/* ================================================================
   GEONEPAL — MAIN CONTROLLER
   ================================================================ */


/* ================================================================
   LOGO FALLBACK
   ================================================================ */

const LOGO_FALLBACKS = [
  "assets/tarutium-logo.jpg",
  "assets/tarutium-logo.png",
  "assets/tarutium-logo.JPG",
  "assets/tarutium-logo.JPEG",
  "assets/tarutium-logo.PNG",
];

function handleLogoError(img) {
  const attempt = parseInt(
    img.dataset.logoAttempt || "0",
    10,
  );

  if (
    attempt <
    LOGO_FALLBACKS.length
  ) {
    img.dataset.logoAttempt =
      attempt + 1;

    img.src =
      LOGO_FALLBACKS[attempt];
  } else {
    img.style.display =
      "none";
  }
}


/* ================================================================
   VIEW SWITCHING
   ================================================================ */

function setView(view) {
  state.view = view;

  const galleryPane =
    document.getElementById(
      "galleryPane",
    );

  const mapPane =
    document.getElementById(
      "mapPane",
    );

  const galleryBtn =
    document.getElementById(
      "galleryBtn",
    );

  const mapBtn =
    document.getElementById(
      "mapBtn",
    );

  if (galleryPane) {
    galleryPane.style.display =
      view === "gallery"
        ? "block"
        : "none";
  }

  if (mapPane) {
    mapPane.style.display =
      view === "map"
        ? "block"
        : "none";
  }

  if (galleryBtn) {
    galleryBtn.classList.toggle(
      "active",
      view === "gallery",
    );
  }

  if (mapBtn) {
    mapBtn.classList.toggle(
      "active",
      view === "map",
    );
  }

  if (view === "map") {
    setTimeout(() => {
      try {
        renderMap();
      } catch (e) {
        console.warn(
          "Map rendering failed",
          e,
        );
      }
    }, 100);
  }
}


/* ================================================================
   ARCHIVE
   ================================================================ */

function openArchive(type) {
  state.disaster =
    type;

  state.year =
    "all";

  state.contentType =
    "all";

  state.province =
    "all";

  state.district =
    "all";

  state.severity =
    "all";

  state.search =
    "";

  state.visibleCount =
    150;

  const searchInput =
    document.getElementById(
      "searchInput",
    );

  if (searchInput) {
    searchInput.value =
      "";
  }

  document
    .querySelectorAll(
      ".filter-chip",
    )
    .forEach((c) => {
      c.classList.toggle(
        "active",
        c.dataset.ct ===
          "all",
      );
    });

  const provinceSelect =
    document.getElementById(
      "provinceSelect",
    );

  if (provinceSelect) {
    provinceSelect.value =
      "all";
  }

  const severitySelect =
    document.getElementById(
      "severitySelect",
    );

  if (severitySelect) {
    severitySelect.value =
      "all";
  }

  renderDistrictOptions();

  const districtSelect =
    document.getElementById(
      "districtSelect",
    );

  if (districtSelect) {
    districtSelect.value =
      "all";
  }

  const meta =
    TYPE_META[type];

  if (!meta) {
    console.warn(
      "Unknown disaster type:",
      type,
    );

    return;
  }

  const archTitle =
    document.getElementById(
      "archTitle",
    );

  if (archTitle) {
    archTitle.textContent =
      meta.label.toUpperCase();
  }

  const archTag =
    document.getElementById(
      "archTag",
    );

  if (archTag) {
    archTag.textContent =
      "NEPAL";

    archTag.style.color =
      meta.color;

    archTag.style.borderColor =
      meta.color;
  }

  const archSummary =
    document.getElementById(
      "archSummary",
    );

  if (archSummary) {
    archSummary.textContent =
      `Explore ${meta.label.toLowerCase()} recorded across Nepal between 2020 and 2026. ${
        type ===
        "earthquake"
          ? "Seismic records combine the live USGS Earthquake Catalog with ground-reported BIPAD incidents."
          : "Incident records are pulled from Nepal's BIPAD disaster portal where available, with a clearly-labelled demonstration fallback when live data is unavailable."
      }`;
  }

  const timelineEyebrow =
    document.getElementById(
      "timelineEyebrow",
    );

  if (timelineEyebrow) {
    timelineEyebrow.textContent =
      "2026 → 2020";
  }

  document.documentElement.style.setProperty(
    "--accent-tint",
    `${meta.color}22`,
  );

  renderYearRail();
  renderStats();
  renderGrid();
  renderTimeline();

  setView("gallery");

  const heroSection =
    document.getElementById(
      "heroSection",
    );

  if (heroSection) {
    heroSection.style.display =
      "none";
  }

  const archiveView =
    document.getElementById(
      "archiveView",
    );

  if (archiveView) {
    archiveView.style.display =
      "block";
  }

  window.scrollTo({
    top: 0,
    behavior: "instant",
  });
}


function closeArchive() {
  const archiveView =
    document.getElementById(
      "archiveView",
    );

  if (archiveView) {
    archiveView.style.display =
      "none";
  }

  const heroSection =
    document.getElementById(
      "heroSection",
    );

  if (heroSection) {
    heroSection.style.display =
      "flex";
  }

  window.scrollTo({
    top: 0,
    behavior: "instant",
  });
}


/* ================================================================
   PAGE ROUTER
   ================================================================ */

function showSection(name) {
  const heroSection =
    document.getElementById(
      "heroSection",
    );

  const archiveView =
    document.getElementById(
      "archiveView",
    );

  const companyPage =
    document.getElementById(
      "companyPage",
    );

  const hazardInfoPage =
    document.getElementById(
      "hazardInfoPage",
    );

  if (heroSection) {
    heroSection.style.display =
      name === "hero"
        ? "flex"
        : "none";
  }

  if (archiveView) {
    archiveView.style.display =
      name === "archive"
        ? "block"
        : "none";
  }

  if (companyPage) {
    companyPage.style.display =
      name === "company"
        ? "block"
        : "none";
  }

  if (hazardInfoPage) {
    hazardInfoPage.style.display =
      name === "hazardInfo"
        ? "block"
        : "none";
  }

  document
    .querySelectorAll(
      ".mainnav a",
    )
    .forEach((a) =>
      a.classList.remove(
        "active",
      ),
    );

  const map = {
    hero: "navHome",
    archive: "navHome",
    company: "navCompany",
  };

  const activeLink =
    document.getElementById(
      map[name],
    );

  if (activeLink) {
    activeLink.classList.add(
      "active",
    );
  }

  window.scrollTo({
    top: 0,
    behavior: "instant",
  });

  if (
    name ===
    "company"
  ) {
    initAboutFadeIn();
  }
}


function initAboutFadeIn() {
  const els =
    document.querySelectorAll(
      ".about-fade",
    );

  if (
    !(
      "IntersectionObserver" in
      window
    )
  ) {
    els.forEach((el) =>
      el.classList.add(
        "in-view",
      ),
    );

    return;
  }

  const io =
    new IntersectionObserver(
      (entries) => {
        entries.forEach(
          (en) => {
            if (
              en.isIntersecting
            ) {
              en.target.classList.add(
                "in-view",
              );

              io.unobserve(
                en.target,
              );
            }
          },
        );
      },
      {
        threshold: 0.15,
      },
    );

  els.forEach((el) =>
    io.observe(el),
  );
}


/* ================================================================
   EVENTS
   ================================================================ */

document
  .querySelectorAll(
    ".cat-card",
  )
  .forEach((card) => {
    card.addEventListener(
      "click",
      () => {
        const type =
          card.dataset.type;

        if (!type) {
          console.warn(
            "Disaster card is missing data-type:",
            card,
          );

          return;
        }

        openArchive(type);
      },
    );

    card.addEventListener(
      "keydown",
      (e) => {
        if (
          (e.key === "Enter" || e.key === " ") &&
          card.dataset.type
        ) {
          e.preventDefault();
          openArchive(card.dataset.type);
        }
      },
    );
  });

document
  .querySelectorAll(
    ".disaster-feature",
  )
  .forEach((card) => {
    card.addEventListener(
      "click",
      () => {
        const type =
          card.dataset.type;

        if (!type) {
          console.warn(
            "Disaster feature card is missing data-type:",
            card,
          );

          return;
        }

        openHazardInfo(type);
      },
    );

    card.addEventListener(
      "keydown",
      (e) => {
        if (
          (e.key === "Enter" || e.key === " ") &&
          card.dataset.type
        ) {
          e.preventDefault();
          openHazardInfo(card.dataset.type);
        }
      },
    );
  });


const backLink =
  document.getElementById(
    "backLink",
  );

if (backLink) {
  backLink.onclick = (e) => {
    e.preventDefault();

    closeArchive();
  };
}


const galleryBtn =
  document.getElementById(
    "galleryBtn",
  );

if (galleryBtn) {
  galleryBtn.onclick = () =>
    setView("gallery");
}


const mapBtn =
  document.getElementById(
    "mapBtn",
  );

if (mapBtn) {
  mapBtn.onclick = () =>
    setView("map");
}


const loadMoreBtn =
  document.getElementById(
    "loadMoreBtn",
  );

if (loadMoreBtn) {
  loadMoreBtn.onclick = () => {
    state.visibleCount +=
      150;

    renderGrid();
  };
}


const refreshBtn =
  document.getElementById(
    "refreshBtn",
  );

if (refreshBtn) {
  refreshBtn.onclick = () =>
    refreshLiveData();
}


const searchInput =
  document.getElementById(
    "searchInput",
  );

if (searchInput) {
  searchInput.addEventListener(
    "input",
    (e) => {
      state.search =
        e.target.value;

      state.visibleCount =
        150;

      renderGrid();
    },
  );
}


document
  .querySelectorAll(
    ".filter-chip",
  )
  .forEach((chip) => {
    chip.onclick = () => {
      document
        .querySelectorAll(
          ".filter-chip",
        )
        .forEach((c) =>
          c.classList.remove(
            "active",
          ),
        );

      chip.classList.add(
        "active",
      );

      state.contentType =
        chip.dataset.ct;

      state.visibleCount =
        150;

      renderGrid();
    };
  });


const provinceSelect =
  document.getElementById(
    "provinceSelect",
  );

if (provinceSelect) {
  provinceSelect.addEventListener(
    "change",
    (e) => {
      state.province =
        e.target.value;

      state.district =
        "all";

      renderDistrictOptions();

      const districtSelect =
        document.getElementById(
          "districtSelect",
        );

      if (districtSelect) {
        districtSelect.value =
          "all";
      }

      state.visibleCount =
        150;

      renderGrid();
      renderStats();
      renderTimeline();

      if (
        state.view ===
        "map"
      ) {
        renderMap();
      }
    },
  );
}


const districtSelect =
  document.getElementById(
    "districtSelect",
  );

if (districtSelect) {
  districtSelect.addEventListener(
    "change",
    (e) => {
      state.district =
        e.target.value;

      state.visibleCount =
        150;

      renderGrid();
      renderStats();
      renderTimeline();

      if (
        state.view ===
        "map"
      ) {
        renderMap();
      }
    },
  );
}


const severitySelect =
  document.getElementById(
    "severitySelect",
  );

if (severitySelect) {
  severitySelect.addEventListener(
    "change",
    (e) => {
      state.severity =
        e.target.value;

      state.visibleCount =
        150;

      renderGrid();
      renderStats();
      renderTimeline();

      if (
        state.view ===
        "map"
      ) {
        renderMap();
      }
    },
  );
}


/* ================================================================
   NAVIGATION
   ================================================================ */

const navHome =
  document.getElementById(
    "navHome",
  );

if (navHome) {
  navHome.onclick = (e) => {
    e.preventDefault();

    showSection("hero");
  };
}


const navMap =
  document.getElementById(
    "navMap",
  );

if (navMap) {
  navMap.onclick = (e) => {
    e.preventDefault();

    if (state.disaster) {
      showSection("archive");

      setView("map");

      const archiveView =
        document.getElementById(
          "archiveView",
        );

      if (archiveView) {
        archiveView.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    } else {
      showSection("hero");
    }
  };
}


const navTimeline =
  document.getElementById(
    "navTimeline",
  );

if (navTimeline) {
  navTimeline.onclick = (e) => {
    e.preventDefault();

    if (state.disaster) {
      showSection("archive");

      const timelineSection =
        document.getElementById(
          "timelineSection",
        );

      if (timelineSection) {
        timelineSection.scrollIntoView({
          behavior: "smooth",
        });
      }
    } else {
      showSection("hero");
    }
  };
}


const navCompany =
  document.getElementById(
    "navCompany",
  );

if (navCompany) {
  navCompany.onclick = (e) => {
    e.preventDefault();

    showSection(
      "company",
    );
  };
}


const companyBackLink =
  document.getElementById(
    "companyBackLink",
  );

if (companyBackLink) {
  companyBackLink.onclick = (e) => {
    e.preventDefault();

    showSection("hero");
  };
}


/* ================================================================
   SPLASH
   ================================================================ */

const enterBtn =
  document.getElementById(
    "enterBtn",
  );

if (enterBtn) {
  enterBtn.onclick = () =>
    document
      .getElementById(
        "splash",
      )
      ?.classList.add(
        "hide",
      );
}


document.body.addEventListener(
  "keydown",
  (e) => {
    if (
      e.key ===
      "Escape"
    ) {
      if (
        typeof closeModal ===
        "function"
      ) {
        closeModal();
      }
    }
  },
);


setTimeout(() => {
  document
    .getElementById(
      "splash",
    )
    ?.classList.add(
      "hide",
    );
}, 4200);


/* ================================================================
   HERO VIDEO MARQUEE
   ================================================================ */

async function loadHeroReel() {
  const track =
    document.getElementById(
      "reelTrack",
    );

  const section =
    document.getElementById(
      "heroReel",
    );

  if (!track || !section) {
    return;
  }

  try {
    const q =
      encodeURIComponent(
        "Nepal flood earthquake landslide disaster",
      );

    const url =
      `/api/youtube?q=${q}&max=16`;

    const res =
      await fetch(url);

    if (!res.ok) {
      throw new Error(
        `HTTP ${res.status}`,
      );
    }

    const j =
      await res.json();

    if (
      j.error ||
      !j.items ||
      !j.items.length
    ) {
      section.style.display =
        "none";

      return;
    }

    const seen =
      new Set();

    const items =
      j.items.filter(
        (v) => {
          const id =
            v?.id?.videoId;

          if (!id) {
            return false;
          }

          if (
            seen.has(id)
          ) {
            return false;
          }

          seen.add(id);

          return true;
        },
      );

    if (!items.length) {
      section.style.display =
        "none";

      return;
    }

    const cardsHtml =
      items
        .map(
          (v) => {
            const thumb =
              v?.snippet
                ?.thumbnails
                ?.medium
                ?.url;

            if (!thumb) {
              return "";
            }

            const title =
              String(
                v?.snippet
                  ?.title ||
                  "",
              )
                .replace(
                  /&/g,
                  "&amp;",
                )
                .replace(
                  /</g,
                  "&lt;",
                )
                .replace(
                  />/g,
                  "&gt;",
                )
                .replace(
                  /"/g,
                  "&quot;",
                )
                .replace(
                  /'/g,
                  "&#39;",
                );

            const videoId =
              encodeURIComponent(
                v.id.videoId,
              );

            return `
              <a
                class="marquee-card"
                href="https://www.youtube.com/watch?v=${videoId}"
                target="_blank"
                rel="noopener noreferrer"
                title="${title}"
              >
                <img
                  src="${thumb}"
                  loading="lazy"
                  alt=""
                  referrerpolicy="no-referrer"
                >

                <span class="mc-live">
                  VIDEO
                </span>
              </a>
            `;
          },
        )
        .join("");

    if (!cardsHtml) {
      section.style.display =
        "none";

      return;
    }

    track.innerHTML =
      cardsHtml +
      cardsHtml;
  } catch (e) {
    console.warn(
      "Hero reel unavailable",
      e,
    );

    section.style.display =
      "none";
  }
}


/* ================================================================
   REFRESH
   ================================================================ */

async function refreshLiveData() {
  const badge =
    document.getElementById(
      "liveBadge",
    );

  const refresh =
    document.getElementById(
      "refreshBtn",
    );

  const original =
    badge?.textContent ||
    "● LIVE DATA";

  if (refresh) {
    refresh.disabled =
      true;

    refresh.style.opacity =
      "0.5";

    refresh.style.transform =
      "rotate(180deg)";
  }

  if (badge) {
    badge.textContent =
      "● REFRESHING LIVE DATA…";
  }

  try {
    await loadLiveData();

    if (
      typeof loadAllCommonsImages ===
      "function"
    ) {
      await loadAllCommonsImages();
    }

    if (
      typeof loadAllCategoryMedia ===
      "function"
    ) {
      await loadAllCategoryMedia();
    }

    updateHeroCounts();

    if (badge) {
      badge.textContent =
        "● LIVE DATA UPDATED JUST NOW";
    }

    if (state.disaster) {
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
    }
  } catch (e) {
    console.warn(
      "Live data refresh failed",
      e,
    );

    if (badge) {
      badge.textContent =
        "● LIVE REFRESH FAILED · SHOWING LAST AVAILABLE DATA";
    }
  } finally {
    if (refresh) {
      refresh.disabled =
        false;

      refresh.style.opacity =
        "";

      refresh.style.transform =
        "";
    }

    setTimeout(() => {
      if (
        badge &&
        !state.disaster
      ) {
        badge.textContent =
          original ||
          "● LIVE DATA";
      }
    }, 5000);
  }
}


/* ================================================================
   INITIALIZATION
   ================================================================ */

(async function init() {
  try {
    renderProvinceOptions();

    renderDistrictOptions();

    buildDemoData();

    updateHeroCounts();

    const badge =
      document.getElementById(
        "liveBadge",
      );

    if (badge) {
      badge.textContent =
        "● CONNECTING TO LIVE DISASTER FEEDS…";
    }

    await loadLiveData();

    updateHeroCounts();

    if (badge) {
      badge.textContent =
        "● LIVE DATA CONNECTED";
    }

    if (
      typeof loadAllCommonsImages ===
      "function"
    ) {
      await loadAllCommonsImages();
    }

    updateHeroCounts();

    loadHeroReel();

    if (
      typeof loadAllCategoryMedia ===
      "function"
    ) {
      await loadAllCategoryMedia();
    }

    updateHeroCounts();

    if (state.disaster) {
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
    }
  } catch (e) {
    console.error(
      "GeoNepal initialization failed",
      e,
    );

    const badge =
      document.getElementById(
        "liveBadge",
      );

    if (badge) {
      badge.textContent =
        "● LIVE SERVICES UNAVAILABLE · ARCHIVE STILL AVAILABLE";
    }

    try {
      updateHeroCounts();

      if (state.disaster) {
        renderYearRail();
        renderStats();
        renderGrid();
        renderTimeline();
      }
    } catch (renderError) {
      console.error(
        "Fallback rendering failed",
        renderError,
      );
    }
  }
})();


/* ================================================================
   HAZARD INFO PAGE — "Records in Detail" destination, separate from
   the "Select the Hazard" archive entry point.
   ================================================================ */
function openHazardInfo(type) {
  renderHazardInfo(type);

  const heroSection = document.getElementById("heroSection");
  const archiveView = document.getElementById("archiveView");
  const companyPage = document.getElementById("companyPage");
  const hazardInfoPage = document.getElementById("hazardInfoPage");

  if (heroSection) heroSection.style.display = "none";
  if (archiveView) archiveView.style.display = "none";
  if (companyPage) companyPage.style.display = "none";
  if (hazardInfoPage) hazardInfoPage.style.display = "block";

  window.scrollTo({ top: 0, behavior: "instant" });
}