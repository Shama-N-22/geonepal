/* ================================================================
   GEONEPAL — RENDER / UI LAYER
   ================================================================ */


/* ================================================================
   HELPERS
   ================================================================ */

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

  const d =
    date instanceof Date
      ? date
      : new Date(date);

  if (Number.isNaN(d.getTime())) {
    return "Reference";
  }

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
      item.source ||
      item.domain ||
      item.district ||
      "News"
    );
  }

  if (item.contentType === "video") {
    return (
      item.mediaData?.channel ||
      item.channel ||
      item.district ||
      "YouTube"
    );
  }

  if (item.contentType === "image") {
    return (
      item.mediaData?.artist ||
      item.artist ||
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


function safeImageURL(url, seed) {
  if (!url || typeof url !== "string") {
    return imageFallbackHTML(seed);
  }

  const value = url.trim();

  if (!value) {
    return imageFallbackHTML(seed);
  }

  if (
    value.startsWith("data:") ||
    value.includes("placeholder") ||
    value.includes("placehold.co") ||
    value.endsWith(".svg")
  ) {
    return imageFallbackHTML(seed);
  }

  return value;
}


function getArticleDate(article) {
  if (!article) return 0;

  const raw =
    article.date ||
    article.publishedAt ||
    article.published ||
    article.pubDate;

  if (!raw) return 0;

  const time =
    new Date(raw).getTime();

  return Number.isNaN(time)
    ? 0
    : time;
}


/* ================================================================
   FILTERING
   ================================================================ */

function getFilteredTiles() {
  if (!state.disaster) {
    return [];
  }

  let incidents =
    DB[state.disaster] || [];

  if (state.year !== "all") {
    incidents =
      incidents.filter(
        (d) =>
          d.year === state.year,
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

  if (state.severity !== "all") {
    incidents =
      incidents.filter(
        (d) =>
          d.severity ===
          state.severity,
      );
  }

  let tiles =
    expandTiles(incidents);

  if (
    state.province === "all" &&
    state.district === "all" &&
    state.severity === "all"
  ) {
    tiles =
      tiles.concat(
        mediaTilesFor(
          state.disaster,
          state.year,
        ),
      );
  }

  if (state.contentType !== "all") {
    tiles =
      tiles.filter(
        (t) =>
          t.contentType ===
          state.contentType,
      );
  }

  const query =
    state.search
      .trim()
      .toLowerCase();

  if (query) {
    tiles =
      tiles.filter((t) => {
        const fields = [
          t.id,
          t.district,
          t.province,
          t.title,
          t.year,
          t.disasterType,
          t.municipality,
          t.contentType,
          t.description,
          t.mediaData?.source,
          t.mediaData?.domain,
          t.mediaData?.channel,
          t.mediaData?.artist,
        ];

        return fields.some(
          (field) =>
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
  const floodCount =
    document.getElementById(
      "countFlood",
    );

  const earthquakeCount =
    document.getElementById(
      "countEarthquake",
    );

  const landslideCount =
    document.getElementById(
      "countLandslide",
    );

  if (floodCount) {
    floodCount.textContent =
      (
        DB.flood?.length || 0
      ).toLocaleString();
  }

  if (earthquakeCount) {
    earthquakeCount.textContent =
      (
        DB.earthquake?.length || 0
      ).toLocaleString();
  }

  if (landslideCount) {
    landslideCount.textContent =
      (
        DB.landslide?.length || 0
      ).toLocaleString();
  }

  const badge =
    document.getElementById(
      "liveBadge",
    );

  if (!badge) {
    return;
  }

  const liveParts = [];

  if (
    typeof usgsLoaded !==
      "undefined" &&
    usgsLoaded
  ) {
    liveParts.push(
      `${(
        DB.earthquake?.length ||
        0
      ).toLocaleString()} USGS earthquakes`,
    );
  }

  if (
    typeof gdacsLoaded !==
      "undefined" &&
    gdacsLoaded
  ) {
    liveParts.push(
      "GDACS",
    );
  }

  if (liveParts.length) {
    badge.textContent =
      `● LIVE DATA · ${liveParts.join(
        " · ",
      )} · 2020–2026`;
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

  if (!section || !track) {
    return;
  }

  const allNews = [];

  [
    "flood",
    "earthquake",
    "landslide",
  ].forEach((type) => {
    const articles =
      MEDIA?.[type]?.news || [];

    articles.forEach(
      (article) => {
        if (!article) {
          return;
        }

        allNews.push({
          ...article,
          disasterType:
            article.disasterType ||
            type,
        });
      },
    );
  });

  const seen =
    new Set();

  const news =
    allNews
      .filter((article) => {
        const title =
          String(
            article.title || "",
          )
            .trim()
            .toLowerCase();

        const url =
          String(
            article.url || "",
          )
            .trim()
            .toLowerCase();

        const source =
          String(
            article.source ||
              article.domain ||
              "",
          )
            .trim()
            .toLowerCase();

        const key =
          url ||
          `${title}|${source}|${getArticleDate(
            article,
          )}`;

        if (
          !key ||
          seen.has(key)
        ) {
          return false;
        }

        seen.add(key);

        return true;
      })
      .sort(
        (a, b) =>
          getArticleDate(b) -
          getArticleDate(a),
      )
      .slice(0, 12);

  section.style.display =
    "block";

  if (!news.length) {
    track.innerHTML = `
      <div style="
        width:100%;
        padding:20px;
        border:1px dashed var(--panel-border);
        font-family:var(--font-mono);
        font-size:11px;
        color:var(--text-2);
        background:rgba(255,255,255,.015);
      ">
        <strong style="
          display:block;
          color:var(--text-1);
          margin-bottom:6px;
        ">
          NEWS FEED
        </strong>

        No current articles are available
        from the configured public news
        sources.

        <br><br>

        The dashboard will continue checking
        when the feed refreshes.
      </div>
    `;

    return;
  }

  track.innerHTML =
    news
      .map(
        (article, index) => {
          const meta =
            TYPE_META[
              article.disasterType
            ] ||
            TYPE_META.earthquake;

          const image =
            typeof getCardImage ===
            "function"
              ? safeImageURL(
                  getCardImage(
                    article,
                    index,
                  ),
                  `home-${index}`,
                )
              : imageFallbackHTML(
                  `home-${index}`,
                );

          const title =
            article.title ||
            "Nepal disaster news";

          const source =
            article.source ||
            article.domain ||
            "NEWS";

          const date =
            article.date ||
            article.publishedAt ||
            article.pubDate;

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
                  src="${escapeHTML(
                    image,
                  )}"
                  alt="${escapeHTML(
                    title,
                  )}"
                  loading="lazy"
                  referrerpolicy="no-referrer"
                  style="
                    width:100%;
                    height:100%;
                    object-fit:cover;
                    display:block;
                  "
                >

                <span style="
                  position:absolute;
                  top:8px;
                  left:8px;
                  padding:4px 7px;
                  background:rgba(0,0,0,.78);
                  border:1px solid ${meta.color};
                  color:${meta.color};
                  font:600 9px var(--font-mono);
                  letter-spacing:.08em;
                ">
                  ${escapeHTML(
                    meta.tag,
                  )}
                </span>
              </div>

              <div style="padding:12px;">
                <div style="
                  font:600 10px var(--font-mono);
                  color:var(--text-2);
                  margin-bottom:7px;
                  white-space:nowrap;
                  overflow:hidden;
                  text-overflow:ellipsis;
                ">
                  ${escapeHTML(
                    source,
                  )}
                  ${
                    date
                      ? ` · ${formatDate(
                          date,
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
                    title,
                  )}
                </div>
              </div>
            </article>
          `;
        },
      )
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

        if (article?.url) {
          window.open(
            article.url,
            "_blank",
            "noopener,noreferrer",
          );
        }
      };
    });

  track
    .querySelectorAll("img")
    .forEach(
      (img, index) => {
        img.onerror = () => {
          if (
            img.dataset.fallback ===
            "1"
          ) {
            return;
          }

          img.dataset.fallback =
            "1";

          img.src =
            imageFallbackHTML(
              `home-news-${index}`,
            );
        };
      },
    );
}


/* ================================================================
   YEAR RAIL
   ================================================================ */

function renderYearRail() {
  const rail =
    document.getElementById(
      "yearRail",
    );

  if (!rail) {
    return;
  }

  const meta =
    TYPE_META[
      state.disaster
    ];

  if (!meta) {
    return;
  }

  rail.innerHTML =
    "";

  const allChip =
    document.createElement(
      "div",
    );

  allChip.className =
    "year-chip" +
    (
      state.year === "all"
        ? " active"
        : ""
    );

  allChip.style.setProperty(
    "--accent",
    meta.color,
  );

  allChip.innerHTML = `
    <span class="y">ALL</span>
    <span class="c">
      ${
        (
          DB[state.disaster] ||
          []
        ).length
      .toLocaleString()}
      total
    </span>
  `;

  allChip.onclick = () => {
    state.year =
      "all";

    state.visibleCount =
      150;

    renderYearRail();
    renderStats();
    renderGrid();
    renderTimeline();

    if (
      state.view === "map"
    ) {
      renderMap();
    }
  };

  rail.appendChild(
    allChip,
  );

  YEARS.slice()
    .reverse()
    .forEach((y) => {
      const count =
        (
          DB[state.disaster] ||
          []
        ).filter(
          (d) =>
            d.year === y,
        ).length;

      const chip =
        document.createElement(
          "div",
        );

      chip.className =
        "year-chip" +
        (
          state.year === y
            ? " active"
            : ""
        );

      chip.style.setProperty(
        "--accent",
        meta.color,
      );

      chip.innerHTML = `
        <span class="y">${y}</span>

        <span class="c">
          ${count.toLocaleString()}
          incidents
        </span>
      `;

      chip.onclick = () => {
        state.year =
          y;

        state.visibleCount =
          150;

        renderYearRail();
        renderStats();
        renderGrid();
        renderTimeline();

        if (
          state.view ===
          "map"
        ) {
          renderMap();
        }
      };

      rail.appendChild(
        chip,
      );
    });
}


/* ================================================================
   ANIMATED NUMBERS
   ================================================================ */

function animateNum(
  el,
  target,
) {
  if (!el) {
    return;
  }

  const dur =
    900;

  const start =
    performance.now();

  function step(now) {
    const p =
      Math.min(
        1,
        (now - start) /
          dur,
      );

    el.textContent =
      Math.floor(
        p * target,
      ).toLocaleString();

    if (p < 1) {
      requestAnimationFrame(
        step,
      );
    } else {
      el.textContent =
        target.toLocaleString();
    }
  }

  requestAnimationFrame(
    step,
  );
}


/* ================================================================
   STATS
   ================================================================ */

function renderStats() {
  const bar =
    document.getElementById(
      "statsBar",
    );

  if (!bar) {
    return;
  }

  let incidents =
    DB[state.disaster] ||
    [];

  if (state.year !== "all") {
    incidents =
      incidents.filter(
        (d) =>
          d.year ===
          state.year,
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

  if (state.severity !== "all") {
    incidents =
      incidents.filter(
        (d) =>
          d.severity ===
          state.severity,
      );
  }

  const districts =
    new Set(
      incidents
        .map(
          (d) =>
            d.district,
        )
        .filter(Boolean),
    ).size;

  const provinces =
    new Set(
      incidents
        .map(
          (d) =>
            d.province,
        )
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
        (
          d.demo
            ? d.imageCount ||
              0
            : 0
        ),
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
        (
          d.demo
            ? d.videoCount ||
              0
            : 0
        ),
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
        (
          d.demo
            ? d.newsCount ||
              0
            : 0
        ),
      0,
    );

  const live =
    incidents.filter(
      (d) =>
        !d.demo,
    ).length;

  const cells = [
    [
      "Incidents",
      incidents.length,
    ],
    [
      "Districts",
      districts,
    ],
    [
      "Images",
      images,
    ],
    [
      "Videos",
      videos,
    ],
    [
      "News Reports",
      news,
    ],
    [
      "Provinces",
      provinces,
    ],
    [
      "Live Records",
      live,
    ],
  ];

  bar.innerHTML =
    cells
      .map(
        ([label, num]) => `
          <div class="stat-cell">

            <div
              class="stat-num"
              data-target="${num}"
            >
              0
            </div>

            <div class="stat-label">
              ${escapeHTML(
                label,
              )}
            </div>

          </div>
        `,
      )
      .join("");

  bar
    .querySelectorAll(
      ".stat-num",
    )
    .forEach(
      (el) =>
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

  if (!sel) {
    return;
  }

  sel.innerHTML =
    `
      <option value="all">
        All Provinces
      </option>
    ` +
    Object.keys(
      PROVINCES || {},
    )
      .map(
        (p) => `
          <option value="${escapeHTML(
            p,
          )}">
            ${escapeHTML(
              p,
            )}
          </option>
        `,
      )
      .join("");

  sel.value =
    state.province ||
    "all";
}


function renderDistrictOptions() {
  const sel =
    document.getElementById(
      "districtSelect",
    );

  if (!sel) {
    return;
  }

  const list =
    state.province ===
    "all"
      ? ALL_DISTRICTS
      : PROVINCES[
          state.province
        ] || [];

  sel.innerHTML =
    `
      <option value="all">
        All Districts
      </option>
    ` +
    list
      .map(
        (d) => `
          <option value="${escapeHTML(
            d,
          )}">
            ${escapeHTML(
              d,
            )}
          </option>
        `,
      )
      .join("");

  if (
    list.includes(
      state.district,
    )
  ) {
    sel.value =
      state.district;
  } else {
    sel.value =
      "all";
  }
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

  if (!grid) {
    return;
  }

  const shown =
    tiles.slice(
      0,
      state.visibleCount,
    );

  const resultCount =
    document.getElementById(
      "resultCount",
    );

  if (resultCount) {
    resultCount.textContent =
      `${tiles.length.toLocaleString()} RESULTS · SHOWING ${shown.length.toLocaleString()}`;
  }

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
        ">
          ⌕
        </div>

        <strong style="
          display:block;
          color:var(--text-1);
          margin-bottom:7px;
        ">
          NO MATCHING RECORDS
        </strong>

        Try another year,
        province, district,
        severity, content type,
        or search term.
      </div>
    `;

    const loadMore =
      document.getElementById(
        "loadMoreBtn",
      );

    if (loadMore) {
      loadMore.style.display =
        "none";
    }

    return;
  }

  grid.innerHTML =
    shown
      .map((t, index) => {
        const meta =
          TYPE_META[
            t.disasterType
          ] ||
          TYPE_META.earthquake;

        const typeIcon = {
          incident: "📍",
          image: "📷",
          news: "📰",
          video: "▶",
        }[
          t.contentType
        ] || "•";

        const image =
          safeImageURL(
            t.tileImg,
            `${t.id}-${index}`,
          );

        const source =
          t.isMedia
            ? getMediaSource(
                t,
              )
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
              t.isMedia
                ? "1"
                : "0"
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
                ? `
                  <span class="demo-tag">
                    DEMO
                  </span>
                `
                : `
                  <span
                    class="demo-tag"
                    style="
                      color:#39d97a
                    "
                  >
                    LIVE
                  </span>
                `
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
        image.onerror =
          () => {
            if (
              image.dataset
                .fallback ===
              "1"
            ) {
              return;
            }

            image.dataset.fallback =
              "1";

            image.src =
              imageFallbackHTML(
                el.dataset.id,
              );
          };
      }

      const open =
        () => {
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
                  m.id ===
                  id,
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
                d.id ===
                id,
            );

          if (inc) {
            openModal(
              inc,
            );
          }
        };

      el.onclick =
        open;

      el.onkeydown =
        (e) => {
          if (
            e.key ===
              "Enter" ||
            e.key ===
              " "
          ) {
            e.preventDefault();

            open();
          }
        };
    });

  const loadMore =
    document.getElementById(
      "loadMoreBtn",
    );

  if (loadMore) {
    loadMore.style.display =
      tiles.length >
      state.visibleCount
        ? "inline-block"
        : "none";
  }
}


/* ================================================================
   MAP
   ================================================================ */

let mainLeafletMap =
  null;

let mainMarkersLayer =
  null;


function renderMap() {
  let incidents =
    DB[state.disaster] ||
    [];

  if (state.year !== "all") {
    incidents =
      incidents.filter(
        (d) =>
          d.year ===
          state.year,
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

  if (state.severity !== "all") {
    incidents =
      incidents.filter(
        (d) =>
          d.severity ===
          state.severity,
      );
  }

  const meta =
    TYPE_META[
      state.disaster
    ];

  if (!meta) {
    return;
  }

  if (
    typeof window.L ===
    "undefined"
  ) {
    console.warn(
      "Leaflet is not loaded.",
    );

    return;
  }

  const mapElement =
    document.getElementById(
      "leafletMap",
    );

  if (!mapElement) {
    return;
  }

  try {
    if (
      !mainLeafletMap
    ) {
      mainLeafletMap =
        L.map(
          "leafletMap",
          {
            preferCanvas:
              true,
          },
        ).setView(
          [
            28.3949,
            84.124,
          ],
          7,
        );

      L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 18,

          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
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

    if (
      !mainMarkersLayer
    ) {
      mainMarkersLayer =
        L.layerGroup().addTo(
          mainLeafletMap,
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
        .trim() ||
      meta.color;

    const CAP =
      500;

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
              fillColor:
                color,
              fillOpacity:
                0.55,
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
              ${status}
              ·
              ${escapeHTML(
                meta.tag,
              )}
            </div>

            <strong>
              ${escapeHTML(
                inc.title,
              )}
            </strong>

            <br>

            ${escapeHTML(
              inc.district ||
                "Nepal",
            )},
            ${escapeHTML(
              inc.province ||
                "Nepal",
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
            const popup =
              e.popup;

            const contentNode =
              popup?.getElement?.();

            const link =
              contentNode?.querySelector(
                ".map-detail-link",
              );

            if (link) {
              link.onclick =
                (ev) => {
                  ev.preventDefault();

                  openModal(
                    inc,
                  );
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
        (d) =>
          !d.demo,
      ).length;

    const legend =
      document.getElementById(
        "mapLegend",
      );

    if (legend) {
      legend.innerHTML = `
        <div style="
          font-weight:600;
          color:#fff;
          margin-bottom:4px;
        ">
          ${incidents.length.toLocaleString()}
          RECORDS

          ${
            incidents.length >
            CAP
              ? ` · SHOWING ${CAP}`
              : ""
          }
        </div>

        <div>
          <span
            class="sw"
            style="
              background:${meta.color}
            "
          ></span>

          ${escapeHTML(
            meta.label,
          )}

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
  } catch (error) {
    console.error(
      "Map rendering failed",
      error,
    );
  }
}


/* ================================================================
   TIMELINE
   ================================================================ */

function renderTimeline() {
  const rail =
    document.getElementById(
      "timelineRail",
    );

  if (!rail) {
    return;
  }

  const meta =
    TYPE_META[
      state.disaster
    ];

  if (!meta) {
    return;
  }

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

        if (
          state.severity !==
          "all"
        ) {
          incidents =
            incidents.filter(
              (d) =>
                d.severity ===
                state.severity,
            );
        }

        let top =
          [...incidents].sort(
            (a, b) =>
              (b.mag || 0) -
                (a.mag || 0) ||
              0,
          );

        if (
          state.disaster !==
          "earthquake"
        ) {
          top =
            incidents;
        }

        top =
          top.slice(
            0,
            3,
          );

        return `
          <div class="timeline-year">

            <div class="ty">
              ${y}
              ·
              ${incidents.length}
              RECORDS
            </div>

            ${
              top.length
                ? top
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
                : `
                    <div
                      class="tev"
                      style="
                        opacity:.4
                      "
                    >
                      No records
                    </div>
                  `
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
      el.onclick =
        () => {
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
            openModal(
              inc,
            );
          }
        };
    });
}


/* ================================================================
   INCIDENT MODAL
   ================================================================ */

async function openModal(
  inc,
) {
  if (!inc) {
    return;
  }

  const meta =
    TYPE_META[
      inc.disasterType
    ] ||
    TYPE_META.earthquake;

  const overlay =
    document.getElementById(
      "modalOverlay",
    );

  const panel =
    document.getElementById(
      "modalPanel",
    );

  if (!overlay || !panel) {
    return;
  }

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
      ? safeImageURL(
          getCardImage(
            inc,
          ),
          inc.id,
        )
      : safeImageURL(
          inc.image,
          inc.id,
        );

  const gallery =
    Array.isArray(
      inc.gallery,
    )
      ? inc.gallery
      : [];

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
        type="button"
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
              inc.district ||
                "Nepal",
            )},
            ${escapeHTML(
              inc.province ||
                "Nepal",
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
              ? `
                <span>
                  ⚠
                  ${escapeHTML(
                    inc.severity,
                  )}
                </span>
              `
              : ""
          }

          ${
            inc.verified !==
            undefined
              ? `
                <span>
                  ${
                    inc.verified
                      ? "✓ Verified by BIPAD"
                      : "◌ Unverified"
                  }
                </span>
              `
              : ""
          }

          ${
            inc.mag
              ? `
                <span>
                  Magnitude
                  ${(
                    +inc.mag
                  ).toFixed(1)}
                </span>
              `
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
                        style="
                          text-decoration:underline
                        "
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
          gallery.length
            ? `
              <div
                class="gallery-strip"
                id="galleryStrip_${escapeHTML(
                  inc.id,
                )}"
              >

                ${[
                  heroImage,
                  ...gallery,
                ]
                  .filter(
                    Boolean,
                  )
                  .map(
                    (g, i) => `
                      <img
                        src="${escapeHTML(
                          safeImageURL(
                            g,
                            `${inc.id}-${i}`,
                          ),
                        )}"
                        loading="lazy"
                        alt="Reference image ${
                          i + 1
                        }"
                        referrerpolicy="no-referrer"
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
                style="
                  margin-top:10px
                "
              >

                ${
                  inc.demo
                    ? "◆ Placeholder imagery — demonstration data."
                    : `
                      ◆ REFERENCE IMAGERY —
                      this may not depict this exact incident.

                      ${
                        inc.imageAttribution &&
                        inc
                          .imageAttribution[0]
                          ? `
                            Photo credit:
                            ${escapeHTML(
                              inc
                                .imageAttribution[0]
                                .artist ||
                                "Unknown",
                            )}

                            ·

                            ${escapeHTML(
                              inc
                                .imageAttribution[0]
                                .license ||
                                "See source",
                            )}
                          `
                          : ""
                      }
                    `
                }

              </div>
            `
            : `
              <div style="
                font-family:var(--font-mono);
                font-size:11.5px;
                color:var(--text-2);
                border:1px dashed var(--panel-border);
                padding:16px;
              ">

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
                      inc.district ||
                        "Nepal",
                    )}
                  </div>

                  <div class="ns">
                    Demonstration record
                    ·
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
                          : inc.gdacsUrl
                            ? "GDACS"
                            : "Public disaster feed"
                    }

                    ·

                    ${formatDate(
                      inc.date,
                    )}

                  </div>

                </div>

                ${
                  inc.usgsUrl ||
                  inc.bipadUrl ||
                  inc.gdacsUrl
                    ? `
                      <a
                        class="news-btn"
                        href="${escapeHTML(
                          inc.usgsUrl ||
                            inc.bipadUrl ||
                            inc.gdacsUrl,
                        )}"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        VIEW RECORD →
                      </a>
                    `
                    : `
                      <span class="news-btn">
                        LIVE RECORD
                      </span>
                    `
                }

              </div>
            `
        }

      </div>


      <div
        class="modal-block"
        id="gdeltBlock_${escapeHTML(
          inc.id,
        )}"
        style="
          display:none
        "
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
        style="
          display:none
        "
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
                    i <
                    filledCount
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

  const closeButton =
    document.getElementById(
      "modalCloseBtn",
    );

  if (closeButton) {
    closeButton.onclick =
      closeModal;
  }

  overlay.onclick =
    (e) => {
      if (
        e.target ===
        overlay
      ) {
        closeModal();
      }
    };

  const hero =
    document.getElementById(
      `heroImg_${inc.id}`,
    );

  if (hero) {
    hero.onerror =
      () => {
        hero.onerror =
          null;

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

  if (
    !inc.demo &&
    typeof loadWikiSummary ===
      "function"
  ) {
    loadWikiSummary(
      inc.disasterType,
    )
      .then((w) => {
        if (
          !w ||
          !w.extract
        ) {
          return;
        }

        const block =
          document.getElementById(
            `wikiBlock_${inc.id}`,
          );

        const content =
          document.getElementById(
            `wikiContent_${inc.id}`,
          );

        if (
          !block ||
          !content
        ) {
          return;
        }

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
                  not a report on this specific
                  incident.

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
      })
      .catch(
        () => {},
      );
  }


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
      MEDIA?.[
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
          No current public news
          coverage was found for
          this category.
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
                      a.title ||
                        "News article",
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

                ${
                  a.url
                    ? `
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
                    `
                    : ""
                }

              </div>
            `,
          )
          .join("");
    }
  }

  renderMiniMap(
    inc,
  );
}


/* ================================================================
   CLOSE INCIDENT MODAL
   ================================================================ */

function closeModal() {
  const overlay =
    document.getElementById(
      "modalOverlay",
    );

  if (!overlay) {
    return;
  }

  overlay.classList.remove(
    "show",
  );
}


/* ================================================================
   MINI MAP
   ================================================================ */

function renderMiniMap(
  inc,
) {
  if (
    typeof window.L ===
      "undefined" ||
    !inc
  ) {
    return;
  }

  if (
    typeof inc.lat !==
      "number" ||
    typeof inc.lng !==
      "number"
  ) {
    const container =
      document.getElementById(
        `miniMap_${inc.id}`,
      );

    if (container) {
      container.innerHTML = `
        <div style="
          height:100%;
          min-height:180px;
          display:flex;
          align-items:center;
          justify-content:center;
          font:11px var(--font-mono);
          color:var(--text-2);
          border:1px dashed var(--panel-border);
        ">
          LOCATION COORDINATES UNAVAILABLE
        </div>
      `;
    }

    return;
  }

  const container =
    document.getElementById(
      `miniMap_${inc.id}`,
    );

  if (!container) {
    return;
  }

  try {
    const map =
      L.map(
        container,
        {
          zoomControl:
            true,
          attributionControl:
            true,
        },
      ).setView(
        [
          inc.lat,
          inc.lng,
        ],
        9,
      );

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 18,
        attribution:
          "&copy; OpenStreetMap contributors",
      },
    ).addTo(map);

    const meta =
      TYPE_META[
        inc.disasterType
      ] ||
      TYPE_META.earthquake;

    L.circleMarker(
      [
        inc.lat,
        inc.lng,
      ],
      {
        radius: 9,
        color:
          meta.color,
        weight: 2,
        fillColor:
          meta.color,
        fillOpacity:
          0.75,
      },
    )
      .addTo(map)
      .bindPopup(
        escapeHTML(
          inc.title ||
            "Disaster location",
        ),
      )
      .openPopup();

    setTimeout(
      () =>
        map.invalidateSize(),
      100,
    );
  } catch (err) {
    console.warn(
      "Mini map failed",
      err,
    );
  }
}


/* ================================================================
   MEDIA MODAL
   ================================================================ */

function openMediaModal(
  item,
) {
  if (!item) {
    return;
  }

  const overlay =
    document.getElementById(
      "modalOverlay",
    );

  const panel =
    document.getElementById(
      "modalPanel",
    );

  if (!overlay || !panel) {
    return;
  }

  const type =
    item.contentType ||
    "image";

  const meta =
    TYPE_META[
      item.disasterType
    ] ||
    TYPE_META.earthquake;

  const image =
    safeImageURL(
      item.tileImg ||
        item.image ||
        item.url,
      item.id ||
        "media",
    );

  panel.style.setProperty(
    "--accent",
    meta.color,
  );

  let mediaHTML =
    "";

  if (
    type ===
    "video"
  ) {
    const videoUrl =
      item.url ||
      item.mediaData?.url ||
      "";

    mediaHTML = `
      <div style="
        aspect-ratio:16/9;
        background:#000;
        display:flex;
        align-items:center;
        justify-content:center;
      ">

        ${
          videoUrl
            ? `
              <a
                href="${escapeHTML(
                  videoUrl,
                )}"
                target="_blank"
                rel="noopener noreferrer"
                style="
                  color:#fff;
                  font:600 12px var(--font-mono);
                  text-decoration:underline;
                "
              >
                OPEN VIDEO →
              </a>
            `
            : `
              <span style="
                color:#aaa;
                font:11px var(--font-mono);
              ">
                VIDEO SOURCE UNAVAILABLE
              </span>
            `
        }

      </div>
    `;
  } else {
    mediaHTML = `
      <img
        src="${escapeHTML(
          image,
        )}"
        alt="${escapeHTML(
          item.title ||
            "Nepal disaster media",
        )}"
        style="
          width:100%;
          max-height:65vh;
          object-fit:contain;
          display:block;
          background:#000;
        "
        referrerpolicy="no-referrer"
      >
    `;
  }

  panel.innerHTML = `
    <div class="modal-hero">

      ${mediaHTML}

      <button
        class="modal-close"
        id="modalCloseBtn"
        type="button"
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
          ${escapeHTML(
            meta.tag,
          )}
        </span>

        <h2>
          ${escapeHTML(
            item.title ||
              "Public disaster media",
          )}
        </h2>

        <div class="modal-meta">

          <span>
            ${escapeHTML(
              getMediaSource(
                item,
              ),
            )}
          </span>

          ${
            item.date
              ? `
                <span>
                  📅
                  ${formatDate(
                    item.date,
                    "long",
                  )}
                </span>
              `
              : ""
          }

        </div>

      </div>

    </div>

    <div class="modal-body">

      <div class="modal-block">

        <h4>
          Source
        </h4>

        <p>
          ${
            type ===
            "image"
              ? "Public reference imagery from the configured media source."
              : type ===
                  "video"
                ? "Public video result from the configured video source."
                : "Public news article from the configured news source."
          }
        </p>

        ${
          item.url
            ? `
              <a
                class="news-btn"
                href="${escapeHTML(
                  item.url,
                )}"
                target="_blank"
                rel="noopener noreferrer"
              >
                OPEN ORIGINAL SOURCE →
              </a>
            `
            : ""
        }

      </div>

      ${
        type ===
        "news"
          ? `
            <div class="modal-block">

              <h4>
                Article
              </h4>

              <p>
                ${escapeHTML(
                  item.description ||
                    item.title ||
                    "Open the original source for the full article.",
                )}
              </p>

            </div>
          `
          : ""
      }

    </div>
  `;

  overlay.classList.add(
    "show",
  );

  const closeButton =
    document.getElementById(
      "modalCloseBtn",
    );

  if (closeButton) {
    closeButton.onclick =
      closeModal;
  }

  overlay.onclick =
    (e) => {
      if (
        e.target ===
        overlay
      ) {
        closeModal();
      }
    };

  const mediaImg =
    panel.querySelector(
      ".modal-hero img",
    );

  if (mediaImg) {
    mediaImg.onerror =
      () => {
        mediaImg.onerror =
          null;

        mediaImg.src =
          imageFallbackHTML(
            item.id ||
              "media",
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
  if (
    !container ||
    !inc
  ) {
    return;
  }

  try {
    const params =
      new URLSearchParams();

    params.set(
      "q",
      [
        "Nepal",
        inc.disasterType ||
          "disaster",
        inc.district ||
          "",
      ]
        .filter(Boolean)
        .join(" "),
    );

    if (inc.date) {
      params.set(
        "date",
        String(
          inc.date,
        ),
      );
    }

    const response =
      await fetch(
        `/api/youtube?${params.toString()}`,
        {
          headers: {
            Accept:
              "application/json",
          },
        },
      );

    if (!response.ok) {
      throw new Error(
        `YouTube request failed: ${response.status}`,
      );
    }

    const data =
      await response.json();

    const videos =
      Array.isArray(data)
        ? data
        : Array.isArray(
              data?.videos,
            )
          ? data.videos
          : Array.isArray(
                data?.items,
              )
            ? data.items
            : [];

    if (!videos.length) {
      container.innerHTML = `
        <div style="
          grid-column:1/-1;
          font:11px var(--font-mono);
          color:var(--text-2);
        ">
          No relevant public videos found.
        </div>
      `;

      return;
    }

    container.innerHTML =
      videos
        .slice(0, 6)
        .map(
          (
            video,
            index,
          ) => {
            const title =
              video.title ||
              video.name ||
              "Nepal disaster video";

            const url =
              video.url ||
              video.videoUrl ||
              video.link ||
              (
                video.id
                  ? `https://www.youtube.com/watch?v=${encodeURIComponent(
                      video.id,
                    )}`
                  : ""
              );

            const thumbnail =
              safeImageURL(
                video.thumbnail ||
                  video.thumbnailUrl ||
                  video.image,
                `youtube-${inc.id}-${index}`,
              );

            const channel =
              video.channel ||
              video.channelTitle ||
              video.source ||
              "YouTube";

            return `
              <article
                class="video-card"
                style="
                  overflow:hidden;
                  border:1px solid var(--panel-border);
                  background:var(--bg-2);
                "
              >

                <div style="
                  aspect-ratio:16/9;
                  overflow:hidden;
                ">

                  <img
                    src="${escapeHTML(
                      thumbnail,
                    )}"
                    alt="${escapeHTML(
                      title,
                    )}"
                    loading="lazy"
                    referrerpolicy="no-referrer"
                    style="
                      width:100%;
                      height:100%;
                      object-fit:cover;
                      display:block;
                    "
                  >

                </div>

                <div style="
                  padding:10px;
                ">

                  <div style="
                    font:700 13px var(--font-display);
                    line-height:1.2;
                    margin-bottom:6px;
                    color:var(--text-0);
                  ">
                    ${escapeHTML(
                      title,
                    )}
                  </div>

                  <div style="
                    font:10px var(--font-mono);
                    color:var(--text-2);
                    margin-bottom:8px;
                  ">
                    ${escapeHTML(
                      channel,
                    )}
                  </div>

                  ${
                    url
                      ? `
                        <a
                          class="news-btn"
                          href="${escapeHTML(
                            url,
                          )}"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          WATCH →
                        </a>
                      `
                      : ""
                  }

                </div>

              </article>
            `;
          },
        )
        .join("");

    container
      .querySelectorAll(
        "img",
      )
      .forEach(
        (
          img,
          index,
        ) => {
          img.onerror =
            () => {
              if (
                img.dataset
                  .fallback ===
                "1"
              ) {
                return;
              }

              img.dataset.fallback =
                "1";

              img.src =
                imageFallbackHTML(
                  `youtube-${inc.id}-${index}`,
                );
            };
        },
      );
  } catch (error) {
    console.warn(
      "YouTube loading failed",
      error,
    );

    container.innerHTML = `
      <div style="
        grid-column:1/-1;
        font:11px var(--font-mono);
        color:var(--text-2);
      ">
        Public video feed is temporarily
        unavailable.
      </div>
    `;
  }
}


/* ================================================================
   WIKIPEDIA BACKGROUND
   ================================================================ */

async function loadWikiSummary(
  disasterType,
) {
  const titles = {
    earthquake:
      "Earthquake",
    flood:
      "Flood",
    landslide:
      "Landslide",
  };

  const title =
    titles[
      disasterType
    ] ||
    "Natural disaster";

  const url =
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      title,
    )}`;

  try {
    const response =
      await fetch(
        url,
        {
          headers: {
            Accept:
              "application/json",
          },
        },
      );

    if (!response.ok) {
      throw new Error(
        `Wikipedia request failed: ${response.status}`,
      );
    }

    const data =
      await response.json();

    return {
      extract:
        data.extract ||
        "",

      url:
        data.content_urls
          ?.desktop?.page ||
        `https://en.wikipedia.org/wiki/${encodeURIComponent(
          title.replace(
            / /g,
            "_",
          ),
        )}`,
    };
  } catch (error) {
    console.warn(
      "Wikipedia summary failed",
      error,
    );

    return null;
  }
}


/* ================================================================
   GLOBAL ESCAPE HANDLING
   ================================================================ */

document.addEventListener(
  "keydown",
  (e) => {
    if (
      e.key ===
      "Escape"
    ) {
      const overlay =
        document.getElementById(
          "modalOverlay",
        );

      if (
        overlay?.classList.contains(
          "show",
        )
      ) {
        closeModal();
      }
    }
  },
);