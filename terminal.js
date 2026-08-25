/* ============================================================
   bamboo-term v2.1 — b4mboo.net 共通ターミナル
   index では「/」でフローティング起動、404 ではページ内に常駐。
   ページ側は読み込み前に window.BAMBOO_TERM = { cwd: '~' } で設定可。
   ============================================================ */
(function () {
    'use strict';

    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const CFG = window.BAMBOO_TERM || {};
    const CWD = CFG.cwd || '~';
    const PROMPT = `guest@b4mboo.net:${CWD}$`;
    const VERSION = 'bamboo-term, version 2.1.0(1)-release (x86_64-bamboo-linux-noka)';

    /* ---------- styles ---------- */
    const style = document.createElement('style');
    style.textContent = `
.bt-float {
    --bt-accent: var(--bamboo-green, #7abf75);
    --bt-bg: var(--card-bg, #121412);
    --bt-bg-soft: var(--card-hover-bg, #181b18);
    --bt-border: var(--card-border, #2a302a);
    --bt-text: var(--text-main, #e6e8e4);
    --bt-dim: var(--text-sub, #969c94);
    position: fixed; left: 50%; bottom: 28px;
    transform: translate(-50%, 18px);
    width: min(720px, calc(100% - 40px));
    max-height: min(620px, calc(100dvh - 56px));
    background: color-mix(in srgb, var(--bt-bg) 94%, transparent);
    border: 1px solid var(--bt-border); border-top: 2px solid var(--bt-accent);
    border-radius: 12px; z-index: 10001;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
    opacity: 0; visibility: hidden;
    overflow: hidden;
    transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s;
}
.bt-float.open { opacity: 1; visibility: visible; transform: translate(-50%, 0); }
.bt-head {
    display: flex; justify-content: space-between; align-items: center;
    min-height: 48px; padding: 9px 12px 9px 16px;
    border-bottom: 1px solid var(--bt-border); background: var(--bt-bg-soft);
    color: var(--bt-dim); font-size: 0.7rem; letter-spacing: 0.02em;
}
.bt-title, .bt-controls { display: flex; align-items: center; min-width: 0; }
.bt-title { gap: 9px; }
.bt-title strong { color: var(--bt-text); font-size: 0.72rem; letter-spacing: 0.06em; }
.bt-status { width: 7px; height: 7px; border-radius: 50%; background: var(--bt-accent); box-shadow: 0 0 0 3px rgba(122, 191, 117, 0.12); }
.bt-context { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bt-controls { gap: 8px; }
.bt-controls kbd {
    padding: 3px 6px; border: 1px solid var(--bt-border); border-radius: 5px;
    background: var(--bt-bg); color: var(--bt-dim); font: inherit;
}
.bt-close {
    display: grid; width: 28px; height: 28px; padding: 0; place-items: center;
    background: transparent; border: 1px solid transparent; border-radius: 6px;
    color: var(--bt-dim); font: inherit; font-size: 1rem; line-height: 1; cursor: pointer;
}
.bt-close:hover { color: var(--bt-text); border-color: var(--bt-border); background: var(--bt-bg); }
.bt-close:focus-visible { outline: 2px solid var(--bt-accent); outline-offset: 2px; }
.bt-float .bt-out {
    min-height: 150px; max-height: min(330px, calc(100dvh - 180px));
    overflow-y: auto; padding: 16px 18px;
    font-size: 0.78rem; line-height: 1.75; color: var(--bt-text); overflow-wrap: anywhere;
    scrollbar-width: thin; scrollbar-color: var(--bt-border) transparent;
}
.bt-float > .bt-line { border-top: 1px solid var(--bt-border); padding: 13px 18px; background: var(--bt-bg-soft); }
.bt-float > .bt-line:focus-within { border-top-color: var(--bt-accent); }
.bt-line { display: flex; align-items: center; gap: 8px; }
.bt-prompt { color: var(--bt-accent); font-size: 0.76rem; white-space: nowrap; font-family: inherit; }
.bt-input {
    flex: 1; background: transparent; border: none; outline: none;
    color: var(--bt-text); font-family: inherit; font-size: 0.8rem;
    caret-color: var(--bt-accent); min-width: 0; padding: 2px 0;
}
.bt-out .t-cmd { color: var(--bt-text); }
.bt-out .t-dim, .t-dim { color: var(--bt-dim); }
.bt-out .t-acc, .t-acc { color: var(--bt-accent); font-weight: 600; }
.bt-out .t-err, .t-err { color: #df8b84; }
.bt-out .t-warn, .t-warn { color: #cfb96f; }
.bt-pre {
    font-family: inherit; margin: 6px 0;
    line-height: 1.4; overflow-x: auto; white-space: pre; color: inherit;
}
.bt-toast {
    position: fixed; left: 50%; bottom: 112px;
    transform: translate(-50%, 8px);
    padding: 10px 14px; border-radius: 8px;
    background: var(--card-bg, #121412); color: var(--text-main, #e6e8e4);
    border: 1px solid var(--card-border, #2a302a); box-shadow: 0 16px 44px rgba(0, 0, 0, 0.35);
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
    font-weight: 500; font-size: 0.76rem; z-index: 10002;
    opacity: 0; transition: opacity 0.2s ease, transform 0.2s ease; pointer-events: none; white-space: nowrap;
}
.bt-toast.show { opacity: 1; transform: translate(-50%, 0); }
body.bt-shake { animation: bt-shake 0.5s ease; }
@keyframes bt-shake {
    0%, 100% { transform: translate(0, 0); }
    20% { transform: translate(-8px, 4px); }
    40% { transform: translate(8px, -4px); }
    60% { transform: translate(-6px, -3px); }
    80% { transform: translate(6px, 3px); }
}
@media (max-width: 768px) {
    .bt-float { bottom: 10px; width: calc(100% - 20px); max-height: calc(100dvh - 20px); border-radius: 10px; }
    .bt-head { min-height: 44px; padding-left: 12px; }
    .bt-context { display: none; }
    .bt-float .bt-out { min-height: 180px; max-height: calc(100dvh - 150px); padding: 14px 12px; font-size: 0.74rem; }
    .bt-float > .bt-line { padding: 12px; }
    .bt-prompt { max-width: 48%; overflow: hidden; text-overflow: ellipsis; }
    .bt-toast { max-width: calc(100% - 32px); white-space: normal; text-align: center; }
}
@media (prefers-reduced-motion: reduce) {
    .bt-float, .bt-toast { transition-duration: 0.01ms; }
}
`;
    document.head.appendChild(style);

    /* ---------- session state ---------- */
    let out = null;          // 出力先
    let lineEl = null;       // 入力行 (out の中にある場合は print 時に手前へ挿入)
    let inputEl = null;
    let floatEl = null;
    let inline = false;      // 404 等のページ内常駐モード
    const history = [];
    let hIdx = 0;

    const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const sleep = ms => new Promise(r => setTimeout(r, REDUCED ? 0 : ms));
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];

    function print(html) {
        if (!out) return;
        const div = document.createElement('div');
        div.innerHTML = html;
        if (lineEl && lineEl.parentNode === out) out.insertBefore(div, lineEl);
        else out.appendChild(div);
        out.scrollTop = out.scrollHeight;
        return div;
    }
    const printText = t => print(esc(t));
    const printPre = t => print(`<pre class="bt-pre">${esc(t)}</pre>`);

    function echo(cmd) {
        print(`<span class="t-dim">${esc(PROMPT)} </span><span class="t-cmd">${esc(cmd)}</span>`);
    }

    let toastTimer = null;
    function toast(msg) {
        let el = document.querySelector('.bt-toast');
        if (!el) {
            el = document.createElement('div');
            el.className = 'bt-toast';
            el.setAttribute('role', 'status');
            el.setAttribute('aria-live', 'polite');
            document.body.appendChild(el);
        }
        el.textContent = msg;
        el.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
    }

    /* --- 竹マトリックス (404 は既存の #mx を切り替え) --- */
    let mxState = null;
    function toggleMatrix() {
        const pageMx = document.getElementById('mx');
        if (pageMx) {
            const turnOn = pageMx.style.display === 'none';
            pageMx.style.display = turnOn ? '' : 'none';
            return turnOn;
        }
        if (mxState) {
            cancelAnimationFrame(mxState.raf);
            mxState.canvas.remove();
            mxState = null;
            return false;
        }
        const canvas = document.createElement('canvas');
        canvas.style.cssText = 'position:fixed;inset:0;z-index:-1;opacity:.35;pointer-events:none;';
        document.body.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
        resize();
        addEventListener('resize', resize);
        const glyphs = 'ﾀｹﾉｺb4mboo01竹';
        const fs = 16;
        const drops = Array(Math.ceil(innerWidth / fs)).fill(1);
        let last = 0;
        function draw(t) {
            mxState.raf = requestAnimationFrame(draw);
            if (t - last < 50) return;
            last = t;
            ctx.fillStyle = 'rgba(8, 8, 8, 0.08)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#7abf75';
            ctx.font = fs + 'px monospace';
            drops.forEach((y, i) => {
                ctx.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], i * fs, y * fs);
                drops[i] = (y * fs > canvas.height && Math.random() > 0.975) ? 0 : y + 1;
            });
        }
        mxState = { canvas, raf: requestAnimationFrame(draw) };
        return true;
    }

    /* ---------- データ ---------- */
    const FORTUNES = [
        'You will find the missing semicolon in the last place you look.',
        'A merge conflict is heading your way. Rebase responsibly.',
        'Your next deploy will work on the first try. (citation needed)',
        'He who pushes to main on Friday, debugs on Saturday.',
        'The bug is not in your code. It is in your assumptions.',
        'Real programmers test in production. You are about to become very real.',
        '404: fortune not found.',
        'It works on my machine, and that is where it will stay.'
    ];
    const EIGHTBALL = [
        'It is certain.', 'Without a doubt.', 'Ask again later.',
        'Reply hazy, try again.', 'Outlook not so good.', 'My sources say no.',
        'Signs point to yes.', 'Very doubtful.', 'Cannot predict now.'
    ];
    const OPEN_MAP = {
        base: 'https://base.b4mboo.net',
        bot: 'https://bot.b4mboo.net',
        notes: 'https://notes.b4mboo.net',
        github: 'https://github.com/b4mbo-o',
        twitter: 'https://twitter.com/b4mbo_o',
        donate: '/donate.html',
        bakadeka: '/bakadeka/'
    };

    /* ---------- コマンド定義 ---------- */
    const COMMANDS = {};
    function def(names, fn) {
        names.split('|').forEach(n => { COMMANDS[n] = fn; });
    }

    def('help', () => {
        print(`<span class="t-dim">${esc(VERSION)}</span><br>
These commands are defined internally.  Type 'help' to see this list.<br><br>
<span class="t-acc"> help  about  whoami  pwd  ls  cat  cd  echo  date  history  clear  exit</span><br>
<span class="t-acc"> theme  matrix  banner  neofetch  tree  top  uptime</span><br>
<span class="t-acc"> fortune  roll  coin  8ball  oshi  cowsay  sl</span><br>
<span class="t-acc"> home  open  hint</span><br><br>
<span class="t-dim">Other classics may or may not exist. Try them.</span>`);
    });

    def('about', () => {
        print(`b4mboo.net — personal site of <span class="t-acc">bamboo</span> (programmer / idol otaku).`);
    });

    def('whoami', () => printText('guest'));
    def('hostname', () => printText('b4mboo.net'));
    def('pwd', () => printText(CWD === '~' ? '/home/guest' : '/home/guest/lost'));

    def('ls', (arg) => {
        if (arg.includes('-la') || arg.includes('-a')) {
            print(`.  ..  <span class="t-dim">.oshi_config</span>  <span class="t-dim">.vault</span>  friends  notes  <span class="t-acc">secret.txt</span>  works`);
        } else {
            print(`friends  notes  <span class="t-acc">secret.txt</span>  works`);
        }
    });

    def('cat', (arg) => {
        if (arg === 'secret.txt') {
            print(`U2VjcmV0cyBkb24ndCBnbyBpbiBnaXQu`);
        } else if (arg === '.vault') {
            printPre(`00000000  4e 6f 74 68 69 6e 67 20  68 65 72 65 2e 20 47 6f  |Nothing here. Go|
00000010  20 74 6f 75 63 68 20 67  72 61 73 73 2e           | touch grass.|
0000001d`);
        } else if (arg === '.oshi_config') {
            print(`<span class="t-dim">export OSHI="小晴のか"<br>export MODE="MEGAFON"<br>export CALL_VOLUME=unlimited</span>`);
        } else if (!arg) {
            print(`<span class="t-dim">usage: cat [file]</span>`);
        } else {
            print(`<span class="t-err">cat: ${esc(arg)}: No such file or directory</span>`);
        }
    });

    def('cd', async (arg) => {
        if (CWD === '~/lost' && (arg === '~' || arg === '/' || arg === '' || arg === '..')) {
            print(`<span class="t-dim"># heading home...</span>`);
            await sleep(700);
            location.href = '/';
        } else if (['works', 'friends', 'notes'].includes(arg)) {
            print(`<span class="t-err">bash: cd: ${esc(arg)}: Permission denied</span>`);
        } else {
            print(`<span class="t-err">bash: cd: ${esc(arg || '~')}: No such file or directory</span>`);
        }
    });

    def('echo', (arg) => printText(arg || ''));

    def('date', () => {
        const d = new Date();
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const mons = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const p = n => String(n).padStart(2, '0');
        printText(`${days[d.getDay()]} ${mons[d.getMonth()]} ${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())} JST ${d.getFullYear()}`);
    });

    def('history', () => {
        if (history.length === 0) return print(`<span class="t-dim">(empty)</span>`);
        history.forEach((h, i) => print(`<span class="t-dim">${String(i + 1).padStart(5)}</span>  ${esc(h)}`));
    });

    def('clear|cls', () => {
        if (!out) return;
        Array.from(out.children).forEach(c => { if (c !== lineEl) c.remove(); });
    });

    def('exit|quit|:q|:q!|logout', () => {
        if (inline) print(`<span class="t-dim">There is no escape from a 404. Try 'cd ~' instead.</span>`);
        else closeFloat();
    });

    def('theme', (arg) => {
        if (!document.body.hasAttribute('data-theme')) {
            return print(`<span class="t-dim">theme: no light reaches this page. (dark only)</span>`);
        }
        const cur = document.body.getAttribute('data-theme');
        const next = (arg === 'dark' || arg === 'light') ? arg : (cur === 'dark' ? 'light' : 'dark');
        document.body.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        print(`theme: <span class="t-acc">${next}</span>`);
    });

    def('matrix', () => {
        print(toggleMatrix()
            ? `matrix: <span class="t-acc">on</span> <span class="t-dim">— look behind the content.</span>`
            : `matrix: off`);
    });

    def('banner', () => {
        printPre(String.raw`
 _      _ _             _
| |__  | | |  _ __ ___ | |__   ___   ___
| '_ \ |_  _|| '_ ' _ \| '_ \ / _ \ / _ \
| |_) |  | | | | | | | | |_) | (_) | (_) |
|_.__/   |_| |_| |_| |_|_.__/ \___/ \___/  .net`);
    });

    def('neofetch', () => {
        const theme = document.body.getAttribute('data-theme') || 'dark (locked)';
        print(`<pre class="bt-pre"><span class="t-acc">     |\\|/|     </span><span class="t-acc">guest</span>@<span class="t-acc">b4mboo.net</span>
<span class="t-acc">     | | |     </span>------------------
<span class="t-acc">     |-|-|     </span>OS:      BambooOS 5.0 LTS (Otaku Edition)
<span class="t-acc">     | | |     </span>Kernel:  6.8.0-otaku
<span class="t-acc">     |-|-|     </span>Shell:   bamboo-term 2.1.0
<span class="t-acc">    /| | |\\    </span>Theme:   ${esc(theme)}
<span class="t-acc">   / | | | \\   </span>Uptime:  forever (oshi-katsu)
<span class="t-acc">     |_|_|     </span>Oshi:    小晴のか</pre>`);
    });

    def('tree', () => {
        printPre(`.
├── works
│   ├── base-checker
│   ├── bakadeka
│   ├── image-bot
│   ├── tanuki-notify
│   └── oshikatsu-bot
├── friends        (6 sites)
├── notes
├── donate.html
└── secret.txt

3 directories, 8 files`);
    });

    def('top|ps', () => {
        printPre(`  PID USER    %CPU  COMMAND
    1 bamboo  42.0  oshikatsu
    2 bamboo  35.5  bamboo.service
    3 guest   13.3  bamboo-term
    4 bamboo   9.2  base-checker --watch
    5 bamboo   0.1  sleep 86400`);
    });

    def('uptime', () => {
        const d = new Date();
        const p = n => String(n).padStart(2, '0');
        const days = Math.floor((Date.now() - new Date('2025-01-01')) / 86400000);
        printText(` ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())} up ${days} days,  1 user,  load average: 0.99, 0.87, 0.02`);
    });

    def('fortune', () => printText(pick(FORTUNES)));

    def('roll|dice', (arg) => {
        const m = /^(\d{1,2})d(\d{1,3})$/i.exec(arg.trim());
        const n = m ? +m[1] : 1;
        const faces = m ? +m[2] : 6;
        if (n < 1 || faces < 2) return print(`<span class="t-dim">usage: roll 2d6</span>`);
        const rolls = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * faces));
        const sum = rolls.reduce((a, b) => a + b, 0);
        printText(n > 1 ? `${rolls.join(' + ')} = ${sum}` : String(sum));
    });

    def('coin|flip', () => printText(Math.random() < 0.02 ? 'edge. huh.' : (Math.random() < 0.5 ? 'heads' : 'tails')));

    def('8ball', (arg) => {
        if (!arg) return print(`<span class="t-dim">usage: 8ball [question]</span>`);
        printText(pick(EIGHTBALL));
    });

    def('oshi', () => {
        printPre(`1. 小晴のか
2. あいす
3. 輪廻ねる
4. 花丸ぺこ`);
    });

    def('cowsay', (arg) => {
        const msg = arg || 'moo';
        const bar = '-'.repeat(msg.length + 2);
        printPre(` ${'_'.repeat(msg.length + 2)}
< ${msg} >
 ${bar}
        \\   ^__^
         \\  (oo)\\_______
            (__)\\       )\\/\\
                ||----w |
                ||     ||`);
    });

    def('sl', async () => {
        const train = [
            '      ====        ________ ',
            '  _D _|  |_______/        \\__I_I_____===__|_____',
            '   |(_)---  |   H\\________/ |   |        =|___ _|',
            '   /     |  |   H  |  |     |   |         ||_| |_',
            '  |      |  |   H  |__------------------ | [___]',
            '  | ________|___H__/__|_____/[][]~\\_______|      ',
            '  |/ |   |-----------I_____I [][] []  D   |======',
            '__/ =| o |=-~~\\  /~~\\  /~~\\  /~~\\ ____Y___________',
            ' |/-=|___|=    ||    ||    ||    |_____/~\\___/   ',
            '  \\_/      \\O=====O=====O=====O_/      \\_/       '
        ];
        const el = print(`<pre class="bt-pre"></pre>`).firstChild;
        if (REDUCED) { el.textContent = train.join('\n'); return; }
        for (let offset = 40; offset >= -50; offset -= 4) {
            el.textContent = train.map(l => offset >= 0 ? ' '.repeat(offset) + l : l.slice(-offset)).join('\n');
            await sleep(70);
        }
        el.remove();
        print(`<span class="t-dim">sl: you meant 'ls', didn't you?</span>`);
    });

    def('home', async () => {
        print(`<span class="t-dim"># going home...</span>`);
        await sleep(600);
        location.href = '/';
    });

    def('open', (arg) => {
        const key = arg.toLowerCase();
        if (OPEN_MAP[key]) {
            print(`<span class="t-dim">${esc(OPEN_MAP[key])}</span>`);
            window.open(OPEN_MAP[key], '_blank');
        } else {
            print(`<span class="t-dim">usage: open &lt;${Object.keys(OPEN_MAP).join('|')}&gt;</span>`);
        }
    });

    def('hint', () => {
        print(`<span class="t-dim">- the konami code does something<br>- secret.txt is worth a read (so is 'ls -la')<br>- some commands aren't listed in 'help'<br>- vim users know how to leave</span>`);
    });

    def('sudo', (arg) => {
        if (arg.startsWith('rm')) return COMMANDS['rm'](arg.replace(/^rm\s*/, ''));
        print(`<span class="t-err">guest is not in the sudoers file.  This incident will be reported.</span>`);
    });

    def('rm', async (arg) => {
        if (arg.includes('--no-preserve-root')) {
            document.body.classList.add('bt-shake');
            setTimeout(() => document.body.classList.remove('bt-shake'), 600);
            print(`<span class="t-err">removing everything... 3... 2... 1...</span>`);
            await sleep(1500);
            print(`<span class="t-acc">just kidding.</span> <span class="t-dim">this site is read-only.</span>`);
        } else if (arg.includes('-rf') && (arg.includes(' /') || arg.trim().endsWith('/') || arg.trim() === '-rf')) {
            print(`<span class="t-err">rm: it is dangerous to operate recursively on '/'</span><br><span class="t-err">rm: use --no-preserve-root to override this failsafe</span>`);
        } else if (!arg) {
            print(`<span class="t-err">rm: missing operand</span>`);
        } else {
            print(`<span class="t-err">rm: cannot remove '${esc(arg.replace(/^-\S+\s*/, '') || '/')}': Permission denied</span>`);
        }
    });

    def('vim|vi', () => print(`<span class="t-warn">vim: opening...</span> <span class="t-dim">good luck exiting. (:q! — as always)</span>`));
    def('emacs', () => print(`<span class="t-err">bash: emacs: command not found</span> <span class="t-dim">(this is a vim household)</span>`));
    def('nano', () => print(`<span class="t-dim">nano: a respectable choice.</span>`));

    def('ping', async (arg) => {
        const host = (arg || 'b4mboo.net').split(/\s+/)[0];
        print(`PING ${esc(host)} (203.0.113.42) 56(84) bytes of data.`);
        if (host.includes('gateway')) {
            await sleep(1800);
            print(`<span class="t-dim">--- ${esc(host)} ping statistics ---</span>`);
            print(`<span class="t-err">3 packets transmitted, 0 received, 100% packet loss, time 2041ms</span>`);
            return;
        }
        for (let i = 1; i <= 3; i++) {
            await sleep(400);
            print(`64 bytes from ${esc(host)} (203.0.113.42): icmp_seq=${i} ttl=57 time=${(4 + Math.random() * 30).toFixed(1)} ms`);
        }
        print(`<span class="t-dim">--- ${esc(host)} ping statistics ---<br>3 packets transmitted, 3 received, 0% packet loss, time 2003ms</span>`);
    });

    def('ssh', () => print(`<span class="t-err">guest@b4mboo.net: Permission denied (publickey).</span>`));
    def('curl|wget', () => print(`<span class="t-err">curl: (7) Failed to connect to b4mboo.net port 443 after 12 ms: Connection refused</span>`));
    def('telnet', () => print(`<span class="t-dim">telnet: connect to address 203.0.113.42: Connection refused (it's not 1995)</span>`));

    def('git', (arg) => {
        const sub = arg.split(/\s+/)[0];
        switch (sub) {
            case 'status':
                print(`On branch main<br>Your branch is up to date with 'origin/main'.<br><br>nothing to commit, working tree clean`);
                break;
            case 'blame':
                print(`<span class="t-dim">it was bamboo. it is always bamboo.</span>`);
                break;
            case 'push':
                print(`Everything up-to-date`);
                break;
            case 'log':
                print(`<span class="t-warn">d177c79</span> donate updateyaken<br><span class="t-warn">6a16327</span> うおっｈｔｔｐｓ<br><span class="t-dim">(these are real commit messages)</span>`);
                break;
            case 'commit':
                print(`<span class="t-dim">nothing added to commit but untracked feelings present</span>`);
                break;
            default:
                print(`<span class="t-dim">usage: git &lt;status|log|blame|push|commit&gt;</span>`);
        }
    });

    def('npm|yarn|pnpm', async () => {
        await sleep(700);
        print(`added 1 package, and audited 2 packages in 842ms`);
        await sleep(300);
        print(`found <span class="t-acc">0</span> vulnerabilities <span class="t-dim">(in this terminal, at least)</span>`);
    });

    def('docker', () => print(`<span class="t-err">Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?</span>`));
    def('make', () => print(`<span class="t-err">make: *** No targets specified and no makefile found.  Stop.</span>`));
    def('kill|killall', () => print(`<span class="t-err">bash: kill: (1) - Operation not permitted</span>`));
    def('whois', () => print(`Domain Name: B4MBOO.NET<br>Registrant: bamboo (programmer / idol otaku)<br><span class="t-dim">Status: intermittently offline (attending live shows)</span>`));

    def('man', (arg) => {
        if (arg === 'man') return print(`<span class="t-dim">man: what manner of man reads man man?</span>`);
        if (!arg) return print(`<span class="t-dim">What manual page do you want?<br>For example, try 'man man'.</span>`);
        print(`<span class="t-err">No manual entry for ${esc(arg)}</span>`);
    });

    def('reboot', async () => {
        print(`<span class="t-warn">reboot: system going down for reboot NOW!</span>`);
        await sleep(1200);
        location.reload();
    });

    def('shutdown|poweroff', () => print(`<span class="t-dim">shutdown: you can't shut down someone else's server. close the tab instead.</span>`));
    def('version|ver', () => printText(VERSION));
    def('credits', () => print(`site: <span class="t-acc">bamboo</span> (@b4mbo_o)<br><span class="t-dim">© 2025 b4mboo.net</span>`));

    /* ---------- vault ----------
     * エントリはキー名の SHA-256 で引き、URL は AES-GCM(PBKDF2) で暗号化済み。
     * 開け方はコマンドではない。失敗は command not found と区別がつかない。
     * エントリ追加/更新: コンソールで await __sealGate('name', 'pass', 'https://...')
     */
    const VAULT = {
        '209373a514be7ee4': 'SG3OYWYYkbhhvQtVvAoahQ3egKxAbpJ16uw3DUoUrs+RftFpWUJMRPi8lLfUnn+ALks+aD5DPMqCEQLL2u6P+AjDrA==',
        'd0d5c1d2feed6b30': 'YbnSPAjgb9K1WBVWXwsk+V9yBJwQw/P/S7V6U14wf15+cE3afgxWjGaHy+5Apn13ZuqIbF0PrInEnp+3C9wxowbS+w==',
        'ef260e9aa3c673af': 'bafVfiIUik8G8ZvQg2zN+8Eauz6+0aH5VUXM/SsOqHxNqQB6V1kRXFaBQuwluOg8pvSTmfRyySX1o+i/BIySTUmc'
    };
    const vEnc = new TextEncoder();
    const vB64 = b64 => Uint8Array.from(atob(b64), c => c.charCodeAt(0));

    async function vaultKeyId(name) {
        const d = await crypto.subtle.digest('SHA-256', vEnc.encode(name));
        return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
    }

    async function vaultDerive(pass, salt, usage) {
        const km = await crypto.subtle.importKey('raw', vEnc.encode(pass), 'PBKDF2', false, ['deriveKey']);
        return crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
            km, { name: 'AES-GCM', length: 256 }, false, [usage]);
    }

    async function tryVault(raw) {
        const sp = raw.indexOf(' ');
        if (sp === -1 || !window.isSecureContext) return false;
        const name = raw.slice(0, sp).toLowerCase();
        const pass = raw.slice(sp + 1).trim();
        if (!pass) return false;
        const blob = VAULT[await vaultKeyId(name)];
        if (!blob) return false;
        try {
            const data = vB64(blob);
            const key = await vaultDerive(pass, data.slice(0, 16), 'decrypt');
            const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: data.slice(16, 28) }, key, data.slice(28));
            window.open(new TextDecoder().decode(pt), '_blank');
            return true;
        } catch (_) {
            return false;
        }
    }

    window.__sealGate = async function (name, pass, url) {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await vaultDerive(pass, salt, 'encrypt');
        const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, vEnc.encode(url)));
        return `'${await vaultKeyId(name)}': '${btoa(String.fromCharCode(...salt, ...iv, ...ct))}'`;
    };

    /* ---------- 実行 ---------- */
    let running = false;
    async function runCommand(raw) {
        echo(raw);
        const sp = raw.indexOf(' ');
        const cmd = (sp === -1 ? raw : raw.slice(0, sp)).toLowerCase();
        const arg = sp === -1 ? '' : raw.slice(sp + 1).trim();
        const fn = COMMANDS[cmd];
        if (!fn) {
            if (!(await tryVault(raw))) {
                print(`<span class="t-err">bash: ${esc(cmd)}: command not found</span>`);
            }
            return;
        }
        if (running) return;
        running = true;
        try { await fn(arg, raw); } finally { running = false; }
    }

    /* ---------- 入力行 ---------- */
    function buildLine() {
        const line = document.createElement('div');
        line.className = 'bt-line';
        line.innerHTML = `<span class="bt-prompt">${esc(PROMPT)}</span><input class="bt-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="terminal input">`;
        const input = line.querySelector('.bt-input');
        input.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
                const cmd = input.value.trim();
                input.value = '';
                if (cmd) {
                    history.push(cmd);
                    hIdx = history.length;
                    runCommand(cmd);
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (hIdx > 0) input.value = history[--hIdx] || '';
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (hIdx < history.length) input.value = history[++hIdx] || '';
            } else if (e.key === 'Escape' && !inline) {
                closeFloat();
            }
        });
        return { line, input };
    }

    /* ---------- フローティング (index 用) ---------- */
    function buildFloat() {
        floatEl = document.createElement('div');
        floatEl.className = 'bt-float';
        floatEl.setAttribute('role', 'dialog');
        floatEl.setAttribute('aria-label', 'Bamboo terminal');
        floatEl.setAttribute('aria-hidden', 'true');
        floatEl.innerHTML = `
            <div class="bt-head">
                <div class="bt-title">
                    <span class="bt-status" aria-hidden="true"></span>
                    <strong>BAMBOO TERM</strong>
                    <span class="bt-context">guest@b4mboo.net:${esc(CWD)}</span>
                </div>
                <div class="bt-controls">
                    <kbd>ESC</kbd>
                    <button class="bt-close" type="button" aria-label="ターミナルを閉じる">×</button>
                </div>
            </div>
            <div class="bt-out"></div>`;
        out = floatEl.querySelector('.bt-out');
        const { line, input } = buildLine();
        floatEl.appendChild(line);
        inputEl = input;
        floatEl.querySelector('.bt-close').addEventListener('click', event => {
            event.stopPropagation();
            closeFloat();
        });
        floatEl.addEventListener('click', () => inputEl.focus());
        document.body.appendChild(floatEl);
        const d = new Date();
        print(`<span class="t-dim">Last login: ${d.toDateString()} ${d.toTimeString().slice(0, 8)} on ttys001</span>`);
        print(`Welcome to <span class="t-acc">BambooOS 5.0 LTS</span> (GNU/Bamboo 6.8.0-otaku x86_64)`);
        print(`<span class="t-dim">Type 'help' for commands. Esc or 'exit' to close.</span>`);
    }

    function openFloat() {
        if (inline) { inputEl && inputEl.focus(); return; }
        if (!floatEl) buildFloat();
        floatEl.classList.add('open');
        floatEl.setAttribute('aria-hidden', 'false');
        setTimeout(() => inputEl.focus(), 100);
    }

    function closeFloat() {
        if (floatEl) {
            floatEl.classList.remove('open');
            floatEl.setAttribute('aria-hidden', 'true');
            if (document.activeElement === inputEl) inputEl.blur();
        }
    }

    /* ---------- インライン (404 用) ---------- */
    function attach(container) {
        inline = true;
        out = container;
        const { line, input } = buildLine();
        container.appendChild(line);
        lineEl = line;
        inputEl = input;
        container.addEventListener('click', () => input.focus());
        print(`<span class="t-dim"># this shell is live. type 'help'.</span>`);
    }

    /* ---------- グローバルキー / コナミコマンド ---------- */
    const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let kIdx = 0;

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { closeFloat(); return; }
        const el = document.activeElement;
        const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
        if (typing) return;

        const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        kIdx = (key === KONAMI[kIdx]) ? kIdx + 1 : (key === KONAMI[0] ? 1 : 0);
        if (kIdx === KONAMI.length) {
            kIdx = 0;
            toast(toggleMatrix() ? 'matrix: on' : 'matrix: off');
        }

        if (e.key === '/') {
            e.preventDefault();
            openFloat();
        }
    });

    /* ---------- export ---------- */
    window.bambooTerm = { open: openFloat, close: closeFloat, run: runCommand, attach, toggleMatrix, toast };
})();
