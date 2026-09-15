// ==========================================================================
// storage.js - ローカル保存(自己ベスト・累計統計・実績解除状況)
// ==========================================================================

const Storage = (() => {
  const KEY = "stackdeluxe_v1";
  const PLAYER_ID_KEY = "stackdeluxe_player_id";
  const NAME_KEY = "stackdeluxe_name";

  function defaultStats() {
    return {
      bestScore: 0,
      totalGames: 0,
      totalBlocks: 0,
      totalPerfects: 0,
      bestStreak: 0,
      noPerfectHighScore: 0,
      allPerfectHighScore: 0,
      unlocked: [],
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultStats();
      const parsed = JSON.parse(raw);
      return Object.assign(defaultStats(), parsed);
    } catch (e) {
      return defaultStats();
    }
  }

  function save(stats) {
    try {
      localStorage.setItem(KEY, JSON.stringify(stats));
    } catch (e) {
      /* 保存できない環境は無視 */
    }
  }

  function getPlayerId() {
    try {
      let id = localStorage.getItem(PLAYER_ID_KEY);
      if (!id) {
        id = "p_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
        localStorage.setItem(PLAYER_ID_KEY, id);
      }
      return id;
    } catch (e) {
      return "p_temp_" + Math.random().toString(36).slice(2, 10);
    }
  }

  function getName() {
    try { return localStorage.getItem(NAME_KEY) || ""; } catch (e) { return ""; }
  }
  function setName(name) {
    try { localStorage.setItem(NAME_KEY, name); } catch (e) { /* ignore */ }
  }

  return { load, save, getPlayerId, getName, setName };
})();
