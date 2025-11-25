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

    // カスタムカーソルは削除しました

    /* --- 2. 3Dカードチルト --- */
    applyCardTilt();

    /* --- 5. Blog Feed Fetcher (New!) --- */
    fetchNotes();
});


/* --- 4. Bamboo Gate (パスワード機能) --- */
const secretMap = {
    'esim': 'https://esim.b4mboo.net',
    'povo': 'https://povo.b4mboo.net',
    'dev':  'https://dev.b4mboo.net'
};

const GATE_PASS = "bamboo"; 

let currentTarget = null;
const modal = document.getElementById('gate-modal');
const passInput = document.getElementById('gate-pass');

function openGate(targetKey) {
    currentTarget = targetKey;
    modal.classList.add('active');
    passInput.value = '';
    setTimeout(() => passInput.focus(), 100);
}

function closeGate() {
    modal.classList.remove('active');
    currentTarget = null;
}

function checkGate() {
    if (passInput.value === GATE_PASS) {
        const url = secretMap[currentTarget];
        if (url) {
            window.open(url, '_blank');
            closeGate();
        }
    } else {
        passInput.style.borderColor = '#ff6b6b';
        passInput.animate([
            { transform: 'translateX(0)' }, { transform: 'translateX(-8px)' },
            { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }
        ], { duration: 200 });
        setTimeout(() => passInput.style.borderColor = 'var(--card-border)', 800);
    }
}

passInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkGate();
});


/* --- Utility: カードのチルト効果を付与 --- */
function applyCardTilt() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    document.querySelectorAll('.link-card').forEach(card => {
        if (card.dataset.tiltBound === '1') return;
        card.dataset.tiltBound = '1';

        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -4;
            const rotateY = ((x - centerX) / centerX) * 4;
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
        });
    });
}

/* --- 5. Notes (Blog) Fetcher Logic --- */
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

        // 新しく挿入したカードにもエフェクトを付与
        applyCardTilt();
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
