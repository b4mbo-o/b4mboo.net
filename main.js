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

    // ★設定: ここにブログのRSSフィードURLを入れる
    // 例: WordPressなら 'https://note.b4mboo.net/feed'
    // 例: Zennなら 'https://zenn.dev/b4mboo/feed'
    // 今はダミーURLにしているので、ブログを作ったら書き換えてください
    const BLOG_RSS_URL = 'https://note.b4mboo.net/feed'; 

    // RSS to JSON Converter (CORS回避のため rss2json.com を利用)
    const API_ENDPOINT = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(BLOG_RSS_URL)}`;

    try {
        const response = await fetch(API_ENDPOINT);
        const data = await response.json();

        if (data.status === 'ok' && data.items.length > 0) {
            container.innerHTML = ''; // Loading表示を消す

            // 最新3件を表示
            data.items.slice(0, 3).forEach(item => {
                // 日付の整形
                const date = new Date(item.pubDate).toLocaleDateString('ja-JP');
                
                // カードHTMLの生成
                const cardHTML = `
                    <a href="${item.link}" target="_blank" class="card link-card">
                        <div class="card-top">
                            <span class="service-name" style="font-size: 1rem;">${item.title}</span>
                            <span class="status-dot"></span>
                        </div>
                        <p class="service-desc" style="margin-top: 10px;">${date}</p>
                        <div class="card-footer">note.b4mboo.net</div>
                    </a>
                `;
                container.innerHTML += cardHTML;
            });
            
            // 新しく挿入したカードにもエフェクトを付与
            applyCardTilt();
        } else {
            // 記事がない、または取得エラーの場合（まだブログがない時など）
            throw new Error('No items found');
        }
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
