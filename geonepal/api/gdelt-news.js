// Vercel serverless function — runs on Vercel's servers, not in the browser.
// GDELT's API appears to lack CORS headers, so a direct browser fetch fails
// with "Failed to fetch" no matter how correct the query is. Server-to-server
// requests aren't subject to browser CORS, so this relay fixes that cleanly
// without needing any API key.
// Best-effort real image extraction from the actual publisher page — same
// approach as api/google-news.js. Only used when GDELT itself didn't already
// supply a socialimage for that article.
async function extractOgImage(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const r = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GeoNepalBot/1.0)' }
    });
    clearTimeout(timeout);
    if (!r.ok) return null;
    const html = await r.text();
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
    return match ? match[1] : null;
  } catch (e) {
    return null;
  }
}

export default async function handler(req, res) {
  const { type } = req.query;
  if (!type || !['flood', 'earthquake', 'landslide'].includes(type)) {
    res.status(400).json({ error: 'invalid or missing type' });
    return;
  }

  const q = `${type} Nepal`;
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(q)}&mode=artlist&maxrecords=250&format=json&sort=hybridrel&startdatetime=20200101000000&enddatetime=20261231235959`;

  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error('GDELT responded with status ' + r.status);
    const data = await r.json();

    // GDELT often omits socialimage — try real extraction for the first 15
    // articles missing one, rather than leaving them all blank.
    const articles = data.articles || [];
    const missingImage = articles.filter(a => !a.socialimage && a.url).slice(0, 15);
    const enriched = await Promise.all(missingImage.map(async (a) => ({
      url: a.url,
      image: await extractOgImage(a.url)
    })));
    const imageMap = new Map(enriched.map(x => [x.url, x.image]));
    data.articles = articles.map(a => ({
      ...a,
      socialimage: a.socialimage || imageMap.get(a.url) || null
    }));

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    res.status(200).json(data);
  } catch (e) {
    res.status(502).json({ error: 'gdelt fetch failed', message: String(e) });
  }
}