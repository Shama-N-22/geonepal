// Second real news source, used only as a fallback when GDELT (api/gdelt-news.js)
// returns zero results. Google News RSS requires no API key, but like GDELT it's
// safest fetched server-side rather than directly from the browser.
// Best-effort real image extraction from the actual publisher page (og:image /
// twitter:image meta tags) — done server-side to dodge browser CORS, capped
// with a short timeout so one slow site can't hang the whole request.
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
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=NP&ceid=NP:en`;

  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error('Google News RSS responded with status ' + r.status);
    const xml = await r.text();

    // Lightweight regex-based RSS parsing — avoids adding an XML-parser
    // dependency for a fairly regular, well-formed feed structure.
    const items = [];
    const blocks = xml.split('<item>').slice(1, 61);
    for (const block of blocks) {
      const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
      const pubDateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      const sourceMatch = block.match(/<source url="([^"]*)">([\s\S]*?)<\/source>/);
      if (!titleMatch || !linkMatch) continue;
      items.push({
        title: titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim(),
        link: linkMatch[1].trim(),
        pubDate: pubDateMatch ? pubDateMatch[1].trim() : null,
        source: sourceMatch ? sourceMatch[2].trim() : null
      });
    }

    // Only the first 20 get real-image extraction (bounded time budget) —
    // never fabricate an image for the rest, they just have none.
    const toEnrich = items.slice(0, 20);
    const rest = items.slice(20).map(it => ({ ...it, image: null }));
    const enriched = await Promise.all(toEnrich.map(async (it) => {
      const image = await extractOgImage(it.link);
      return { ...it, image };
    }));
    const finalItems = [...enriched, ...rest];

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    res.status(200).json({ items: finalItems });
  } catch (e) {
    res.status(502).json({ error: 'google news rss fetch failed', message: String(e) });
  }
}