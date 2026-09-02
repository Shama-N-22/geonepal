// Second real news source, used only as a fallback when GDELT (api/gdelt-news.js)
// returns zero results. Google News RSS requires no API key, but like GDELT it's
// safest fetched server-side rather than directly from the browser.
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

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    res.status(200).json({ items });
  } catch (e) {
    res.status(502).json({ error: 'google news rss fetch failed', message: String(e) });
  }
}