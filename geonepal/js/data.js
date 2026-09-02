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

/* ---------- real reference imagery from Wikimedia Commons (no key required) ---------- */
const COMMONS_CATEGORIES = {
  flood: "Category:Floods_in_Nepal",
  earthquake: "Category:2015_Nepal_earthquake",
  landslide: "Category:Landslides_in_Nepal",
};
let COMMONS_CACHE = { flood: [], earthquake: [], landslide: [] };

async function loadCommonsImages(disasterType) {
  const cat = COMMONS_CATEGORIES[disasterType];
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&gcmtitle=${encodeURIComponent(cat)}&gcmtype=file&gcmlimit=60&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=500&format=json&origin=*`;
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

function attachCommonsImagery() {
  ["flood", "earthquake", "landslide"].forEach((type) => {
    const pool = COMMONS_CACHE[type];
    if (!pool || !pool.length) return;
    let i = 0;
    DB[type].forEach((inc) => {
      if (inc.demo) return;
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
  if (!seendate || seendate.length < 8) return null;
  const y = seendate.slice(0, 4),
    m = seendate.slice(4, 6),
    d = seendate.slice(6, 8);
  const dt = new Date(`${y}-${m}-${d}`);
  return isNaN(dt) ? null : dt;
}

/* ---------- honest "no photo" placeholder, built fresh per-incident ---------- */
function noPhotoCard(labelLine1, labelLine2) {
  const l1 = (labelLine1 || "").slice(0, 34).replace(/[<>&]/g, "");
  const l2 = (labelLine2 || "").slice(0, 34).replace(/[<>&]/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="#161b21"/>
  <line x1="120" y1="140" x2="280" y2="260" stroke="#39424e" stroke-width="2"/>
  <line x1="280" y1="140" x2="120" y2="260" stroke="#39424e" stroke-width="2"/>
  <rect x="120" y="140" width="160" height="120" fill="none" stroke="#39424e" stroke-width="2"/>
  <text x="200" y="288" fill="#5c6470" font-family="monospace" font-size="10" text-anchor="middle">NO VERIFIED PHOTO</text>
  <text x="200" y="330" fill="#8891a0" font-family="monospace" font-size="11" text-anchor="middle">${l1}</text>
  <text x="200" y="348" fill="#6b7480" font-family="monospace" font-size="9" text-anchor="middle">${l2}</text>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
const NO_PHOTO_SVG = noPhotoCard("", "");

const BIPAD_BASE_URL = "https://bipadportal.gov.np/api/v1";
const BIPAD_HAZARD_IDS = { earthquake: 8, flood: 11, landslide: 17 };

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

/* Real approximate center coordinates for Nepal's real districts (district
   headquarters area — not surveyed GIS boundaries, but real geographic
   reference points, not placeholders). Used to classify any real lat/lng
   into a real Nepal district by nearest center — far more reliable than
   text-matching BIPAD's free-text titles, and replaces a hash-based fake
   assignment previously used for GDACS/USGS that had nothing to do with
   their real coordinates. */
const DISTRICT_CENTERS = {
  Jhapa: [26.65, 87.98],
  Morang: [26.65, 87.28],
  Sunsari: [26.62, 87.17],
  Ilam: [26.91, 87.93],
  Dhankuta: [26.98, 87.34],
  Bhojpur: [27.17, 87.05],
  Taplejung: [27.35, 87.67],
  Sankhuwasabha: [27.62, 87.21],
  Terhathum: [27.12, 87.55],
  Panchthar: [27.14, 87.8],
  Udayapur: [26.86, 86.73],
  Khotang: [27.2, 86.83],
  Okhaldhunga: [27.32, 86.5],
  Saptari: [26.6, 86.75],
  Siraha: [26.65, 86.21],
  Dhanusha: [26.83, 85.93],
  Mahottari: [26.65, 85.8],
  Sarlahi: [26.86, 85.56],
  Rautahat: [26.98, 85.3],
  Bara: [27.03, 85.03],
  Parsa: [27.02, 84.87],
  Kathmandu: [27.7172, 85.324],
  Lalitpur: [27.6644, 85.3188],
  Bhaktapur: [27.671, 85.4298],
  Kavrepalanchok: [27.63, 85.55],
  Sindhupalchok: [27.95, 85.68],
  Nuwakot: [27.92, 85.16],
  Dhading: [27.86, 84.9],
  Rasuwa: [28.1, 85.28],
  Chitwan: [27.62, 84.43],
  Makwanpur: [27.42, 85.03],
  Ramechhap: [27.33, 86.08],
  Dolakha: [27.66, 86.17],
  Sindhuli: [27.25, 85.97],
  Kaski: [28.21, 83.98],
  Lamjung: [28.23, 84.36],
  Tanahun: [27.94, 84.25],
  Syangja: [28.1, 83.88],
  Gorkha: [28.0, 84.63],
  Manang: [28.66, 84.02],
  Mustang: [28.99, 83.83],
  Parbat: [28.23, 83.68],
  Baglung: [28.27, 83.59],
  Nawalpur: [27.75, 84.13],
  Rupandehi: [27.63, 83.45],
  Kapilvastu: [27.55, 83.05],
  Dang: [28.03, 82.3],
  Banke: [28.05, 81.62],
  Bardiya: [28.3, 81.6],
  Palpa: [27.87, 83.55],
  Gulmi: [28.08, 83.23],
  Arghakhanchi: [27.93, 83.2],
  Pyuthan: [28.1, 82.85],
  Rolpa: [28.3, 82.63],
  "Nawalparasi (W)": [27.68, 83.83],
  Surkhet: [28.6, 81.62],
  Dailekh: [28.85, 81.72],
  Jajarkot: [28.7, 82.2],
  Kalikot: [29.13, 81.6],
  Jumla: [29.27, 82.18],
  Mugu: [29.55, 82.15],
  Humla: [29.97, 81.82],
  Dolpa: [29.03, 82.9],
  Salyan: [28.38, 82.17],
  Kailali: [28.68, 80.6],
  Kanchanpur: [28.85, 80.19],
  Dadeldhura: [29.3, 80.58],
  Doti: [29.27, 80.93],
  Achham: [29.08, 81.28],
  Baitadi: [29.53, 80.47],
  Darchula: [29.85, 80.55],
  Bajura: [29.53, 81.55],
  Bajhang: [29.63, 81.2],
};

function classifyDistrict(lat, lng) {
  let best = "Kathmandu",
    bestDist = Infinity;
  for (const [d, [dlat, dlng]] of Object.entries(DISTRICT_CENTERS)) {
    const dist = (lat - dlat) ** 2 + (lng - dlng) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = d;
    }
  }
  return best;
}

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

async function loadBipadHazard(
  disasterType,
  { maxPages = 3, pageLimit = 200, sinceDate = "2020-01-01" } = {},
) {
  const hazard = BIPAD_HAZARD_IDS[disasterType];
  let url = `${BIPAD_BASE_URL}/incident/?hazard=${hazard}&ordering=-incident_on&limit=${pageLimit}&incident_on__gt=${sinceDate}`;
  const seenIds = new Map();
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
    .filter((r) => r.point && Array.isArray(r.point.coordinates))
    .map((r) => {
      const [lng, lat] = r.point.coordinates;
      const dateStr = r.incidentOn || r.reportedOn || r.createdOn;
      const date = new Date(dateStr);
      const district = classifyDistrict(lat, lng);
      const province = provinceOf(district);
      const place =
        (r.title || "")
          .replace(/^(Earthquake|Flood|Landslide)\s+at\s+/i, "")
          .trim() ||
        r.streetAddress ||
        "Location not specified";
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
        district,
        municipality: place,
        severity: null,
        verified: !!r.verified,
        title: r.title || `${disasterType} incident`,
        description: factParts.join(" "),
        lat,
        lng,
        image: noPhotoCard(
          district,
          date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
        ),
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
        const nearestDistrict = classifyDistrict(lat, lng);
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
          image: noPhotoCard(
            nearestDistrict,
            t.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
          ),
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
        const nearestDistrict = classifyDistrict(lat, lng);
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
          image: noPhotoCard(
            `M${mag.toFixed(1)} · ${nearestDistrict}`,
            t.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
          ),
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

let MEDIA = {
  flood: { news: [], video: [], newsLoaded: false, videoLoaded: false },
  earthquake: { news: [], video: [], newsLoaded: false, videoLoaded: false },
  landslide: { news: [], video: [], newsLoaded: false, videoLoaded: false },
};

async function loadCategoryNews(disasterType) {
  const q = `${disasterType} Nepal`;
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(q)}&mode=artlist&maxrecords=250&format=json&sort=hybridrel&startdatetime=20200101000000&enddatetime=20261231235959`;
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

async function loadLiveData() {
  const bipadSlides = await loadBipadHazard("landslide");
  if (bipadSlides.length) DB.landslide = bipadSlides;

  const bipadFloods = await loadBipadHazard("flood");
  if (bipadFloods.length) {
    DB.flood = bipadFloods;
  } else {
    await loadGDACS();
  }

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
