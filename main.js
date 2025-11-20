document.addEventListener('DOMContentLoaded', () => {
    
    /* --- 1. テーマ切り替え (Robust Switch) --- */
    const themeBtn = document.getElementById('theme-toggle');
    
    // localStorageから読み込み。未設定ならHTMLの初期値(dark)に従う
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.body.setAttribute('data-theme', savedTheme);
    }

    themeBtn.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme');
        
        if (currentTheme === 'light') {
            // Switch to Dark
            document.body.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            // Switch to Light
            document.body.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        }
    });


    /* --- 2. カスタムカーソル --- */
    const cursorDot = document.getElementById('cursor-dot');
    const cursorOutline = document.getElementById('cursor-outline');

    if (window.matchMedia("(pointer: fine)").matches) {
        window.addEventListener('mousemove', (e) => {
            const posX = e.clientX;
            const posY = e.clientY;
            cursorDot.style.left = `${posX}px`;
            cursorDot.style.top = `${posY}px`;
            cursorOutline.animate({ left: `${posX}px`, top: `${posY}px` }, { duration: 500, fill: "forwards" });
        });

        const interactiveElements = document.querySelectorAll('a, .card, button');
        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursorOutline.style.transform = "translate(-50%, -50%) scale(1.5)";
                cursorOutline.style.backgroundColor = "var(--bamboo-glow)";
                cursorOutline.style.borderColor = "transparent";
            });
            el.addEventListener('mouseleave', () => {
                cursorOutline.style.transform = "translate(-50%, -50%) scale(1)";
                cursorOutline.style.backgroundColor = "transparent";
                cursorOutline.style.borderColor = "var(--bamboo-green)";
            });
        });
    }

    /* --- 3. 3Dカードチルト --- */
    const cards = document.querySelectorAll('.link-card');
    cards.forEach(card => {
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