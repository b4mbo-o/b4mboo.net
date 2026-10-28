# b4mboo.net

![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)

**My Personal Portfolio / Digital Hub** Web Engineer / Digital Creator / Idol Otaku

> **Concept:** Dark Tech Zen (Modern Organic × Cyber Bamboo)

## 🎍 Overview
**b4mboo.net** は、私の制作物やツールを集約したポートフォリオサイトです。
「和（竹）」の静けさと、現代的なWebデザイン（Tech）を融合させた **"Dark Tech Zen"** をテーマに構築しています。

フレームワークを使用せず、軽量かつ高速な Vanilla HTML/CSS/JS で構成されており、メンテナンス性とパフォーマンスを重視しています。

## ✨ Features

- **Design**:
  - 漆黒の背景に浮かぶ「竹」のシルエットとネオングリーンのアクセント。
  - マウス操作に追従するカスタムカーソルと、3Dチルトエフェクト付きのカードUI。
  - **Dark / Light Mode Switcher**: 気分に合わせてテーマを切り替え可能（設定はローカルストレージに保存）。

- **Security Gate**:
  - 特定のプライベートツール（eSIM, povo, Dev）へのアクセスを制限。
  - 簡易的なパスワード認証ゲート機能をJavaScriptで実装（平文保存による軽量実装）。

- **Responsive**:
  - PC、タブレット、スマートフォン、あらゆるデバイスで最適化されたレイアウト。

## 📂 File Structure

```text
b4mboo.net/
├── index.html  # Main structure & Content
├── style.css   # Styling (Variables, Dark/Light themes, Animations)
├── main.js     # Logic (Theme toggle, Password gate, Interactions)
└── README.md   # Documentation
```

## 🚀 Deployment

### Donate mining

`donate.html` supports opt-in CPU mining via CoinIMP and GPU mining of Quantus
(QTC) via WebGPU. `donate.js` contains the public payout address and pool URL.
No wallet secret or private API key is used. Changing modes requires fresh
consent. Stop, revoking consent, hiding the tab and leaving the page terminate
mining, including during initialization. GPU errors stop mining without
automatically starting the CPU engine.

GPU mode needs HTTPS (localhost also works) and a working WebGPU adapter.
The work-time slider inserts pauses between dispatches; it is not a hardware
utilization or power limit. GPU initialization checks a known-answer vector and
each found share is independently verified before submission. Displayed GPU
hash counts are lower bounds because an early-exit dispatch does not expose
its exact hash count. Accepted shares are reported only after pool confirmation.
Pool availability, accepted shares, payout and earnings depend on the third-party
pool and have not been verified by a live mining run. An upgrade-only WebSocket
check accepted `Origin: https://b4mboo.net` (HTTP 101); no mining handshake or
payout address was sent. Local browser checks cover desktop/mobile layouts and
the real WebGPU worker with a software adapter against a mocked pool.

The unmodified shader in `assets/quantus/mining.wgsl` and the constants/reference
algorithm in `quantus-pow.js` come from
[Quantus-Network/quantus-miner](https://github.com/Quantus-Network/quantus-miner/tree/8e2d27219c93567fca67bf049f52882f6c87df35)
(Apache-2.0, license in `assets/quantus/LICENSE`). The browser worker and pool
controller are implemented locally; the pool website's scripts are not copied.

Offline validation: `node --test tests/*.test.mjs` and
`node --check donate.js`, `node --check quantus-gpu-worker.js`,
`node --check quantus-pow.js`, `node --check main.js`.

このプロジェクトは静的なWebサイトです。
NginxやApacheなどのWebサーバーのドキュメントルート（例: `/var/www/html/`）にファイルを配置するだけで動作します。

```bash
# Example: Deploy to Nginx
sudo cp -r * /var/www/html/
```

## 👤 Author

**b4mboo**

- Twitter: [@b4mbo_o](https://twitter.com/b4mbo_o)
- Instagram: [@b4mbo._.o](https://instagram.com/b4mbo._.o)
- GitHub: [@b4mbo-o](https://github.com/b4mbo-o)

---
&copy; 2025 b4mboo.net
