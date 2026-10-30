const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const mint = (url.searchParams.get("mint") || "").trim();

  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) {
    return json({ error: "Invalid Solana mint address" }, 400);
  }

  const fetchSafe = async (endpoint) => {
    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        return { ok: false, status: response.status };
      }
      return { ok: true, data: await response.json() };
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  };

  const [marketResult, rugResult] = await Promise.all([
    fetchSafe(
      `https://api.dexscreener.com/token-pairs/v1/solana/${mint}`
    ),
    fetchSafe(
      `https://api.rugcheck.xyz/v1/tokens/${mint}/report`
    )
  ]);

  const pairs =
    marketResult.ok && Array.isArray(marketResult.data)
      ? marketResult.data
      : [];

  pairs.sort(
    (a, b) =>
      (b.liquidity?.usd || 0) -
      (a.liquidity?.usd || 0)
  );

  const market = pairs[0] || null;
  const rugcheck = rugResult.ok ? rugResult.data : null;

  if (!market && !rugcheck) {
    return json({
      error: "No data returned by DexScreener or RugCheck"
    }, 502);
  }

  return json({
    mint,
    market,
    rugcheck,
    sources: {
      dexscreener: marketResult.ok ? "ok" : "unavailable",
      rugcheck: rugResult.ok ? "ok" : "unavailable",
      retrievedAt: new Date().toISOString()
    }
  });
}
