import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../donate.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../donate.html', import.meta.url), 'utf8');
const payout = 'qznZa3n4ZzrWfuhEhuQ7AJXBD44Vb3fdp1NNrTfBpKnSyDPvk';

function fixture(gpu = true) {
    function element() {
        return {
            value: '', checked: false, disabled: false, hidden: false, dataset: {}, textContent: '', events: {},
            addEventListener(name, callback) { this.events[name] = callback; },
            emit(name) { return this.events[name]?.(); },
            remove() {}
        };
    }
    const elements = Object.fromEntries([...html.matchAll(/\bid="([^"]+)"/g)].map(match => [match[1], element()]));
    Object.assign(elements['mining-mode'], { value: 'cpu' });
    elements['cpu-limit'].value = elements['gpu-budget'].value = '20';
    elements['thread-count'].value = '1';
    const scripts = [], workers = [], sockets = [], miners = [], timers = new Map();
    const document = {
        hidden: false, events: {}, body: { appendChild: script => scripts.push(script) },
        getElementById: id => elements[id], createElement: element,
        addEventListener(name, callback) { this.events[name] = callback; }
    };
    let timerId = 0;
    const context = {
        document, navigator: { hardwareConcurrency: 8, gpu: gpu ? {} : undefined },
        isSecureContext: true, performance, crypto: { randomUUID: () => '12345678-1234' },
        addEventListener() {},
        setTimeout(callback) { timers.set(++timerId, callback); return timerId; },
        setInterval(callback) { timers.set(++timerId, callback); return timerId; },
        clearTimeout(id) { timers.delete(id); }, clearInterval(id) { timers.delete(id); },
        Worker: class {
            messages = []; terminated = false;
            constructor() { workers.push(this); }
            postMessage(message) { this.messages.push(message); }
            terminate() { this.terminated = true; }
            emit(message) { this.onmessage?.({ data: message }); }
        },
        WebSocket: class {
            static OPEN = 1;
            sent = []; readyState = 0;
            constructor(url) { this.url = url; sockets.push(this); }
            send(message) { this.sent.push(message); }
            close() { this.readyState = 3; this.onclose?.(); }
            open() { this.readyState = 1; this.onopen?.(); }
            emit(message) { this.onmessage?.({ data: JSON.stringify(message) }); }
        }
    };
    context.window = context;
    vm.runInNewContext(source, context);
    function installCpu() {
        context.Client = {
            IF_EXCLUSIVE_TAB: 0,
            Anonymous: class {
                events = {}; starts = 0; stops = 0;
                constructor(key, options) { this.options = options; miners.push(this); }
                on(name, callback) { this.events[name] = callback; }
                start() { this.starts++; this.events.open?.(); }
                stop() { this.stops++; this.events.close?.(); }
                setThrottle() {} setNumThreads() {}
            }
        };
    }
    async function gpuStart() {
        elements['mining-mode'].value = 'gpu';
        elements['mining-mode'].emit('change');
        elements['miner-consent'].checked = true;
        elements['miner-consent'].emit('change');
        await elements['start-miner'].emit('click');
    }
    return { context, elements, document, scripts, workers, sockets, miners, timers, installCpu, gpuStart };
}

test('loading the page does not load an engine or connect to a pool', () => {
    const f = fixture();
    assert.equal(f.elements['start-miner'].disabled, true);
    assert.equal(f.scripts.length + f.workers.length + f.sockets.length, 0);
    assert.equal(fixture(false).elements['gpu-option'].disabled, true);
});

test('Stop cancels GPU initialization and ignores a late ready message', async () => {
    const f = fixture();
    await f.gpuStart();
    assert.equal(f.elements['stop-miner'].disabled, false);
    f.elements['stop-miner'].emit('click');
    f.workers[0].emit({ kind: 'ready' });
    assert.equal(f.workers[0].terminated, true);
    assert.equal(f.sockets.length, 0);
    assert.equal(f.timers.size, 0);
});

for (const trigger of ['consent', 'hidden']) test(`${trigger} cancels GPU initialization without restart`, async () => {
    const f = fixture();
    await f.gpuStart();
    if (trigger === 'consent') {
        f.elements['miner-consent'].checked = false;
        f.elements['miner-consent'].emit('change');
    } else {
        f.document.hidden = true;
        f.document.events.visibilitychange();
    }
    f.workers[0].emit({ kind: 'ready' });
    assert.equal(f.workers[0].terminated, true);
    assert.equal(f.sockets.length, 0);
    assert.equal(f.elements['miner-status'].dataset.state, 'idle');
});

test('pool uses the configured payout, ignores stale work and counts only confirmed shares', async () => {
    const f = fixture();
    await f.gpuStart();
    const worker = f.workers[0];
    worker.emit({ kind: 'ready' });
    const socket = f.sockets[0];
    socket.open();
    assert.equal(JSON.parse(socket.sent[0]).Hello.payout_address, payout);
    socket.emit({ HelloAck: {} });
    assert.equal(socket.sent.at(-1), 'Ready');
    socket.emit({ NewJob: { job_id: 'first', mining_hash: '00'.repeat(32), difficulty: '1' } });
    const oldId = worker.messages.at(-1).id;
    socket.emit({ NewJob: { job_id: 'second', mining_hash: '01'.repeat(32), difficulty: '2' } });
    worker.emit({ kind: 'found', jobId: oldId, nonce: '00'.repeat(64), hashes: 1 });
    assert.equal(socket.sent.length, 2);
    worker.emit({ kind: 'found', jobId: worker.messages.at(-1).id, nonce: '01'.repeat(64), hashes: 1 });
    assert.equal(JSON.parse(socket.sent.at(-1)).JobResult.job_id, 'second');
    assert.equal(f.elements['accepted-shares'].textContent, '0');
    socket.emit({ ShareAccepted: {} });
    assert.equal(f.elements['accepted-shares'].textContent, '1');
    socket.onerror();
    assert.equal(worker.terminated, true);
    assert.equal(socket.readyState, 3);
    assert.equal(f.elements['miner-status'].dataset.state, 'error');
});

test('GPU validation failure stops without starting CPU', async () => {
    const f = fixture();
    await f.gpuStart();
    f.workers[0].emit({ kind: 'error', message: 'known-answer test failed' });
    assert.equal(f.elements['miner-status'].dataset.state, 'error');
    assert.equal(f.scripts.length + f.sockets.length, 0);
    assert.equal(f.workers[0].terminated, true);
});

test('stopping a pending CoinIMP load prevents CPU mining after it resolves', async () => {
    const f = fixture();
    f.elements['miner-consent'].checked = true;
    const pending = f.elements['start-miner'].emit('click');
    assert.equal(f.scripts.length, 1);
    f.elements['stop-miner'].emit('click');
    f.installCpu();
    f.scripts[0].onload();
    await pending;
    assert.equal(f.miners.length, 0);
    assert.equal(f.elements['miner-status'].dataset.state, 'idle');
});

test('CPU start, full power and stop preserve the existing engine behavior', async () => {
    const f = fixture();
    f.installCpu();
    f.elements['full-power-mode'].checked = true;
    f.elements['full-power-mode'].emit('input');
    f.elements['miner-consent'].checked = true;
    await f.elements['start-miner'].emit('click');
    assert.equal(f.miners[0].options.throttle, 0);
    assert.equal(f.miners[0].options.threads, 8);
    assert.equal(f.miners[0].starts, 1);
    assert.equal(f.elements['miner-status'].dataset.state, 'running');
    f.elements['stop-miner'].emit('click');
    assert.equal(f.miners[0].stops, 1);
    assert.equal(f.timers.size, 0);
});
