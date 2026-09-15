// ==========================================================================
// ui.js - 画面遷移・入力・実績/ランキング表示の結線
// ==========================================================================

(() => {
  const $ = (id) => document.getElementById(id);

  const el = {
    canvas: $("gameCanvas"),
    hud: $("hud"),
    score: $("score"),
    bestScore: $("bestScore"),
    perfectText: $("perfectText"),
    startScreen: $("startScreen"),
    startBest: $("startBest"),
    startBtn: $("startBtn"),
    gameOverScreen: $("gameOverScreen"),
    newBestLabel: $("newBestLabel"),
    resultScore: $("resultScore"),
    resultPerfects: $("resultPerfects"),
    achToastArea: $("achToastArea"),
    submitRankBox: $("submitRankBox"),
    nameInput: $("nameInput"),
    submitRankBtn: $("submitRankBtn"),
    submitStatus: $("submitStatus"),
    retryBtn: $("retryBtn"),
    homeBtn: $("homeBtn"),
    achievementsPanel: $("achievementsPanel"),
    achList: $("achList"),
    achProgress: $("achProgress"),
    rankingPanel: $("rankingPanel"),
    rankList: $("rankList"),
  };

  let stats = Storage.load();
  let lastGameNewBest = false;

  function updateBestDisplays() {
    el.bestScore.textContent = stats.bestScore;
    el.startBest.textContent = stats.bestScore;
  }

  function showScreen(name) {
    el.startScreen.classList.toggle("hidden", name !== "start");
    el.gameOverScreen.classList.toggle("hidden", name !== "gameover");
    el.hud.classList.toggle("hidden", name !== "play");
  }

  const JUDGE_LABEL = { perfect: "PERFECT!", fast: "FAST", late: "LATE" };

  function flashJudge(type) {
    el.perfectText.textContent = JUDGE_LABEL[type] || "";
    el.perfectText.classList.remove("judge-perfect", "judge-fast", "judge-late");
    el.perfectText.classList.add(`judge-${type}`);
    el.perfectText.classList.remove("hidden");
    el.perfectText.style.animation = "none";
    // 強制リフロー後に再度アニメーションを付け直す
    void el.perfectText.offsetWidth;
    el.perfectText.style.animation = "";
    clearTimeout(flashJudge._t);
    flashJudge._t = setTimeout(() => el.perfectText.classList.add("hidden"), 600);
  }

  function startGame() {
    showScreen("play");
    el.score.textContent = "0";
    Game.reset();
  }

  function renderAchievementToasts(newly) {
    el.achToastArea.innerHTML = "";
    if (!newly.length) return;
    for (const a of newly) {
      const div = document.createElement("div");
      div.className = "achToastItem";
      div.innerHTML = `<div class="icon">${a.icon}</div><div><div class="name">実績解除: ${a.name}</div><div class="desc">${a.desc}</div></div>`;
      el.achToastArea.appendChild(div);
    }
  }

  function handleGameOver(result) {
    stats.totalGames++;
    stats.totalBlocks += result.score;
    stats.totalPerfects += result.perfects;
    stats.bestStreak = Math.max(stats.bestStreak, result.maxStreak);
    if (result.perfects === 0) {
      stats.noPerfectHighScore = Math.max(stats.noPerfectHighScore, result.score);
    }
    if (result.perfects === result.score && result.score > 0) {
      stats.allPerfectHighScore = Math.max(stats.allPerfectHighScore, result.score);
    }
    lastGameNewBest = result.score > stats.bestScore;
    if (lastGameNewBest) stats.bestScore = result.score;

    const newly = checkNewAchievements(stats);
    Storage.save(stats);
    updateBestDisplays();

    el.resultScore.textContent = result.score;
    el.resultPerfects.textContent = result.perfects;
    el.newBestLabel.classList.toggle("hidden", !lastGameNewBest);
    renderAchievementToasts(newly);

    el.submitRankBox.classList.remove("hidden");
    el.nameInput.value = Storage.getName();
    el.submitStatus.textContent = "";

    showScreen("gameover");
  }

  Game.callbacks.onScore = (score) => { el.score.textContent = score; };
  Game.callbacks.onJudge = flashJudge;
  Game.callbacks.onGameOver = handleGameOver;

  // ===== 入力 =====
  function tryPlace() {
    if (el.hud.classList.contains("hidden")) return;
    Game.placeBlock();
  }
  el.canvas.addEventListener("pointerdown", tryPlace);
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      tryPlace();
    }
  });

  // ===== 画面ボタン =====
  el.startBtn.addEventListener("click", startGame);
  el.retryBtn.addEventListener("click", startGame);
  el.homeBtn.addEventListener("click", () => showScreen("start"));

  $("openAchievementsBtn").addEventListener("click", () => openAchievements());
  $("openAchievementsBtn2").addEventListener("click", () => openAchievements());
  $("openRankingBtn").addEventListener("click", () => openRanking());
  $("openRankingBtn2").addEventListener("click", () => openRanking());

  document.querySelectorAll(".closeBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      $(btn.dataset.close).classList.add("hidden");
    });
  });

  // ===== 実績パネル =====
  function openAchievements() {
    const unlocked = new Set(stats.unlocked);
    el.achProgress.textContent = `${unlocked.size} / ${ACHIEVEMENTS.length}`;
    el.achList.innerHTML = "";
    let lastCategory = null;
    for (const a of ACHIEVEMENTS) {
      if (a.category !== lastCategory) {
        lastCategory = a.category;
        const h = document.createElement("div");
        h.className = "achCategory";
        h.textContent = a.category;
        el.achList.appendChild(h);
      }
      const isUnlocked = unlocked.has(a.id);
      const [cur, max] = a.progress(stats);
      const pct = Math.min(100, Math.round((cur / max) * 100));
      const item = document.createElement("div");
      item.className = "achItem " + (isUnlocked ? "unlocked" : "locked");
      item.innerHTML = `
        <div class="icon">${isUnlocked ? a.icon : "🔒"}</div>
        <div class="body">
          <div class="name">${a.name}</div>
          <div class="desc">${a.desc}</div>
          ${isUnlocked ? "" : `
            <div class="prog">${cur.toLocaleString()} / ${max.toLocaleString()}</div>
            <div class="achBarTrack"><div class="achBarFill" style="width:${pct}%"></div></div>
          `}
        </div>`;
      el.achList.appendChild(item);
    }
    el.achievementsPanel.classList.remove("hidden");
  }

  // ===== ランキングパネル =====
  async function openRanking() {
    el.rankingPanel.classList.remove("hidden");
    el.rankList.innerHTML = '<div class="rankLoading">読み込み中...</div>';
    try {
      const rows = await Ranking.fetchTop(50);
      if (!rows.length) {
        el.rankList.innerHTML = '<div class="rankEmpty">まだ誰も登録していません</div>';
        return;
      }
      const myId = Storage.getPlayerId();
      el.rankList.innerHTML = "";
      rows.forEach((row, i) => {
        const rank = i + 1;
        const div = document.createElement("div");
        div.className = "rankRow " + (rank <= 3 ? `top${rank}` : "");
        div.innerHTML = `
          <div class="rank">${rank}</div>
          <div class="rname">${escapeHtml(row.name || "名無し")}</div>
          <div class="rscore">${row.best_score}</div>`;
        el.rankList.appendChild(div);
      });
    } catch (e) {
      el.rankList.innerHTML = '<div class="rankEmpty">読み込みに失敗しました</div>';
      console.warn(e);
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  el.submitRankBtn.addEventListener("click", async () => {
    const name = el.nameInput.value.trim().slice(0, 12) || "名無し";
    Storage.setName(name);
    el.submitStatus.textContent = "送信中...";
    try {
      await Ranking.submit(Storage.getPlayerId(), name, stats.bestScore, stats.totalGames);
      el.submitStatus.textContent = "送信しました！";
    } catch (e) {
      el.submitStatus.textContent = "送信に失敗しました";
      console.warn(e);
    }
  });

  // ===== 初期化 =====
  Game.init(el.canvas);
  updateBestDisplays();
  showScreen("start");
})();
