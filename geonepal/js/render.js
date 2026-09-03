/* ================================================================
   GEONEPAL — RENDER / UI LAYER
   ================================================================ */

/* ---------- small helpers ---------- */

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(date, style = "short") {
  if (!date) return "Reference";

  const d = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(d.getTime())) return "Reference";

  return d.toLocaleDateString(
    "en-GB",
    style === "long"
      ? {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }
      : {
          day: "2-digit",
          month: "short",
          year: "numeric",
        },
  );
}

function getMediaSource(item) {
  if (!item) return "Public source";

  if (item.contentType === "news") {
    return (
      item.mediaData?.source ||
      item.mediaData?.domain ||
      item.district ||
      "News"
    );
  }

  if (item.contentType === "video") {
    return (
      item.mediaData?.channel ||
      item.district ||
      "YouTube"
    );
  }

  if (item.contentType === "image") {
    return (
      item.mediaData?.artist ||
      "Wikimedia Commons"
    );
  }

  return "Public source";
}

function imageFallbackHTML(seed) {
  const safe = String(seed || "nepal")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 40);

  return `https://picsum.photos/seed/geonepal-fallback-${safe || "nepal"}/900/600`;
}

/* ---------- filtering ---------- */

function getFilteredTiles() {
  if (!state.disaster) return [];

  let incidents = DB[state.disaster] || [];

  if (state.year !== "all") {
    incidents = incidents.filter(
      (d) => d.year === state.year,
    );
  }

  if (state.province !== "all") {
    incidents = incidents.filter(
      (d) => d.province === state.province,
    );
  }

  if (state.district !== "all") {
    incidents = incidents.filter(
      (d) => d.district === state.district,
    );
  }

  if (state.severity !== "all") {
    incidents = incidents.filter(
      (d) => d.severity === state.severity,
    );
  }

  let tiles = expandTiles(incidents);

  /*
    Category-level media is intentionally added only
    when geographic/severity filters are not active.
  */
  if (
    state.province === "all" &&
    state.district === "all" &&
    state.severity === "all"
  ) {
    tiles = tiles.concat(
      mediaTilesFor(
        state.disaster,
        state.year,
      ),
    );
  }

  if (state.contentType !== "all") {
    tiles = tiles.filter(
      (t) =>
        t.contentType === state.contentType,
    );
  }

  const query = state.search.trim().toLowerCase();

  if (query) {
    tiles = tiles.filter((t) => {
      const fields = [
        t.district,
        t.province,
        t.title,
        t.year,
        t.disasterType,
        t.municipality,
        t.contentType,
        t.mediaData?.source,
        t.mediaData?.domain,
        t.mediaData?.channel,
        t.mediaData?.artist,
      ];

      return fields.some((field) =>
        String(field ?? "")
          .toLowerCase()
          .includes(query),
      );
    });
  }

  return tiles;
}

/* ================================================================
   HERO COUNTS
   ================================================================ */

function updateHeroCounts() {
  document.getElementById("countFlood").textContent =
    DB.flood.length.toLocaleString();

  document.getElementById(
    "countEarthquake",
  ).textContent =
    DB.earthquake.length.toLocaleString();

  document.getElementById(
    "countLandslide",
  ).textContent =
    DB.landslide.length.toLocaleString();

  const badge =
    document.getElementById("liveBadge");

  if (!badge) return;

  const liveParts = [];

  if (usgsLoaded) {
    liveParts.push(
      `${DB.earthquake.length.toLocaleString()} USGS earthquakes`,
    );
  }

  if (gdacsLoaded) {
    liveParts.push("GDACS");
  }

  if (liveParts.length) {
    badge.textContent =
      `● LIVE DATA · ${liveParts.join(" · ")} · 2020–2026`;
  } else {
    badge.textContent =
      "● LIVE DATA · BIPAD / USGS / GDACS";
  }
}

/* ================================================================
   HOMEPAGE NEWS
   ================================================================ */

function renderHomeNews() {
  const section =
    document.getElementById(
      "homeNewsSection",
    );

  const track =
    document.getElementById(
      "homeNewsTrack",
    );

  if (!section || !track) return;

  const allNews = [
    ...(MEDIA.flood?.news || []).map(
      (a) => ({
        ...a,
        disasterType: "flood",
      }),
    ),

    ...(MEDIA.earthquake?.news || []).map(
      (a) => ({
        ...a,
        disasterType: "earthquake",
      }),
    ),

    ...(MEDIA.landslide?.news || []).map(
      (a) => ({
        ...a,
        disasterType: "landslide",
      }),
    ),
  ];

  const seen = new Set();

  const news = allNews
    .filter((a) => {
      const key =
        a.url ||
        a.title ||
        Math.random();

      if (seen.has(key)) return false;

      seen.add(key);

      return true;
    })
    .sort((a, b) => {
      const ad =
        a.date instanceof Date
          ? a.date.getTime()
          : 0;

      const bd =
        b.date instanceof Date
          ? b.date.getTime()
          : 0;

      return bd - ad;
    })
    .slice(0, 12);

  section.style.display = "block";

  if (!news.length) {
    track.innerHTML = `
      <div style="
        width:100%;
        padding:18px;
        border:1px dashed var(--panel-border);
        font-family:var(--font-mono);
        font-size:11px;
        color:var(--text-2);
      ">
        NEWS FEED — No current articles available.
        The archive will continue checking public news sources.
      </div>
    `;
    return;
  }

  track.innerHTML = news
    .map((article, index) => {
      const meta =
        TYPE_META[
          article.disasterType
        ];

      const image =
        typeof getCardImage ===
        "function"
          ? getCardImage(
              article,
              index,
            )
          : imageFallbackHTML(
              article.title,
            );

      return `
        <article
          class="home-news-card"
          data-news-index="${index}"
          style="
            border-top:2px solid ${meta.color};
            cursor:pointer;
          "
        >
          <div style="
            position:relative;
            overflow:hidden;
            aspect-ratio:16/9;
            background:var(--bg-2);
          ">
            <img
              src="${escapeHTML(image)}"
              alt="${escapeHTML(article.title)}"
              loading="lazy"
              referrerpolicy="no-referrer"
              style="
                width:100%;
                height:100%;
                object-fit:cover;
                display:block;
              "
              onerror="
                this.onerror=null;
                this.src='${imageFallbackHTML(
                  `home-${index}`,
                )}';
              "
            >

            <span style="
              position:absolute;
              top:8px;
              left:8px;
              padding:4px 7px;
              background:rgba(0,0,0,.75);
              border:1px solid ${meta.color};
              color:${meta.color};
              font:600 9px var(--font-mono);
              letter-spacing:.08em;
            ">
              ${meta.tag}
            </span>
          </div>

          <div style="padding:12px;">
            <div style="
              font:600 12px var(--font-mono);
              color:var(--text-2);
              margin-bottom:7px;
            ">
              ${escapeHTML(
                article.source ||
                  article.domain ||
                  "NEWS",
              )}
              ${
                article.date
                  ? ` · ${formatDate(
                      article.date,
                    )}`
                  : ""
              }
            </div>

            <div style="
              font:700 17px var(--font-display);
              line-height:1.12;
              color:var(--text-0);
            ">
              ${escapeHTML(
                article.title,
              )}
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  track
    .querySelectorAll(
      ".home-news-card",
    )
    .forEach((card) => {
      card.onclick = () => {
        const index =
          Number(
            card.dataset.newsIndex,
          );

        const article =
          news[index];

        if (
          article &&
          article.url
        ) {
          window.open(
            article.url,
            "_blank",
            "noopener,noreferrer",
          );
        }
      };
    });
}

/* ================================================================
   YEAR RAIL
   ================================================================ */

function renderYearRail() {
  const rail =
    document.getElementById(
      "yearRail",
    );

  const meta =
    TYPE_META[state.disaster];

  rail.innerHTML = "";

  const allChip =
    document.createElement("div");

  allChip.className =
    "year-chip" +
    (state.year === "all"
      ? " active"
      : "");

  allChip.style.setProperty(
    "--accent",
    meta.color,
  );

  allChip.innerHTML = `
    <span class="y">ALL</span>
    <span class="c">
      ${DB[state.disaster].length.toLocaleString()} total
    </span>
  `;

  allChip.onclick = () => {
    state.year = "all";
    state.visibleCount = 150;

    renderYearRail();
    renderStats();
    renderGrid();
    renderTimeline();
  };

  rail.appendChild(allChip);

  YEARS.slice()
    .reverse()
    .forEach((y) => {
      const count =
        DB[state.disaster].filter(
          (d) => d.year === y,
        ).length;

      const chip =
        document.createElement(
          "div",
        );

      chip.className =
        "year-chip" +
        (state.year === y
          ? " active"
          : "");

      chip.style.setProperty(
        "--accent",
        meta.color,
      );

      chip.innerHTML = `
        <span class="y">${y}</span>
        <span class="c">
          ${count.toLocaleString()} incidents
        </span>
      `;

      chip.onclick = () => {
        state.year = y;
        state.visibleCount = 150;

        renderYearRail();
        renderStats();
        renderGrid();
        renderTimeline();
      };

      rail.appendChild(chip);
    });
}

/* ================================================================
   ANIMATED NUMBERS
   ================================================================ */

function animateNum(el, target) {
  const dur = 900;
  const start = performance.now();

  function step(now) {
    const p = Math.min(
      1,
      (now - start) / dur,
    );

    el.textContent = Math.floor(
      p * target,
    ).toLocaleString();

    if (p < 1) {
      requestAnimationFrame(step);
    } else {
      el.textContent =
        target.toLocaleString();
    }
  }

  requestAnimationFrame(step);
}

/* ================================================================
   STATS
   ================================================================ */

function renderStats() {
  const bar =
    document.getElementById(
      "statsBar",
    );

  let incidents =
    DB[state.disaster] || [];

  if (state.year !== "all") {
    incidents =
      incidents.filter(
        (d) => d.year === state.year,
      );
  }

  const districts =
    new Set(
      incidents
        .map((d) => d.district)
        .filter(Boolean),
    ).size;

  const provinces =
    new Set(
      incidents
        .map((d) => d.province)
        .filter(Boolean),
    ).size;

  const media =
    mediaTilesFor(
      state.disaster,
      state.year,
    );

  const images =
    media.filter(
      (m) =>
        m.contentType ===
        "image",
    ).length +
    incidents.reduce(
      (a, d) =>
        a +
        (d.demo
          ? d.imageCount || 0
          : 0),
      0,
    );

  const videos =
    media.filter(
      (m) =>
        m.contentType ===
        "video",
    ).length +
    incidents.reduce(
      (a, d) =>
        a +
        (d.demo
          ? d.videoCount || 0
          : 0),
      0,
    );

  const news =
    media.filter(
      (m) =>
        m.contentType ===
        "news",
    ).length +
    incidents.reduce(
      (a, d) =>
        a +
        (d.demo
          ? d.newsCount || 0
          : 0),
      0,
    );

  const live =
    incidents.filter(
      (d) => !d.demo,
    ).length;

  const cells = [
    ["Incidents", incidents.length],
    ["Districts", districts],
    ["Images", images],
    ["Videos", videos],
    ["News Reports", news],
    ["Provinces", provinces],
    ["Live Records", live],
  ];

  bar.innerHTML = cells
    .map(
      ([label, num]) => `
        <div class="stat-cell">
          <div
            class="stat-num"
            data-target="${num}"
          >0</div>
          <div class="stat-label">
            ${escapeHTML(label)}
          </div>
        </div>
      `,
    )
    .join("");

  bar
    .querySelectorAll(
      ".stat-num",
    )
    .forEach((el) =>
      animateNum(
        el,
        Number(
          el.dataset.target,
        ),
      ),
    );
}

/* ================================================================
   FILTER OPTIONS
   ================================================================ */

function renderProvinceOptions() {
  const sel =
    document.getElementById(
      "provinceSelect",
    );

  sel.innerHTML =
    '<option value="all">All Provinces</option>' +
    Object.keys(PROVINCES)
      .map(
        (p) =>
          `<option value="${escapeHTML(
            p,
          )}">${escapeHTML(
            p,
          )}</option>`,
      )
      .join("");
}

function renderDistrictOptions() {
  const sel =
    document.getElementById(
      "districtSelect",
    );

  const list =
    state.province === "all"
      ? ALL_DISTRICTS
      : PROVINCES[
          state.province
        ] || [];

  sel.innerHTML =
    '<option value="all">All Districts</option>' +
    list
      .map(
        (d) =>
          `<option value="${escapeHTML(
            d,
          )}">${escapeHTML(
            d,
          )}</option>`,
      )
      .join("");
}

/* ================================================================
   GRID
   ================================================================ */

function renderGrid() {
  const tiles =
    getFilteredTiles();

  const grid =
    document.getElementById(
      "tileGrid",
    );

  const shown =
    tiles.slice(
      0,
      state.visibleCount,
    );

  document.getElementById(
    "resultCount",
  ).textContent =
    `${tiles.length.toLocaleString()} RESULTS · SHOWING ${shown.length.toLocaleString()}`;

  if (!tiles.length) {
    grid.innerHTML = `
      <div style="
        grid-column:1/-1;
        padding:48px 20px;
        font-family:var(--font-mono);
        font-size:12px;
        color:var(--text-2);
        border:1px dashed var(--panel-border);
        text-align:center;
      ">
        <div style="
          font-size:25px;
          margin-bottom:12px;
        ">⌕</div>

        <strong style="
          display:block;
          color:var(--text-1);
          margin-bottom:7px;
        ">
          NO MATCHING RECORDS
        </strong>

        Try another year, province,
        district, severity, content type,
        or search term.
      </div>
    `;

    document.getElementById(
      "loadMoreBtn",
    ).style.display = "none";

    return;
  }

  grid.innerHTML = shown
    .map((t, index) => {
      const meta =
        TYPE_META[
          t.disasterType
        ];

      const typeIcon = {
        incident: "📍",
        image: "📷",
        news: "📰",
        video: "▶",
      }[t.contentType];

      const image =
        t.tileImg ||
        imageFallbackHTML(
          `${t.id}-${index}`,
        );

      const source =
        t.isMedia
          ? getMediaSource(t)
          : t.demo
            ? "Demonstration record"
            : t.verified
              ? "BIPAD · Verified"
              : t.usgsUrl
                ? "USGS Earthquake Catalog"
                : t.gdacsUrl
                  ? "GDACS"
                  : "BIPAD";

      return `
        <div
          class="tile"
          data-id="${escapeHTML(
            t.id,
          )}"
          data-ct="${escapeHTML(
            t.contentType,
          )}"
          data-media="${
            t.isMedia ? "1" : "0"
          }"
          tabindex="0"
          role="button"
          aria-label="${escapeHTML(
            t.title ||
              "Disaster record",
          )}"
        >

          <span
            class="type-dot"
            style="
              background:${meta.color};
              color:${meta.color};
            "
          ></span>

          ${
            t.demo
              ? '<span class="demo-tag">DEMO</span>'
              : '<span class="demo-tag" style="color:#39d97a">LIVE</span>'
          }

          <img
            loading="lazy"
            src="${escapeHTML(
              image,
            )}"
            alt="${escapeHTML(
              t.title ||
                "Nepal disaster",
            )}"
            referrerpolicy="no-referrer"
            data-fallback="0"
          >

          <div class="tile-overlay">

            <div class="tile-loc">
              ${typeIcon}
              ${escapeHTML(
                t.district ||
                  source,
              )}
            </div>

            <div class="tile-date">
              ${
                t.date
                  ? formatDate(
                      t.date,
                    )
                  : "Reference"
              }
            </div>

            <div style="
              font-family:var(--font-mono);
              font-size:9px;
              opacity:.75;
              margin-top:3px;
              white-space:nowrap;
              overflow:hidden;
              text-overflow:ellipsis;
            ">
              ${escapeHTML(
                source,
              )}
            </div>

            <div class="tile-view">
              VIEW →
            </div>

          </div>
        </div>
      `;
    })
    .join("");

  grid
    .querySelectorAll(
      ".tile",
    )
    .forEach((el) => {
      const image =
        el.querySelector(
          "img",
        );

      if (image) {
        image.onerror = () => {
          if (
            image.dataset
              .fallback ===
            "1"
          )
            return;

          image.dataset.fallback =
            "1";

          image.src =
            imageFallbackHTML(
              el.dataset.id,
            );
        };
      }

      const open = () => {
        const id =
          el.dataset.id;

        if (
          el.dataset.media ===
          "1"
        ) {
          const allMedia =
            mediaTilesFor(
              state.disaster,
              "all",
            );

          const item =
            allMedia.find(
              (m) =>
                m.id === id,
            );

          if (item) {
            openMediaModal(
              item,
            );
          }

          return;
        }

        const inc =
          (
            DB[
              state.disaster
            ] || []
          ).find(
            (d) =>
              d.id === id,
          );

        if (inc) {
          openModal(inc);
        }
      };

      el.onclick = open;

      el.onkeydown = (e) => {
        if (
          e.key === "Enter" ||
          e.key === " "
        ) {
          e.preventDefault();
          open();
        }
      };
    });

  document.getElementById(
    "loadMoreBtn",
  ).style.display =
    tiles.length >
    state.visibleCount
      ? "inline-block"
      : "none";
}

/* ================================================================
   MAP
   ================================================================ */

let mainLeafletMap = null;
let mainMarkersLayer = null;

function renderMap() {
  let incidents =
    DB[state.disaster] || [];

  if (state.year !== "all") {
    incidents =
      incidents.filter(
        (d) => d.year === state.year,
      );
  }

  if (state.province !== "all") {
    incidents =
      incidents.filter(
        (d) =>
          d.province ===
          state.province,
      );
  }

  if (state.district !== "all") {
    incidents =
      incidents.filter(
        (d) =>
          d.district ===
          state.district,
      );
  }

  const meta =
    TYPE_META[state.disaster];

  if (!mainLeafletMap) {
    mainLeafletMap = L.map(
      "leafletMap",
      {
        preferCanvas: true,
      },
    ).setView(
      [28.3949, 84.124],
      7,
    );

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 18,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
      },
    ).addTo(
      mainLeafletMap,
    );

    mainMarkersLayer =
      L.layerGroup().addTo(
        mainLeafletMap,
      );
  } else {
    setTimeout(
      () =>
        mainLeafletMap.invalidateSize(),
      60,
    );
  }

  mainMarkersLayer.clearLayers();

  const colorVar =
    state.disaster ===
    "flood"
      ? "--flood"
      : state.disaster ===
          "earthquake"
        ? "--quake"
        : "--slide";

  const color =
    getComputedStyle(
      document.documentElement,
    )
      .getPropertyValue(
        colorVar,
      )
      .trim();

  const CAP = 500;

  const shown =
    incidents.slice(
      0,
      CAP,
    );

  shown.forEach(
    (inc) => {
      if (
        typeof inc.lat !==
          "number" ||
        typeof inc.lng !==
          "number"
      ) {
        return;
      }

      const marker =
        L.circleMarker(
          [
            inc.lat,
            inc.lng,
          ],
          {
            radius: 6,
            color,
            weight: 1.5,
            fillColor: color,
            fillOpacity: 0.55,
          },
        );

      const verifiedLine =
        inc.verified !==
        undefined
          ? inc.verified
            ? " · ✓ Verified"
            : " · Unverified"
          : inc.mag
            ? ` · M${(
                +inc.mag
              ).toFixed(1)}`
            : "";

      const status =
        inc.demo
          ? "DEMO"
          : "LIVE";

      marker.bindPopup(`
        <div style="
          min-width:190px;
          font-family:Inter,sans-serif;
        ">
          <div style="
            font:600 9px monospace;
            letter-spacing:.08em;
            color:${color};
            margin-bottom:5px;
          ">
            ${status} · ${meta.tag}
          </div>

          <strong>
            ${escapeHTML(
              inc.title,
            )}
          </strong>

          <br>

          ${escapeHTML(
            inc.district,
          )},
          ${escapeHTML(
            inc.province,
          )}

          <br>

          ${formatDate(
            inc.date,
          )}

          ${verifiedLine}

          <br><br>

          <a
            href="#"
            class="map-detail-link"
            style="color:${color}"
          >
            View full details →
          </a>
        </div>
      `);

      marker.on(
        "popupopen",
        (e) => {
          const link =
            e.popup._contentNode.querySelector(
              ".map-detail-link",
            );

          if (link) {
            link.onclick = (
              ev,
            ) => {
              ev.preventDefault();
              openModal(inc);
            };
          }
        },
      );

      marker.addTo(
        mainMarkersLayer,
      );
    },
  );

  const live =
    incidents.filter(
      (d) => !d.demo,
    ).length;

  document.getElementById(
    "mapLegend",
  ).innerHTML = `
    <div style="
      font-weight:600;
      color:#fff;
      margin-bottom:4px;
    ">
      ${incidents.length.toLocaleString()}
      RECORDS
      ${
        incidents.length > CAP
          ? ` · SHOWING ${CAP}`
          : ""
      }
    </div>

    <div>
      <span
        class="sw"
        style="background:${meta.color}"
      ></span>

      ${meta.label}
      · ${live.toLocaleString()}
      live
      · ${(
        incidents.length -
        live
      ).toLocaleString()}
      demo
    </div>
  `;
}

/* ================================================================
   TIMELINE
   ================================================================ */

function renderTimeline() {
  const rail =
    document.getElementById(
      "timelineRail",
    );

  const meta =
    TYPE_META[state.disaster];

  rail.innerHTML =
    YEARS.slice()
      .reverse()
      .map((y) => {
        let incidents =
          (
            DB[
              state.disaster
            ] || []
          ).filter(
            (d) =>
              d.year === y,
          );

        if (
          state.province !==
          "all"
        ) {
          incidents =
            incidents.filter(
              (d) =>
                d.province ===
                state.province,
            );
        }

        if (
          state.district !==
          "all"
        ) {
          incidents =
            incidents.filter(
              (d) =>
                d.district ===
                state.district,
            );
        }

        let top = [
          ...incidents,
        ].sort(
          (a, b) =>
            (b.mag || 0) -
              (a.mag || 0) ||
            0,
        );

        if (
          state.disaster !==
          "earthquake"
        ) {
          top = incidents;
        }

        top = top.slice(
          0,
          3,
        );

        return `
          <div class="timeline-year">

            <div class="ty">
              ${y} ·
              ${incidents.length}
              RECORDS
            </div>

            ${
              top
                .map(
                  (t) => `
                    <div
                      class="tev"
                      data-id="${escapeHTML(
                        t.id,
                      )}"
                    >
                      <span
                        class="dot"
                        style="
                          background:${meta.color}
                        "
                      ></span>

                      ${escapeHTML(
                        t.district ||
                          "Nepal",
                      )}

                      ${
                        t.mag
                          ? ` — M${(
                              +t.mag
                            ).toFixed(
                              1,
                            )}`
                          : ""
                      }

                      ${
                        t.demo
                          ? " · DEMO"
                          : ""
                      }
                    </div>
                  `,
                )
                .join("")
                ||
                '<div class="tev" style="opacity:.4">No records</div>'
            }

          </div>
        `;
      })
      .join("");

  rail
    .querySelectorAll(
      ".tev[data-id]",
    )
    .forEach((el) => {
      el.onclick = () => {
        const inc =
          (
            DB[
              state.disaster
            ] || []
          ).find(
            (d) =>
              d.id ===
              el.dataset.id,
          );

        if (inc) {
          openModal(inc);
        }
      };
    });
}

/* ================================================================
   INCIDENT MODAL
   ================================================================ */

async function openModal(inc) {
  const meta =
    TYPE_META[
      inc.disasterType
    ];

  const overlay =
    document.getElementById(
      "modalOverlay",
    );

  const panel =
    document.getElementById(
      "modalPanel",
    );

  panel.style.setProperty(
    "--accent",
    meta.color,
  );

  const stages =
    inc.disasterType ===
    "earthquake"
      ? [
          "Reported",
          "Aftershocks",
          "Assessment",
          "Response",
          "Recovery",
        ]
      : [
          "Reported",
          "Escalation",
          "Peak",
          "Response",
          "Recovery",
        ];

  const filledCount =
    inc.demo
      ? 2
      : 3;

  const heroImage =
    typeof getCardImage ===
    "function"
      ? getCardImage(inc)
      : inc.image;

  panel.innerHTML = `
    <div class="modal-hero">

      <img
        src="${escapeHTML(
          heroImage,
        )}"
        alt="${escapeHTML(
          inc.title,
        )}"
        id="heroImg_${escapeHTML(
          inc.id,
        )}"
        referrerpolicy="no-referrer"
      >

      <button
        class="modal-close"
        id="modalCloseBtn"
        aria-label="Close"
      >
        ✕
      </button>

      <div class="modal-headtext">

        <span
          class="type-tag"
          style="
            color:${meta.color};
            border-color:${meta.color};
          "
        >
          ${meta.icon}
          ${meta.tag}
        </span>

        <h2>
          ${escapeHTML(
            inc.title,
          )}
        </h2>

        <div class="modal-meta">

          <span>
            📍
            ${escapeHTML(
              inc.district,
            )},
            ${escapeHTML(
              inc.province,
            )}
          </span>

          <span>
            📅
            ${formatDate(
              inc.date,
              "long",
            )}
          </span>

          ${
            inc.severity
              ? `<span>⚠ ${escapeHTML(
                  inc.severity,
                )}</span>`
              : ""
          }

          ${
            inc.verified !==
            undefined
              ? `<span>${
                  inc.verified
                    ? "✓ Verified by BIPAD"
                    : "◌ Unverified"
                }</span>`
              : ""
          }

          ${
            inc.mag
              ? `<span>Magnitude ${(
                  +inc.mag
                ).toFixed(1)}</span>`
              : ""
          }

        </div>
      </div>
    </div>

    <div class="modal-body">

      <div class="modal-block">

        <h4>
          What Happened
          <span style="
            font-size:10px;
            color:var(--text-2);
            font-weight:400;
          ">
            — authoritative incident data
          </span>
        </h4>

        <p>
          ${escapeHTML(
            inc.description ||
              "No detailed description is available for this record.",
          )}
        </p>

        ${
          inc.demo
            ? `
              <div class="demo-note">
                ◆ DEMONSTRATION RECORD —
                not a verified real event,
                for layout preview only.
              </div>
            `
            : `
              <div class="real-note">
                ◆ LIVE DATA —
                sourced from
                ${
                  inc.usgsUrl
                    ? "the USGS Earthquake Catalog"
                    : inc.bipadUrl
                      ? "Nepal's BIPAD disaster portal"
                      : inc.gdacsUrl
                        ? "GDACS"
                        : "a live public feed"
                }

                ${
                  inc.usgsUrl ||
                  inc.bipadUrl ||
                  inc.gdacsUrl
                    ? `
                      ·
                      <a
                        href="${escapeHTML(
                          inc.usgsUrl ||
                            inc.bipadUrl ||
                            inc.gdacsUrl,
                        )}"
                        target="_blank"
                        rel="noopener noreferrer"
                        style="text-decoration:underline"
                      >
                        View source record →
                      </a>
                    `
                    : ""
                }
              </div>
            `
        }

      </div>

      <div class="modal-block">

        <h4>
          Visual Evidence
        </h4>

        ${
          inc.gallery &&
          inc.gallery.length
            ? `
              <div
                class="gallery-strip"
                id="galleryStrip_${escapeHTML(
                  inc.id,
                )}"
              >
                ${[
                  heroImage,
                  ...inc.gallery,
                ]
                  .map(
                    (g, i) => `
                      <img
                        src="${escapeHTML(
                          g,
                        )}"
                        loading="lazy"
                        alt="Reference image ${i + 1}"
                        referrerpolicy="no-referrer"
                        onerror="
                          this.style.opacity='.35';
                        "
                      >
                    `,
                  )
                  .join("")}
              </div>

              <div
                class="${
                  inc.demo
                    ? "demo-note"
                    : "real-note"
                }"
                style="margin-top:10px"
              >
                ${
                  inc.demo
                    ? "◆ Placeholder imagery — demonstration data."
                    : `◆ REFERENCE IMAGERY — this may not depict this exact incident.${
                        inc.imageAttribution &&
                        inc.imageAttribution[0]
                          ? ` Photo credit: ${escapeHTML(
                              inc
                                .imageAttribution[0]
                                .artist,
                            )} · ${escapeHTML(
                              inc
                                .imageAttribution[0]
                                .license,
                            )}`
                          : ""
                      }`
                }
              </div>
            `
            : `
              <div
                style="
                  font-family:var(--font-mono);
                  font-size:11.5px;
                  color:var(--text-2);
                  border:1px dashed var(--panel-border);
                  padding:16px;
                "
              >
                No incident-specific photograph
                is available for this record.
                The dashboard thumbnail is a
                visual fallback and should not be
                interpreted as evidence of this event.
              </div>
            `
        }

      </div>

      <div class="modal-block">

        <h4>
          Source Record
        </h4>

        ${
          inc.demo
            ? `
              <div class="news-item">
                <div>
                  <div class="nh">
                    ${escapeHTML(
                      meta.label,
                    )}
                    update:
                    ${escapeHTML(
                      inc.district,
                    )}
                  </div>

                  <div class="ns">
                    Demonstration record ·
                    ${formatDate(
                      inc.date,
                    )}
                  </div>
                </div>

                <button
                  class="news-btn"
                  type="button"
                  onclick="closeModal()"
                >
                  DEMO RECORD
                </button>
              </div>
            `
            : `
              <div class="news-item">

                <div>
                  <div class="nh">
                    ${escapeHTML(
                      inc.title,
                    )}
                  </div>

                  <div class="ns">
                    ${
                      inc.usgsUrl
                        ? "USGS Earthquake Hazards Program"
                        : inc.bipadUrl
                          ? "Nepal Disaster Risk Reduction Portal (BIPAD)"
                          : "GDACS"
                    }
                    ·
                    ${formatDate(
                      inc.date,
                    )}
                  </div>
                </div>

                <a
                  class="news-btn"
                  href="${escapeHTML(
                    inc.usgsUrl ||
                      inc.bipadUrl ||
                      inc.gdacsUrl ||
                      "#",
                  )}"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  VIEW RECORD →
                </a>

              </div>
            `
        }

      </div>

      <div
        class="modal-block"
        id="gdeltBlock_${escapeHTML(
          inc.id,
        )}"
        style="display:none"
      >
        <h4>
          Related News
          <span style="
            font-size:10px;
            color:var(--text-2);
            font-weight:400;
          ">
            — general coverage
          </span>
        </h4>

        <div
          id="gdeltContent_${escapeHTML(
            inc.id,
          )}"
        ></div>
      </div>

      <div
        class="modal-block"
        id="wikiBlock_${escapeHTML(
          inc.id,
        )}"
        style="display:none"
      >
        <h4>
          Background Reading
        </h4>

        <div
          id="wikiContent_${escapeHTML(
            inc.id,
          )}"
        ></div>
      </div>

      <div class="modal-block">

        <h4>
          Videos
        </h4>

        <div
          class="video-grid"
          id="videoGrid_${escapeHTML(
            inc.id,
          )}"
        >
          <div style="
            grid-column:1/-1;
            font-family:var(--font-mono);
            font-size:11px;
            color:var(--text-2);
          ">
            Loading real videos via YouTube…
          </div>
        </div>

      </div>

      <div class="modal-block">

        <h4>
          Location
        </h4>

        <div
          class="mini-map"
          id="miniMap_${escapeHTML(
            inc.id,
          )}"
        ></div>

      </div>

      <div class="modal-block">

        <h4>
          Incident Timeline
        </h4>

        <div class="timeline-stages">

          ${stages
            .map(
              (s, i) => `
                <div
                  class="tstage ${
                    i < filledCount
                      ? "filled"
                      : ""
                  }"
                  style="
                    --accent:${meta.color}
                  "
                >
                  <div class="tdot"></div>
                  <div class="tl">
                    ${escapeHTML(
                      s,
                    )}
                  </div>
                </div>
              `,
            )
            .join("")}

        </div>

      </div>

    </div>
  `;

  overlay.classList.add(
    "show",
  );

  document.getElementById(
    "modalCloseBtn",
  ).onclick = closeModal;

  overlay.onclick = (e) => {
    if (
      e.target === overlay
    ) {
      closeModal();
    }
  };

  const hero =
    document.getElementById(
      `heroImg_${inc.id}`,
    );

  if (hero) {
    hero.onerror = () => {
      hero.onerror = null;
      hero.src =
        imageFallbackHTML(
          inc.id,
        );
    };
  }

  fetchYouTube(
    inc,
    document.getElementById(
      `videoGrid_${inc.id}`,
    ),
  );

  if (!inc.demo) {
    loadWikiSummary(
      inc.disasterType,
    ).then((w) => {
      if (
        !w ||
        !w.extract
      )
        return;

      const block =
        document.getElementById(
          `wikiBlock_${inc.id}`,
        );

      const content =
        document.getElementById(
          `wikiContent_${inc.id}`,
        );

      if (!block || !content)
        return;

      content.innerHTML = `
        <p>
          ${escapeHTML(
            w.extract,
          )}
        </p>

        ${
          w.url
            ? `
              <div
                class="demo-note"
                style="
                  margin-top:10px;
                  color:var(--text-2);
                  border-color:var(--panel-border);
                  background:none;
                "
              >
                ◆ General background —
                not a report on this specific incident.

                <a
                  href="${escapeHTML(
                    w.url,
                  )}"
                  target="_blank"
                  rel="noopener noreferrer"
                  style="
                    text-decoration:underline;
                    color:var(--text-1);
                  "
                >
                  Read on Wikipedia →
                </a>
              </div>
            `
            : ""
        }
      `;

      block.style.display =
        "block";
    });

    const gdeltBlock =
      document.getElementById(
        `gdeltBlock_${inc.id}`,
      );

    const gdeltContent =
      document.getElementById(
        `gdeltContent_${inc.id}`,
      );

    if (
      gdeltBlock &&
      gdeltContent
    ) {
      const catNews =
        MEDIA[
          inc.disasterType
        ]?.news || [];

      gdeltBlock.style.display =
        "block";

      if (!catNews.length) {
        gdeltContent.innerHTML = `
          <div style="
            font-family:var(--font-mono);
            font-size:11px;
            color:var(--text-2);
          ">
            No current public news coverage
            was found for this category.
          </div>
        `;
      } else {
        gdeltContent.innerHTML =
          catNews
            .slice(0, 3)
            .map(
              (a) => `
                <div class="news-item">

                  <div>
                    <div class="nh">
                      ${escapeHTML(
                        a.title,
                      )}
                    </div>

                    <div class="ns">
                      ${escapeHTML(
                        a.domain ||
                          a.source ||
                          "News",
                      )}
                      ${
                        a.date
                          ? ` · ${formatDate(
                              a.date,
                            )}`
                          : ""
                      }
                    </div>
                  </div>

                  <a
                    class="news-btn"
                    href="${escapeHTML(
                      a.url,
                    )}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    READ ARTICLE →
                  </a>

                </div>
              `,
            )
            .join("");
      }
    }
  }

  if (
    typeof inc.lat ===
      "number" &&
    typeof inc.lng ===
      "number"
  ) {
    setTimeout(
      () => {
        const container =
          document.getElementById(
            `miniMap_${inc.id}`,
          );

        if (
          !container ||
          !window.L
        )
          return;

        const miniMap =
          L.map(
            container,
            {
              zoomControl:
                false,
              attributionControl:
                false,
              scrollWheelZoom:
                false,
            },
          ).setView(
            [
              inc.lat,
              inc.lng,
            ],
            11,
          );

        L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            maxZoom: 18,
          },
        ).addTo(
          miniMap,
        );

        L.circleMarker(
          [
            inc.lat,
            inc.lng,
          ],
          {
            radius: 8,
            color:
              meta.color,
            weight: 2,
            fillColor:
              meta.color,
            fillOpacity:
              0.6,
          },
        ).addTo(
          miniMap,
        );

        miniMap.invalidateSize();
      },
      80,
    );
  }
}

function closeModal() {
  const overlay =
    document.getElementById(
      "modalOverlay",
    );

  if (overlay) {
    overlay.classList.remove(
      "show",
    );
  }
}

/* ================================================================
   MEDIA MODAL
   ================================================================ */

function openMediaModal(item) {
  const meta =
    TYPE_META[
      item.disasterType
    ];

  const overlay =
    document.getElementById(
      "modalOverlay",
    );

  const panel =
    document.getElementById(
      "modalPanel",
    );

  panel.style.setProperty(
    "--accent",
    meta.color,
  );

  const kindLabel = {
    news: "NEWS ARTICLE",
    video: "VIDEO",
    image: "REFERENCE PHOTOGRAPH",
  }[item.contentType];

  const sourceLabel =
    getMediaSource(item);

  const image =
    item.tileImg ||
    imageFallbackHTML(
      item.id,
    );

  panel.innerHTML = `
    <div
      class="modal-hero"
      style="height:280px;"
    >

      <img
        src="${escapeHTML(
          image,
        )}"
        alt="${escapeHTML(
          item.title,
        )}"
        referrerpolicy="no-referrer"
      >

      <button
        class="modal-close"
        id="modalCloseBtn"
      >
        ✕
      </button>

      <div class="modal-headtext">

        <span
          class="type-tag"
          style="
            color:${meta.color};
            border-color:${meta.color};
          "
        >
          ${meta.icon}
          ${kindLabel}
        </span>

        <h2
          style="
            font-size:clamp(
              20px,
              2.6vw,
              28px
            );
          "
        >
          ${escapeHTML(
            item.title,
          )}
        </h2>

        <div class="modal-meta">

          <span>
            ${escapeHTML(
              sourceLabel,
            )}
          </span>

          ${
            item.date
              ? `<span>📅 ${formatDate(
                  item.date,
                  "long",
                )}</span>`
              : ""
          }

        </div>

      </div>
    </div>

    <div class="modal-body">

      <div class="modal-block">

        <div class="real-note">
          ◆ ${escapeHTML(
            kindLabel,
          )}
          · ${escapeHTML(
            sourceLabel,
          )}
          · general ${
            meta.label
          } coverage for Nepal.
        </div>

      </div>

      ${
        item.contentType ===
          "image" &&
        item.mediaData
          ? `
            <div class="modal-block">

              <h4>
                Attribution
              </h4>

              <p>
                Photographer/uploader:
                ${escapeHTML(
                  item.mediaData
                    .artist ||
                    "Unknown",
                )}

                <br>

                License:
                ${escapeHTML(
                  item.mediaData
                    .license ||
                    "See Commons page",
                )}
              </p>

              ${
                item.mediaData
                  .descriptionUrl
                  ? `
                    <a
                      class="news-btn"
                      href="${escapeHTML(
                        item.mediaData
                          .descriptionUrl,
                      )}"
                      target="_blank"
                      rel="noopener noreferrer"
                      style="
                        display:inline-block;
                        margin-top:8px;
                      "
                    >
                      VIEW ON COMMONS →
                    </a>
                  `
                  : ""
              }

            </div>
          `
          : `
            <div class="modal-block">

              <a
                class="news-btn"
                href="${escapeHTML(
                  item.mediaData
                    ?.url ||
                    "#",
                )}"
                target="_blank"
                rel="noopener noreferrer"
                style="
                  display:inline-block;
                "
              >
                ${
                  item.contentType ===
                  "video"
                    ? "WATCH ON YOUTUBE →"
                    : "READ ARTICLE →"
                }
              </a>

            </div>
          `
      }

    </div>
  `;

  overlay.classList.add(
    "show",
  );

  document.getElementById(
    "modalCloseBtn",
  ).onclick = closeModal;

  overlay.onclick = (e) => {
    if (
      e.target === overlay
    ) {
      closeModal();
    }
  };

  const hero =
    panel.querySelector(
      ".modal-hero img",
    );

  if (hero) {
    hero.onerror = () => {
      hero.onerror = null;
      hero.src =
        imageFallbackHTML(
          item.id,
        );
    };
  }
}

/* ================================================================
   YOUTUBE
   ================================================================ */

async function fetchYouTube(
  inc,
  container,
) {
  if (!container) return;

  try {
    const q =
      encodeURIComponent(
        `${inc.district} Nepal ${inc.disasterType} ${inc.year}`,
      );

    const url =
      `/api/youtube?q=${q}&max=4`;

    const res =
      await fetch(url);

    if (!res.ok) {
      throw new Error(
        `HTTP ${res.status}`,
      );
    }

    const j =
      await res.json();

    if (j.error) {
      throw new Error(
        j.error.message ||
          "YouTube API error",
      );
    }

    const seen =
      new Set();

    const items = (
      j.items || []
    ).filter((v) => {
      const id =
        v?.id?.videoId;

      if (!id) return false;

      if (seen.has(id))
        return false;

      seen.add(id);

      return true;
    });

    if (!items.length) {
      container.innerHTML = `
        <div style="
          grid-column:1/-1;
          font-family:var(--font-mono);
          font-size:11px;
          color:var(--text-2);
          padding:12px 0;
        ">
          No relevant public videos
          were found for this record.
        </div>
      `;

      return;
    }

    container.innerHTML =
      items
        .map(
          (v) => {
            const thumb =
              v.snippet
                ?.thumbnails
                ?.medium
                ?.url ||
              v.snippet
                ?.thumbnails
                ?.default
                ?.url ||
              imageFallbackHTML(
                v.id.videoId,
              );

            return `
              <a
                class="video-tile"
                href="https://www.youtube.com/watch?v=${escapeHTML(
                  v.id.videoId,
                )}"
                target="_blank"
                rel="noopener noreferrer"
              >

                <img
                  src="${escapeHTML(
                    thumb,
                  )}"
                  alt="${escapeHTML(
                    v.snippet
                      ?.title ||
                      "YouTube video",
                  )}"
                  loading="lazy"
                  onerror="
                    this.onerror=null;
                    this.src='${imageFallbackHTML(
                      v.id.videoId,
                    )}';
                  "
                >

                <div class="play">
                  <span>▶</span>
                </div>

                <div class="vt">
                  ${escapeHTML(
                    (
                      v.snippet
                        ?.title ||
                      "Video"
                    ).slice(
                      0,
                      80,
                    ),
                  )}
                </div>

              </a>
            `;
          },
        )
        .join("");
  } catch (e) {
    console.warn(
      "YouTube fetch failed",
      e,
    );

    container.innerHTML = `
      <div style="
        grid-column:1/-1;
        font-family:var(--font-mono);
        font-size:11px;
        color:var(--text-2);
        padding:12px 0;
      ">
        Video service is temporarily
        unavailable. Other live disaster
        data remains available.
      </div>
    `;
  }
}