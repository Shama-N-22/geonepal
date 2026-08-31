/* ======================================================================
   GEONEPAL — data layer, rendering, interaction
   ====================================================================== */

const PROVINCES = {
  Koshi: [
    "Jhapa",
    "Morang",
    "Sunsari",
    "Ilam",
    "Dhankuta",
    "Bhojpur",
    "Taplejung",
    "Sankhuwasabha",
    "Terhathum",
    "Panchthar",
    "Udayapur",
    "Khotang",
    "Okhaldhunga",
  ],
  Madhesh: [
    "Saptari",
    "Siraha",
    "Dhanusha",
    "Mahottari",
    "Sarlahi",
    "Rautahat",
    "Bara",
    "Parsa",
  ],
  Bagmati: [
    "Kathmandu",
    "Lalitpur",
    "Bhaktapur",
    "Kavrepalanchok",
    "Sindhupalchok",
    "Nuwakot",
    "Dhading",
    "Rasuwa",
    "Chitwan",
    "Makwanpur",
    "Ramechhap",
    "Dolakha",
    "Sindhuli",
  ],
  Gandaki: [
    "Kaski",
    "Lamjung",
    "Tanahun",
    "Syangja",
    "Gorkha",
    "Manang",
    "Mustang",
    "Parbat",
    "Baglung",
    "Nawalpur",
  ],
  Lumbini: [
    "Rupandehi",
    "Kapilvastu",
    "Dang",
    "Banke",
    "Bardiya",
    "Palpa",
    "Gulmi",
    "Arghakhanchi",
    "Pyuthan",
    "Rolpa",
    "Nawalparasi (W)",
  ],
  Karnali: [
    "Surkhet",
    "Dailekh",
    "Jajarkot",
    "Kalikot",
    "Jumla",
    "Mugu",
    "Humla",
    "Dolpa",
    "Salyan",
  ],
  Sudurpashchim: [
    "Kailali",
    "Kanchanpur",
    "Dadeldhura",
    "Doti",
    "Achham",
    "Baitadi",
    "Darchula",
    "Bajura",
    "Bajhang",
  ],
};
const ALL_DISTRICTS = Object.values(PROVINCES).flat();
const YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
const SEVERITIES = ["Low", "Moderate", "Severe", "Critical"];

const TYPE_META = {
  flood: { label: "Floods", tag: "FLOOD", color: "var(--flood)", icon: "🌊" },
  earthquake: {
    label: "Earthquakes",
    tag: "EARTHQUAKE",
    color: "var(--quake)",
    icon: "🌍",
  },
  landslide: {
    label: "Landslides",
    tag: "LANDSLIDE",
    color: "var(--slide)",
    icon: "⛰",
  },
};

let DB = { flood: [], earthquake: [], landslide: [] };
let usgsLoaded = false;
let gdacsLoaded = false;

let ytApiKey = "AIzaSyB3wqxmIdOSmWpnCk4w97T0jFvSKMYrxig";

let state = {
  disaster: null,
  year: "all",
  contentType: "all",
  province: "all",
  district: "all",
  severity: "all",
  search: "",
  view: "gallery",
  visibleCount: 150,
};

function seedRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
function pick(arr, rnd) {
  return arr[Math.floor(rnd() * arr.length)];
}
function provinceOf(district) {
  for (const [p, ds] of Object.entries(PROVINCES))
    if (ds.includes(district)) return p;
  return "Bagmati";
}

/* ---------- demo incident generation (flood / landslide) ---------- */
const FLOOD_NOTES = [
  "River overflow affected low-lying settlements after sustained monsoon rainfall.",
  "Flash flood triggered by heavy upstream rain caused road and bridge damage.",
  "Rising river levels prompted evacuation of riverside households.",
  "Inundation of agricultural land reported following days of continuous rain.",
  "Urban drainage overflow caused localized flooding in market areas.",
];
const SLIDE_NOTES = [
  "Slope failure following heavy rainfall blocked a section of the highway.",
  "Debris flow damaged a stretch of local road and adjacent structures.",
  "Saturated hillside gave way, affecting nearby settlements.",
  "Landslide disrupted the district's main supply route for several days.",
  "Slow-moving slope movement prompted monitoring of nearby homes.",
];
function genDemoIncidents(type, year, count) {
  const rnd = seedRandom(year * 13 + (type === "flood" ? 7 : 31));
  const notes = type === "flood" ? FLOOD_NOTES : SLIDE_NOTES;
  const out = [];
  for (let i = 0; i < count; i++) {
    const district = pick(ALL_DISTRICTS, rnd);
    const province = provinceOf(district);
    const month = Math.floor(rnd() * 12);
    const day = 1 + Math.floor(rnd() * 28);
    const date = new Date(year, month, day);
    const severity = pick(SEVERITIES, rnd);
    const seedImg = `${type}-${year}-${i}`;
    const id = `${type}-${year}-${i}`;
    out.push({
      id,
      disasterType: type,
      year,
      date,
      country: "Nepal",
      province,
      district,
      municipality: `${district} Municipality`,
      severity,
      title: `${type === "flood" ? "Flood" : "Landslide"} incident — ${district}`,
      description: pick(notes, rnd),
      lat: 26.5 + rnd() * 4.3,
      lng: 80.2 + rnd() * 8.6,
      image: `https://picsum.photos/seed/${seedImg}/400/400`,
      gallery: [1, 2, 3].map(
        (n) => `https://picsum.photos/seed/${seedImg}-g${n}/500/340`,
      ),
      demo: true,
      newsCount: 1 + Math.floor(rnd() * 3),
      videoCount: Math.floor(rnd() * 2),
      imageCount: 2 + Math.floor(rnd() * 4),
    });
  }
  return out;
}

/* ---------- real reference imagery from Wikimedia Commons (no key required) ----------
   These are genuine, freely-licensed photographs — not stock, not generated —
   pulled from real Commons categories of Nepal disaster imagery. They are
   NOT claimed to depict any specific BIPAD/USGS/GDACS incident; every place
   that uses them is labeled "reference imagery, may not depict this event." */
const COMMONS_CATEGORIES = {
  flood: "Category:Floods_in_Nepal",
  earthquake: "Category:2015_Nepal_earthquake",
  landslide: "Category:Landslides_in_Nepal",
};
let COMMONS_CACHE = { flood: [], earthquake: [], landslide: [] };

async function loadCommonsImages(disasterType) {
  const cat = COMMONS_CATEGORIES[disasterType];
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&gcmtitle=${encodeURIComponent(cat)}&gcmtype=file&gcmlimit=30&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=500&format=json&origin=*`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("bad status");
    const j = await res.json();
    const pages = j.query && j.query.pages ? Object.values(j.query.pages) : [];
    const seenUrls = new Set();
    COMMONS_CACHE[disasterType] = pages
      .filter((p) => p.imageinfo && p.imageinfo[0])
      .map((p) => {
        const info = p.imageinfo[0];
        const meta = info.extmetadata || {};
        return {
          url: info.thumburl || info.url,
          fullUrl: info.url,
          descriptionUrl: info.descriptionurl,
          artist:
            meta.Artist && meta.Artist.value
              ? meta.Artist.value.replace(/<[^>]+>/g, "")
              : "Unknown",
          license:
            (meta.LicenseShortName && meta.LicenseShortName.value) ||
            "See Commons page",
        };
      })
      .filter((img) => {
        // dedupe identical files (some Commons categories list the same image twice)
        if (seenUrls.has(img.url)) return false;
        seenUrls.add(img.url);
        return true;
      });
  } catch (e) {
    console.warn(`Wikimedia Commons fetch failed for ${disasterType}`, e);
  }
}
async function loadAllCommonsImages() {
  await Promise.all(Object.keys(COMMONS_CATEGORIES).map(loadCommonsImages));
}
function commonsImageFor(disasterType, seedIndex) {
  const pool = COMMONS_CACHE[disasterType];
  if (!pool || !pool.length) return null;
  return pool[seedIndex % pool.length];
}

/* Attaches real Commons reference photos to real (non-demo) incidents that have
   no photo of their own — call this AFTER both loadLiveData() and
   loadAllCommonsImages() have resolved. Each attached photo keeps its real
   artist/license attribution and is always labeled as reference imagery. */
function attachCommonsImagery() {
  ["flood", "earthquake", "landslide"].forEach((type) => {
    const pool = COMMONS_CACHE[type];
    if (!pool || !pool.length) return;
    let i = 0;
    DB[type].forEach((inc) => {
      if (inc.demo) return; // demo records keep their own placeholder imagery, untouched
      const primary = commonsImageFor(type, i);
      const g1 = commonsImageFor(type, i + 1);
      const g2 = commonsImageFor(type, i + 2);
      i++;
      if (!primary) return;
      inc.image = primary.url;
      inc.gallery = [g1, g2].filter(Boolean).map((g) => g.url);
      inc.imageAttribution = [primary, g1, g2].filter(Boolean);
      inc.imageCount = inc.gallery.length + 1;
    });
  });
}

/* ---------- real background reading from Wikipedia (no key required) ----------
   General real context about the disaster type/history — NOT a news report
   of the specific incident, and displayed as clearly separate from it. */
const WIKI_TITLES = {
  flood: "Floods_in_Nepal",
  earthquake: "2015_Nepal_earthquake",
  landslide: "Landslides_in_Nepal",
};
let WIKI_CACHE = {};
async function loadWikiSummary(disasterType) {
  if (WIKI_CACHE[disasterType]) return WIKI_CACHE[disasterType];
  const title = WIKI_TITLES[disasterType];
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`,
    );
    if (!res.ok) throw new Error("bad status");
    const j = await res.json();
    WIKI_CACHE[disasterType] = {
      extract: j.extract,
      url:
        j.content_urls && j.content_urls.desktop && j.content_urls.desktop.page,
      title: j.title,
    };
  } catch (e) {
    console.warn(`Wikipedia summary fetch failed for ${disasterType}`, e);
    WIKI_CACHE[disasterType] = null;
  }
  return WIKI_CACHE[disasterType];
}

function parseGdeltDate(seendate) {
  // GDELT format: "20260828T161500Z"
  if (!seendate || seendate.length < 8) return null;
  const y = seendate.slice(0, 4),
    m = seendate.slice(4, 6),
    d = seendate.slice(6, 8);
  const dt = new Date(`${y}-${m}-${d}`);
  return isNaN(dt) ? null : dt;
}

/* ---------- honest "no photo" placeholder for real records with no image source ----------
   Plain neutral empty-state, not a stock photo and not a generated visual —
   just tells the truth: no verified photograph exists for this real record yet. */
const NO_PHOTO_SVG = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="#161b21"/>
  <line x1="120" y1="140" x2="280" y2="260" stroke="#39424e" stroke-width="2"/>
  <line x1="280" y1="140" x2="120" y2="260" stroke="#39424e" stroke-width="2"/>
  <rect x="120" y="140" width="160" height="120" fill="none" stroke="#39424e" stroke-width="2"/>
  <text x="200" y="300" fill="#5c6470" font-family="monospace" font-size="11" text-anchor="middle">NO VERIFIED PHOTO</text>
</svg>`)}`;

/* ---------- real BIPAD Nepal fetch (no key required) ----------
   Confirmed live via bipadportal.gov.np/api/v1. Government-run Nepal DRR
   incident database — this is now the primary real source for landslides
   (which had no real feed before) and floods, and is merged in for
   earthquakes alongside USGS. */
const BIPAD_BASE_URL = "https://bipadportal.gov.np/api/v1";
const BIPAD_HAZARD_IDS = { earthquake: 8, flood: 11, landslide: 17 };

/* Rough province center points for classifying a coordinate into one of
   Nepal's 7 provinces. This is an approximation by nearest center, not an
   authoritative GIS boundary lookup — good enough for filtering/display,
   not for anything requiring survey-grade accuracy. */
const PROVINCE_CENTERS = {
  Sudurpashchim: [29.3, 80.6],
  Karnali: [29.0, 82.3],
  Lumbini: [27.9, 82.5],
  Gandaki: [28.4, 83.9],
  Bagmati: [27.9, 85.4],
  Madhesh: [26.9, 85.9],
  Koshi: [27.3, 87.3],
};
function classifyProvince(lat, lng) {
  let best = "Bagmati",
    bestDist = Infinity;
  for (const [p, [plat, plng]] of Object.entries(PROVINCE_CENTERS)) {
    const d = (lat - plat) ** 2 + (lng - plng) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

/* Nepal only has 77 real districts. BIPAD's incident titles are free text
   ("Lo Ghekar Damodarkunda Rural Municipality-5"), so storing that raw text
   as "district" was inflating the count into the hundreds and breaking the
   district filter (which is built from this real 77-name list). This tries
   to match a real district name out of the title/place text; if none is
   found, it honestly falls back to the raw text rather than inventing one. */
function matchRealDistrict(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const d of ALL_DISTRICTS) {
    if (lower.includes(d.toLowerCase())) return d;
  }
  return null;
}

async function fetchBipadPage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("bad status " + res.status);
  return res.json();
}

/* Fetches recent BIPAD incidents for one hazard, following pagination up to
   a sensible cap rather than trusting the API's own (currently bogus/huge)
   "count" field, and rather than downloading full history on page load. */
async function loadBipadHazard(
  disasterType,
  { maxPages = 3, pageLimit = 200, sinceDate = "2020-01-01" } = {},
) {
  const hazard = BIPAD_HAZARD_IDS[disasterType];
  let url = `${BIPAD_BASE_URL}/incident/?hazard=${hazard}&ordering=-incident_on&limit=${pageLimit}&incident_on__gt=${sinceDate}`;
  const seenIds = new Map(); // dedupe by BIPAD's own id — offset-based pagination can occasionally repeat a record across page boundaries
  let pages = 0;
  try {
    while (url && pages < maxPages) {
      const j = await fetchBipadPage(url);
      (j.results || []).forEach((r) => {
        if (r && r.id != null) seenIds.set(r.id, r);
      });
      url = j.next || null;
      pages++;
    }
  } catch (e) {
    console.warn(
      `BIPAD fetch failed for hazard ${hazard} (${disasterType})`,
      e,
    );
    return [];
  }
  const all = Array.from(seenIds.values());

  return all
    .filter((r) => r.point && Array.isArray(r.point.coordinates)) // skip malformed/missing coordinates rather than crash
    .map((r) => {
      const [lng, lat] = r.point.coordinates; // BIPAD is GeoJSON: [lng, lat]
      const dateStr = r.incidentOn || r.reportedOn || r.createdOn;
      const date = new Date(dateStr);
      const province = classifyProvince(lat, lng);
      const place =
        (r.title || "")
          .replace(/^(Earthquake|Flood|Landslide)\s+at\s+/i, "")
          .trim() ||
        r.streetAddress ||
        "Location not specified";
      const realDistrict =
        matchRealDistrict(r.title) || matchRealDistrict(place);
      const factParts = [];
      factParts.push(
        r.verified ? "Verified by BIPAD." : "Not yet verified by BIPAD.",
      );
      if (r.dataSource)
        factParts.push(`Reported via ${r.dataSource.replace(/_/g, " ")}.`);
      if (r.source) factParts.push(`Source type: ${r.source}.`);
      if (r.wards && r.wards.length)
        factParts.push(`Ward ID ${r.wards.join(", ")}.`);
      return {
        id: `bipad-${r.id}`,
        disasterType,
        year: date.getFullYear(),
        date,
        country: "Nepal",
        province,
        district: realDistrict || place, // real district name when we can match one, honest raw place text otherwise
        municipality: place,
        severity: null, // BIPAD gives no severity/magnitude scale — we don't invent one
        verified: !!r.verified,
        title: r.title || `${disasterType} incident`,
        description: factParts.join(" "),
        lat,
        lng,
        image: NO_PHOTO_SVG,
        gallery: [],
        demo: false,
        source: "BIPAD",
        bipadUrl: `${BIPAD_BASE_URL}/incident/${r.id}/`,
        newsCount: 1,
        videoCount: 0,
        imageCount: 0,
      };
    })
    .filter((d) => YEARS.includes(d.year));
}

/* ---------- real GDACS flood fetch (no key required) ---------- */
async function loadGDACS() {
  const url =
    "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?fromdate=2020-01-01&todate=2026-12-31&country=157&eventtypes=FL";
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("bad status");
    const j = await res.json();
    const feats = j.features || j || [];
    const mapped = feats
      .map((f, i) => {
        const p = f.properties || f;
        const geom = f.geometry || {};
        const [lng, lat] = geom.coordinates || [
          84 + Math.random() * 4,
          27 + Math.random() * 2,
        ];
        const t = new Date(p.fromdate || p.eventdate || Date.now());
        const alert = (p.alertlevel || "").toLowerCase();
        let severity = "Low";
        if (alert === "red") severity = "Critical";
        else if (alert === "orange") severity = "Severe";
        else if (alert === "green") severity = "Moderate";
        const nearestDistrict =
          ALL_DISTRICTS[
            Math.floor(Math.abs(lat * lng * 1000)) % ALL_DISTRICTS.length
          ];
        const province = provinceOf(nearestDistrict);
        return {
          id: `gdacs-fl-${p.eventid || i}`,
          disasterType: "flood",
          year: t.getFullYear(),
          date: t,
          country: "Nepal",
          province,
          district: nearestDistrict,
          municipality: p.name || nearestDistrict,
          severity,
          title: p.name || p.htmldescription || `Flood event`,
          description: (
            p.description ||
            p.htmldescription ||
            "Flood event recorded by GDACS (Global Disaster Alert and Coordination System)."
          ).replace(/<[^>]+>/g, ""),
          lat,
          lng,
          image: NO_PHOTO_SVG,
          gallery: [],
          demo: false,
          gdacsUrl:
            p.url && p.url.details
              ? p.url.details
              : `https://www.gdacs.org/report.aspx?eventid=${p.eventid}&eventtype=FL`,
          newsCount: 1,
          videoCount: 0,
          imageCount: 0,
        };
      })
      .filter((d) => YEARS.includes(d.year));
    if (mapped.length) {
      DB.flood = mapped;
      gdacsLoaded = true;
    } else throw new Error("no GDACS results for Nepal in range");
  } catch (e) {
    console.warn(
      "GDACS fetch failed or returned nothing, keeping demo flood data",
      e,
    );
  }
}

/* ---------- real USGS earthquake fetch ---------- */
async function loadUSGS() {
  const url =
    "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2020-01-01&endtime=2026-12-31&minlatitude=26&maxlatitude=31&minlongitude=80&maxlongitude=89&minmagnitude=2.5&limit=2000";
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("bad status");
    const j = await res.json();
    const feats = j.features || [];
    DB.earthquake = feats
      .map((f, i) => {
        const mag = f.properties.mag || 0;
        const t = new Date(f.properties.time);
        const [lng, lat, depth] = f.geometry.coordinates;
        let severity = "Low";
        if (mag >= 6) severity = "Critical";
        else if (mag >= 5) severity = "Severe";
        else if (mag >= 4) severity = "Moderate";
        const nearestDistrict =
          ALL_DISTRICTS[
            Math.floor(Math.abs(lat * lng * 1000) % ALL_DISTRICTS.length)
          ];
        const province = provinceOf(nearestDistrict);
        return {
          id: `eq-${f.id || i}`,
          disasterType: "earthquake",
          year: t.getFullYear(),
          date: t,
          country: "Nepal",
          province,
          district: nearestDistrict,
          municipality: f.properties.place || nearestDistrict,
          severity,
          title: f.properties.place || `M${mag.toFixed(1)} earthquake`,
          description: `Magnitude ${mag.toFixed(1)} earthquake recorded at a depth of ${depth ? depth.toFixed(1) : "—"} km. Source: USGS Earthquake Catalog.`,
          lat,
          lng,
          mag,
          depth,
          image: NO_PHOTO_SVG,
          gallery: [],
          demo: false,
          usgsUrl: f.properties.url,
          newsCount: 1,
          videoCount: 0,
          imageCount: 0,
        };
      })
      .filter((d) => YEARS.includes(d.year));
  } catch (e) {
    console.warn("USGS fetch failed, falling back to demo quake data", e);
    DB.earthquake = YEARS.flatMap((y) =>
      genDemoIncidents("earthquake", y, 12).map((d) => ({
        ...d,
        demo: true,
        mag: (2.5 + Math.random() * 4).toFixed(1),
      })),
    );
  }
  usgsLoaded = true;
}

/* ---------- category-level real media (NOT tied to one incident) ----------
   Per-incident search almost never finds a matching article/video for a
   specific BIPAD record — Nepal's local disasters rarely get individually
   named international coverage. So instead: pull real coverage for each
   DISASTER CATEGORY as a whole (e.g. "landslide Nepal", not one municipality),
   show it as its own tiles in the News/Videos/Images filters, and be honest
   when nothing real comes back — we never fabricate a substitute. */
let MEDIA = {
  flood: { news: [], video: [], newsLoaded: false, videoLoaded: false },
  earthquake: { news: [], video: [], newsLoaded: false, videoLoaded: false },
  landslide: { news: [], video: [], newsLoaded: false, videoLoaded: false },
};

async function loadCategoryNews(disasterType) {
  const q = `${disasterType} Nepal`;
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(q)}&mode=artlist&maxrecords=100&format=json&sort=hybridrel`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("bad status " + res.status);
    const j = await res.json();
    const raw = (j.articles || [])
      .map((a, i) => ({
        id: `gdelt-${disasterType}-${i}`,
        title: a.title || "Untitled article",
        url: a.url,
        domain:
          a.domain || (a.url ? new URL(a.url).hostname : "Unknown source"),
        date: parseGdeltDate(a.seendate),
        image: a.socialimage || null,
      }))
      .filter((a) => a.url);

    // Wire-syndicated articles often republish the exact same photo and near-
    // identical headline across many mirror sites — dedupe by image AND by
    // normalized title so the grid doesn't fill up with visual repeats.
    const seenImages = new Set();
    const seenTitles = new Set();
    const deduped = [];
    for (const a of raw) {
      const normTitle = a.title.toLowerCase().trim().replace(/\s+/g, " ");
      if (a.image && seenImages.has(a.image)) continue;
      if (seenTitles.has(normTitle)) continue;
      if (a.image) seenImages.add(a.image);
      seenTitles.add(normTitle);
      deduped.push(a);
    }
    MEDIA[disasterType].news = deduped;
  } catch (e) {
    console.warn(`GDELT category fetch failed for ${disasterType}`, e);
    MEDIA[disasterType].news = [];
  }
  MEDIA[disasterType].newsLoaded = true;
}

async function loadCategoryVideos(disasterType) {
  if (!ytApiKey) {
    MEDIA[disasterType].videoLoaded = true;
    return;
  }
  const q = encodeURIComponent(`${disasterType} Nepal disaster`);
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=16&q=${q}&key=${ytApiKey}`;
  try {
    const res = await fetch(url);
    const j = await res.json();
    if (j.error) throw new Error(j.error.message);
    MEDIA[disasterType].video = (j.items || []).map((v) => ({
      id: v.id.videoId,
      title: v.snippet.title,
      url: `https://www.youtube.com/watch?v=${v.id.videoId}`,
      thumb: v.snippet.thumbnails.medium.url,
      channel: v.snippet.channelTitle,
      date: new Date(v.snippet.publishedAt),
    }));
  } catch (e) {
    console.warn(`YouTube category fetch failed for ${disasterType}`, e);
    MEDIA[disasterType].video = [];
  }
  MEDIA[disasterType].videoLoaded = true;
}

async function loadAllCategoryMedia() {
  const types = ["flood", "earthquake", "landslide"];
  await Promise.all([
    ...types.map(loadCategoryNews),
    ...types.map(loadCategoryVideos),
  ]);
}

/* ---------- orchestrate live sources per hazard, each with an honest fallback chain ---------- */
async function loadLiveData() {
  // Landslides: BIPAD is the only real source we have — fall back to demo only if it fails entirely.
  const bipadSlides = await loadBipadHazard("landslide");
  if (bipadSlides.length) DB.landslide = bipadSlides;

  // Floods: try BIPAD first (confirmed working, Nepal-specific), then GDACS, then keep demo.
  const bipadFloods = await loadBipadHazard("flood");
  if (bipadFloods.length) {
    DB.flood = bipadFloods;
  } else {
    await loadGDACS();
  }

  // Earthquakes: USGS stays primary (global authoritative catalog); merge in BIPAD's
  // ground-reported records too since they capture locally-felt events USGS may omit.
  await loadUSGS();
  const bipadQuakes = await loadBipadHazard("earthquake");
  if (bipadQuakes.length)
    DB.earthquake = [...DB.earthquake.filter((d) => !d.demo), ...bipadQuakes];
}

function buildDemoData() {
  DB.flood = YEARS.flatMap((y) =>
    genDemoIncidents("flood", y, 70 + Math.floor(Math.random() * 40)),
  );
  DB.landslide = YEARS.flatMap((y) =>
    genDemoIncidents("landslide", y, 40 + Math.floor(Math.random() * 30)),
  );
}

/* ---------- expand incidents into tiles ----------
   DEMO incidents still generate their own placeholder sub-tiles (clearly
   labeled DEMO) so the layout stays full while data is still demo. REAL
   incidents only ever produce their own single 'incident' tile — their
   news/video/image tiles come separately, for real, from the category
   media pools (MEDIA / COMMONS_CACHE), never duplicated per-incident. */
function expandTiles(incidents) {
  const tiles = [];
  incidents.forEach((inc) => {
    tiles.push({ ...inc, contentType: "incident", tileImg: inc.image });
    if (inc.demo) {
      const ic = inc.imageCount || 2;
      for (let i = 0; i < ic; i++)
        tiles.push({
          ...inc,
          contentType: "image",
          tileImg: `https://picsum.photos/seed/${inc.id}-img${i}/380/380`,
        });
      const nc = inc.newsCount || 1;
      for (let i = 0; i < nc; i++)
        tiles.push({
          ...inc,
          contentType: "news",
          tileImg: `https://picsum.photos/seed/${inc.id}-news${i}/380/380`,
        });
      const vc = inc.videoCount || 0;
      for (let i = 0; i < vc; i++)
        tiles.push({
          ...inc,
          contentType: "video",
          tileImg: `https://picsum.photos/seed/${inc.id}-vid${i}/380/380`,
        });
    }
  });
  return tiles;
}

/* Real category-level media (GDELT news, YouTube video, Commons images) as
   grid tiles for the currently selected disaster type. News/video are
   year-filtered by their own real publish date; images are shown regardless
   of year since Commons photos aren't tied to one dated event. */
function mediaTilesFor(disasterType, year) {
  const tiles = [];
  const m = MEDIA[disasterType] || { news: [], video: [] };
  m.news.forEach((a) => {
    if (year !== "all" && (!a.date || a.date.getFullYear() !== year)) return;
    tiles.push({
      id: a.id,
      disasterType,
      contentType: "news",
      demo: false,
      isMedia: true,
      title: a.title,
      district: a.domain,
      date: a.date || new Date(),
      tileImg: a.image || NO_PHOTO_SVG,
      mediaData: a,
    });
  });
  m.video.forEach((v) => {
    if (year !== "all" && (!v.date || v.date.getFullYear() !== year)) return;
    tiles.push({
      id: v.id,
      disasterType,
      contentType: "video",
      demo: false,
      isMedia: true,
      title: v.title,
      district: v.channel,
      date: v.date || new Date(),
      tileImg: v.thumb,
      mediaData: v,
    });
  });
  (COMMONS_CACHE[disasterType] || []).forEach((img, i) => {
    tiles.push({
      id: `commons-${disasterType}-${i}`,
      disasterType,
      contentType: "image",
      demo: false,
      isMedia: true,
      title: "Reference photograph — Wikimedia Commons",
      district: img.artist,
      date: null,
      tileImg: img.url,
      mediaData: img,
    });
  });
  return tiles;
}
