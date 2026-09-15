// ==========================================================================
// ranking.js - 世界ランキング(Supabase)
// ==========================================================================

const Ranking = (() => {
  const SUPABASE_URL = "https://kifnzvktwbomxthzvvgy.supabase.co";
  // 同プロジェクトで書き込みに使われている従来形式(JWT)のanon key。
  // 新形式のpublishable keyはINSERTが403で弾かれるため使わない。
  const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZm56dmt0d2JvbXh0aHp2dmd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MzgxMzgsImV4cCI6MjA5MzQxNDEzOH0.M7nXP-u--6J_6rRpgz1cJj21_7KX6MtfTmZy77Xf_IE";
  const TABLE = "stackdeluxe_scores";
  let client = null;

  function sb() {
    if (client) return client;
    if (!window.supabase || !window.supabase.createClient) return null;
    // kaikomziu.github.io は全ゲーム共通オリジン(localStorage共有)。
    // 他ゲームのSupabaseログインセッションを拾って authenticated ロールで
    // 送信してしまわないよう、認証状態を一切持たせない。
    client = window.supabase.createClient(SUPABASE_URL, KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: "Bearer " + KEY } },
    });
    return client;
  }

  async function fetchTop(limit = 50) {
    const c = sb();
    if (!c) throw new Error("接続できませんでした");
    const { data, error } = await c
      .from(TABLE)
      .select("name,best_score,total_games")
      .order("best_score", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  }

  async function estimateRank(score) {
    const c = sb();
    if (!c) return null;
    const { count, error } = await c
      .from(TABLE)
      .select("id", { count: "exact", head: true })
      .gt("best_score", score);
    if (error) return null;
    return (count || 0) + 1;
  }

  async function submit(id, name, bestScore, totalGames) {
    const c = sb();
    if (!c) throw new Error("接続できませんでした");
    const cleanName = String(name || "").trim().slice(0, 12) || "名無し";
    if (!(bestScore >= 0) || !isFinite(bestScore)) throw new Error("不正なスコアです");
    const row = {
      id,
      name: cleanName,
      best_score: Math.max(0, Math.floor(bestScore)),
      total_games: Math.max(0, Math.floor(totalGames || 0)),
      updated_at: new Date().toISOString(),
    };
    const { error } = await c.from(TABLE).upsert(row, { onConflict: "id" });
    if (error) throw error;
  }

  return { fetchTop, estimateRank, submit };
})();
