document.addEventListener('DOMContentLoaded', () => {

    /* --- 1. テーマ切り替え --- */
    const themeBtn = document.getElementById('theme-toggle');
    const setTheme = (nextTheme) => {
        document.body.setAttribute('data-theme', nextTheme);
        localStorage.setItem('theme', nextTheme);
        if (themeBtn) themeBtn.setAttribute('aria-pressed', nextTheme === 'dark' ? 'true' : 'false');
    };

    const savedTheme = localStorage.getItem('theme');
    const initialTheme = savedTheme || document.body.getAttribute('data-theme') || 'dark';
    setTheme(initialTheme);

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const currentTheme = document.body.getAttribute('data-theme');
            const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
            setTheme(nextTheme);
        });
    }

    /* --- 2. Blog Feed Fetcher --- */
    fetchNotes();

    /* --- 3. スクロール演出 --- */
    setupScrollSpy();
    setupCardReveal();
    setupTabTitle();
    printConsoleArt();
});


/* --- Notes (Blog) Fetcher Logic --- */
async function fetchNotes() {
    const container = document.getElementById('notes-container');
    if (!container) return;

    // ★設定: ブログのRSSフィードURL
    // notes.b4mboo.net で生成したフィードを参照します
    // Astroのビルドで生成されるRSSは feed.xml なので明示的に参照する
    const BLOG_RSS_URL = 'https://notes.b4mboo.net/feed.xml';

    try {
        const response = await fetch(BLOG_RSS_URL, { headers: { 'Accept': 'application/xml' } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const xmlText = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, 'application/xml');
        const items = Array.from(doc.querySelectorAll('item'));

        if (items.length === 0) throw new Error('No items found in feed');

        container.innerHTML = ''; // Loading表示を消す

        items.slice(0, 3).forEach(item => {
            const title = item.querySelector('title')?.textContent || 'No title';
            const link = item.querySelector('link')?.textContent || '#';
            const pubDate = item.querySelector('pubDate')?.textContent || '';
            const date = pubDate ? new Date(pubDate).toLocaleDateString('ja-JP') : '';

            const cardHTML = `
                <a href="${link}" target="_blank" class="card link-card">
                    <div class="card-top">
                        <span class="service-name" style="font-size: 1rem;">${title}</span>
                        <span class="status-dot"></span>
                    </div>
                    <p class="service-desc" style="margin-top: 10px;">${date}</p>
                    <div class="card-footer">notes.b4mboo.net</div>
                </a>
            `;
            container.innerHTML += cardHTML;
        });

    } catch (error) {
        console.log("Blog fetch failed (maybe blog is not ready yet):", error);
        // エラー時は「Coming Soon」のままにしておくか、メッセージを変える
        container.innerHTML = `
            <div class="card" style="align-items: center; justify-content: center; opacity: 0.6; border-style: dashed;">
                <p style="color: var(--text-sub); font-family: monospace;">// Notes Coming Soon...</p>
            </div>
        `;
    }
}

/* ============================================================
   ✨ スクロール演出 & 小ネタ (ターミナル関連は terminal.js 側)
   ============================================================ */

/* --- Scrollspy: 現在地をナビに反映 --- */
function setupScrollSpy() {
    const links = new Map();
    document.querySelectorAll('.nav-link[href^="#"]').forEach(a => {
        links.set(a.getAttribute('href').slice(1), a);
    });
    if (links.size === 0 || !('IntersectionObserver' in window)) return;

    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            links.forEach(a => a.classList.remove('active'));
            const link = links.get(entry.target.id);
            if (link) link.classList.add('active');
        });
    }, { rootMargin: '-30% 0px -60% 0px' });

    document.querySelectorAll('.content-section[id]').forEach(sec => io.observe(sec));
}

/* --- カードのスクロール出現 (段差付き) --- */
function setupCardReveal() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;
    const cards = document.querySelectorAll('.grid-wrapper .card');
    cards.forEach(c => c.classList.add('reveal-pending'));

    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const card = entry.target;
            const siblings = Array.from(card.parentElement.children);
            const idx = siblings.indexOf(card);
            card.style.animationDelay = `${Math.min(idx, 6) * 70}ms`;
            card.classList.remove('reveal-pending');
            card.classList.add('reveal-in');
            io.unobserve(card);
        });
    }, { threshold: 0.15 });

    cards.forEach(c => io.observe(c));
}

/* --- タブを離れたら寝る --- */
function setupTabTitle() {
    const original = document.title;
    document.addEventListener('visibilitychange', () => {
        document.title = document.hidden ? '( ˘ω˘ ) ｽﾔｧ… | b4mboo.net' : original;
    });
}

/* --- Console Art --- */
function printConsoleArt() {
    console.log('%c🎋 b4mboo.net', 'color:#7abf75; font-size:24px; font-weight:bold; text-shadow:0 0 10px rgba(122,191,117,.5);');
    console.log('%cようこそ、DevToolsを開くタイプのきっしょいおたくくん', 'color:#888; font-size:12px;');
    console.log('%c裏コマンド: 「/」キーでターミナル起動 → help で一覧', 'color:#7abf75; font-size:12px;');
}
