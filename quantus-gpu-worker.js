import { difficultyTarget, hexBytes, littleEndian, miningMidstate, nonceHash, U512_MAX } from './quantus-pow.js';

let device;
let pipeline;
let job = null;
let running = false;
let budget = 20;
let batchSize = 256;
const MAX_BATCH_SIZE = 1048576;
let maxBatchSize = MAX_BATCH_SIZE;
let resources;
let inputKey = '';
const RESULT_BYTES = 33 * 4;

function report(kind, data = {}) {
    self.postMessage({ kind, ...data });
}

function fail(error) {
    job = null;
    running = false;
    report('error', { message: error.message || String(error) });
    if (device) device.destroy();
}

function createResources() {
    const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
    const buffers = [RESULT_BYTES, 96, 64, 64, 16].map(size => device.createBuffer({ size, usage }));
    return {
        buffers,
        staging: device.createBuffer({ size: RESULT_BYTES, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ }),
        group: device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: buffers.map((buffer, binding) => ({ binding, resource: { buffer } }))
        })
    };
}

async function dispatch(header, nonce, target, count) {
    if (!resources) resources = createResources();
    const { buffers, staging, group } = resources;
    // The midstate depends on the header and high nonce half, not on each batch.
    // Keep it and its GPU buffer until the inputs actually change.
    const key = `${header}:${nonce >> 256n}:${target}`;
    if (key !== inputKey) {
        const hex = nonce.toString(16).padStart(128, '0');
        device.queue.writeBuffer(buffers[1], 0, miningMidstate(header, hex));
        device.queue.writeBuffer(buffers[3], 0, littleEndian(target, 64));
        inputKey = key;
    }
    device.queue.writeBuffer(buffers[2], 0, littleEndian(nonce, 64));
    device.queue.writeBuffer(buffers[4], 0, new Uint32Array([count, 1, count, 0]));
    const encoder = device.createCommandEncoder();
    encoder.clearBuffer(buffers[0]);
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, group);
    pass.dispatchWorkgroups(Math.ceil(count / 256));
    pass.end();
    encoder.copyBufferToBuffer(buffers[0], 0, staging, 0, RESULT_BYTES);
    device.queue.submit([encoder.finish()]);
    await staging.mapAsync(GPUMapMode.READ);
    try {
        return new Uint32Array(staging.getMappedRange().slice(0));
    } finally {
        staging.unmap();
    }
}

function resultHex(words, start) {
    return Array.from(words.subarray(start, start + 16)).reverse()
        .map(word => word.toString(16).padStart(8, '0')).join('');
}

async function initialize() {
    if (!navigator.gpu) throw new Error('WebGPUに対応したブラウザが必要です。');
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) throw new Error('利用可能なGPUが見つかりません。');
    device = await adapter.requestDevice();
    maxBatchSize = Math.min(MAX_BATCH_SIZE, device.limits.maxComputeWorkgroupsPerDimension * 256);
    device.lost.then(info => { if (info.reason !== 'destroyed') fail(new Error('GPU接続が失われました。')); });
    device.addEventListener('uncapturederror', event => fail(event.error));
    report('status', { message: 'GPUシェーダーをコンパイル中…（数十秒かかる場合があります）' });
    const response = await fetch('./assets/quantus/mining.wgsl');
    if (!response.ok) throw new Error('GPUシェーダーを読み込めませんでした。');
    const module = device.createShaderModule({ code: await response.text() });
    const info = await module.getCompilationInfo();
    if (info.messages.some(message => message.type === 'error')) throw new Error('GPUシェーダーのコンパイルに失敗しました。');
    pipeline = await device.createComputePipelineAsync({ layout: 'auto', compute: { module, entryPoint: 'mining_main' } });

    // Offline known-answer test: no pool, job or real shares are involved.
    const header = '00'.repeat(32);
    const result = await dispatch(header, 0n, U512_MAX, 1);
    const expected = '8e64e3d8e0f38f882e8501f9e525df0a95d2e91e9cfc32c9248d756fb07780e2f8fdca2c5a54441e6fcd8d774a5f6aae72f36d1c76bc19f691a0d4f6c607e8cc';
    if (result[0] !== 1 || resultHex(result, 1) !== '00'.repeat(64) || resultHex(result, 17) !== expected) {
        throw new Error('GPUの計算結果が検証値と一致しません。この端末ではGPU採掘を開始できません。');
    }
    const infoText = [adapter.info?.vendor, adapter.info?.architecture, adapter.info?.description || adapter.info?.device]
        .filter(Boolean).join(' / ');
    report('ready', { adapter: infoText || 'WebGPU adapter' });
}

async function mine() {
    if (running || !job) return;
    running = true;
    try {
        while (job) {
            const current = job;
            const start = performance.now();
            // The upstream kernel cannot carry into the high 256 nonce bits.
            const lowRemaining = (1n << 256n) - (current.nonce & ((1n << 256n) - 1n));
            const count = Number(lowRemaining < BigInt(batchSize) ? lowRemaining : BigInt(batchSize));
            const result = await dispatch(current.header, current.nonce, current.target, count);
            const elapsed = Math.max(1, performance.now() - start);
            if (job !== current) continue;
            if (result[0]) {
                const nonce = resultHex(result, 1);
                const hash = nonceHash(current.header, nonce);
                if (hash !== resultHex(result, 17) || BigInt('0x' + hash) >= current.target) {
                    throw new Error('GPUの計算結果の検証に失敗したため停止しました。');
                }
                // Early-exit dispatches do not reveal the actual number of hashes.
                report('found', { jobId: current.id, nonce, hashes: 1 });
                job = null;
            } else {
                current.nonce = (current.nonce + BigInt(count)) & U512_MAX;
                report('progress', { jobId: current.id, hashes: count });
            }
            // Tune only complete batches: early exits don't measure full-batch cost.
            // Allow enough parallel work for discrete GPUs, while aiming for ~30ms dispatches.
            if (!result[0] && count === batchSize) {
                batchSize = Math.max(256, Math.min(maxBatchSize, Math.floor(batchSize * Math.min(2, 30 / elapsed) / 256) * 256));
            }
            // 100% means no intentional rest. mapAsync already yields to worker events.
            const rest = elapsed * (100 / budget - 1);
            if (rest > 0) await new Promise(resolve => setTimeout(resolve, rest));
        }
    } finally {
        running = false;
    }
}

self.onmessage = event => {
    const message = event.data;
    try {
        if (message.kind === 'init') {
            budget = Math.max(10, Math.min(100, Number(message.budget) || 20));
            initialize().catch(fail);
        } else if (message.kind === 'budget') {
            budget = Math.max(10, Math.min(100, Number(message.budget) || 20));
        } else if (message.kind === 'job') {
            if (!pipeline) throw new Error('GPU is not ready');
            hexBytes(message.header, 32);
            const nonce = new Uint8Array(64);
            crypto.getRandomValues(nonce);
            const nonceHex = Array.from(nonce, byte => byte.toString(16).padStart(2, '0')).join('');
            job = { id: message.id, header: message.header, target: difficultyTarget(message.difficulty), nonce: BigInt('0x' + nonceHex) };
            mine().catch(fail);
        } else if (message.kind === 'cancel') {
            job = null;
        }
    } catch (error) {
        fail(error);
    }
};
