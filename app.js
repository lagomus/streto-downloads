const API_URL = "https://api.github.com/repos/streto/streto-downloads/releases";

const latestGrid = document.getElementById("latestGrid");
const releaseList = document.getElementById("releaseList");
const statusEl = document.getElementById("status");
const latestReleaseLink = document.getElementById("latestReleaseLink");
const cardTemplate = document.getElementById("assetCardTemplate");
const releaseTypeFilter = document.getElementById("releaseTypeFilter");
const platformFilter = document.getElementById("platformFilter");
const archFilter = document.getElementById("archFilter");

const PLATFORM_ORDER = ["Windows", "macOS", "Linux", "Android", "iOS"];
const ARCH_ORDER = ["x64", "arm64"];

let cachedReleases = [];

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

  const arch =
    n.includes("arm64") || n.includes("aarch64") || n.includes("armv8")
      ? "arm64"
      : "x64";

  return { platform, arch };
}

function prettyDate(isoDate) {
  if (!isoDate) {
    return "unknown";
  }

  return new Date(isoDate).toLocaleDateString(undefined, {
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
  const chipEl = card.querySelector(".chip");
  const fileEl = card.querySelector(".asset-file");
  const linkEl = card.querySelector(".download-btn");

  titleEl.textContent = `${cls.platform} ${cls.arch}`;
  chipEl.textContent = releaseTag;
  fileEl.textContent = asset.name;
  linkEl.href = asset.browser_download_url;

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

    const key = `${cls.platform}:${cls.arch}`;
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
    empty.textContent = "No desktop installer assets were found in the latest release.";
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
    title.textContent = `${release.tag_name} ${release.prerelease ? "(pre-release)" : ""}`.trim();

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
      empty.textContent = "No desktop installer assets in this release.";
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
    releaseList.innerHTML = '<div class="empty">No releases match the selected filters.</div>';
  }
}

function rerender() {
  const latest = selectLatest(cachedReleases);

  if (!latest) {
    latestReleaseLink.style.display = "none";
    statusEl.textContent = "No releases found yet.";
    latestGrid.innerHTML = '<div class="empty">No releases found.</div>';
    releaseList.innerHTML = "";
    return;
  }

  latestReleaseLink.style.display = "inline";
  latestReleaseLink.href = latest.html_url;
  statusEl.textContent = `Latest: ${latest.tag_name} (${prettyDate(latest.published_at || latest.created_at)})`;

  renderLatest(latest);
  renderAll(cachedReleases);
}

async function loadReleases() {
  try {
    const res = await fetch(API_URL, {
      headers: { Accept: "application/vnd.github+json" },
    });

    if (!res.ok) {
      throw new Error(`GitHub API responded with ${res.status}`);
    }

    const releases = await res.json();
    if (!Array.isArray(releases) || releases.length === 0) {
      statusEl.textContent = "No releases found yet.";
      latestReleaseLink.style.display = "none";
      latestGrid.innerHTML = '<div class="empty">No releases found.</div>';
      return;
    }

    cachedReleases = releases;
    rerender();
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Unable to load release data.";
    latestReleaseLink.style.display = "none";
    latestGrid.innerHTML = '<div class="empty">Failed to load downloads. Please try again later.</div>';
  }
}

releaseTypeFilter.addEventListener("change", rerender);
platformFilter.addEventListener("change", rerender);
archFilter.addEventListener("change", rerender);

loadReleases();
