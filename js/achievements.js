// ==========================================================================
// achievements.js - 実績定義(40種類以上)
// 各実績: { id, category, name, desc, icon, check(stats)->bool, progress(stats)->[cur,max] }
// ==========================================================================

function generateAchievements() {
  const list = [];
  const add = (a) => list.push(a);

  // --- 高さ(自己ベスト段数) ---
  const heightMilestones = [5, 10, 15, 20, 30, 40, 50, 75, 100, 150, 200, 300, 500];
  heightMilestones.forEach((v) => {
    add({
      id: `height_${v}`,
      category: "高さ",
      name: `${v}段タワー`,
      desc: `1ゲームで${v}段まで積み上げる`,
      icon: "🏗️",
      check: (s) => s.bestScore >= v,
      progress: (s) => [Math.min(s.bestScore, v), v],
    });
  });

  // --- 累計積んだ段数 ---
  const totalBlockMilestones = [50, 100, 500, 1000, 5000, 10000, 50000, 100000];
  totalBlockMilestones.forEach((v) => {
    add({
      id: `total_${v}`,
      category: "累計ブロック数",
      name: `累計${v.toLocaleString()}段`,
      desc: `全ゲーム合計で${v.toLocaleString()}段積み上げる`,
      icon: "📦",
      check: (s) => s.totalBlocks >= v,
      progress: (s) => [Math.min(s.totalBlocks, v), v],
    });
  });

  // --- パーフェクト累計回数 ---
  const perfectMilestones = [1, 10, 50, 100, 500, 1000, 5000];
  perfectMilestones.forEach((v) => {
    add({
      id: `perfect_${v}`,
      category: "パーフェクト",
      name: `パーフェクト${v.toLocaleString()}回`,
      desc: `累計で${v.toLocaleString()}回ぴったり重ねる`,
      icon: "✨",
      check: (s) => s.totalPerfects >= v,
      progress: (s) => [Math.min(s.totalPerfects, v), v],
    });
  });

  // --- 1ゲーム内の連続パーフェクト ---
  const streakMilestones = [3, 5, 10, 20, 30, 50];
  streakMilestones.forEach((v) => {
    add({
      id: `streak_${v}`,
      category: "連続パーフェクト",
      name: `${v}連続パーフェクト`,
      desc: `1ゲーム中に${v}回連続でぴったり重ねる`,
      icon: "🔥",
      check: (s) => s.bestStreak >= v,
      progress: (s) => [Math.min(s.bestStreak, v), v],
    });
  });

  // --- プレイ回数 ---
  const playMilestones = [1, 10, 50, 100, 250, 500, 1000];
  playMilestones.forEach((v) => {
    add({
      id: `games_${v}`,
      category: "プレイ回数",
      name: `プレイ${v.toLocaleString()}回`,
      desc: `累計で${v.toLocaleString()}回プレイする`,
      icon: "🎮",
      check: (s) => s.totalGames >= v,
      progress: (s) => [Math.min(s.totalGames, v), v],
    });
  });

  // --- ネタ / 特殊実績 ---
  const noPerfectMilestones = [10, 20, 30];
  noPerfectMilestones.forEach((v) => {
    add({
      id: `noperfect_${v}`,
      category: "特殊",
      name: `勘だけで${v}段`,
      desc: `パーフェクトを1回も出さずに${v}段まで積み上げる`,
      icon: "🎲",
      check: (s) => s.noPerfectHighScore >= v,
      progress: (s) => [Math.min(s.noPerfectHighScore, v), v],
    });
  });

  const allPerfectMilestones = [5, 10, 20];
  allPerfectMilestones.forEach((v) => {
    add({
      id: `allperfect_${v}`,
      category: "特殊",
      name: `完全一致${v}段`,
      desc: `1ゲームで${v}段すべてパーフェクトで積み上げる`,
      icon: "💎",
      check: (s) => s.allPerfectHighScore >= v,
      progress: (s) => [Math.min(s.allPerfectHighScore, v), v],
    });
  });

  add({
    id: "special_first_game",
    category: "特殊",
    name: "はじめの一歩",
    desc: "初めてタワーを崩す",
    icon: "🚩",
    check: (s) => s.totalGames >= 1,
    progress: (s) => [Math.min(s.totalGames, 1), 1],
  });

  return list;
}

const ACHIEVEMENTS = generateAchievements();

// 実績チェック: 新たに解除された実績の配列を返す
function checkNewAchievements(stats) {
  const unlocked = new Set(stats.unlocked);
  const newly = [];
  for (const a of ACHIEVEMENTS) {
    if (unlocked.has(a.id)) continue;
    if (a.check(stats)) {
      unlocked.add(a.id);
      newly.push(a);
    }
  }
  stats.unlocked = Array.from(unlocked);
  return newly;
}
