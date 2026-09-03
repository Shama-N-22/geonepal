/* ---------- filtering ---------- */
function getFilteredTiles() {
  if (!state.disaster) return [];
  let incidents = DB[state.disaster] || [];
  if (state.year !== "all")
    incidents = incidents.filter((d) => d.year === state.year);
  if (state.province !== "all")
    incidents = incidents.filter((d) => d.province === state.province);
  if (state.district !== "all")
    incidents = incidents.filter((d) => d.district === state.district);
  if (state.severity !== "all")
    incidents = incidents.filter((d) => d.severity === state.severity);
  let tiles = expandTiles(incidents);

  if (
    state.province === "all" &&
    state.district === "all" &&
    state.severity === "all"
  ) {
    tiles = tiles.concat(mediaTilesFor(state.disaster, state.year));
  }

  if (state.contentType !== "all")
    tiles = tiles.filter((t) => t.contentType === state.contentType);
  if (state.search.trim()) {
    const q = state.search.trim().toLowerCase();
    tiles = tiles.filter(
      (t) =>
        (t.district || "").toLowerCase().includes(q) ||
        (t.province || "").toLowerCase().includes(q) ||
        (t.title || "").toLowerCase().includes(q) ||
        (t.year ? String(t.year).includes(q) : false) ||
        (t.disasterType || "").includes(q),
    );
  }
  return tiles;
}

/* ---------- rendering: hero counts ---------- */
function updateHeroCounts() {
  document.getElementById("countFlood").textContent = DB.flood.length;
  document.getElementById("countEarthquake").textContent = DB.earthquake.length;
  document.getElementById("countLandslide").textContent = DB.landslide.length;
  const badge = document.getElementById("liveBadge");
  if (usgsLoaded) {
    badge.textContent = `● Live: ${DB.earthquake.length} USGS earthquake records loaded (2020–2026)`;
  }
}

/* ---------- year rail ---------- */
function renderYearRail() {
  const rail = document.getElementById("yearRail");
  const meta = TYPE_META[state.disaster];
  rail.innerHTML = "";
  const allChip = document.createElement("div");
  allChip.className = "year-chip" + (state.year === "all" ? " active" : "");
  allChip.style.setProperty("--accent", meta.color);
  allChip.innerHTML = `<span class="y">ALL</span><span class="c">${DB[state.disaster].length} total</span>`;
  allChip.onclick = () => {
    state.year = "all";
    state.visibleCount = 150;
    renderYearRail();
    renderStats();
    renderGrid();
  };
  rail.appendChild(allChip);
  YEARS.slice()
    .reverse()
    .forEach((y) => {
      const count = DB[state.disaster].filter((d) => d.year === y).length;
      const chip = document.createElement("div");
      chip.className = "year-chip" + (state.year === y ? " active" : "");
      chip.style.setProperty("--accent", meta.color);
      chip.innerHTML = `<span class="y">${y}</span><span class="c">${count} incidents</span>`;
      chip.onclick = () => {
        state.year = y;
        state.visibleCount = 150;
        renderYearRail();
        renderStats();
        renderGrid();
      };
      rail.appendChild(chip);
    });
}

/* ---------- stats bar ---------- */
function animateNum(el, target) {
  const dur = 900,
    start = performance.now();
  function step(now) {
    const p = Math.min(1, (now - start) / dur);
    el.textContent = Math.floor(p * target).toLocaleString();
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = target.toLocaleString();
  }
  requestAnimationFrame(step);
}
function renderStats() {
  const bar = document.getElementById("statsBar");
  let incidents = DB[state.disaster] || [];
  if (state.year !== "all")
    incidents = incidents.filter((d) => d.year === state.year);
  const districts = new Set(incidents.map((d) => d.district)).size;
  const provinces = new Set(incidents.map((d) => d.province)).size;
  const media = mediaTilesFor(state.disaster, state.year);
  const images =
    media.filter((m) => m.contentType === "image").length +
    incidents.reduce((a, d) => a + (d.demo ? d.imageCount || 0 : 0), 0);
  const videos =
    media.filter((m) => m.contentType === "video").length +
    incidents.reduce((a, d) => a + (d.demo ? d.videoCount || 0 : 0), 0);
  const news =
    media.filter((m) => m.contentType === "news").length +
    incidents.reduce((a, d) => a + (d.demo ? d.newsCount || 0 : 0), 0);
  const cells = [
    ["Incidents", incidents.length],
    ["Districts", districts],
    ["Images", images],
    ["Videos", videos],
    ["News Reports", news],
    ["Provinces", provinces],
  ];
  bar.innerHTML = cells
    .map(
      ([label, num]) => `
    <div class="stat-cell"><div class="stat-num" data-target="${num}">0</div><div class="stat-label">${label}</div></div>
  `,
    )
    .join("");
  bar
    .querySelectorAll(".stat-num")
    .forEach((el) => animateNum(el, +el.dataset.target));
}

/* ---------- toolbar filters ---------- */
function renderProvinceOptions() {
  const sel = document.getElementById("provinceSelect");
  sel.innerHTML =
    '<option value="all">All Provinces</option>' +
    Object.keys(PROVINCES)
      .map((p) => `<option value="${p}">${p}</option>`)
      .join("");
}
function renderDistrictOptions() {
  const sel = document.getElementById("districtSelect");
  const list =
    state.province === "all" ? ALL_DISTRICTS : PROVINCES[state.province];
  sel.innerHTML =
    '<option value="all">All Districts</option>' +
    list.map((d) => `<option value="${d}">${d}</option>`).join("");
}

/* ---------- grid rendering ---------- */
function renderGrid() {
  const tiles = getFilteredTiles();
  const grid = document.getElementById("tileGrid");
  const shown = tiles.slice(0, state.visibleCount);
  document.getElementById("resultCount").textContent =
    `${tiles.length.toLocaleString()} RESULTS`;
  if (!tiles.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;padding:40px 10px;font-family:var(--font-mono);font-size:12px;color:var(--text-2);border:1px dashed var(--panel-border);text-align:center;">
      No records match this filter. ${state.contentType !== "all" ? `Real BIPAD/USGS/GDACS records currently only include structured incident data — no separate news/image/video items exist yet for this category, so this filter is empty rather than fabricated.` : `Try a different year, province, or search term.`}
    </div>`;
    document.getElementById("loadMoreBtn").style.display = "none";
    return;
  }
  grid.innerHTML = shown
    .map((t) => {
      const meta = TYPE_META[t.disasterType];
      const typeIcon = { incident: "📍", image: "📷", news: "📰", video: "▶" }[
        t.contentType
      ];
      return `<div class="tile" data-id="${t.id}" data-ct="${t.contentType}" data-media="${t.isMedia ? "1" : "0"}">
      <span class="type-dot" style="background:${meta.color};color:${meta.color}"></span>
      ${t.demo ? '<span class="demo-tag">DEMO</span>' : '<span class="demo-tag" style="color:#39d97a">LIVE</span>'}
      <img loading="lazy" src="${t.tileImg}" alt="${t.title}">
      <div class="tile-overlay">
        <div class="tile-loc">${typeIcon} ${t.district}</div>
        <div class="tile-date">${t.date ? t.date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Reference"}</div>
        <div class="tile-view">VIEW →</div>
      </div>
    </div>`;
    })
    .join("");
  grid.querySelectorAll(".tile").forEach((el) => {
    el.onclick = () => {
      const id = el.dataset.id;
      if (el.dataset.media === "1") {
        const allMedia = mediaTilesFor(state.disaster, "all");
        const item = allMedia.find((m) => m.id === id);
        if (item) openMediaModal(item);
        return;
      }
      const inc = (DB[state.disaster] || []).find((d) => d.id === id);
      if (inc) openModal(inc);
    };
  });
  document.getElementById("loadMoreBtn").style.display =
    tiles.length > state.visibleCount ? "inline-block" : "none";
}

/* ---------- map view — real Leaflet + OpenStreetMap, real coordinates ---------- */
let mainLeafletMap = null;
let mainMarkersLayer = null;

function renderMap() {
  let incidents = DB[state.disaster] || [];
  if (state.year !== "all")
    incidents = incidents.filter((d) => d.year === state.year);
  const meta = TYPE_META[state.disaster];

  if (!mainLeafletMap) {
    mainLeafletMap = L.map("leafletMap", { preferCanvas: true }).setView(
      [28.3949, 84.124],
      7,
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
    }).addTo(mainLeafletMap);
    mainMarkersLayer = L.layerGroup().addTo(mainLeafletMap);
  } else {
    setTimeout(() => mainLeafletMap.invalidateSize(), 60);
  }

  mainMarkersLayer.clearLayers();
  const colorVar =
    state.disaster === "flood"
      ? "--flood"
      : state.disaster === "earthquake"
        ? "--quake"
        : "--slide";
  const color = getComputedStyle(document.documentElement)
    .getPropertyValue(colorVar)
    .trim();

  const CAP = 500;
  const shown = incidents.slice(0, CAP);
  shown.forEach((inc) => {
    if (typeof inc.lat !== "number" || typeof inc.lng !== "number") return;
    const marker = L.circleMarker([inc.lat, inc.lng], {
      radius: 6,
      color: color,
      weight: 1.5,
      fillColor: color,
      fillOpacity: 0.55,
    });
    const verifiedLine =
      inc.verified !== undefined
        ? inc.verified
          ? " · ✓ Verified"
          : " · Unverified"
        : inc.mag
          ? ` · M${(+inc.mag).toFixed(1)}`
          : "";
    marker.bindPopup(
      `<strong>${inc.title}</strong><br>${inc.district}, ${inc.province}<br>${inc.date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}${verifiedLine}<br><a href="#" style="color:${color}">View full details →</a>`,
    );
    marker.on("popupopen", (e) => {
      const link = e.popup._contentNode.querySelector("a");
      if (link)
        link.onclick = (ev) => {
          ev.preventDefault();
          openModal(inc);
        };
    });
    marker.addTo(mainMarkersLayer);
  });

  document.getElementById("mapLegend").innerHTML = `
    <div style="font-weight:600;color:#fff;margin-bottom:2px;">${incidents.length.toLocaleString()} RECORDS${incidents.length > CAP ? ` (showing first ${CAP})` : ""}</div>
    <div><span class="sw" style="background:${meta.color}"></span>${meta.label} — real coordinates from ${state.disaster === "earthquake" ? "USGS/BIPAD" : "BIPAD"}</div>
  `;
}

/* ---------- timeline section ---------- */
function renderTimeline() {
  const rail = document.getElementById("timelineRail");
  const meta = TYPE_META[state.disaster];
  rail.innerHTML = YEARS.slice()
    .reverse()
    .map((y) => {
      const incidents = (DB[state.disaster] || []).filter((d) => d.year === y);
      let top = [...incidents]
        .sort((a, b) => (b.mag || 0) - (a.mag || 0) || 0)
        .slice(0, 3);
      if (state.disaster !== "earthquake") top = incidents.slice(0, 3);
      return `<div class="timeline-year">
      <div class="ty">${y} · ${incidents.length} RECORDS</div>
      ${top.map((t) => `<div class="tev" data-id="${t.id}"><span class="dot" style="background:${meta.color}"></span>${t.district}${t.mag ? ` — M${(+t.mag).toFixed(1)}` : ""}</div>`).join("") || '<div class="tev" style="opacity:.4">No records</div>'}
    </div>`;
    })
    .join("");
  rail.querySelectorAll(".tev[data-id]").forEach((el) => {
    el.onclick = () => {
      const inc = (DB[state.disaster] || []).find(
        (d) => d.id === el.dataset.id,
      );
      if (inc) openModal(inc);
    };
  });
}

/* ---------- modal ---------- */
async function openModal(inc) {
  const meta = TYPE_META[inc.disasterType];
  const overlay = document.getElementById("modalOverlay");
  const panel = document.getElementById("modalPanel");
  panel.style.setProperty("--accent", meta.color);

  const stages =
    inc.disasterType === "earthquake"
      ? ["Reported", "Aftershocks", "Assessment", "Response", "Recovery"]
      : ["Reported", "Escalation", "Peak", "Response", "Recovery"];
  const filledCount = inc.demo ? 2 + Math.floor(Math.random() * 3) : 3;

  panel.innerHTML = `
    <div class="modal-hero">
      <img src="${inc.image}" alt="" id="heroImg_${inc.id}">
      <button class="modal-close" id="modalCloseBtn">✕</button>
      <div class="modal-headtext">
        <span class="type-tag" style="color:${meta.color};border-color:${meta.color}">${meta.icon} ${meta.tag}</span>
        <h2>${inc.title}</h2>
        <div class="modal-meta">
          <span>📍 ${inc.district}, ${inc.province}</span>
          <span>📅 ${inc.date.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</span>
          ${inc.severity ? `<span>⚠ ${inc.severity}</span>` : inc.verified !== undefined ? `<span>${inc.verified ? "✓ Verified by BIPAD" : "◌ Unverified"}</span>` : ""}
          ${inc.mag ? `<span>Magnitude ${(+inc.mag).toFixed(1)}</span>` : ""}
        </div>
      </div>
    </div>
    <div class="modal-body">
      <div class="modal-block">
        <h4>What Happened <span style="font-size:10px;color:var(--text-2);font-weight:400;">— BIPAD / USGS / GDACS, authoritative incident data</span></h4>
        <p>${inc.description}</p>
        ${
          inc.demo
            ? `<div class="demo-note">◆ DEMONSTRATION RECORD — not a verified real event, for layout preview only</div>`
            : `<div class="real-note">◆ LIVE DATA — sourced from ${inc.usgsUrl ? "the USGS Earthquake Catalog" : inc.bipadUrl ? "Nepal's BIPAD disaster portal" : inc.gdacsUrl ? "GDACS (Global Disaster Alert and Coordination System)" : "a live public feed"}${inc.usgsUrl || inc.bipadUrl || inc.gdacsUrl ? ` · <a href="${inc.usgsUrl || inc.bipadUrl || inc.gdacsUrl}" target="_blank" style="text-decoration:underline">View source record →</a>` : ""}</div>`
        }
      </div>
      <div class="modal-block">
        <h4>Visual Evidence</h4>
        ${
          inc.gallery.length
            ? `
        <div class="gallery-strip" id="galleryStrip_${inc.id}">${[inc.image, ...inc.gallery].map((g) => `<img src="${g}" loading="lazy">`).join("")}</div>
        ${
          inc.demo
            ? `<div class="demo-note" style="margin-top:10px">◆ Placeholder imagery — connect a real media source to replace</div>`
            : `<div id="imgNote_${inc.id}" class="real-note" style="margin-top:10px">◆ REFERENCE IMAGERY — real, freely-licensed photographs from Wikimedia Commons' Nepal disaster archive. These may not depict this specific incident.${inc.imageAttribution && inc.imageAttribution[0] ? ` Photo credit: ${inc.imageAttribution[0].artist} (${inc.imageAttribution[0].license}) · <a href="${inc.imageAttribution[0].descriptionUrl}" target="_blank" style="text-decoration:underline">Source →</a>` : ""}</div>`
        }
        `
            : `
        <div id="imgNote_${inc.id}" style="font-family:var(--font-mono);font-size:11.5px;color:var(--text-2);border:1px dashed var(--panel-border);padding:16px;">No verified photograph is available for this record yet. This is real event data — we're not substituting a stock or generated image for it.</div>
        `
        }
      </div>
      <div class="modal-block">
        <h4>Source Record <span style="font-size:10px;color:var(--text-2);font-weight:400;">— the official record itself</span></h4>
        ${
          inc.demo
            ? `
          <div class="news-item">
            <div><div class="nh">${meta.label} update: ${inc.district} monitoring situation</div><div class="ns">Demo Wire Service · ${inc.date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div></div>
            <button class="news-btn">DEMO ARTICLE</button>
          </div>`
            : `
          <div class="news-item">
            <div><div class="nh">${inc.title} — ${inc.usgsUrl ? "USGS Event Report" : inc.bipadUrl ? "BIPAD Incident Record" : "GDACS Event Report"}</div><div class="ns">${inc.usgsUrl ? "USGS Earthquake Hazards Program" : inc.bipadUrl ? "Nepal Disaster Risk Reduction Portal (BIPAD)" : "GDACS · JRC/UNOCHA"} · ${inc.date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div></div>
            <a class="news-btn" href="${inc.usgsUrl || inc.bipadUrl || inc.gdacsUrl || "#"}" target="_blank">VIEW RECORD →</a>
          </div>`
        }
      </div>
      <div class="modal-block" id="gdeltBlock_${inc.id}" style="display:none">
        <h4>Related News <span style="font-size:10px;color:var(--text-2);font-weight:400;">— general ${meta.label.toLowerCase()} coverage, not specific to this incident</span></h4>
        <div id="gdeltContent_${inc.id}"></div>
      </div>
      <div class="modal-block" id="wikiBlock_${inc.id}" style="display:none">
        <h4>Background Reading <span style="font-size:10px;color:var(--text-2);font-weight:400;">— general context via Wikipedia</span></h4>
        <div id="wikiContent_${inc.id}"></div>
      </div>
      <div class="modal-block">
        <h4>Videos</h4>
        <div class="video-grid" id="videoGrid_${inc.id}">
          <div style="grid-column:1/-1;font-family:var(--font-mono);font-size:11px;color:var(--text-2)">Loading real videos via YouTube API…</div>
        </div>
      </div>
      <div class="modal-block">
        <h4>Location</h4>
        <div class="mini-map" id="miniMap_${inc.id}"></div>
      </div>
      <div class="modal-block">
        <h4>Incident Timeline</h4>
        <div class="timeline-stages">
          ${stages.map((s, i) => `<div class="tstage ${i < filledCount ? "filled" : ""}" style="--accent:${meta.color}"><div class="tdot"></div><div class="tl">${s}</div></div>`).join("")}
        </div>
      </div>
    </div>
  `;
  overlay.classList.add("show");
  document.getElementById("modalCloseBtn").onclick = closeModal;
  overlay.onclick = (e) => {
    if (e.target === overlay) closeModal();
  };

  fetchYouTube(inc, document.getElementById(`videoGrid_${inc.id}`));
  if (!inc.demo) {
    loadWikiSummary(inc.disasterType).then((w) => {
      if (!w || !w.extract) return;
      const block = document.getElementById(`wikiBlock_${inc.id}`);
      const content = document.getElementById(`wikiContent_${inc.id}`);
      if (!block || !content) return;
      content.innerHTML = `
        <p>${w.extract}</p>
        <div class="demo-note" style="margin-top:10px;color:var(--text-2);border-color:var(--panel-border);background:none;">◆ General background from Wikipedia — not a report on this specific incident · <a href="${w.url}" target="_blank" style="text-decoration:underline;color:var(--text-1)">Read on Wikipedia →</a></div>
      `;
      block.style.display = "block";
    });

    const gdeltBlock = document.getElementById(`gdeltBlock_${inc.id}`);
    const gdeltContent = document.getElementById(`gdeltContent_${inc.id}`);
    if (gdeltBlock && gdeltContent) {
      const catNews =
        (MEDIA[inc.disasterType] && MEDIA[inc.disasterType].news) || [];
      if (!catNews.length) {
        gdeltBlock.style.display = "block";
        gdeltContent.innerHTML = `<div style="font-family:var(--font-mono);font-size:11px;color:var(--text-2)">No real news coverage found for ${meta.label.toLowerCase()} in Nepal right now — check the NEWS filter tab, it updates as coverage appears.</div>`;
      } else {
        gdeltBlock.style.display = "block";
        gdeltContent.innerHTML =
          catNews
            .slice(0, 3)
            .map(
              (a) => `
          <div class="news-item">
            <div><div class="nh">${a.title}</div><div class="ns">${a.domain}${a.date ? " · " + a.date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : ""} · ${a.source || "News"}</div></div>
            <a class="news-btn" href="${a.url}" target="_blank">READ ARTICLE →</a>
          </div>
        `,
            )
            .join("") +
          `<div class="demo-note" style="margin-top:10px;color:var(--text-2);border-color:var(--panel-border);background:none;">◆ Showing general ${meta.label.toLowerCase()} coverage, not necessarily this exact incident — see the NEWS filter tab for the full list.</div>`;
      }
    }
  }

  if (typeof inc.lat === "number" && typeof inc.lng === "number") {
    setTimeout(() => {
      const container = document.getElementById(`miniMap_${inc.id}`);
      if (!container || !window.L) return;
      const miniMap = L.map(container, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
      }).setView([inc.lat, inc.lng], 11);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
      }).addTo(miniMap);
      L.circleMarker([inc.lat, inc.lng], {
        radius: 8,
        color: meta.color,
        weight: 2,
        fillColor: meta.color,
        fillOpacity: 0.6,
      }).addTo(miniMap);
      miniMap.invalidateSize();
    }, 80);
  }
}
function closeModal() {
  document.getElementById("modalOverlay").classList.remove("show");
}

/* ---------- media modal (for News/Video/Image tiles — category-level, real, not tied to one incident) ---------- */
function openMediaModal(item) {
  const meta = TYPE_META[item.disasterType];
  const overlay = document.getElementById("modalOverlay");
  const panel = document.getElementById("modalPanel");
  panel.style.setProperty("--accent", meta.color);

  const kindLabel = {
    news: "NEWS ARTICLE",
    video: "VIDEO",
    image: "REFERENCE PHOTOGRAPH",
  }[item.contentType];
  const sourceLabel =
    item.contentType === "news"
      ? `via ${(item.mediaData && item.mediaData.source) || "news search"}`
      : { video: "via YouTube", image: "via Wikimedia Commons" }[
          item.contentType
        ];

  panel.innerHTML = `
    <div class="modal-hero" style="height:280px;">
      <img src="${item.tileImg}" alt="">
      <button class="modal-close" id="modalCloseBtn">✕</button>
      <div class="modal-headtext">
        <span class="type-tag" style="color:${meta.color};border-color:${meta.color}">${meta.icon} ${kindLabel}</span>
        <h2 style="font-size:clamp(20px,2.6vw,28px);">${item.title}</h2>
        <div class="modal-meta">
          <span>${item.district}</span>
          ${item.date ? `<span>📅 ${item.date.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</span>` : ""}
        </div>
      </div>
    </div>
    <div class="modal-body">
      <div class="modal-block">
        <div class="real-note">◆ ${sourceLabel.toUpperCase()} — general ${meta.label.toLowerCase()} coverage for Nepal, not tied to one specific BIPAD incident record.</div>
      </div>
      ${
        item.contentType === "image" && item.mediaData
          ? `
      <div class="modal-block">
        <h4>Attribution</h4>
        <p>Photographer/uploader: ${item.mediaData.artist || "Unknown"}<br>License: ${item.mediaData.license || "See Commons page"}</p>
        <a class="news-btn" href="${item.mediaData.descriptionUrl}" target="_blank" style="display:inline-block;margin-top:8px;">VIEW ON COMMONS →</a>
      </div>`
          : `
      <div class="modal-block">
        <a class="news-btn" href="${item.mediaData ? item.mediaData.url : "#"}" target="_blank" style="display:inline-block;">${item.contentType === "video" ? "WATCH ON YOUTUBE →" : "READ ARTICLE →"}</a>
      </div>`
      }
    </div>
  `;
  overlay.classList.add("show");
  document.getElementById("modalCloseBtn").onclick = closeModal;
  overlay.onclick = (e) => {
    if (e.target === overlay) closeModal();
  };
}

/* ---------- YouTube fetch (real, needs user key) ---------- */
async function fetchYouTube(inc, container) {
  try {
    const q = encodeURIComponent(
      `${inc.district} Nepal ${inc.disasterType} ${inc.year}`,
    );
    const url = `/api/youtube?q=${q}&max=4`;
    const res = await fetch(url);
    const j = await res.json();
    if (j.error) {
      container.innerHTML = `<div style="grid-column:1/-1;font-family:var(--font-mono);font-size:11px;color:#ff5a3c">YouTube API error: ${j.error.message}</div>`;
      return;
    }
    const items = j.items || [];
    if (!items.length) {
      container.innerHTML = `<div style="grid-column:1/-1;font-family:var(--font-mono);font-size:11px;color:var(--text-2)">No real videos found for this query.</div>`;
      return;
    }
    container.innerHTML = items
      .map(
        (v) => `
      <a class="video-tile" href="https://www.youtube.com/watch?v=${v.id.videoId}" target="_blank">
        <img src="${v.snippet.thumbnails.medium.url}">
        <div class="play"><span>▶</span></div>
        <div class="vt">${v.snippet.title.slice(0, 60)}</div>
      </a>`,
      )
      .join("");
  } catch (e) {
    container.innerHTML = `<div style="grid-column:1/-1;font-family:var(--font-mono);font-size:11px;color:#ff5a3c">Could not reach YouTube API.</div>`;
  }
}
