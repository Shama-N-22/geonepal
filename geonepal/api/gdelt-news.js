New-Item -ItemType Directory -Force -Path api
@'
// Vercel serverless function — runs on Vercel's servers, not in the browser.
// GDELT's API appears to lack CORS headers, so a direct browser fetch fails
// with "Failed to fetch" no matter how correct the query is. Server-to-server
// requests aren't subject to browser CORS, so this relay fixes that cleanly
// without needing any API key.
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
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    res.status(200).json(data);
  } catch (e) {
    res.status(502).json({ error: 'gdelt fetch failed', message: String(e) });
  }
}
'@ | Out-File -FilePath api/gdelt-news.js -Encoding utf8