/* ---------- logo fallback: tries common alternate filenames before giving up ----------
   Fixes the "broken image icon + alt text" look if the file was saved with a
   different extension/case than assets/tarutium-logo.jpeg. */
const LOGO_FALLBACKS = [
  "assets/tarutium-logo.jpg",
  "assets/tarutium-logo.png",
  "assets/tarutium-logo.JPG",
  "assets/tarutium-logo.JPEG",
  "assets/tarutium-logo.PNG",
];
function handleLogoError(img) {
  const attempt = parseInt(img.dataset.logoAttempt || "0", 10);
  if (attempt < LOGO_FALLBACKS.length) {
    img.dataset.logoAttempt = attempt + 1;
    img.src = LOGO_FALLBACKS[attempt];
  } else {
    img.style.display = "none";
  }
}

/* ---------- view switching ---------- */
function setView(view) {
  state.view = view;
  document.getElementById("galleryPane").style.display =
    view === "gallery" ? "block" : "none";
  document.getElementById("mapPane").style.display =
    view === "map" ? "block" : "none";
  document
    .getElementById("galleryBtn")
    .classList.toggle("active", view === "gallery");
  document.getElementById("mapBtn").classList.toggle("active", view === "map");
  if (view === "map") renderMap();
}

function openArchive(type) {
  state.disaster = type;
  state.year = "all";
  state.contentType = "all";
  state.province = "all";
  state.district = "all";
  state.severity = "all";
  state.search = "";
  state.visibleCount = 150;
  document.getElementById("searchInput").value = "";
  document
    .querySelectorAll(".filter-chip")
    .forEach((c) => c.classList.toggle("active", c.dataset.ct === "all"));
  document.getElementById("provinceSelect").value = "all";
  document.getElementById("severitySelect").value = "all";
  renderDistrictOptions();
  document.getElementById("districtSelect").value = "all";

  const meta = TYPE_META[type];
  document.getElementById("archTitle").textContent = meta.label.toUpperCase();
  document.getElementById("archTag").textContent = "NEPAL";
  document.getElementById("archTag").style.color = meta.color;
  document.getElementById("archTag").style.borderColor = meta.color;
  document.getElementById("archSummary").textContent =
    `Explore ${meta.label.toLowerCase()} recorded across Nepal between 2020 and 2026. ${type === "earthquake" ? "Seismic records combine the live USGS Earthquake Catalog with ground-reported BIPAD incidents." : "Incident records are pulled live from Nepal's BIPAD disaster portal where available, with a demo fallback if the feed is unreachable."}`;
  document.getElementById("timelineEyebrow").textContent = "2026 → 2020";

  document.documentElement.style.setProperty(
    "--accent-tint",
    meta.color + "22",
  );

  renderYearRail();
  renderStats();
  renderGrid();
  renderTimeline();
  setView("gallery");

  document.getElementById("heroSection").style.display = "none";
  document.getElementById("archiveView").style.display = "block";
  window.scrollTo({ top: 0, behavior: "instant" });
}
function closeArchive() {
  document.getElementById("archiveView").style.display = "none";
  document.getElementById("heroSection").style.display = "flex";
  window.scrollTo({ top: 0, behavior: "instant" });
}

/* ---------- top-level page router: hero / archive / company ---------- */
function showSection(name) {
  document.getElementById("heroSection").style.display =
    name === "hero" ? "flex" : "none";
  document.getElementById("archiveView").style.display =
    name === "archive" ? "block" : "none";
  document.getElementById("companyPage").style.display =
    name === "company" ? "block" : "none";
  document
    .querySelectorAll(".mainnav a")
    .forEach((a) => a.classList.remove("active"));
  const map = { hero: "navHome", archive: "navHome", company: "navCompany" };
  const activeLink = document.getElementById(map[name]);
  if (activeLink) activeLink.classList.add("active");
  window.scrollTo({ top: 0, behavior: "instant" });
  if (name === "company") initAboutFadeIn();
}
function initAboutFadeIn() {
  const els = document.querySelectorAll(".about-fade");
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) en.target.classList.add("in-view");
      });
    },
    { threshold: 0.15 },
  );
  els.forEach((el) => io.observe(el));
}

/* ---------- event wiring ---------- */
document.querySelectorAll(".cat-card").forEach((card) => {
  card.addEventListener("click", () => openArchive(card.dataset.type));
});
document.getElementById("backLink").onclick = (e) => {
  e.preventDefault();
  closeArchive();
};
document.getElementById("galleryBtn").onclick = () => setView("gallery");
document.getElementById("mapBtn").onclick = () => setView("map");
document.getElementById("loadMoreBtn").onclick = () => {
  state.visibleCount += 150;
  renderGrid();
};
document.getElementById("refreshBtn").onclick = () => refreshLiveData();

document.getElementById("searchInput").addEventListener("input", (e) => {
  state.search = e.target.value;
  state.visibleCount = 150;
  renderGrid();
});
document.querySelectorAll(".filter-chip").forEach((chip) => {
  chip.onclick = () => {
    document
      .querySelectorAll(".filter-chip")
      .forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    state.contentType = chip.dataset.ct;
    state.visibleCount = 150;
    renderGrid();
  };
});
document.getElementById("provinceSelect").addEventListener("change", (e) => {
  state.province = e.target.value;
  state.district = "all";
  renderDistrictOptions();
  state.visibleCount = 150;
  renderGrid();
});
document.getElementById("districtSelect").addEventListener("change", (e) => {
  state.district = e.target.value;
  state.visibleCount = 150;
  renderGrid();
});
document.getElementById("severitySelect").addEventListener("change", (e) => {
  state.severity = e.target.value;
  state.visibleCount = 150;
  renderGrid();
});

document.getElementById("navHome").onclick = (e) => {
  e.preventDefault();
  showSection("hero");
};
document.getElementById("navMap").onclick = (e) => {
  e.preventDefault();
  if (state.disaster) {
    showSection("archive");
    setView("map");
    document.getElementById("archiveView").scrollIntoView();
  }
};
document.getElementById("navTimeline").onclick = (e) => {
  e.preventDefault();
  if (state.disaster) {
    showSection("archive");
    document
      .getElementById("timelineSection")
      .scrollIntoView({ behavior: "smooth" });
  }
};
document.getElementById("navCompany").onclick = (e) => {
  e.preventDefault();
  showSection("company");
};
document.getElementById("companyBackLink").onclick = (e) => {
  e.preventDefault();
  showSection("hero");
};

document.getElementById("enterBtn").onclick = () =>
  document.getElementById("splash").classList.add("hide");
document.body.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});
setTimeout(() => {
  document.getElementById("splash").classList.add("hide");
}, 4200);

/* ---------- hero video marquee (real YouTube results, slim looping strip above the title) ---------- */
async function loadHeroReel() {
  const track = document.getElementById("reelTrack");
  const section = document.getElementById("heroReel");
  try {
    const q = encodeURIComponent("Nepal flood earthquake landslide disaster");
    const url = `/api/youtube?q=${q}&max=16`;
    const res = await fetch(url);
    const j = await res.json();
    if (j.error || !j.items || !j.items.length) {
      section.style.display = "none";
      return;
    }
    const seen = new Set();
    const items = j.items.filter((v) => {
      if (seen.has(v.id.videoId)) return false;
      seen.add(v.id.videoId);
      return true;
    });
    const cardsHtml = items
      .map(
        (v) => `
      <a class="marquee-card" href="https://www.youtube.com/watch?v=${v.id.videoId}" target="_blank" title="${v.snippet.title}">
        <img src="${v.snippet.thumbnails.medium.url}" loading="lazy">
        <span class="mc-live">LIVE</span>
      </a>`,
      )
      .join("");
    track.innerHTML = cardsHtml + cardsHtml;
  } catch (e) {
    section.style.display = "none";
  }
}

/* ---------- live-data status + manual refresh ---------- */
async function refreshLiveData() {
  const badge = document.getElementById("liveBadge");
  const before = badge.textContent;
  badge.textContent = "● Refreshing live BIPAD / USGS / GDACS data…";
  try {
    await loadLiveData();
    await loadAllCommonsImages();
    await loadAllCategoryMedia();
  } catch (e) {
    console.warn("Live data refresh failed", e);
  }
  updateHeroCounts();
  if (state.disaster) {
    renderYearRail();
    renderStats();
    renderGrid();
    renderTimeline();
    if (state.view === "map") renderMap();
  }
}

/* ---------- init ---------- */
(async function init() {
  renderProvinceOptions();
  renderDistrictOptions();
  buildDemoData();
  updateHeroCounts();
  document.getElementById("liveBadge").textContent =
    "● Loading live BIPAD / USGS / GDACS feeds…";
  await loadLiveData();
  await loadAllCommonsImages();
  updateHeroCounts();
  loadHeroReel();
  loadAllCategoryMedia().then(() => {
    if (state.disaster) {
      renderStats();
      renderGrid();
    }
  });
})();
