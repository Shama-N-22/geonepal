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
  flood: {
    label: "Floods",
    tag: "FLOOD",
    color: "var(--flood)",
    icon: "🌊",
  },

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

let DB = {
  flood: [],
  earthquake: [],
  landslide: [],
};

let usgsLoaded = false;
let gdacsLoaded = false;

/*
  YouTube key is server-side only.
  It lives in the Vercel Environment Variable:
  YOUTUBE_API_KEY
*/

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

  if (s <= 0) {
    s += 2147483646;
  }

  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function pick(arr, rnd) {
  return arr[Math.floor(rnd() * arr.length)];
}

function provinceOf(district) {
  for (const [p, ds] of Object.entries(PROVINCES)) {
    if (ds.includes(district)) {
      return p;
    }
  }

  return "Bagmati";
}

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
  const rnd = seedRandom(
    year * 13 + (type === "flood" ? 7 : 31)
  );

  const notes =
    type === "flood" ? FLOOD_NOTES : SLIDE_NOTES;

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

      title:
        type === "flood"
          ? `Flood incident — ${district}`
          : `Landslide incident — ${district}`,

      description: pick(notes, rnd),

      lat: 26.5 + rnd() * 4.3,
      lng: 80.2 + rnd() * 8.6,

      image: `https://picsum.photos/seed/${seedImg}/400/400`,

      gallery: [1, 2, 3].map(
        (n) =>
          `https://picsum.photos/seed/${seedImg}-g${n}/500/340`
      ),

      demo: true,

      newsCount: 1 + Math.floor(rnd() * 3),
      videoCount: Math.floor(rnd() * 2),
      imageCount: 2 + Math.floor(rnd() * 4),
    });
  }

  return out;
}

/* ======================================================================
   WIKIMEDIA COMMONS
   ====================================================================== */

const COMMONS_CATEGORIES = {
  flood: "Category:Floods_in_Nepal",
  earthquake: "Category:2015_Nepal_earthquake",
  landslide: "Category:Landslides_in_Nepal",
};

let COMMONS_CACHE = {
  flood: [],
  earthquake: [],
  landslide: [],
};

async function loadCommonsImages(disasterType) {
  const cat = COMMONS_CATEGORIES[disasterType];

  const url =
    `https://commons.wikimedia.org/w/api.php` +
    `?action=query` +
    `&generator=categorymembers` +
    `&gcmtitle=${encodeURIComponent(cat)}` +
    `&gcmtype=file` +
    `&gcmlimit=60` +
    `&prop=imageinfo` +
    `&iiprop=url|extmetadata` +
    `&iiurlwidth=500` +
    `&format=json` +
    `&origin=*`;

  try {
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error("bad status");
    }

    const j = await res.json();

    const pages =
      j.query && j.query.pages
        ? Object.values(j.query.pages)
        : [];

    const seenKeys = new Set();

    COMMONS_CACHE[disasterType] = pages
      .filter(
        (p) =>
          p.imageinfo &&
          p.imageinfo[0]
      )
      .map((p) => {
        const info = p.imageinfo[0];
        const meta = info.extmetadata || {};

        return {
          url: info.thumburl || info.url,
          fullUrl: info.url,
          descriptionUrl: info.descriptionurl,

          title: p.title || "",

          artist:
            meta.Artist && meta.Artist.value
              ? meta.Artist.value.replace(
                  /<[^>]+>/g,
                  ""
                )
              : "Unknown",

          license:
            meta.LicenseShortName &&
            meta.LicenseShortName.value
              ? meta.LicenseShortName.value
              : "See Commons page",
        };
      })
      .filter((img) => {
        const key =
          img.descriptionUrl ||
          normalizeImageUrl(img.url);

        if (!key) {
          return false;
        }

        if (seenKeys.has(key)) {
          return false;
        }

        seenKeys.add(key);

        return true;
      });

  } catch (e) {
    console.warn(
      `Wikimedia Commons fetch failed for ${disasterType}`,
      e
    );

    COMMONS_CACHE[disasterType] = [];
  }
}

async function loadAllCommonsImages() {
  await Promise.all(
    Object.keys(COMMONS_CATEGORIES).map(
      loadCommonsImages
    )
  );
}

function commonsImageFor(disasterType, seedIndex) {
  const pool = COMMONS_CACHE[disasterType];

  if (!pool || !pool.length) {
    return null;
  }

  return pool[seedIndex % pool.length];
}

function attachCommonsImagery() {
  ["flood", "earthquake", "landslide"].forEach(
    (type) => {
      const pool = COMMONS_CACHE[type];

      if (!pool || !pool.length) {
        return;
      }

      let i = 0;

      DB[type].forEach((inc) => {
        if (inc.demo) {
          return;
        }

        const primary = commonsImageFor(
          type,
          i
        );

        const g1 = commonsImageFor(
          type,
          i + 1
        );

        const g2 = commonsImageFor(
          type,
          i + 2
        );

        i++;

        if (!primary) {
          return;
        }

        inc.image = primary.url;

        inc.gallery = [
          g1,
          g2,
        ]
          .filter(Boolean)
          .map((g) => g.url);

        inc.imageAttribution = [
          primary,
          g1,
          g2,
        ].filter(Boolean);

        inc.imageCount =
          inc.gallery.length + 1;
      });
    }
  );
}

/* ======================================================================
   WIKIPEDIA
   ====================================================================== */

const WIKI_TITLES = {
  flood: "Floods_in_Nepal",
  earthquake: "2015_Nepal_earthquake",
  landslide: "Landslides_in_Nepal",
};

let WIKI_CACHE = {};

async function loadWikiSummary(disasterType) {
  if (WIKI_CACHE[disasterType]) {
    return WIKI_CACHE[disasterType];
  }

  const title = WIKI_TITLES[disasterType];

  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`
    );

    if (!res.ok) {
      throw new Error("bad status");
    }

    const j = await res.json();

    WIKI_CACHE[disasterType] = {
      extract: j.extract,

      url:
        j.content_urls &&
        j.content_urls.desktop &&
        j.content_urls.desktop.page,

      title: j.title,
    };
  } catch (e) {
    console.warn(
      `Wikipedia summary fetch failed for ${disasterType}`,
      e
    );

    WIKI_CACHE[disasterType] = null;
  }

  return WIKI_CACHE[disasterType];
}

/* ======================================================================
   DATE HELPERS
   ====================================================================== */

function parseGdeltDate(seendate) {
  if (!seendate || seendate.length < 8) {
    return null;
  }

  const y = seendate.slice(0, 4);
  const m = seendate.slice(4, 6);
  const d = seendate.slice(6, 8);

  const dt = new Date(`${y}-${m}-${d}`);

  return isNaN(dt) ? null : dt;
}

/* ======================================================================
   IMAGE HELPERS
   ====================================================================== */

function normalizeImageUrl(url) {
  if (!url || typeof url !== "string") {
    return "";
  }

  return url
    .trim()
    .replace(/^https?:\/\//i, "")
    .split("?")[0]
    .split("#")[0]
    .toLowerCase()
    .replace(/\/+$/, "");
}

function noPhotoCard(labelLine1, labelLine2) {
  const l1 = (labelLine1 || "")
    .slice(0, 34)
    .replace(/[<>&]/g, "");

  const l2 = (labelLine2 || "")
    .slice(0, 34)
    .replace(/[<>&]/g, "");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg"
         width="400"
         height="400"
         viewBox="0 0 400 400">

      <rect
        width="400"
        height="400"
        fill="#161b21"
      />

      <line
        x1="120"
        y1="140"
        x2="280"
        y2="260"
        stroke="#39424e"
        stroke-width="2"
      />

      <line
        x1="280"
        y1="140"
        x2="120"
        y2="260"
        stroke="#39424e"
        stroke-width="2"
      />

      <rect
        x="120"
        y="140"
        width="160"
        height="120"
        fill="none"
        stroke="#39424e"
        stroke-width="2"
      />

      <text
        x="200"
        y="288"
        fill="#5c6470"
        font-family="monospace"
        font-size="10"
        text-anchor="middle"
      >
        NO VERIFIED PHOTO
      </text>

      <text
        x="200"
        y="330"
        fill="#8891a0"
        font-family="monospace"
        font-size="11"
        text-anchor="middle"
      >
        ${l1}
      </text>

      <text
        x="200"
        y="348"
        fill="#6b7480"
        font-family="monospace"
        font-size="9"
        text-anchor="middle"
      >
        ${l2}
      </text>

    </svg>
  `;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/*
  IMPORTANT:

  Live BIPAD / USGS / GDACS records often contain the SVG
  "NO VERIFIED PHOTO" placeholder.

  We DO NOT use that placeholder as a dashboard thumbnail.

  Instead:
  1. Use a real image URL if available.
  2. Ignore the internal SVG placeholder.
  3. Use deterministic Picsum fallback.
*/

function getCardImage(item, index = 0) {
  const candidates = [
    item?.image,
    item?.imageUrl,
    item?.tileImg,
    item?.thumb,
  ];

  for (const candidate of candidates) {
    if (
      typeof candidate !== "string" ||
      !candidate.trim()
    ) {
      continue;
    }

    const value = candidate.trim();

    /*
      Ignore our generated "NO VERIFIED PHOTO"
      and "NO ARTICLE IMAGE" SVG placeholders.
    */
    if (
      value.startsWith("data:image/svg+xml") ||
      value.includes("NO%20VERIFIED%20PHOTO") ||
      value.includes("NO%20ARTICLE%20IMAGE") ||
      value.includes("NO VERIFIED PHOTO") ||
      value.includes("NO ARTICLE IMAGE")
    ) {
      continue;
    }

    return value;
  }

  /*
    Guaranteed photographic fallback.

    Different IDs/seeds produce different images,
    so live cards don't all get the same fallback.
  */
  const rawSeed = String(
    item?.id ||
      item?.title ||
      item?.url ||
      `${item?.disasterType || "disaster"}-${index}`
  );

  const safeSeed =
    rawSeed
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 40) ||
    `disaster-${index}`;

  return `https://picsum.photos/seed/geonepal-${safeSeed}/900/600`;
}

const NO_PHOTO_SVG = noPhotoCard("", "");

function newsNoImageCard() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg"
         width="400"
         height="300"
         viewBox="0 0 400 300">

      <rect
        width="400"
        height="300"
        fill="#14181d"
      />

      <rect
        x="130"
        y="90"
        width="140"
        height="100"
        fill="none"
        stroke="#3a4451"
        stroke-width="2"
        rx="4"
      />

      <line
        x1="150"
        y1="115"
        x2="250"
        y2="115"
        stroke="#3a4451"
        stroke-width="3"
      />

      <line
        x1="150"
        y1="135"
        x2="250"
        y2="135"
        stroke="#3a4451"
        stroke-width="3"
      />

      <line
        x1="150"
        y1="155"
        x2="210"
        y2="155"
        stroke="#3a4451"
        stroke-width="3"
      />

      <text
        x="200"
        y="225"
        fill="#6b7480"
        font-family="monospace"
        font-size="11"
        text-anchor="middle"
        letter-spacing="1"
      >
        NO ARTICLE IMAGE
      </text>

    </svg>
  `;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/*
  Remove duplicate images.

  Handles:
  - http vs https
  - query strings
  - trailing slashes
  - Commons duplicate description pages
*/
function dedupeImages(images) {
  const seen = new Set();

  return images.filter((img) => {
    if (!img) {
      return false;
    }

    const url =
      img.image ||
      img.imageUrl ||
      img.url ||
      img.src;

    if (
      !url ||
      typeof url !== "string"
    ) {
      return false;
    }

    const normalized =
      normalizeImageUrl(url);

    const descriptionKey =
      img.descriptionUrl
        ? normalizeImageUrl(
            img.descriptionUrl
          )
        : "";

    const key =
      descriptionKey ||
      normalized;

    if (!key) {
      return false;
    }

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
}

/* ======================================================================
   BIPAD
   ====================================================================== */

const BIPAD_BASE_URL =
  "https://bipadportal.gov.np/api/v1";

const BIPAD_HAZARD_IDS = {
  earthquake: 8,
  flood: 11,
  landslide: 17,
};

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
  let best = "Bagmati";
  let bestDist = Infinity;

  for (const [
    p,
    [plat, plng],
  ] of Object.entries(PROVINCE_CENTERS)) {
    const d =
      (lat - plat) ** 2 +
      (lng - plng) ** 2;

    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }

  return best;
}

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
  let best = "Kathmandu";
  let bestDist = Infinity;

  for (const [
    d,
    [dlat, dlng],
  ] of Object.entries(DISTRICT_CENTERS)) {
    const dist =
      (lat - dlat) ** 2 +
      (lng - dlng) ** 2;

    if (dist < bestDist) {
      bestDist = dist;
      best = d;
    }
  }

  return best;
}

function matchRealDistrict(text) {
  if (!text) {
    return null;
  }

  const lower = text.toLowerCase();

  for (const d of ALL_DISTRICTS) {
    if (
      lower.includes(
        d.toLowerCase()
      )
    ) {
      return d;
    }
  }

  return null;
}

async function fetchBipadPage(url) {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(
      "bad status " + res.status
    );
  }

  return res.json();
}

async function loadBipadHazard(
  disasterType,
  {
    maxPages = 3,
    pageLimit = 200,
    sinceDate = "2020-01-01",
  } = {}
) {
  const hazard =
    BIPAD_HAZARD_IDS[disasterType];

  let url =
    `${BIPAD_BASE_URL}/incident/` +
    `?hazard=${hazard}` +
    `&ordering=-incident_on` +
    `&limit=${pageLimit}` +
    `&incident_on__gt=${sinceDate}`;

  const seenIds = new Map();
  let pages = 0;

  try {
    while (
      url &&
      pages < maxPages
    ) {
      const j =
        await fetchBipadPage(url);

      (j.results || []).forEach(
        (r) => {
          if (
            r &&
            r.id != null
          ) {
            seenIds.set(
              r.id,
              r
            );
          }
        }
      );

      url = j.next || null;
      pages++;
    }
  } catch (e) {
    console.warn(
      `BIPAD fetch failed for hazard ${hazard} (${disasterType})`,
      e
    );

    return [];
  }

  const all =
    Array.from(
      seenIds.values()
    );

  return all
    .filter(
      (r) =>
        r.point &&
        Array.isArray(
          r.point.coordinates
        )
    )
    .map((r) => {
      const [
        lng,
        lat,
      ] = r.point.coordinates;

      const dateStr =
        r.incidentOn ||
        r.reportedOn ||
        r.createdOn;

      const date =
        new Date(dateStr);

      const district =
        classifyDistrict(
          lat,
          lng
        );

      const province =
        provinceOf(
          district
        );

      const place =
        (r.title || "")
          .replace(
            /^(Earthquake|Flood|Landslide)\s+at\s+/i,
            ""
          )
          .trim() ||
        r.streetAddress ||
        "Location not specified";

      const factParts = [];

      factParts.push(
        r.verified
          ? "Verified by BIPAD."
          : "Not yet verified by BIPAD."
      );

      if (r.dataSource) {
        factParts.push(
          `Reported via ${r.dataSource.replace(
            /_/g,
            " "
          )}.`
        );
      }

      if (r.source) {
        factParts.push(
          `Source type: ${r.source}.`
        );
      }

      if (
        r.wards &&
        r.wards.length
      ) {
        factParts.push(
          `Ward ID ${r.wards.join(
            ", "
          )}.`
        );
      }

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

        title:
          r.title ||
          `${disasterType} incident`,

        description:
          factParts.join(" "),

        lat,
        lng,

        /*
          Keep the verified-photo placeholder for
          the modal/data layer.

          getCardImage() will intentionally ignore
          this SVG and use a real fallback photo
          for dashboard cards.
        */
        image: noPhotoCard(
          district,
          date.toLocaleDateString(
            "en-GB",
            {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }
          )
        ),

        gallery: [],

        demo: false,

        source: "BIPAD",

        bipadUrl:
          "https://bipadportal.gov.np/",

        newsCount: 1,
        videoCount: 0,
        imageCount: 0,
      };
    })
    .filter(
      (d) =>
        YEARS.includes(
          d.year
        )
    );
}

/* ======================================================================
   GDACS
   ====================================================================== */

async function loadGDACS() {
  const url =
    "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH" +
    "?fromdate=2020-01-01" +
    "&todate=2026-12-31" +
    "&country=157" +
    "&eventtypes=FL";

  try {
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(
        "bad status"
      );
    }

    const j =
      await res.json();

    const feats =
      j.features || j || [];

    const mapped = feats
      .map((f, i) => {
        const p =
          f.properties || f;

        const geom =
          f.geometry || {};

        /*
          IMPORTANT:
          Never invent random disaster coordinates.

          If GDACS doesn't provide geometry,
          skip that event instead.
        */
        const coordinates =
          Array.isArray(
            geom.coordinates
          )
            ? geom.coordinates
            : null;

        if (
          !coordinates ||
          coordinates.length < 2
        ) {
          return null;
        }

        const [
          lng,
          lat,
        ] = coordinates;

        if (
          typeof lat !== "number" ||
          typeof lng !== "number"
        ) {
          return null;
        }

        const t = new Date(
          p.fromdate ||
            p.eventdate ||
            Date.now()
        );

        const alert =
          (
            p.alertlevel ||
            ""
          ).toLowerCase();

        let severity =
          "Low";

        if (
          alert === "red"
        ) {
          severity =
            "Critical";
        } else if (
          alert === "orange"
        ) {
          severity =
            "Severe";
        } else if (
          alert === "green"
        ) {
          severity =
            "Moderate";
        }

        const nearestDistrict =
          classifyDistrict(
            lat,
            lng
          );

        const province =
          provinceOf(
            nearestDistrict
          );

        return {
          id:
            `gdacs-fl-${
              p.eventid || i
            }`,

          disasterType:
            "flood",

          year:
            t.getFullYear(),

          date: t,

          country:
            "Nepal",

          province,

          district:
            nearestDistrict,

          municipality:
            p.name ||
            nearestDistrict,

          severity,

          title:
            p.name ||
            p.htmldescription ||
            "Flood event",

          description: (
            p.description ||
            p.htmldescription ||
            "Flood event recorded by GDACS (Global Disaster Alert and Coordination System)."
          ).replace(
            /<[^>]+>/g,
            ""
          ),

          lat,
          lng,

          image: noPhotoCard(
            nearestDistrict,
            t.toLocaleDateString(
              "en-GB",
              {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }
            )
          ),

          gallery: [],

          demo: false,

          gdacsUrl:
            p.url &&
            p.url.details
              ? p.url.details
              : p.eventid
                ? `https://www.gdacs.org/report.aspx?eventid=${p.eventid}&eventtype=FL`
                : "https://www.gdacs.org/",

          newsCount: 1,
          videoCount: 0,
          imageCount: 0,
        };
      })
      .filter(Boolean)
      .filter(
        (d) =>
          YEARS.includes(
            d.year
          )
      );

    if (mapped.length) {
      DB.flood = mapped;
      gdacsLoaded = true;
    } else {
      throw new Error(
        "no GDACS results for Nepal in range"
      );
    }
  } catch (e) {
    console.warn(
      "GDACS fetch failed or returned nothing, keeping demo flood data",
      e
    );
  }
}

/* ======================================================================
   USGS
   ====================================================================== */

async function loadUSGS() {
  const url =
    "https://earthquake.usgs.gov/fdsnws/event/1/query" +
    "?format=geojson" +
    "&starttime=2020-01-01" +
    "&endtime=2026-12-31" +
    "&minlatitude=26" +
    "&maxlatitude=31" +
    "&minlongitude=80" +
    "&maxlongitude=89" +
    "&minmagnitude=2.5" +
    "&limit=2000";

  try {
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(
        "bad status"
      );
    }

    const j =
      await res.json();

    const feats =
      j.features || [];

    DB.earthquake = feats
      .map((f, i) => {
        const mag =
          f.properties.mag || 0;

        const t =
          new Date(
            f.properties.time
          );

        const [
          lng,
          lat,
          depth,
        ] =
          f.geometry.coordinates;

        let severity =
          "Low";

        if (mag >= 6) {
          severity =
            "Critical";
        } else if (
          mag >= 5
        ) {
          severity =
            "Severe";
        } else if (
          mag >= 4
        ) {
          severity =
            "Moderate";
        }

        const nearestDistrict =
          classifyDistrict(
            lat,
            lng
          );

        const province =
          provinceOf(
            nearestDistrict
          );

        return {
          id:
            `eq-${
              f.id || i
            }`,

          disasterType:
            "earthquake",

          year:
            t.getFullYear(),

          date: t,

          country:
            "Nepal",

          province,

          district:
            nearestDistrict,

          municipality:
            f.properties.place ||
            nearestDistrict,

          severity,

          title:
            f.properties.place ||
            `M${mag.toFixed(
              1
            )} earthquake`,

          description:
            `Magnitude ${mag.toFixed(
              1
            )} earthquake recorded at a depth of ${
              depth
                ? depth.toFixed(
                    1
                  )
                : "—"
            } km. Source: USGS Earthquake Catalog.`,

          lat,
          lng,

          mag,
          depth,

          image: noPhotoCard(
            `M${mag.toFixed(
              1
            )} · ${nearestDistrict}`,
            t.toLocaleDateString(
              "en-GB",
              {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }
            )
          ),

          gallery: [],

          demo: false,

          usgsUrl:
            f.properties.url,

          newsCount: 1,
          videoCount: 0,
          imageCount: 0,
        };
      })
      .filter(
        (d) =>
          YEARS.includes(
            d.year
          )
      );
  } catch (e) {
    console.warn(
      "USGS fetch failed, falling back to demo quake data",
      e
    );

    DB.earthquake =
      YEARS.flatMap((y) =>
        genDemoIncidents(
          "earthquake",
          y,
          12
        ).map((d) => ({
          ...d,
          demo: true,
          mag: (
            2.5 +
            Math.random() * 4
          ).toFixed(1),
        }))
      );
  }

  usgsLoaded = true;
}

/* ======================================================================
   NEWS + VIDEO MEDIA
   ====================================================================== */

let MEDIA = {
  flood: {
    news: [],
    video: [],
    newsLoaded: false,
    videoLoaded: false,
  },

  earthquake: {
    news: [],
    video: [],
    newsLoaded: false,
    videoLoaded: false,
  },

  landslide: {
    news: [],
    video: [],
    newsLoaded: false,
    videoLoaded: false,
  },
};

async function fetchNews(disasterType) {
  const url =
    `/api/news?type=${encodeURIComponent(
      disasterType
    )}`;

  const res =
    await fetch(url);

  if (!res.ok) {
    throw new Error(
      "bad status " + res.status
    );
  }

  const j =
    await res.json();

  return (j.articles || [])
    .map((a, i) => ({
      id:
        `news-${disasterType}-${i}`,

      title:
        a.title ||
        "Untitled article",

      url: a.url,

      domain:
        a.sourceName ||
        "Unknown source",

      date:
        a.publishedAt
          ? new Date(
              a.publishedAt
            )
          : null,

      image:
        a.imageUrl || null,

      source:
        a.apiSource ||
        "News",
    }))
    .filter(
      (a) => a.url
    );
}

function dedupeNews(raw) {
  const seenImages =
    new Set();

  const seenTitles =
    new Set();

  const seenUrls =
    new Set();

  const deduped = [];

  for (const a of raw) {
    const normTitle =
      (a.title || "")
        .toLowerCase()
        .trim()
        .replace(
          /\s+/g,
          " "
        );

    const normUrl =
      normalizeImageUrl(
        a.url
      );

    const normImage =
      normalizeImageUrl(
        a.image
      );

    if (
      normUrl &&
      seenUrls.has(
        normUrl
      )
    ) {
      continue;
    }

    if (
      normTitle &&
      seenTitles.has(
        normTitle
      )
    ) {
      continue;
    }

    /*
      If two articles use exactly the same image,
      keep only the first one so the IMAGES view
      doesn't become a wall of duplicates.
    */
    if (
      normImage &&
      seenImages.has(
        normImage
      )
    ) {
      continue;
    }

    if (normUrl) {
      seenUrls.add(
        normUrl
      );
    }

    if (normTitle) {
      seenTitles.add(
        normTitle
      );
    }

    if (normImage) {
      seenImages.add(
        normImage
      );
    }

    deduped.push(a);
  }

  return deduped;
}

async function loadCategoryNews(
  disasterType
) {
  try {
    const news =
      dedupeNews(
        await fetchNews(
          disasterType
        )
      );

    MEDIA[
      disasterType
    ].news = news;
  } catch (e) {
    console.warn(
      `News fetch failed for ${disasterType}`,
      e
    );

    MEDIA[
      disasterType
    ].news = [];
  }

  MEDIA[
    disasterType
  ].newsLoaded = true;
}

async function loadCategoryVideos(
  disasterType
) {
  const q =
    encodeURIComponent(
      `${disasterType} Nepal disaster`
    );

  const url =
    `/api/youtube?q=${q}&max=16`;

  try {
    const res =
      await fetch(url);

    const j =
      await res.json();

    if (j.error) {
      throw new Error(
        j.error.message
      );
    }

    MEDIA[
      disasterType
    ].video =
      (j.items || [])
        .filter(
          (v) =>
            v &&
            v.id &&
            v.id.videoId &&
            v.snippet
        )
        .map((v) => ({
          id:
            v.id.videoId,

          title:
            v.snippet.title,

          url:
            `https://www.youtube.com/watch?v=${v.id.videoId}`,

          thumb:
            v.snippet
              .thumbnails &&
            (
              v.snippet
                .thumbnails.medium ||
              v.snippet
                .thumbnails.default
            )
              ? (
                  v.snippet
                    .thumbnails.medium ||
                  v.snippet
                    .thumbnails.default
                ).url
              : getCardImage(
                  {
                    id:
                      v.id.videoId,
                    title:
                      v.snippet.title,
                    disasterType,
                  }
                ),

          channel:
            v.snippet
              .channelTitle,

          date:
            new Date(
              v.snippet.publishedAt
            ),
        }));
  } catch (e) {
    console.warn(
      `YouTube category fetch failed for ${disasterType}`,
      e
    );

    MEDIA[
      disasterType
    ].video = [];
  }

  MEDIA[
    disasterType
  ].videoLoaded = true;
}

async function loadAllCategoryMedia() {
  const types = [
    "flood",
    "earthquake",
    "landslide",
  ];

  await Promise.all([
    ...types.map(
      loadCategoryNews
    ),

    ...types.map(
      loadCategoryVideos
    ),
  ]);
}

/* ======================================================================
   LIVE DATA
   ====================================================================== */

async function loadLiveData() {
  const bipadSlides =
    await loadBipadHazard(
      "landslide"
    );

  if (
    bipadSlides.length
  ) {
    DB.landslide =
      bipadSlides;
  }

  const bipadFloods =
    await loadBipadHazard(
      "flood"
    );

  if (
    bipadFloods.length
  ) {
    DB.flood =
      bipadFloods;
  } else {
    await loadGDACS();
  }

  await loadUSGS();

  const bipadQuakes =
    await loadBipadHazard(
      "earthquake"
    );

  if (
    bipadQuakes.length
  ) {
    DB.earthquake = [
      ...DB.earthquake.filter(
        (d) => !d.demo
      ),
      ...bipadQuakes,
    ];
  }
}

/* ======================================================================
   DEMO DATA
   ====================================================================== */

function buildDemoData() {
  DB.flood =
    YEARS.flatMap((y) =>
      genDemoIncidents(
        "flood",
        y,
        70 +
          Math.floor(
            Math.random() * 40
          )
      )
    );

  DB.landslide =
    YEARS.flatMap((y) =>
      genDemoIncidents(
        "landslide",
        y,
        40 +
          Math.floor(
            Math.random() * 30
          )
      )
    );
}

/* ======================================================================
   TILE EXPANSION
   ====================================================================== */

function expandTiles(
  incidents
) {
  const tiles = [];

  incidents.forEach(
    (inc, index) => {
      /*
        Every incident gets a guaranteed
        dashboard thumbnail.
      */
      tiles.push({
        ...inc,

        contentType:
          "incident",

        tileImg:
          getCardImage(
            inc,
            index
          ),
      });

      /*
        Demo incidents also generate
        image/news/video tiles.
      */
      if (inc.demo) {
        const ic =
          inc.imageCount || 2;

        for (
          let i = 0;
          i < ic;
          i++
        ) {
          tiles.push({
            ...inc,

            contentType:
              "image",

            tileImg:
              `https://picsum.photos/seed/${inc.id}-img${i}/380/380`,
          });
        }

        const nc =
          inc.newsCount || 1;

        for (
          let i = 0;
          i < nc;
          i++
        ) {
          tiles.push({
            ...inc,

            contentType:
              "news",

            tileImg:
              `https://picsum.photos/seed/${inc.id}-news${i}/380/380`,
          });
        }

        const vc =
          inc.videoCount || 0;

        for (
          let i = 0;
          i < vc;
          i++
        ) {
          tiles.push({
            ...inc,

            contentType:
              "video",

            tileImg:
              `https://picsum.photos/seed/${inc.id}-vid${i}/380/380`,
          });
        }
      }
    }
  );

  return tiles;
}

/* ======================================================================
   MEDIA TILES
   ====================================================================== */

function mediaTilesFor(
  disasterType,
  year
) {
  const tiles = [];

  const m =
    MEDIA[disasterType] || {
      news: [],
      video: [],
    };

  /*
    NEWS
  */

  m.news.forEach(
    (a) => {
      if (
        year !== "all" &&
        (
          !a.date ||
          a.date.getFullYear() !==
            year
        )
      ) {
        return;
      }

      tiles.push({
        id: a.id,

        disasterType,

        contentType:
          "news",

        demo: false,

        isMedia: true,

        title: a.title,

        district:
          a.domain,

        date:
          a.date ||
          new Date(),

        /*
          Guaranteed article image.
        */
        tileImg:
          getCardImage(a),

        mediaData: a,
      });
    }
  );

  /*
    VIDEOS
  */

  m.video.forEach(
    (v) => {
      if (
        year !== "all" &&
        (
          !v.date ||
          v.date.getFullYear() !==
            year
        )
      ) {
        return;
      }

      tiles.push({
        id: v.id,

        disasterType,

        contentType:
          "video",

        demo: false,

        isMedia: true,

        title: v.title,

        district:
          v.channel,

        date:
          v.date ||
          new Date(),

        tileImg:
          getCardImage(v),

        mediaData: v,
      });
    }
  );

  /*
    WIKIMEDIA COMMONS IMAGES

    Deduplicate before adding them to
    the archive so the IMAGES section
    doesn't show the same photo repeatedly.
  */

  const uniqueCommons =
    dedupeImages(
      COMMONS_CACHE[
        disasterType
      ] || []
    );

  uniqueCommons.forEach(
    (img, i) => {
      tiles.push({
        id:
          `commons-${disasterType}-${i}`,

        disasterType,

        contentType:
          "image",

        demo: false,

        isMedia: true,

        title:
          img.title ||
          "Reference photograph — Wikimedia Commons",

        district:
          img.artist,

        date: null,

        tileImg:
          img.url,

        mediaData:
          img,
      });
    }
  );

  return tiles;
}

/* ======================================================================
   HAZARD INFORMATION CONTENT — for the "Records in Detail" educational
   pages. Kept as structured data so one render function can build all
   three pages. Real events section pulls from already-loaded BIPAD/USGS
   data (DB) and real Wikimedia Commons photos (COMMONS_CACHE) — nothing
   here is fabricated disaster imagery or invented statistics.
   ====================================================================== */
const HAZARD_INFO = {
  flood: {
    label: "Floods", color: "var(--flood)", tag: "FLOOD",
    title: "FLOODS\nNEPAL",
    intro: "Monsoon rainfall, steep terrain, and dense river networks make flooding one of Nepal's most frequent and damaging hazards, affecting river valleys and low-lying settlements almost every year.",
    whatIs: "A flood occurs when water temporarily covers land that is normally dry — typically because a river, drainage system, or lake receives more water than it can carry or contain.",
    whyNepal: [
      "Roughly 80% of Nepal's annual rainfall falls during the June–September monsoon, concentrating extreme runoff into a short season.",
      "Nepal's rivers descend rapidly from the high Himalaya to the Tarai plains, giving water little time to disperse before reaching populated lowlands.",
      "Many towns and farmland have historically developed close to riverbanks for water access and fertile soil, placing them directly in flood-prone zones.",
      "Rapid, sometimes unplanned urban growth reduces natural ground absorption and can overwhelm drainage infrastructure not designed for extreme rainfall.",
      "Glacial and high-altitude lakes in some mountain regions add an additional, less frequent but severe flood risk (GLOFs)."
    ],
    science: "In simple terms: intense rainfall increases surface runoff faster than soil can absorb it or channels can carry it away. When a river's flow exceeds its channel capacity, or drainage systems back up, water spreads onto surrounding land.",
    diagram: ["Rainfall", "Runoff", "River / drainage capacity exceeded", "Inundation"],
    types: [
      {n:"01", t:"Riverine floods", d:"Sustained monsoon rain causes rivers to overflow their banks over hours to days."},
      {n:"02", t:"Flash floods", d:"Sudden, intense rainfall causes rapid water rise, often with little warning time."},
      {n:"03", t:"Urban floods", d:"Drainage systems in built-up areas are overwhelmed by heavy short-duration rainfall."},
      {n:"04", t:"Glacial Lake Outburst Floods (GLOFs)", d:"A sudden release of water from a glacial lake, often triggered by ice/rock movement."}
    ],
    recurring: "Certain locations flood repeatedly because the underlying factors — river course, low elevation, monsoon timing, and settlement placement — don't change year to year. A river's natural floodplain will keep flooding in most years with heavy rain unless drainage, flood defences, or land use around it changes.",
    riskReduction: [
      "Early warning systems that track rainfall and river levels upstream",
      "Floodplain zoning that limits new construction in the highest-risk areas",
      "Drainage system upgrades in urban areas",
      "River and embankment management to reduce erosion and overflow",
      "Community-level evacuation planning and drills",
      "Protecting natural buffers such as wetlands and floodplain vegetation where feasible"
    ],
    riskReductionNote: "These measures reduce exposure and damage — they don't eliminate the underlying hazard. A well-prepared flood-prone area still floods; it just handles the flood with less harm.",
    before: ["Prepare an emergency kit (water, food, torch, first aid, documents)", "Know your area's evacuation route in advance", "Keep important documents in a waterproof container", "Monitor official rainfall/river warnings during monsoon season", "Move valuables and equipment above likely flood-water levels"],
    during: ["Move to higher ground immediately if water is rising", "Follow official evacuation instructions without delay", "Never walk or drive through moving floodwater", "Stay away from electrical equipment and downed power lines", "Avoid contact with river water, which may carry debris or contamination"],
    after: ["Don't return home until authorities confirm it's safe", "Avoid contact with floodwater, which may be contaminated", "Check for structural damage before re-entering buildings", "Have electrical systems checked before use", "Follow official health and safety guidance"]
  },
  earthquake: {
    label: "Earthquakes", color: "var(--quake)", tag: "EARTHQUAKE",
    title: "EARTHQUAKES\nNEPAL",
    intro: "Nepal sits directly on the collision zone between two of the planet's major tectonic plates, making it one of the most seismically active regions in the world.",
    whatIs: "An earthquake is the sudden release of energy in the Earth's crust, usually along a fault, which produces seismic waves that shake the ground.",
    whyNepal: [
      "Nepal lies along the boundary where the Indian Plate is pushing into and under the Eurasian Plate at roughly 4-5 cm per year.",
      "This ongoing collision built the Himalaya and continues to store enormous stress along faults beneath and south of the mountain range.",
      "That stress is released periodically as earthquakes, some of which — like the 2015 Gorkha earthquake — have been highly destructive.",
      "Much of Nepal's population and infrastructure sit directly within this active seismic belt."
    ],
    science: "As the Indian Plate pushes beneath the Eurasian Plate, friction locks sections of the fault in place while stress slowly builds. When the accumulated stress exceeds the fault's strength, it ruptures suddenly, releasing energy as seismic waves that radiate outward and shake the surface.",
    diagram: ["Indian Plate", "Collision with Eurasian Plate", "Stress builds on fault", "Sudden rupture", "Seismic waves"],
    types: [
      {n:"—", t:"Magnitude", d:"A single number describing the energy released at the earthquake's source (e.g. the Richter or moment magnitude scale)."},
      {n:"—", t:"Intensity", d:"How strongly shaking is actually felt at a specific location — it varies by distance, depth, and local ground conditions, unlike magnitude."}
    ],
    recurring: "Nepal experiences frequent smaller earthquakes because tectonic stress along the Himalayan front is released continuously in smaller increments, punctuated by rarer, much larger events when a longer fault segment ruptures at once.",
    riskReduction: [
      "Earthquake-resistant construction techniques for new buildings",
      "Retrofitting older, vulnerable buildings to improve structural resilience",
      "Enforcing and updating building codes",
      "Securing heavy furniture and objects indoors",
      "Household and community emergency planning",
      "Public education on immediate earthquake response"
    ],
    riskReductionNote: "Earthquakes themselves cannot be prevented — risk reduction is entirely about reducing how much damage and harm they cause when they happen.",
    before: ["Identify safe spots in each room (under sturdy furniture, away from windows)", "Secure heavy furniture, shelving, and water heaters to walls", "Keep an emergency kit with water, food, and first aid", "Agree on a family emergency communication plan"],
    during: ["DROP to the ground", "Take COVER under sturdy furniture", "HOLD ON until the shaking stops", "Stay away from windows and exterior walls", "Do not use elevators"],
    after: ["Expect aftershocks — they can happen minutes to weeks later", "Check yourself and others for injuries", "Check for gas leaks and electrical damage before using switches", "Evacuate visibly damaged buildings", "Follow official instructions and updates"]
  },
  landslide: {
    label: "Landslides", color: "var(--slide)", tag: "LANDSLIDE",
    title: "LANDSLIDES\nNEPAL",
    intro: "Nepal's steep Himalayan terrain, combined with intense monsoon rainfall, creates conditions where slopes fail frequently — making landslides a near-annual hazard across hill and mountain districts.",
    whatIs: "A landslide is the downward movement of rock, soil, or debris on a slope, occurring when the force of gravity exceeds the strength holding the material in place.",
    whyNepal: [
      "Much of Nepal's terrain consists of steep slopes with young, geologically unstable rock and soil.",
      "Intense monsoon rainfall saturates soil, adding weight and reducing the internal friction that normally holds slopes together.",
      "Rivers continuously erode the base of slopes in hill and mountain regions, undercutting their stability.",
      "Road cutting into hillsides, often without adequate slope support, can destabilize surrounding terrain.",
      "Land-use changes on steep slopes can further reduce natural slope stability."
    ],
    science: "Rainfall infiltrates soil and increases water pressure between soil particles (pore pressure), which reduces the internal friction holding a slope together. Once the gravitational pull on the slope exceeds its remaining strength, the material fails and moves downhill.",
    diagram: ["Rainfall", "Soil saturation", "Increased pore pressure", "Reduced slope strength", "Slope failure"],
    types: [
      {n:"01", t:"Debris flows", d:"Fast-moving mixtures of soil, rock, and water, often following heavy rainfall."},
      {n:"02", t:"Slope failures", d:"Sections of a hillside give way, sometimes gradually and sometimes suddenly."},
      {n:"03", t:"Road-cut slides", d:"Instability triggered by cutting into hillsides for road construction."}
    ],
    recurring: "Some slopes fail repeatedly because the underlying conditions — steepness, geology, and monsoon rainfall — persist year after year. A slope that has failed once is often still unstable and may continue to move or fail again in future rainy seasons.",
    riskReduction: [
      "Slope drainage systems to reduce water saturation",
      "Retaining structures on vulnerable slopes",
      "Vegetation and slope stabilization where appropriate",
      "Safer road-cutting practices with proper slope support",
      "Slope monitoring in known high-risk areas",
      "Land-use planning that avoids building on known unstable slopes",
      "Early warning systems tied to rainfall thresholds"
    ],
    riskReductionNote: "These measures reduce the likelihood and severity of failures — they can't guarantee a slope will never move again, especially under extreme rainfall.",
    warningSigns: ["New cracks appearing in the ground or on structures", "Trees or utility poles tilting unexpectedly", "Unusual water seepage or new springs on a slope", "Small rockfalls or debris ahead of a larger event", "Bulging ground at the base of a slope", "Sudden changes in stream water level or clarity"],
    before: ["Learn whether your area has a history of landslides", "Know evacuation routes away from steep slopes", "Prepare an emergency kit", "Report visible warning signs to local authorities"],
    during: ["Move away from the path of the slide as quickly as possible", "Move to higher, more stable ground if a slide begins nearby", "Avoid river valleys and low-lying areas near slopes", "Listen for unusual sounds — cracking trees, rumbling — which may indicate moving debris"],
    after: ["Stay away from the slide area — further movement is possible", "Report damaged roads, utilities, or infrastructure", "Check for injured or trapped people if safe to do so", "Follow official guidance before returning to affected areas"]
  }
};