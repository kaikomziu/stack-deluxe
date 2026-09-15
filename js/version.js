// ==========================================================================
// version.js - バージョン表示・更新履歴(新しい順)
// ==========================================================================

const VERSION = "1.1.0";

const CHANGELOG = [
  {
    version: "1.1.0",
    date: "2026-09-16",
    notes: [
      "ブロックを置くタイミングの判定表示を追加(PERFECTに加えてFAST/LATEを表示)",
      "早すぎた場合は水色の「FAST」、遅すぎた場合は赤色の「LATE」で表示",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-09-15",
    notes: [
      "初回リリース",
      "動くブロックをクリック/タップ/スペースキーで積み上げるStack系タワーゲーム",
      "ぴったり重ねるとPERFECT判定、積むごとに虹色にグラデーション",
      "実績48種類を実装(高さ・累計ブロック数・パーフェクト・連続パーフェクト・プレイ回数・特殊)",
      "世界共有のオンラインランキングに対応",
    ],
  },
];

function renderVersionFooter() {
  const el = document.getElementById("versionText");
  if (el) el.textContent = `v${VERSION}`;
}

function renderChangelogList() {
  return CHANGELOG.map((entry) => `
    <div class="changelog-entry">
      <div class="changelog-head">
        <span class="changelog-ver">v${entry.version}</span>
        <span class="changelog-date">${entry.date}</span>
      </div>
      <ul>${entry.notes.map((n) => `<li>${n}</li>`).join("")}</ul>
    </div>
  `).join("");
}
