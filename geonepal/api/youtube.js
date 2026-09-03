export default async function handler(req, res) {
  const { q, max } = req.query;
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    res.status(500).json({ error: 'YOUTUBE_API_KEY not configured' });
    return;
  }
  if (!q) {
    res.status(400).json({ error: 'missing query' });
    return;
  }
  const maxResults = Math.min(parseInt(max, 10) || 10, 25);

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResults}&q=${encodeURIComponent(q)}&key=${key}`;
    const r = await fetch(url);
    const j = await r.json();
    if (!r.ok) {
      res.status(r.status).json(j);
      return;
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    res.status(200).json(j);
  } catch (e) {
    res.status(502).json({ error: 'youtube fetch failed', message: String(e) });
  }
}