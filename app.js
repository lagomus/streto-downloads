const API_URLS = [
  "https://api.github.com/repos/lagomus/streto-downloads/releases",
  "https://api.github.com/repos/lagomus/streto-pos/releases",
  "https://api.github.com/repos/streto/streto-downloads/releases",
];

const latestGrid = document.getElementById("latestGrid");
const releaseList = document.getElementById("releaseList");
const statusEl = document.getElementById("status");
const latestReleaseLink = document.getElementById("latestReleaseLink");
const cardTemplate = document.getElementById("assetCardTemplate");
const releaseTypeFilter = document.getElementById("releaseTypeFilter");
const platformFilter = document.getElementById("platformFilter");
const archFilter = document.getElementById("archFilter");
const langEnBtn = document.getElementById("langEn");
const langEsBtn = document.getElementById("langEs");
const debugPanel = document.getElementById("debugPanel");
const debugOutput = document.getElementById("debugOutput");

const DEBUG_MODE = new URLSearchParams(window.location.search).get("debug") === "1";
const DEBUG_LINES = [];

const I18N = {
  en: {
    pageTitle: "Streto Downloads",
    badgeText: "Official Distribution",
    heroTitle: "Streto Desktop Downloads",
    heroLead:
      "Fast access to the latest signed installers for Windows, macOS, Linux, Android, and iOS, grouped by architecture.",
    latestHeading: "Latest Release",
    latestReleaseLink: "Open release notes",
    allHeading: "All Releases",
    releaseTypeLabel: "Release type",
    releaseTypeAll: "All",
    releaseTypeStable: "Stable",
    releaseTypePre: "Pre-release",
    platformLabel: "Platform",
    platformAll: "All",
    platformWindows: "Windows",
    platformMac: "macOS",
    platformLinux: "Linux",
    platformAndroid: "Android",
    platformIos: "iOS",
    archLabel: "Architecture",
    archAll: "All",
    footerText:
      "Source code is private. This repository only distributes desktop binaries and update metadata.",
    loadingReleases: "Loading releases...",
    noDesktopAssetsLatest: "No installer assets were found in the latest release for these filters.",
    noDesktopAssetsRelease: "No installer assets in this release for these filters.",
    noReleasesMatch: "No releases match the selected filters.",
    noReleasesFound: "No releases found.",
    noReleasesYet: "No releases found yet.",
    latestStatus: (tag, date) => `Latest: ${tag} (${date})`,
    unableToLoad: "Unable to load release data.",
    failedToLoad: "Failed to load downloads. Please try again later.",
    download: "Download",
    preReleaseTag: "pre-release",
    unknownDate: "unknown",
  },
  es: {
    pageTitle: "Descargas de Streto",
    badgeText: "Distribucion oficial",
    heroTitle: "Descargas de Streto Desktop",
    heroLead:
      "Acceso rapido a los instaladores firmados mas recientes para Windows, macOS, Linux, Android y iOS, agrupados por arquitectura.",
    latestHeading: "Ultima version",
    latestReleaseLink: "Ver notas de la version",
    allHeading: "Todas las versiones",
    releaseTypeLabel: "Tipo de version",
    releaseTypeAll: "Todas",
    releaseTypeStable: "Estable",
    releaseTypePre: "Pre-lanzamiento",
    platformLabel: "Plataforma",
    platformAll: "Todas",
    platformWindows: "Windows",
    platformMac: "macOS",
    platformLinux: "Linux",
    platformAndroid: "Android",
    platformIos: "iOS",
    archLabel: "Arquitectura",
    archAll: "Todas",
    footerText:
      "El codigo fuente es privado. Este repositorio solo distribuye binarios de escritorio y metadatos de actualizacion.",
    loadingReleases: "Cargando versiones...",
    noDesktopAssetsLatest: "No se encontraron instaladores en la ultima version para estos filtros.",
    noDesktopAssetsRelease: "No hay instaladores en esta version para estos filtros.",
    noReleasesMatch: "No hay versiones que coincidan con los filtros seleccionados.",
    noReleasesFound: "No se encontraron versiones.",
    noReleasesYet: "Aun no hay versiones publicadas.",
    latestStatus: (tag, date) => `Ultima version: ${tag} (${date})`,
    unableToLoad: "No se pudieron cargar las versiones.",
    failedToLoad: "No se pudieron cargar las descargas. Intenta nuevamente mas tarde.",
    download: "Descargar",
    preReleaseTag: "pre-lanzamiento",
    unknownDate: "desconocida",
  },
};

const PLATFORM_ORDER = ["Windows", "macOS", "Linux", "Android", "iOS"];
const ARCH_ORDER = ["x64", "arm64"];

let cachedReleases = [];

function debugLog(message) {
  if (!DEBUG_MODE) {
    return;
  }

  const line = `[${new Date().toISOString()}] ${message}`;
  DEBUG_LINES.push(line);
  if (debugOutput) {
    debugOutput.textContent = DEBUG_LINES.join("\n");
  }
}

function setupDebugPanel() {
  if (!DEBUG_MODE) {
    return;
  }

  if (debugPanel) {
    debugPanel.hidden = false;
  }

  debugLog(`Debug mode enabled`);
  debugLog(`Page URL: ${window.location.href}`);
  debugLog(`Navigator language: ${navigator.language || "unknown"}`);
  debugLog(`Navigator languages: ${(navigator.languages || []).join(", ")}`);
}

function detectLanguage() {
  try {
    const savedLang = localStorage.getItem("streto_downloads_lang");
    if (savedLang === "en" || savedLang === "es") {
      debugLog(`Language from localStorage: ${savedLang}`);
      return savedLang;
    }
  } catch {
    // Ignore storage failures and use browser language.
  }

  const langs = Array.isArray(navigator.languages) && navigator.languages.length
    ? navigator.languages
    : [navigator.language || "en"];

  for (const lang of langs) {
    if ((lang || "").toLowerCase().startsWith("es")) {
      debugLog(`Language detected from browser: es`);
      return "es";
    }
  }

  debugLog(`Language detected from browser: en`);
  return "en";
}

let currentLang = detectLanguage();
let T = I18N[currentLang] || I18N.en;

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = value;
  }
}

function applyI18n() {
  document.documentElement.lang = currentLang;
  document.title = T.pageTitle;
  debugLog(`Applying language: ${currentLang}`);

  setText("badgeText", T.badgeText);
  setText("heroTitle", T.heroTitle);
  setText("heroLead", T.heroLead);
  setText("latestHeading", T.latestHeading);
  setText("latestReleaseLink", T.latestReleaseLink);
  setText("allHeading", T.allHeading);
  setText("releaseTypeLabel", T.releaseTypeLabel);
  setText("releaseTypeAll", T.releaseTypeAll);
  setText("releaseTypeStable", T.releaseTypeStable);
  setText("releaseTypePre", T.releaseTypePre);
  setText("platformLabel", T.platformLabel);
  setText("platformAll", T.platformAll);
  setText("platformWindows", T.platformWindows);
  setText("platformMac", T.platformMac);
  setText("platformLinux", T.platformLinux);
  setText("platformAndroid", T.platformAndroid);
  setText("platformIos", T.platformIos);
  setText("archLabel", T.archLabel);
  setText("archAll", T.archAll);
  setText("footerText", T.footerText);
  setText("status", T.loadingReleases);

  if (langEnBtn) {
    langEnBtn.classList.toggle("active", currentLang === "en");
  }
  if (langEsBtn) {
    langEsBtn.classList.toggle("active", currentLang === "es");
  }
}

function setLanguage(lang) {
  if (!I18N[lang] || lang === currentLang) {
    return;
  }

  currentLang = lang;
  T = I18N[currentLang] || I18N.en;
  debugLog(`Language switched manually: ${currentLang}`);
  try {
    localStorage.setItem("streto_downloads_lang", currentLang);
    debugLog(`localStorage updated: streto_downloads_lang=${currentLang}`);
  } catch {
    // Ignore storage failures and continue in-memory.
  }
  applyI18n();
  rerender();
}

function classifyAsset(assetName) {
  const n = assetName.toLowerCase();

  let platform = null;
  if (n.endsWith(".exe") || n.includes("win")) {
    platform = "Windows";
  } else if (n.endsWith(".dmg") || n.endsWith(".pkg") || n.includes("-mac") || n.includes("macos")) {
    platform = "macOS";
  } else if (
    n.endsWith(".appimage") ||
    n.endsWith(".deb") ||
    n.endsWith(".rpm") ||
    n.endsWith(".snap") ||
    n.includes("linux") ||
    n.includes("appimage")
  ) {
    platform = "Linux";
  } else if (n.endsWith(".apk") || n.endsWith(".aab") || n.includes("android")) {
    platform = "Android";
  } else if (n.endsWith(".ipa") || n.includes("ios")) {
    platform = "iOS";
  }

  if (!platform) {
    return null;
  }

  let packageType = "Package";
  if (platform === "Windows") {
    if (n.includes("setup") || n.includes("installer") || n.includes("nsis")) {
      packageType = "Setup";
    } else {
      packageType = "Portable";
    }
  } else if (platform === "macOS") {
    if (n.endsWith(".dmg")) {
      packageType = "DMG";
    } else if (n.endsWith(".pkg")) {
      packageType = "PKG";
    } else if (n.endsWith(".zip")) {
      packageType = "ZIP";
    }
  } else if (platform === "Linux") {
    if (n.endsWith(".appimage")) {
      packageType = "AppImage";
    } else if (n.endsWith(".deb")) {
      packageType = "DEB";
    } else if (n.endsWith(".rpm")) {
      packageType = "RPM";
    } else if (n.endsWith(".snap")) {
      packageType = "SNAP";
    }
  } else if (platform === "Android") {
    packageType = n.endsWith(".aab") ? "AAB" : "APK";
  } else if (platform === "iOS") {
    packageType = "IPA";
  }

  const arch =
    n.includes("arm64") || n.includes("aarch64") || n.includes("armv8")
      ? "arm64"
      : "x64";

  return { platform, arch, packageType };
}

function prettyDate(isoDate) {
  if (!isoDate) {
    return T.unknownDate;
  }

  return new Date(isoDate).toLocaleDateString(document.documentElement.lang, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function preferredArch() {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("arm64") || ua.includes("aarch64")) {
    return "arm64";
  }
  return "x64";
}

function createAssetCard(asset, releaseTag) {
  const card = cardTemplate.content.firstElementChild.cloneNode(true);
  const cls = classifyAsset(asset.name);
  const titleEl = card.querySelector("h3");
  const kindEl = card.querySelector(".asset-kind");
  const releaseEl = card.querySelector(".asset-release");
  const fileEl = card.querySelector(".asset-file");
  const linkEl = card.querySelector(".download-btn");

  titleEl.textContent = `${cls.platform} ${cls.arch} ${cls.packageType}`;
  kindEl.textContent = cls.packageType;
  releaseEl.textContent = releaseTag;
  fileEl.textContent = asset.name;
  linkEl.href = asset.browser_download_url;
  linkEl.textContent = T.download;

  return card;
}

function passAssetFilter(asset) {
  const cls = classifyAsset(asset.name);
  if (!cls) {
    return false;
  }

  const byPlatform = platformFilter.value === "all" || cls.platform === platformFilter.value;
  const byArch = archFilter.value === "all" || cls.arch === archFilter.value;
  return byPlatform && byArch;
}

function passReleaseFilter(release) {
  if (releaseTypeFilter.value === "stable") {
    return !release.prerelease;
  }
  if (releaseTypeFilter.value === "pre") {
    return !!release.prerelease;
  }
  return true;
}

function selectLatest(releases) {
  for (const release of releases) {
    if (!passReleaseFilter(release)) {
      continue;
    }
    const assets = (release.assets || []).filter(passAssetFilter);
    if (assets.length > 0) {
      return release;
    }
  }
  return releases.find(passReleaseFilter) || releases[0] || null;
}

function renderLatest(release) {
  latestGrid.innerHTML = "";

  const grouped = new Map();
  for (const asset of (release.assets || []).filter(passAssetFilter)) {
    const cls = classifyAsset(asset.name);
    if (!cls) {
      continue;
    }

    const key = `${cls.platform}:${cls.arch}:${cls.packageType}`;
    if (!grouped.has(key)) {
      grouped.set(key, asset);
    }
  }

  const preferred = preferredArch();
  for (const platform of PLATFORM_ORDER) {
    for (const arch of ARCH_ORDER) {
      const key = `${platform}:${arch}`;
      const asset = grouped.get(key);
      if (!asset) {
        continue;
      }

      const card = createAssetCard(asset, release.tag_name);
      if (arch === preferred) {
        card.style.borderColor = "rgba(52, 211, 153, 0.75)";
      }
      latestGrid.appendChild(card);
    }
  }

  if (!latestGrid.children.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = T.noDesktopAssetsLatest;
    latestGrid.appendChild(empty);
  }
}

function renderAll(releases) {
  releaseList.innerHTML = "";

  const filteredReleases = releases.filter(passReleaseFilter);

  for (const release of filteredReleases) {
    const details = document.createElement("details");
    details.className = "release-row";

    const summary = document.createElement("summary");

    const title = document.createElement("span");
    title.className = "release-title";
    title.textContent = `${release.tag_name} ${release.prerelease ? `(${T.preReleaseTag})` : ""}`.trim();

    const date = document.createElement("span");
    date.className = "release-date";
    date.textContent = prettyDate(release.published_at || release.created_at);

    summary.append(title, date);
    details.appendChild(summary);

    const assetsWrap = document.createElement("div");
    assetsWrap.className = "release-assets";

    const assets = (release.assets || [])
      .filter((a) => classifyAsset(a.name))
      .filter(passAssetFilter)
      .sort((a, b) => a.name.localeCompare(b.name));

    if (!assets.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = T.noDesktopAssetsRelease;
      assetsWrap.appendChild(empty);
    } else {
      for (const asset of assets) {
        assetsWrap.appendChild(createAssetCard(asset, release.tag_name));
      }
    }

    details.appendChild(assetsWrap);
    releaseList.appendChild(details);
  }

  if (!releaseList.children.length) {
    releaseList.innerHTML = `<div class="empty">${T.noReleasesMatch}</div>`;
  }
}

function rerender() {
  const latest = selectLatest(cachedReleases);
  debugLog(`Rerender called. Cached releases: ${cachedReleases.length}`);

  if (!latest) {
    latestReleaseLink.style.display = "none";
    statusEl.textContent = T.noReleasesYet;
    latestGrid.innerHTML = `<div class="empty">${T.noReleasesFound}</div>`;
    releaseList.innerHTML = "";
    return;
  }

  latestReleaseLink.style.display = "inline";
  latestReleaseLink.href = latest.html_url;
  statusEl.textContent = T.latestStatus(
    latest.tag_name,
    prettyDate(latest.published_at || latest.created_at),
  );

  renderLatest(latest);
  renderAll(cachedReleases);
}

async function loadReleases() {
  try {
    let releases = null;
    for (const url of API_URLS) {
      debugLog(`Trying API URL: ${url}`);
      const res = await fetch(url, {
        headers: { Accept: "application/vnd.github+json" },
      });

      debugLog(`API response: ${url} -> ${res.status}`);

      if (!res.ok) {
        continue;
      }

      releases = await res.json();
      if (Array.isArray(releases) && releases.length > 0) {
        debugLog(`Loaded releases from ${url}. Count: ${releases.length}`);
        break;
      }

      if (Array.isArray(releases) && releases.length === 0) {
        debugLog(`Endpoint returned 0 releases, trying next source`);
      }
    }

    if (!Array.isArray(releases) || releases.length === 0) {
      statusEl.textContent = T.noReleasesYet;
      latestReleaseLink.style.display = "none";
      latestGrid.innerHTML = `<div class="empty">${T.noReleasesFound}</div>`;
      return;
    }

    cachedReleases = releases;
    rerender();
  } catch (err) {
    console.error(err);
    debugLog(`Load error: ${err instanceof Error ? err.message : String(err)}`);
    statusEl.textContent = T.unableToLoad;
    latestReleaseLink.style.display = "none";
    latestGrid.innerHTML = `<div class="empty">${T.failedToLoad}</div>`;
  }
}

releaseTypeFilter.addEventListener("change", rerender);
platformFilter.addEventListener("change", rerender);
archFilter.addEventListener("change", rerender);

if (langEnBtn) {
  langEnBtn.addEventListener("click", () => setLanguage("en"));
}
if (langEsBtn) {
  langEsBtn.addEventListener("click", () => setLanguage("es"));
}

setupDebugPanel();
applyI18n();
loadReleases();
