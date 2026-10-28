import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as pow from '../quantus-pow.js';

const source = readFileSync(new URL('../quantus-gpu-worker.js', import.meta.url), 'utf8')
    .replace(/^import .*;\n/, '');
const header = '00'.repeat(32);

function fixture() {
    const posts = [], sleeps = [];
    let clock = 0;
    const context = vm.createContext({
        ...pow, Uint8Array, Uint32Array, performance: { now: () => clock },
        GPUBufferUsage: { STORAGE: 1, COPY_SRC: 2, COPY_DST: 4, MAP_READ: 8 },
        GPUMapMode: { READ: 1 },
        setTimeout(callback, milliseconds) { sleeps.push(milliseconds); callback(); },
        postMessage(message) { posts.push(message); }
    });
    context.self = context;
    vm.runInContext(source, context);
    return {
        context, posts, sleeps,
        run: code => vm.runInContext(code, context),
        advance: milliseconds => { clock += milliseconds; }
    };
}

test('GPU buffers and midstate survive repeated batches while changed inputs invalidate the cache', async () => {
    const f = fixture();
    const buffers = [], writes = [];
    let midstateCalls = 0;
    f.context.miningMidstate = (...args) => { midstateCalls++; return pow.miningMidstate(...args); };
    f.context.testDevice = {
        createBuffer({ size }) {
            const buffer = { bytes: new ArrayBuffer(size), mapAsync: async () => {},
                getMappedRange() { return this.bytes; }, unmap() {} };
            buffers.push(buffer);
            return buffer;
        },
        createBindGroup: options => options,
        createCommandEncoder() {
            return {
                clearBuffer(buffer) { new Uint8Array(buffer.bytes).fill(0); },
                beginComputePass: () => ({ setPipeline() {}, setBindGroup() {}, dispatchWorkgroups() {}, end() {} }),
                copyBufferToBuffer(from, offset, to) { new Uint8Array(to.bytes).set(new Uint8Array(from.bytes)); },
                finish() {}
            };
        },
        queue: {
            submit() {},
            writeBuffer(buffer, offset, data) {
                writes.push(buffer);
                new Uint8Array(buffer.bytes).set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength), offset);
            }
        }
    };
    f.context.testPipeline = { getBindGroupLayout() {} };
    f.run('device = testDevice; pipeline = testPipeline;');
    await f.context.dispatch(header, 0n, 11n, 256);
    assert.equal(buffers.length, 6);
    assert.equal(writes.length, 4);
    await f.context.dispatch(header, 256n, 11n, 512);
    assert.equal(buffers.length, 6, 'no per-batch allocations');
    assert.equal(writes.length, 6, 'only nonce and dispatch size change');
    assert.equal(midstateCalls, 1, 'no per-batch CPU Poseidon recomputation');
    assert.deepEqual(Array.from(new Uint32Array(buffers[4].bytes)), [512, 1, 512, 0]);
    assert.equal(new DataView(buffers[2].bytes).getUint32(0, true), 256);
    await f.context.dispatch('01'.repeat(32), 256n, 11n, 512);
    await f.context.dispatch('01'.repeat(32), 1n << 256n, 11n, 512);
    await f.context.dispatch('01'.repeat(32), 1n << 256n, 15n, 512);
    assert.equal(midstateCalls, 4);
    assert.equal(buffers.length, 6);
});

for (const cap of [1048576, 512]) test(`100% skips timers and scales complete batches up to ${cap} nonces`, async () => {
    const f = fixture();
    const counts = [];
    f.run(`budget = 100; maxBatchSize = ${cap}; job = { id: 1, header: '${header}', nonce: 0n, target: 0n };`);
    f.context.dispatch = async (header, nonce, target, count) => {
        counts.push(count);
        f.advance(1);
        if (counts.length === 15) f.run('job = null;');
        return new Uint32Array(33);
    };
    await f.context.mine();
    assert.deepEqual(f.sleeps, []);
    assert.equal(Math.max(...counts), cap);
    assert.ok(counts.every(count => count <= cap && count % 256 === 0));
});

test('lower budgets still pause in proportion to dispatch time', async () => {
    const f = fixture();
    let dispatches = 0;
    f.run(`budget = 25; job = { id: 1, header: '${header}', nonce: 0n, target: 0n };`);
    f.context.dispatch = async () => {
        f.advance(4);
        if (++dispatches === 3) f.run('job = null;');
        return new Uint32Array(33);
    };
    await f.context.mine();
    assert.deepEqual(f.sleeps, [12, 12]);
});

test('an early solution is verified without inflating the next batch size', async () => {
    const f = fixture();
    const hash = pow.nonceHash(header, '00'.repeat(64));
    const result = new Uint32Array(33);
    result[0] = 1;
    new Uint8Array(result.buffer).set(pow.littleEndian(BigInt('0x' + hash), 64), 17 * 4);
    f.run(`budget = 100; job = { id: 1, header: '${header}', nonce: 0n, target: U512_MAX };`);
    f.context.dispatch = async () => { f.advance(1); return result; };
    await f.context.mine();
    assert.equal(f.run('batchSize'), 256);
    assert.equal(f.posts[0].kind, 'found');
    assert.equal(f.posts[0].nonce, '00'.repeat(64));
    assert.deepEqual(f.sleeps, []);
});

test('cancellation during a dispatch does not schedule another batch or report stale work', async () => {
    const f = fixture();
    f.run(`budget = 100; job = { id: 1, header: '${header}', nonce: 0n, target: 0n };`);
    f.context.dispatch = async () => { f.run('job = null;'); return new Uint32Array(33); };
    await f.context.mine();
    assert.deepEqual(f.posts, []);
    assert.deepEqual(f.sleeps, []);
    assert.equal(f.run('running'), false);
});
