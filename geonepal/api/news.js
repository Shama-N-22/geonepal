// Combined real-news relay — GNews + NewsAPI + Guardian, normalized into one
// shape, deduplicated, and sorted so articles with real images come first.
// All three API keys are read from Vercel Environment Variables and never
// touch the frontend/browser.
export default async function handler(req, res) {
  const { type } = req.query;
  if (!type || !["flood", "earthquake", "landslide"].includes(type)) {
    res.status(400).json({ error: "invalid or missing type" });
    return;
  }
  const q = `${type} Nepal`;

  const results = await Promise.allSettled([
    fetchGNews(q),
    fetchNewsAPI(q),
    fetchGuardian(q),
  ]);

  let articles = [];
  results.forEach((r) => {
    if (r.status === "fulfilled") articles = articles.concat(r.value);
  });

  const seenUrls = new Set();
  const seenTitles = new Set();
  const deduped = [];
  for (const a of articles) {
    if (!a.title || !a.url) continue;
    const normTitle = a.title.toLowerCase().trim().replace(/\s+/g, " ");
    if (seenUrls.has(a.url)) continue;
    if (seenTitles.has(normTitle)) continue;
    seenUrls.add(a.url);
    seenTitles.add(normTitle);
    deduped.push(a);
  }

  deduped.sort((a, b) => (b.imageUrl ? 1 : 0) - (a.imageUrl ? 1 : 0));

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
  res.status(200).json({ articles: deduped });
}

async function fetchGNews(q) {
  const key = process.env.GNEWS_API_KEY;
  if (!key) return [];
  try {
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&lang=en&max=25&apikey=${key}`;
    const r = await fetch(url);
    if (!r.ok) return [];
    const j = await r.json();
    return (j.articles || []).map((a) => ({
      title: a.title,
      description: a.description || "",
      sourceName: (a.source && a.source.name) || "Unknown",
      publishedAt: a.publishedAt,
      url: a.url,
      imageUrl: a.image || null,
      apiSource: "GNews",
    }));
  } catch (e) {
    return [];
  }
}

async function fetchNewsAPI(q) {
  const key = process.env.NEWSAPI_KEY;
  if (!key) return [];
  try {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&language=en&pageSize=25&sortBy=publishedAt&apiKey=${key}`;
    const r = await fetch(url);
    if (!r.ok) return [];
    const j = await r.json();
    return (j.articles || []).map((a) => ({
      title: a.title,
      description: a.description || "",
      sourceName: (a.source && a.source.name) || "Unknown",
      publishedAt: a.publishedAt,
      url: a.url,
      imageUrl: a.urlToImage || null,
      apiSource: "NewsAPI",
    }));
  } catch (e) {
    return [];
  }
}

async function fetchGuardian(q) {
  const key = process.env.GUARDIAN_API_KEY;
  if (!key) return [];
  try {
    const url = `https://content.guardianapis.com/search?q=${encodeURIComponent(q)}&page-size=25&show-fields=thumbnail,trailText&api-key=${key}`;
    const r = await fetch(url);
    if (!r.ok) return [];
    const j = await r.json();
    const items = (j.response && j.response.results) || [];
    return items.map((a) => ({
      title: a.webTitle,
      description:
        a.fields && a.fields.trailText
          ? a.fields.trailText.replace(/<[^>]+>/g, "")
          : "",
      sourceName: "The Guardian",
      publishedAt: a.webPublicationDate,
      url: a.webUrl,
      imageUrl: (a.fields && a.fields.thumbnail) || null,
      apiSource: "Guardian",
    }));
  } catch (e) {
    return [];
  }
}
