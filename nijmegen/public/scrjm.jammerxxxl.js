/* SCRJM.JAMMERXXXL.JS — intro sequence + stream player for Streaming Nijmegen.
   Reads its configuration from /introduceasindsins.cd.sys (JSON). */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const RECENT_KEY = "sn.recent";
  const video = $("player"), statusEl = $("status"), dot = $("live-dot"), empty = $("empty");
  let hls = null, cfg = { title: "Streaming Nijmegen", tagline: "", introDurationMs: 3200, defaultStream: "", channels: [] };

  $("year").textContent = new Date().getFullYear();

  const setStatus = (text, live = false) => { statusEl.textContent = text; dot.classList.toggle("live", live); };

  const isSafeUrl = (u) => { try { const p = new URL(u); return p.protocol === "https:" || p.protocol === "http:"; } catch { return false; } };

  // ---- Intro ----
  function runIntro() {
    const intro = $("intro"), bar = $("intro-progress");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dur = reduce ? 600 : Math.max(500, Number(cfg.introDurationMs) || 3200);
    $("intro-tag").textContent = cfg.tagline || "";
    if (sessionStorage.getItem("sn.introSeen")) return finish();
    const start = performance.now();
    let raf;
    function tick(t) {
      const p = Math.min(1, (t - start) / dur);
      bar.style.width = (p * 100).toFixed(1) + "%";
      p < 1 ? (raf = requestAnimationFrame(tick)) : finish();
    }
    raf = requestAnimationFrame(tick);
    $("intro-skip").addEventListener("click", finish, { once: true });
    $("intro-skip").focus();
    function finish() {
      cancelAnimationFrame(raf);
      sessionStorage.setItem("sn.introSeen", "1");
      intro.classList.add("done");
      intro.setAttribute("aria-hidden", "true");
    }
  }

  // ---- Player ----
  function play(url) {
    if (!isSafeUrl(url)) { setStatus("Ongeldige URL / Invalid URL"); return; }
    if (hls) { hls.destroy(); hls = null; }
    empty.classList.add("hide");
    setStatus("Laden… / Loading…");
    const isHls = /\.m3u8(\?|$)/i.test(url);
    if (isHls && window.Hls && Hls.isSupported()) {
      hls = new Hls({ lowLatencyMode: true });
      hls.on(Hls.Events.ERROR, (_e, d) => {
        if (!d.fatal) return;
        if (d.type === Hls.ErrorTypes.NETWORK_ERROR) { setStatus("Netwerkfout, opnieuw… / Network error, retrying…"); hls.startLoad(); }
        else if (d.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
        else { setStatus("Stream niet afspeelbaar / Stream unavailable"); hls.destroy(); hls = null; }
      });
      hls.loadSource(url);
      hls.attachMedia(video);
    } else {
      video.src = url; // native HLS (Safari) or progressive MP4/WebM
    }
    video.play().catch(() => setStatus("Klik ▶ om te starten / Press ▶ to start"));
    remember(url);
    const q = new URL(location.href); q.searchParams.set("src", url); history.replaceState(null, "", q);
    $("src").value = url;
  }

  video.addEventListener("playing", () => setStatus("● LIVE / Afspelen", true));
  video.addEventListener("pause", () => setStatus("Gepauzeerd / Paused"));
  video.addEventListener("waiting", () => setStatus("Bufferen… / Buffering…", true));
  video.addEventListener("error", () => { if (!hls) setStatus("Stream niet afspeelbaar / Stream unavailable"); });

  // ---- Lists ----
  const getRecent = () => { try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; } };
  function remember(url) {
    const list = [url, ...getRecent().filter((u) => u !== url)].slice(0, 8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
    renderList($("recent"), list.map((u) => ({ name: u, url: u })), "Nog niets / Nothing yet");
  }
  function renderList(ul, items, emptyText) {
    ul.replaceChildren();
    if (!items.length) { const li = document.createElement("li"); li.className = "none"; li.textContent = emptyText; ul.append(li); return; }
    for (const it of items) {
      const li = document.createElement("li"), b = document.createElement("button");
      b.type = "button"; b.textContent = it.name; b.title = it.url;
      b.addEventListener("click", () => play(it.url));
      li.append(b); ul.append(li);
    }
  }

  $("loader").addEventListener("submit", (e) => { e.preventDefault(); play($("src").value.trim()); });

  // ---- Boot ----
  async function boot() {
    try {
      const r = await fetch("/introduceasindsins.cd.sys", { cache: "no-cache" });
      if (r.ok) cfg = { ...cfg, ...(await r.json()) };
    } catch { /* config optional */ }
    if (cfg.title) document.title = cfg.title;
    runIntro();
    const channels = (Array.isArray(cfg.channels) ? cfg.channels : []).filter((c) => c && isSafeUrl(c.url)).map((c) => ({ name: String(c.name || c.url), url: c.url }));
    renderList($("channels"), channels, "Voeg kanalen toe in introduceasindsins.cd.sys / Add channels in introduceasindsins.cd.sys");
    renderList($("recent"), getRecent().map((u) => ({ name: u, url: u })), "Nog niets / Nothing yet");
    const start = new URLSearchParams(location.search).get("src") || cfg.defaultStream;
    if (start) play(start);
  }
  boot();
})();
