(() => {
    const SITE_KEY = 'd23c337b39a36736437c35dd7d3bf79e3ea570a1adcab5a2ff8e9f909c7060c8';
    const PAYOUT = 'qznZa3n4ZzrWfuhEhuQ7AJXBD44Vb3fdp1NNrTfBpKnSyDPvk';
    const POOL = 'wss://www.quantusminer.com/ws';
    const $ = id => document.getElementById(id);
    const consent = $('miner-consent');
    const mode = $('mining-mode');
    const startBtn = $('start-miner');
    const stopBtn = $('stop-miner');
    const cpuLimit = $('cpu-limit');
    const threadCount = $('thread-count');
    const fullPower = $('full-power-mode');
    const gpuBudget = $('gpu-budget');
    const hardwareThreads = Math.max(1, Math.min(16, navigator.hardwareConcurrency || 1));
    const gpuAvailable = window.isSecureContext && Boolean(navigator.gpu);
    let miner = null;
    let scriptPromise = null;
    let session = 0;
    let active = false;
    let worker = null;
    let socket = null;
    let deadline = null;
    let statsTimer = null;
    let job = null;
    let workId = 0;
    let total = 0;
    let accepted = 0;
    let rejected = 0;
    let startedAt = 0;
    let sampleTime = 0;
    let sampleHashes = 0;

    threadCount.max = String(hardwareThreads);
    $('gpu-option').disabled = !gpuAvailable;
    if (!gpuAvailable) $('gpu-support').textContent = 'GPU採掘にはHTTPSとWebGPU対応のブラウザ・GPUが必要です。';

    function isCurrent(id) {
        return active && session === id && consent.checked && !document.hidden;
    }

    function setState(state, message) {
        $('miner-status').dataset.state = state;
        $('miner-status').textContent = message;
        $('miner-state-dot').className = `status-dot donate-dot is-${state}`;
        startBtn.disabled = active || !consent.checked || document.hidden || (mode.value === 'gpu' && !gpuAvailable);
        stopBtn.disabled = !active;
        mode.disabled = active;
    }

    function threads() {
        const count = Math.max(1, Math.min(hardwareThreads, Number.parseInt(threadCount.value, 10) || 1));
        threadCount.value = String(count);
        $('thread-hint').textContent = `${count} thread${count === 1 ? '' : 's'} / max ${hardwareThreads}`;
        return count;
    }

    function throttle() {
        return 1 - Number(cpuLimit.value) / 100;
    }

    function syncSettings() {
        if (fullPower.checked) {
            cpuLimit.value = '100';
            threadCount.value = String(hardwareThreads);
        }
        cpuLimit.disabled = fullPower.checked;
        threadCount.disabled = fullPower.checked;
        $('cpu-limit-value').textContent = `${cpuLimit.value}%`;
        $('gpu-budget-value').textContent = `${gpuBudget.value}%`;
        const count = threads();
        if (miner) {
            miner.setThrottle(throttle());
            miner.setNumThreads(count);
        }
        if (worker) worker.postMessage({ kind: 'budget', budget: Number(gpuBudget.value) });
    }

    function stop(message = 'Stopped', state = 'idle') {
        active = false;
        session++;
        window.clearTimeout(deadline);
        window.clearInterval(statsTimer);
        if (worker) worker.terminate();
        worker = null;
        if (socket) {
            socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null;
            socket.close();
        }
        socket = null;
        job = null;
        if (miner) miner.stop();
        $('hash-rate').textContent = '0 H/s';
        $('active-threads').textContent = '0';
        setState(state, message);
    }

    function fail(message) {
        stop(message, 'error');
    }

    function armDeadline(milliseconds, message) {
        window.clearTimeout(deadline);
        const id = session;
        deadline = window.setTimeout(() => { if (isCurrent(id)) fail(message); }, milliseconds);
    }

    function resetStats() {
        total = accepted = rejected = sampleHashes = 0;
        sampleTime = performance.now();
        $('hash-rate').textContent = '0 H/s';
        $('total-hashes').textContent = '0';
        $('accepted-shares').textContent = '0';
        $('rejected-shares').textContent = '0';
        $('active-threads').textContent = '0';
    }

    function loadCoinImp() {
        if (window.Client) return Promise.resolve();
        if (scriptPromise) return scriptPromise;
        const script = document.createElement('script');
        scriptPromise = new Promise((resolve, reject) => {
            script.src = 'https://www.hostingcloud.racing/aKMl.js';
            script.async = true;
            const timer = window.setTimeout(() => reject(new Error('CoinIMPの読み込みがタイムアウトしました。')), 20000);
            script.onload = () => {
                window.clearTimeout(timer);
                window.Client ? resolve() : reject(new Error('CoinIMPクライアントが見つかりません。'));
            };
            script.onerror = () => {
                window.clearTimeout(timer);
                reject(new Error('CoinIMPを読み込めません。ブラウザのブロック設定を確認してください。'));
            };
            document.body.appendChild(script);
        }).catch(error => {
            script.remove();
            scriptPromise = null;
            throw error;
        });
        return scriptPromise;
    }

    async function startCpu(id) {
        setState('loading', 'CoinIMPを読み込み中…');
        await loadCoinImp();
        if (!isCurrent(id)) return;
        miner = new window.Client.Anonymous(SITE_KEY, { throttle: throttle(), threads: threads(), autoThreads: false, c: 'w' });
        miner.on('open', () => { if (isCurrent(id)) setState('running', 'CPU mining · CoinIMP'); });
        miner.on('close', () => { if (isCurrent(id)) stop('CoinIMPとの接続が終了しました。'); });
        miner.on('error', () => { if (isCurrent(id)) fail('CoinIMPでエラーが発生しました。'); });
        setState('loading', 'CoinIMPプールへの接続待ち…');
        miner.start(window.Client.IF_EXCLUSIVE_TAB);
        if (!isCurrent(id)) return;
        if (miner.addMiningNotification) miner.addMiningNotification('Top', 'Mining with your permission. Stop anytime.', '#cccccc', 40, '#3d3d3d');
        statsTimer = window.setInterval(() => {
            if (!isCurrent(id)) return;
            try {
                $('hash-rate').textContent = `${Number(miner.getHashesPerSecond() || 0).toFixed(2)} H/s`;
                $('total-hashes').textContent = Math.floor(miner.getTotalHashes()).toLocaleString('ja-JP');
                $('active-threads').textContent = String(miner.getNumThreads());
                $('miner-engine').textContent = miner.hasWASMSupport() ? 'CPU · WASM' : 'CPU · ASM.js';
            } catch {
                fail('CPU採掘の状態を取得できませんでした。');
            }
        }, 1000);
    }

    function send(message) {
        if (!socket || socket.readyState !== WebSocket.OPEN) throw new Error('プールへの接続がありません。');
        socket.send(typeof message === 'string' ? message : JSON.stringify(message));
    }

    function dispatchJob() {
        if (!job || !worker) return;
        worker.postMessage({ kind: 'job', id: ++workId, header: job.mining_hash, difficulty: job.difficulty });
    }

    function connectPool(id) {
        setState('loading', 'Quantus Poolに接続中…');
        armDeadline(20000, 'Quantus Poolへの接続がタイムアウトしました。');
        socket = new WebSocket(POOL);
        socket.onopen = () => {
            if (!isCurrent(id)) return;
            const name = `b4mboo-${crypto.randomUUID().slice(0, 8)}`;
            send({ Hello: { payout_address: PAYOUT, worker_name: name, client: 'b4mboo-webgpu/1' } });
        };
        socket.onerror = () => { if (isCurrent(id)) fail('Quantus Poolに接続できませんでした。'); };
        socket.onclose = () => { if (isCurrent(id)) fail('Quantus Poolとの接続が切れたため停止しました。'); };
        socket.onmessage = event => {
            if (!isCurrent(id)) return;
            try {
                const message = JSON.parse(event.data);
                if (message.HelloAck) send('Ready');
                if (message.NewJob) {
                    job = message.NewJob;
                    startedAt = performance.now();
                    dispatchJob();
                    armDeadline(90000, '新しい採掘ジョブを受信できないため停止しました。');
                    setState('running', 'GPU mining · Quantus Pool');
                }
                if (message.ShareAccepted) {
                    $('accepted-shares').textContent = String(++accepted);
                }
                if (message.ShareRejected) {
                    $('rejected-shares').textContent = String(++rejected);
                    if (rejected >= 5 && rejected > accepted) fail('採掘結果の拒否が続いているため停止しました。');
                }
                if (message.Error) fail('Quantus Poolからエラーが返されました。');
            } catch (error) {
                fail(error.message || 'Quantus Poolからの応答を処理できませんでした。');
            }
        };
    }

    function startGpu(id) {
        if (!gpuAvailable) throw new Error('このブラウザではWebGPUを利用できません。');
        setState('loading', 'GPUを初期化中…');
        $('miner-engine').textContent = 'GPU · WebGPU';
        armDeadline(180000, 'GPUの初期化がタイムアウトしました。');
        worker = new Worker('./quantus-gpu-worker.js', { type: 'module' });
        worker.onerror = () => { if (isCurrent(id)) fail('GPUワーカーでエラーが発生しました。'); };
        worker.onmessage = event => {
            if (!isCurrent(id)) return;
            const message = event.data;
            try {
                if (message.kind === 'status') setState('loading', message.message);
                if (message.kind === 'error') return fail(message.message);
                if (message.kind === 'ready') {
                    $('active-threads').textContent = '1 GPU worker';
                    $('gpu-adapter').textContent = `使用GPU: ${message.adapter || 'WebGPU adapter'}`;
                    connectPool(id);
                }
                if (message.jobId !== workId || !job) return;
                if (message.kind === 'progress' || message.kind === 'found') {
                    total += message.hashes;
                    $('total-hashes').textContent = total.toLocaleString('ja-JP');
                }
                if (message.kind === 'found') {
                    send({ JobResult: {
                        status: 'completed', job_id: job.job_id, nonce: message.nonce, work: message.nonce,
                        hash_count: message.hashes, elapsed_time: (performance.now() - startedAt) / 1000
                    } });
                    dispatchJob();
                }
            } catch (error) {
                fail(error.message);
            }
        };
        worker.postMessage({ kind: 'init', budget: Number(gpuBudget.value) });
        statsTimer = window.setInterval(() => {
            const now = performance.now();
            const rate = (total - sampleHashes) / Math.max(0.001, (now - sampleTime) / 1000);
            $('hash-rate').textContent = `${rate.toFixed(2)} H/s`;
            sampleTime = now;
            sampleHashes = total;
        }, 1000);
    }

    startBtn.addEventListener('click', async () => {
        if (active || !consent.checked || document.hidden) return;
        active = true;
        const id = ++session;
        resetStats();
        try {
            if (mode.value === 'gpu') startGpu(id);
            else await startCpu(id);
        } catch (error) {
            if (isCurrent(id)) fail(error.message);
        }
    });
    stopBtn.addEventListener('click', () => stop('Stopped by user'));
    consent.addEventListener('change', () => {
        if (!consent.checked) stop('同意が解除されたため停止しました。');
        else setState('idle', 'Stopped');
    });
    mode.addEventListener('change', () => {
        stop();
        const gpu = mode.value === 'gpu';
        $('cpu-settings').hidden = gpu;
        $('gpu-settings').hidden = !gpu;
        $('gpu-stats-note').hidden = !gpu;
        $('share-stats').hidden = !gpu;
        $('miner-engine').textContent = 'Waiting';
        resetStats();
        // Changing the resource used requires a fresh opt-in.
        consent.checked = false;
        setState('idle', 'Stopped');
    });
    for (const control of [fullPower, cpuLimit, threadCount, gpuBudget]) control.addEventListener('input', syncSettings);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stop('タブが非表示になったため停止しました。');
        else setState($('miner-status').dataset.state, $('miner-status').textContent);
    });
    window.addEventListener('pagehide', () => stop());
    syncSettings();
    setState('idle', 'Stopped');
})();
