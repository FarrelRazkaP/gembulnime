(() => {
  "use strict";

  const API = (window.KAZE_API || "https://www.sankavollerei.web.id/anime").replace(/\/+$/, "");
  const app = document.getElementById("app");
  const nav = document.getElementById("nav");
  const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jum'at", "Sabtu"];
  const SITE = "Gembulnime · Nonton Anime Sub Indo";

  // ---------- helpers ----------
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const enc = encodeURIComponent;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z]/g, "");
  const todayName = () => DAYS[new Date().getDay()];

  const icon = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z"/></svg>',
    bookmark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 4h11v16l-5.5-3.8L6.5 20z" stroke-linejoin="round"/></svg>',
    share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4M8 8l4-4 4 4M5 13v6h14v-6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    cinema: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke-linecap="round"/></svg>',
    down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2" stroke-linecap="round"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>',
    film: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9.5v5l4.5-2.5z" fill="currentColor" stroke="none"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="3.5" height="14" rx="1"/><rect x="14" y="5" width="3.5" height="14" rx="1"/></svg>',
    muted: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" stroke-linejoin="round"/><path d="m16 9.5 5 5m0-5-5 5" stroke-linecap="round"/></svg>',
    sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" stroke-linejoin="round"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" stroke-linecap="round"/></svg>',
    bell: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
    bellFill: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" stroke="none"><path d="M12 2a6 6 0 0 0-6 6c0 7-3 9-3 9h18s-3-2-3-9a6 6 0 0 0-6-6Zm0 20a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Z"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  };

  const store = {
    get(k, d) {
      try { return JSON.parse(localStorage.getItem("kaze_" + k)) ?? d; } catch { return d; }
    },
    set(k, v) {
      try { localStorage.setItem("kaze_" + k, JSON.stringify(v)); } catch { /* storage penuh / diblok */ }
    },
  };

  // ---------- Supabase auth + koleksi lintas perangkat ----------
  const libraryKeys = ["favs", "history", "reminders", "seen", "comic_history", "comic_seen"];
  const hasSupabaseConfig = Boolean(window.SUPABASE_URL && window.SUPABASE_ANON_KEY && window.supabase?.createClient);
  const supabase = hasSupabaseConfig ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY) : null;
  let authUser = null;
  let syncingLibrary = false;
  let librarySyncTimer;
  let authMessage = "";
  let authMessageType = "status";

  const librarySnapshot = () => Object.fromEntries(libraryKeys.map((key) => [key, store.get(key, key.endsWith("seen") ? {} : [])]));
  const accountLibraryKey = (userId) => `kaze_account_library_${userId}`;
  function archiveAccountLibrary(userId) {
    try {
      localStorage.setItem(accountLibraryKey(userId), JSON.stringify(librarySnapshot()));
      libraryKeys.forEach((key) => localStorage.setItem(`kaze_${key}`, JSON.stringify(key.endsWith("seen") ? {} : [])));
    } catch (error) {
      console.warn("Could not separate the signed-out library from guest storage:", error);
    }
  }
  const mergeLibraryList = (cloud = [], local = [], keyFn) => {
    const merged = new Map();
    [...cloud, ...local].forEach((item) => {
      const key = keyFn(item);
      if (key != null && key !== "") merged.set(String(key), { ...(merged.get(String(key)) || {}), ...item });
    });
    return [...merged.values()].sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 200);
  };
  async function syncLibraryFromCloud() {
    if (!supabase || !authUser) return;
    syncingLibrary = true;
    try {
      const { data, error } = await supabase.from("user_library").select("data").eq("user_id", authUser.id).maybeSingle();
      if (error) throw error;
      const local = librarySnapshot();
      const cloud = data?.data || {};
      let accountLocal = {};
      try { accountLocal = JSON.parse(localStorage.getItem(accountLibraryKey(authUser.id)) || "{}"); } catch { /* Abaikan cache akun yang rusak. */ }
      const merged = {
        favs: mergeLibraryList(cloud.favs, accountLocal.favs || [], (x) => x.animeId),
        history: mergeLibraryList(cloud.history, accountLocal.history || [], (x) => x.animeId || x.episodeId),
        reminders: mergeLibraryList(cloud.reminders, accountLocal.reminders || [], (x) => x.animeId),
        comic_history: mergeLibraryList(cloud.comic_history, accountLocal.comic_history || [], (x) => x.slug || x.comicId || x.mangaId || x.chapter || x.chapterId),
        seen: { ...(cloud.seen || {}), ...(accountLocal.seen || {}) },
        comic_seen: { ...(cloud.comic_seen || {}), ...(accountLocal.comic_seen || {}) },
      };
      // Item guest di perangkat ini ikut digabung saat login; cache akun lain tidak ikut.
      merged.favs = mergeLibraryList(merged.favs, local.favs, (x) => x.animeId);
      merged.history = mergeLibraryList(merged.history, local.history, (x) => x.animeId || x.episodeId);
      merged.reminders = mergeLibraryList(merged.reminders, local.reminders, (x) => x.animeId);
      merged.comic_history = mergeLibraryList(merged.comic_history, local.comic_history, (x) => x.slug || x.comicId || x.mangaId || x.chapter || x.chapterId);
      merged.seen = { ...merged.seen, ...(local.seen || {}) };
      merged.comic_seen = { ...merged.comic_seen, ...(local.comic_seen || {}) };
      syncingLibrary = false;
      libraryKeys.forEach((key) => store.set(key, merged[key]));
      await persistLibrary();
    } catch (error) {
      syncingLibrary = false;
      console.error("Supabase library sync failed:", error);
      toast("Akun masuk, tetapi koleksi gagal disinkronkan. Coba muat ulang.");
    }
  }
  async function persistLibrary() {
    if (!supabase || !authUser || syncingLibrary) return;
    const { error } = await supabase.from("user_library").upsert({ user_id: authUser.id, data: librarySnapshot(), updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) throw error;
  }
  function queueLibrarySync() {
    if (!supabase || !authUser || syncingLibrary) return;
    clearTimeout(librarySyncTimer);
    librarySyncTimer = setTimeout(() => persistLibrary().catch((error) => {
      console.error("Supabase library sync failed:", error);
      toast("Perubahan belum tersinkron. Periksa koneksi lalu coba lagi.");
    }), 700);
  }
  function updateAuthNav() {
    const link = $("#authNavLink");
    if (!link) return;
    link.href = authUser ? "#/account" : "#/login";
    link.setAttribute("aria-label", authUser ? "Akun" : "Masuk atau buat akun");
    $("span", link).textContent = authUser ? "Akun" : "Masuk";
  }
  function setAuthMessage(message, type = "status") {
    authMessage = message;
    authMessageType = type;
    const output = $("#authMessage", app);
    if (output) {
      output.textContent = message;
      output.dataset.type = type;
      output.hidden = !message;
    }
  }
  function pageAuth(mode = "login") {
    if (authUser) { pageAccount(); return; }
    const heading = mode === "signup" ? "Buat akun" : "Masuk ke akun";
    app.innerHTML = `<div class="page auth-page"><section class="auth-panel" aria-labelledby="authTitle">
      <p class="auth-kicker">GEMBUL.NIME</p><h1 class="page-title" id="authTitle">${heading}</h1>
      <p class="page-desc">${mode === "signup" ? "Satu akun untuk membawa koleksimu ke perangkat lain." : "Masuk untuk melanjutkan koleksi anime dan komikmu."}</p>
      ${!supabase ? '<p class="auth-setup" role="status">Login belum dikonfigurasi. Tambahkan URL dan publishable key Supabase di <code>assets/js/config.js</code>.</p>' : ""}
      <form id="authForm" class="auth-form" novalidate>
        <label for="authEmail">Email</label><input class="field" id="authEmail" name="email" type="email" autocomplete="email" required maxlength="254" placeholder="nama@email.com">
        <label for="authPassword">Kata sandi</label><input class="field" id="authPassword" name="password" type="password" autocomplete="${mode === "signup" ? "new-password" : "current-password"}" required minlength="8" placeholder="Minimal 8 karakter">
        <p class="auth-message" id="authMessage" role="${authMessageType === "error" ? "alert" : "status"}" aria-live="polite" data-type="${authMessageType}" ${authMessage ? "" : "hidden"}>${esc(authMessage)}</p>
        <button class="btn btn-primary auth-submit" type="submit" ${supabase ? "" : "disabled"}>${mode === "signup" ? "Daftar" : "Masuk"}</button>
      </form>
      <p class="auth-switch">${mode === "signup" ? "Sudah punya akun?" : "Belum punya akun?"} <button type="button" id="authSwitch">${mode === "signup" ? "Masuk" : "Daftar"}</button></p>
    </section></div>`;
    $("#authSwitch", app).onclick = () => { authMessage = ""; location.hash = mode === "signup" ? "#/login" : "#/signup"; };
    $("#authForm", app).addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const button = $("button[type=submit]", form);
      button.disabled = true;
      button.textContent = "Memproses…";
      setAuthMessage("");
      try {
        const email = form.elements.email.value.trim();
        const password = form.elements.password.value;
        const result = mode === "signup"
          ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}${location.pathname}` } })
          : await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        if (mode === "signup" && !result.data.session) {
          setAuthMessage("Akun dibuat. Buka tautan konfirmasi yang dikirim ke emailmu, lalu masuk.");
          button.disabled = false;
          button.textContent = "Daftar";
          return;
        }
        authMessage = "";
        location.hash = "#/account";
      } catch (error) {
        setAuthMessage(authErrorMessage(error), "error");
        button.disabled = false;
        button.textContent = mode === "signup" ? "Daftar" : "Masuk";
      }
    });
  }
  function authErrorMessage(error) {
    const message = String(error?.message || "");
    const code = String(error?.code || "");
    if (/email_address_not_authorized|email address not authorized/i.test(`${code} ${message}`)) {
      return "Supabase belum diatur untuk mengirim email ke alamat ini. Atur Custom SMTP di Supabase, lalu coba daftar lagi.";
    }
    if (/over_email_send_rate_limit|email rate limit exceeded/i.test(`${code} ${message}`)) {
      return "Batas pengiriman email Supabase tercapai. Coba lagi nanti atau atur Custom SMTP.";
    }
    if (/signup_disabled|signups not allowed/i.test(`${code} ${message}`)) {
      return "Pendaftaran sedang dinonaktifkan di Supabase. Aktifkan Allow new users to sign up di pengaturan Auth.";
    }
    if (/email_provider_disabled/i.test(`${code} ${message}`)) {
      return "Login email belum diaktifkan di Supabase. Aktifkan penyedia Email di pengaturan Auth.";
    }
    if (/invalid login credentials/i.test(message)) return "Email atau kata sandi tidak cocok.";
    if (/already registered|user already exists/i.test(message)) return "Email ini sudah terdaftar. Silakan masuk.";
    if (/password should be at least/i.test(message)) return "Kata sandi harus terdiri dari minimal 8 karakter.";
    if (/email not confirmed/i.test(message)) return "Konfirmasi emailmu sebelum masuk.";
    return message || "Terjadi kendala. Coba lagi sebentar.";
  }
  function pageAccount() {
    if (!authUser) { location.hash = "#/login"; return; }
    app.innerHTML = `<div class="page auth-page"><section class="auth-panel account-panel" aria-labelledby="authTitle">
      <p class="auth-kicker">AKUN GEMBUL.NIME</p><h1 class="page-title" id="authTitle">Akun <span class="hl">kamu</span></h1>
      <p class="page-desc">Masuk sebagai <strong>${esc(authUser.email || "")}</strong></p>
      <p class="auth-account-note">Koleksi tersinkron ke akun Supabase ini. Kamu bisa membuka koleksi yang sama di perangkat lain.</p>
      <a class="btn btn-secondary auth-submit" href="#/library">Buka koleksi</a>
      <button class="btn btn-quiet auth-logout" id="authLogout" type="button">Keluar dari akun</button>
    </section></div>`;
    $("#authLogout", app).onclick = async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      try {
        await persistLibrary();
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        location.hash = "#/login";
      } catch (error) {
        console.error("Supabase sign out failed:", error);
        button.disabled = false;
        toast("Gagal keluar. Periksa koneksi lalu coba lagi.");
      }
    };
  }
  if (store.set) {
    const originalStoreSet = store.set;
    store.set = (key, value) => {
      originalStoreSet(key, value);
      if (libraryKeys.includes(key)) queueLibrarySync();
    };
  }

  // toast dengan aksi opsional (mis. "Urungkan")
  const toastEl = $("#toast");
  function toast(msg, action) {
    toastEl.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ""}`;
    if (action) $("button", toastEl).onclick = () => { action.fn(); toastEl.classList.remove("show"); };
    toastEl.classList.add("show");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => toastEl.classList.remove("show"), action ? 5000 : 2400);
  }

  // ---------- loading bar ----------
  const bar = $("#loadbar");
  let pending = 0;
  const loadStart = () => { if (pending++ === 0) { bar.className = "loadbar"; void bar.offsetWidth; bar.classList.add("run"); } };
  const loadEnd = () => { if (--pending <= 0) { pending = 0; bar.classList.remove("run"); bar.classList.add("done"); } };

  // ---------- API ----------
  const cache = new Map();
  // sumber kedua: Samehadaku di Sanka Vollerei API
  const OP_API = API + "/samehadaku";
  function api(path, { quiet, base = API } = {}) {
    let cleanPath = String(path || "");
    if (base === API) {
      if (cleanPath.startsWith("/ongoing?")) cleanPath = cleanPath.replace("/ongoing?", "/ongoing-anime?");
      else if (cleanPath === "/ongoing") cleanPath = "/ongoing-anime";
      if (cleanPath.startsWith("/completed?")) cleanPath = cleanPath.replace("/completed?", "/complete-anime?");
      else if (cleanPath === "/completed") cleanPath = "/complete-anime";
      if (cleanPath.startsWith("/search?q=")) cleanPath = "/search/" + cleanPath.slice("/search?q=".length);
    }
    const key = base + cleanPath;
    if (cache.has(key)) return cache.get(key);
    if (!quiet) loadStart();
    const p = fetch(key)
      .then(async (r) => {
        let j = await r.json();
        if (j.status === "Too Many Requests" || j.message?.includes("temporarily blocked")) {
          console.warn("[API] Rate limit Sanka terdeteksi, mencoba ulang setelah jeda...");
          await new Promise((res) => setTimeout(res, 1200));
          const r2 = await fetch(key);
          j = await r2.json();
        }
        return j;
      })
      .then((j) => {
        if (j.statusCode && j.statusCode >= 400 && j.statusCode !== 404) {
          throw new Error(j.message || j.statusMessage || `Error ${j.statusCode}`);
        }
        return j;
      })
      .finally(() => { if (!quiet) loadEnd(); });
    cache.set(key, p);
    p.catch(() => cache.delete(key));
    return p;
  }
  // id anime/episode sumber kedua diberi awalan "op:" supaya riwayat & favorit bisa campur dua sumber.
  // Awalan ini dulu dipakai Oploverz, sekarang Samehadaku (entri Samehadaku di riwayat punya src: "sh").
  const isOp = (id) => String(id ?? "").startsWith("op:");
  // sumber ketiga "Stream" (anime-indo) diberi awalan "st:"; dipakai untuk mengisi episode yang hilang
  const isSt = (id) => String(id ?? "").startsWith("st:");
  const animeHref = (id) => (isOp(id) ? `#/op/anime/${enc(id.slice(3))}` : isSt(id) ? `#/st/watch/${enc(id.slice(3))}-episode-1` : `#/anime/${enc(id)}`);
  const watchHref = (id) => (isOp(id) ? `#/op/watch/${enc(id.slice(3))}` : isSt(id) ? `#/st/watch/${enc(id.slice(3))}` : `#/watch/${enc(id)}`);
  const decodeHtml = (s) => { const t = document.createElement("textarea"); t.innerHTML = String(s ?? ""); return t.value; };
  const opSeriesName = (t) => decodeHtml(t).replace(/\s*\b(episode|eps?)\s*\d+.*$/i, "").replace(/\s*subtitle indonesia.*$/i, "").trim();

  const epNum = (t) => {
    const s = String(t ?? "");
    const m = s.match(/(?:episode|eps?)\s*(\d+(?:\.\d+)?)/i) || s.match(/^\s*(\d+(?:\.\d+)?)\s*$/);
    return m ? m[1] : s.replace(/subtitle indonesia/i, "").trim();
  };
  // Otakudesu kadang menyisipkan entri pemisah di daftar episode, mis. One Piece:
  // "==== Pembatas Episode | Episode 1 – 900 Dalam Proses ====". Itu bukan episode, jadi dibuang.
  const realEps = (list) => (list || []).filter((e) => !/pembatas|={3,}/i.test(e.title || ""));
  // daftar episode berurutan → sisipkan penanda kalau nomornya meloncat (episode yang tidak ada di sumber)
  const epGaps = (list, label, link) => list.map((e, i) => {
    const a = Number(label(list[i - 1] || {})), b = Number(label(e));
    const gap = i && Number.isInteger(a) && Number.isInteger(b) && Math.abs(b - a) > 1
      ? `<p class="ep-gap">Episode ${Math.min(a, b) + 1}${Math.abs(b - a) > 2 ? `–${Math.max(a, b) - 1}` : ""} sedang dalam tahap pengerjaan</p>` : "";
    return gap + link(e);
  }).join("");
  const cleanScore = (s) => String(s ?? "").replace(/rating\s*:\s*/i, "").trim();
  const cleanStatus = (s) => String(s ?? "").replace(/status\s*:\s*/i, "").trim();
  // Stream desustream dilewatkan proxy lokal /desu untuk memotong CSP frame-ancestors dan iklan
  const cleanEmbedUrl = (u) => {
    if (!u) return "";
    if (/desustream\./i.test(u)) return `/desu?url=${enc(u)}`;
    return u;
  };
  // Blokir popup liar / iklan yang mencoba buka tab baru saat video disentuh
  const _realOpen = window.open;
  window.open = function (targetUrl, ...rest) {
    if (typeof targetUrl === "string" && !targetUrl.includes(location.host) && !targetUrl.includes("otakudesu")) {
      console.warn("[AdBlock] Menahan popup iklan:", targetUrl);
      return null;
    }
    return _realOpen.call(window, targetUrl, ...rest);
  };
  const cleanTitle = (s) => String(s ?? "").replace(/\s*subtitle indonesia\s*$/i, "").trim();

  // ---------- poster cache ----------
  const posterCache = store.get("posters", {});
  const getPoster = (id) => posterCache[id] || "";
  const setPoster = (id, url) => {
    if (!id || !url || posterCache[id] === url) return;
    posterCache[id] = url;
    store.set("posters", posterCache);
  };

  // ---------- library (history / favorit / pengingat / sudah ditonton) ----------
  const lib = {
    history: () => {
      const h = store.get("history", null);
      if (h === null) {
        const sample = [
          {
            animeId: "komisan-sub-indo",
            episodeId: "komisan-episode-12-sub-indo",
            title: "Komi Can't Communicate",
            epLabel: "12",
            poster: "https://otakudesu.blog/wp-content/uploads/2021/09/Komi-san-Sub-Indo.jpg",
            banner: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/142984-RwLgGjgBrCsF.jpg",
            progress: 96,
            ts: Date.now() - 3600000,
          }
        ];
        store.set("history", sample);
        return sample;
      }
      return h;
    },
    favs: () => store.get("favs", []),
    seen: () => store.get("seen", {}),
    reminders: () => store.get("reminders", []),
    isFav: (id) => lib.favs().some((f) => f.animeId === id),
    isReminded: (id) => lib.reminders().some((r) => r.animeId === id),
    setFav(a, on) {
      const f = lib.favs().filter((x) => x.animeId !== a.animeId);
      store.set("favs", on ? [{ ...a, ts: Date.now() }, ...f] : f);
    },
    toggleReminder(a, dayTitle = "") {
      const list = lib.reminders();
      const exists = list.some((r) => r.animeId === a.animeId);
      if (exists) {
        store.set("reminders", list.filter((r) => r.animeId !== a.animeId));
        return false;
      } else {
        const item = {
          animeId: a.animeId,
          title: cleanTitle(a.title),
          poster: a.poster || getPoster(a.animeId) || "",
          releaseDay: a.releaseDay || dayTitle || "",
          ts: Date.now(),
        };
        store.set("reminders", [item, ...list]);
        if ("Notification" in window && Notification.permission === "default") {
          Notification.requestPermission();
        }
        return true;
      }
    },
    removeReminder(id) {
      const list = lib.reminders();
      const item = list.find((r) => r.animeId === id);
      store.set("reminders", list.filter((r) => r.animeId !== id));
      return item;
    },
    // kunci riwayat: animeId, atau episodeId kalau animeId kosong (supaya entri tanpa animeId tidak saling menimpa)
    histKey: (x) => x.animeId || x.episodeId,
    watched(entry) {
      const k = lib.histKey(entry);
      const h = lib.history().filter((x) => lib.histKey(x) !== k);
      h.unshift({ ...entry, ts: Date.now() });
      store.set("history", h.slice(0, 40));
      const s = lib.seen();
      s[entry.episodeId] = 1;
      store.set("seen", s);
    },
    removeHistory(id) {
      const h = lib.history();
      const item = h.find((x) => lib.histKey(x) === id);
      store.set("history", h.filter((x) => lib.histKey(x) !== id));
      return item;
    },
  };

  // Cek pengingat anime yang tayang hari ini
  function checkReminders() {
    const list = lib.reminders();
    if (!list.length) return;
    const today = todayName().toLowerCase();
    const todayReminders = list.filter((r) => norm(r.releaseDay || "") === norm(today));
    if (!todayReminders.length) return;

    const notifiedKey = "notified_" + new Date().toISOString().slice(0, 10);
    const alreadyNotified = store.get(notifiedKey, []);

    todayReminders.forEach((r) => {
      if (alreadyNotified.includes(r.animeId)) return;
      alreadyNotified.push(r.animeId);
      store.set(notifiedKey, alreadyNotified);

      if ("Notification" in window && Notification.permission === "granted") {
        try {
          const n = new Notification("🔔 Episode Baru Tayang Hari Ini!", {
            body: `${r.title} tayang hari ini (${todayName()})! Klik untuk menonton.`,
            icon: r.poster || "assets/icon.png"
          });
          n.onclick = () => { window.focus(); location.hash = `#/anime/${enc(r.animeId)}`; };
        } catch { /* abaikan jika diblokir */ }
      }
    });

    if (!sessionStorage.getItem("remind_alert_shown")) {
      sessionStorage.setItem("remind_alert_shown", "1");
      const names = todayReminders.map((r) => r.title).slice(0, 2).join(", ") + (todayReminders.length > 2 ? ` (+${todayReminders.length - 2})` : "");
      setTimeout(() => {
        toast(`🔔 Anime yang kamu ingatkan tayang hari ini: ${names}`);
      }, 1400);
    }
  }

  async function share(title) {
    const url = location.href;
    try {
      if (navigator.share) { await navigator.share({ title, url }); return; }
      await navigator.clipboard.writeText(url);
      toast("Link disalin");
    } catch (e) {
      if (e?.name !== "AbortError") toast("Gagal menyalin link");
    }
  }

  // ---------- components ----------
  function card(a, opts = {}) {
    if (a.animeId && a.poster) setPoster(a.animeId, a.poster);
    const score = cleanScore(a.score);
    const ep = opts.epLabel ?? (a.episodes && a.episodes !== "Unknown" ? a.episodes : "");
    const badge = opts.badge ?? (ep ? `EP ${ep}` : ""); // komik memakai "CH 12"
    const href = opts.href || animeHref(a.animeId);
    const foot = opts.foot ?? [a.releaseDay, a.latestReleaseDate || a.lastReleaseDate].filter(Boolean);
    const subTag = opts.sub || foot[0] || (isOp(a.animeId) ? "Samehadaku" : "");
    // pratinjau hover hanya untuk anime Otakudesu (butuh halaman detail Otakudesu)
    const peekable = a.animeId && !isOp(a.animeId);
    const inner = `
      <a class="card" href="${href}"${peekable ? ` data-anime="${esc(a.animeId)}"` : ""}>
        <div class="card-img">
          <img data-src="${esc(a.poster)}" alt="" loading="lazy" referrerpolicy="no-referrer" />
          <div class="card-top">
            ${badge ? `<span class="badge badge-ep">${esc(badge)}</span>` : "<span></span>"}
            ${score && score !== "0" && !opts.removable ? `<span class="badge star">★ ${esc(score)}</span>` : ""}
          </div>
          <span class="card-play">${icon.play}</span>
          <div class="card-overlay">
            <div class="card-title">${esc(cleanTitle(a.title))}</div>
            <div class="card-meta">
              <span class="card-genre">${esc(subTag)}</span>
              ${badge ? `<span class="card-ep-sub"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;margin-right:2px"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 12h3M14 12h3"/></svg>${esc(badge)}</span>` : ""}
              ${score && score !== "0" ? `<span class="card-gold-star">★ ${esc(score)}</span>` : ""}
            </div>
            ${opts.sub ? `<div class="card-sub" style="display:none">${esc(opts.sub)}</div>` : ""}
          </div>
        </div>
      </a>`;
    return opts.removable
      ? `<div class="card-wrap">${inner}<button class="card-x" data-remove="${esc(opts.removeId ?? a.animeId)}" aria-label="Hapus ${esc(cleanTitle(a.title))} dari riwayat">${icon.x}</button></div>`
      : inner;
  }

  function rankCard(a, rank) {
    if (a.animeId && a.poster) setPoster(a.animeId, a.poster);
    const score = cleanScore(a.score);
    const ep = a.episodes && a.episodes !== "Unknown" ? `EP ${a.episodes}` : "";
    const href = animeHref(a.animeId);
    const peekable = a.animeId && !isOp(a.animeId);
    const rankClass = rank === 1 ? "rank-1" : rank === 2 ? "rank-2" : rank === 3 ? "rank-3" : "";
    const rankBadge = rank <= 3 ? "badge-rank-top" : "badge-rank";

    return `
      <div class="rank-card-wrap">
        <span class="rank-number ${rankClass}">${rank}</span>
        <div class="rank-card">
          <a class="card" href="${href}"${peekable ? ` data-anime="${esc(a.animeId)}"` : ""}>
            <div class="card-img">
              <img data-src="${esc(a.poster)}" alt="" loading="lazy" referrerpolicy="no-referrer" />
              <div class="card-top">
                <span class="badge ${rankBadge}">#${rank} TRENDING</span>
                ${score && score !== "0" ? `<span class="badge star">★ ${esc(score)}</span>` : ""}
              </div>
              <span class="card-play">${icon.play}</span>
              <div class="card-overlay">
                <div class="card-title">${esc(cleanTitle(a.title))}</div>
                <div class="card-meta">
                  <span class="card-genre">${esc(a.releaseDay || (isOp(a.animeId) ? "Samehadaku" : "Top Anime"))}</span>
                  ${ep ? `<span class="card-ep-sub"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;margin-right:2px"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 12h3M14 12h3"/></svg>${esc(ep)}</span>` : ""}
                </div>
              </div>
            </div>
          </a>
        </div>
      </div>`;
  }

  function continueCard(h) {
    const title = cleanTitle(h.title);
    const ep = h.epLabel || "1";
    const href = watchHref(h.episodeId);
    const key = lib.histKey(h);
    const metaKey = cleanTitle(h.title).toLowerCase();
    const metaHit = metaStore[metaKey]?.v;
    const imgUrl = h.banner || metaHit?.banner || h.poster || getPoster(h.animeId);
    if (h.animeId && h.poster) setPoster(h.animeId, h.poster);

    const pct = h.progress || (h.ts ? (((h.ts % 45) + 35)) : 96);
    const minLeft = Math.max(1, Math.round(24 * (1 - pct / 100)));

    return `
      <div class="continue-card-wrap">
        <a class="continue-card" href="${href}" data-anime="${esc(h.animeId || "")}">
          <div class="continue-media">
            <img data-src="${esc(imgUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer" />
            <div class="continue-play" aria-label="Putar episode ${esc(ep)}">
              ${icon.play}
            </div>
            <div class="continue-overlay">
              <div class="continue-title">${esc(title)}</div>
              <div class="continue-sub">Episode ${esc(ep)} · ${minLeft}m tersisa</div>
            </div>
            <div class="continue-progress-bar" aria-hidden="true">
              <div class="continue-progress-fill" style="width: ${pct}%"></div>
            </div>
          </div>
        </a>
        <button class="card-x" data-remove="${esc(key)}" aria-label="Hapus ${esc(title)} dari riwayat">${icon.x}</button>
      </div>`;
  }

  const skCards = (n) =>
    Array.from({ length: n }, () => `<div><div class="sk sk-card"></div><div class="sk sk-line"></div><div class="sk sk-line" style="width:60%"></div></div>`).join("");

  function row(title, items, { link, count } = {}) {
    return `
      <section class="section">
        <div class="sec-head">
          <h2 class="sec-title">${title}${count ? `<span class="count">${count}</span>` : ""}</h2>
          <div class="sec-tools">
            ${link ? `<a class="sec-link" href="${link}">Lihat semua</a>` : ""}
          </div>
        </div>
        <div class="row">${items}</div>
      </section>`;
  }

  function pager(p, base) {
    if (!p || !p.totalPages || p.totalPages < 2) return "";
    const cur = p.currentPage, tot = p.totalPages;
    const sep = base.includes("?") ? "&" : "?";
    const url = (n) => `${base}${sep}page=${n}`;
    const list = [...new Set([1, tot, cur - 1, cur, cur + 1].filter((n) => n >= 1 && n <= tot))].sort((a, b) => a - b);
    let out = `<a class="${p.hasPrevPage ? "" : "off"}" href="${url(cur - 1)}" aria-label="Halaman sebelumnya">‹</a>`;
    list.forEach((n, i) => {
      if (i && n - list[i - 1] > 1) out += '<span class="gap">…</span>';
      out += n === cur ? `<span class="cur" aria-current="page">${n}</span>` : `<a href="${url(n)}" aria-label="Halaman ${n}">${n}</a>`;
    });
    out += `<a class="${p.hasNextPage ? "" : "off"}" href="${url(cur + 1)}" aria-label="Halaman berikutnya">›</a>`;
    return `<nav class="pager" aria-label="Halaman">${out}</nav>`;
  }

  const emptyBox = (title, text, action = "") =>
    `<div class="empty"><div class="glyph" aria-hidden="true">G</div><h3>${title}</h3><p>${text}</p>${action}</div>`;

  function errorBox(e) {
    return `
      <div class="page"><div class="err" role="alert">
        <h3>Data gagal dimuat</h3>
        <p class="page-desc">${esc(e?.message || e)}. Episode ini mungkin tidak ada di sumber tersebut, atau API Sanka / situs sumbernya sedang bermasalah.</p>
        <div class="actions"><button class="btn btn-primary btn-sm" id="retry">Muat ulang halaman ini</button></div>
      </div></div>`;
  }

  // gambar fade-in + fallback
  function hydrate(root = app) {
    $$("img[data-src]", root).forEach((img) => {
      img.onload = () => img.classList.add("loaded");
      img.onerror = () => { img.remove(); };
      img.src = img.dataset.src;
      img.removeAttribute("data-src");
    });
    $$(".card-img", root).forEach((c) => { if (!$("img", c)) c.classList.add("noimg"); });
  }

  // ---------- pages ----------
  let heroTimer = null;
  let heroCleanup = null;

  let ytApi = null;
  const loadYouTube = () => ytApi ||= new Promise((resolve, reject) => {
    if (window.YT?.Player) return resolve(window.YT);
    window.onYouTubeIframeAPIReady = () => resolve(window.YT);
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.onerror = () => { ytApi = null; reject(new Error("YouTube API gagal dimuat")); };
    document.head.appendChild(s);
  });

  // satu pemutar YouTube. play(ids) mencoba trailer berurutan: kalau satu menolak di-embed, lanjut ke berikutnya.
  async function ytPlayer(host, { controls = false, mute = true, onPlay, onEnd, onFail } = {}) {
    const YT = await loadYouTube();
    let ids = [], k = 0;
    const raw = await new Promise((resolve) => {
      const pl = new YT.Player(host, {
        playerVars: { autoplay: 1, mute: mute ? 1 : 0, controls: controls ? 1 : 0, disablekb: controls ? 0 : 1, fs: controls ? 1 : 0, rel: 0, playsinline: 1, iv_load_policy: 3, modestbranding: 1 },
        events: {
          onReady: () => resolve(pl),
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.PLAYING) onPlay?.(pl);
            if (e.data === YT.PlayerState.ENDED) onEnd?.(pl);
          },
          onError: () => (++k < ids.length ? pl.loadVideoById(ids[k]) : onFail?.()),
        },
      });
    });
    return {
      raw,
      play(list) { ids = list; k = 0; raw.loadVideoById(ids[0]); },
      stop() { try { raw.stopVideo(); } catch { /* belum siap */ } },
      destroy() { try { raw.destroy(); } catch { /* sudah hilang */ } },
    };
  }

  // ---------- AniList: trailer, banner, warna poster, jadwal episode berikutnya ----------
  // Judul Otakudesu sering beda ejaan ("Oujisama" vs "Ouji-sama", "Season 4" vs nama arc),
  // jadi dicari berurutan: judul Jepang, judul lengkap, judul tanpa season/tahun, bagian sebelum ":".
  try { localStorage.removeItem("kaze_trailers"); } catch { /* cache lama */ }
  const META_TTL = 12 * 3600e3;
  const metaStore = store.get("meta", {});
  const metaInflight = new Map();
  const META_QUERY = "query($s:String){Page(perPage:6){media(search:$s,type:ANIME){status trailer{id site} bannerImage coverImage{color extraLarge} nextAiringEpisode{episode airingAt}}}}";
  const titleVariants = (title, japanese) => {
    const t = cleanTitle(title);
    const bare = t.replace(/\(\d{4}\)|☆/g, " ")
      .replace(/\b(season|part)\s*\d+\b|\b\d+(st|nd|rd|th)\s+season\b/gi, " ")
      .replace(/\s{2,}/g, " ").trim();
    const head = bare.split(/:|\s-\s/)[0].trim();
    return [...new Set([japanese, t, bare, head].filter((s) => s && s.length > 2))];
  };
  async function anilistSearch(s) {
    const r = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: META_QUERY, variables: { s } }),
    });
    if (!r.ok) throw new Error("AniList " + r.status);
    return (await r.json()).data?.Page?.media || [];
  }
  function animeMeta(title, japanese) {
    const key = cleanTitle(title).toLowerCase();
    const hit = metaStore[key];
    if (hit && Date.now() - hit.t < META_TTL) return Promise.resolve(hit.v);
    if (metaInflight.has(key)) return metaInflight.get(key);
    const p = (async () => {
      let best = null;
      const trailers = [];
      const variants = titleVariants(title, japanese);
      for (const [n, s] of variants.entries()) {
        const list = await anilistSearch(s);
        if (!list.length) continue;
        // judul Jepang & judul lengkap: hasil teratas paling akurat. Judul yang dipendekkan: dahulukan yang sedang tayang.
        const top = n < 2 ? list[0] : list.find((m) => m.status === "RELEASING") || list[0];
        best ||= top;
        for (const m of [top, ...list]) if (m.trailer?.site === "youtube" && m.trailer.id) trailers.push(m.trailer.id);
        if (top.trailer?.site === "youtube") break;
      }
      const v = {
        trailers: [...new Set(trailers)].slice(0, 4),
        banner: best?.bannerImage || null,
        color: best?.coverImage?.color || null,
        cover: best?.coverImage?.extraLarge || null,
        next: best?.nextAiringEpisode || null,
      };
      metaStore[key] = { t: Date.now(), v };
      store.set("meta", metaStore);
      return v;
    })()
      .catch(() => ({ trailers: [] })) // jaringan gagal: tidak disimpan, coba lagi lain kali
      .finally(() => metaInflight.delete(key));
    metaInflight.set(key, p);
    return p;
  }
  // sumber Stream (anime-indo): halaman nonton #/st/watch/<slug> untuk entri riwayat lama "st:"
  const ST_API = API + "/stream";

  const detailOf = (id) => api(`/anime/${enc(id)}`, { quiet: true }).then((r) => {
    const d = r.data.details || r.data;
    return { ...d, episodeList: realEps(d.episodeList) };
  });
  // meta lewat detail Otakudesu supaya dapat judul Jepang
  const metaFor = (a) => detailOf(a.animeId).then((d) => animeMeta(a.title, d.japanese), () => animeMeta(a.title));
  function untilText(epochSec) {
    const ms = epochSec * 1000 - Date.now();
    if (ms <= 0) return "";
    const min = Math.floor(ms / 6e4), h = Math.floor(min / 60), d = Math.floor(h / 24);
    return d ? `${d} hari ${h % 24} jam` : h ? `${h} jam ${min % 60} menit` : `${Math.max(1, min)} menit`;
  }
  const nextLabel = (next) => (next && untilText(next.airingAt) ? `EP ${next.episode} tayang di Jepang ${untilText(next.airingAt)} lagi` : "");

  let tickerTimer = null;
  function initLiveTicker() {
    if (tickerTimer) clearInterval(tickerTimer);
    const watchEl = document.getElementById("tickerWatchCount");
    const onlineEl = document.getElementById("tickerOnlineCount");
    const chatterEl = document.getElementById("tickerChatter");
    if (!watchEl && !chatterEl) return;

    const chatters = [
      '"Solo Leveling ep barunya gokil parah!!"',
      '"Gembulnime servernya cepet banget no buffering 🔥"',
      '"Jujutsu Kaisen season baru kapan rilis ya?"',
      '"Kualitas 1080p jernih banget mantap"',
      '"Nonton One Piece mingguan paling nyaman di sini"',
      '"Desain barunya keren parah kayak Netflix & ani.pm! ✦"',
      '"Bleach TYBW visualnya bener-bener gila animation-nya"',
      '"Fitur acak anime ngebantu banget pas bingung mau nonton apa 🎲"'
    ];
    let chatIdx = 0;

    tickerTimer = setInterval(() => {
      if (watchEl) {
        let cur = parseInt(watchEl.textContent.replace(/[^0-9]/g, "")) || 14824;
        cur += Math.floor(Math.random() * 21) - 10;
        watchEl.textContent = cur.toLocaleString("en-US");
      }
      if (onlineEl) {
        let curOn = parseInt(onlineEl.textContent.replace(/[^0-9]/g, "")) || 59776;
        curOn += Math.floor(Math.random() * 31) - 15;
        onlineEl.textContent = curOn.toLocaleString("en-US");
      }
      if (chatterEl) {
        chatIdx = (chatIdx + 1) % chatters.length;
        chatterEl.style.opacity = "0";
        chatterEl.style.transform = "translateY(5px)";
        chatterEl.style.transition = "all 0.3s ease";
        setTimeout(() => {
          chatterEl.innerHTML = `<span style="margin-right:2px">💬</span> ${esc(chatters[chatIdx])}`;
          chatterEl.style.opacity = "1";
          chatterEl.style.transform = "translateY(0)";
        }, 300);
      }
    }, 4500);
  }

  async function pageHome() {
    app.innerHTML = `
      <section class="hero"><div class="hero-main"><div class="hero-copy">
        <div class="sk" style="height:14px;width:160px;margin-bottom:18px"></div>
        <div class="sk" style="height:52px;width:min(520px,80vw);margin-bottom:14px"></div>
        <div class="sk" style="height:16px;width:min(420px,70vw);margin-bottom:28px"></div>
        <div class="sk" style="height:46px;width:200px"></div>
      </div></div></section>
      <div class="body">${row("Lagi tayang", skCards(8))}</div>`;

    const { data } = await api("/home");
    const ongoing = data.ongoing?.animeList || [];
    const completed = data.completed?.animeList || [];
    const top10 = [...ongoing, ...completed].slice(0, 10);
    const history = lib.history();
    const favIds = new Set(lib.favs().map((f) => f.animeId));
    const today = todayName();
    const todayList = ongoing.filter((a) => a.releaseDay === today);
    const heroes = ongoing.slice(0, 6);

    app.innerHTML = `
      <section class="hero" id="hero" aria-roledescription="carousel" aria-label="Anime unggulan">
        <div class="hero-bgs">${heroes.map((a) => `<div class="hero-bg" style="background-image:url('${esc(a.poster)}')"></div>`).join("")}
          <div class="hero-video" aria-hidden="true"><div id="ytHost"></div></div>
        </div>
        <div class="hero-main">
          <div class="hero-copy" id="heroCopy" aria-live="polite"></div>
          <div class="hero-side">
            <div class="hero-ctrl">
              <button class="btn btn-secondary btn-sm" id="heroPlay" hidden></button>
              <button class="icon-btn" id="heroSound" aria-pressed="false" aria-label="Nyalakan suara trailer" hidden>${icon.muted}</button>
            </div>
            <a class="hero-poster" id="heroPoster" href="#" tabindex="-1" aria-hidden="true"><img alt="" referrerpolicy="no-referrer" /></a>
          </div>
        </div>
        <div class="hero-strip" role="tablist" aria-label="Pilih anime">
          ${heroes.map((a, i) => `
            <button class="hs" role="tab" data-i="${i}" aria-label="${esc(cleanTitle(a.title))}">
              <img src="${esc(a.poster)}" alt="" referrerpolicy="no-referrer" /><span>${esc(cleanTitle(a.title))}</span><i></i>
            </button>`).join("")}
        </div>
      </section>

      <div class="live-ticker-wrap">
        <div class="live-ticker" id="liveTickerBar">
          <span class="ticker-item"><span class="pulse-dot"></span> <b id="tickerWatchCount">14,824</b> Menonton</span>
          <span class="ticker-sep">|</span>
          <span class="ticker-item"><b id="tickerOnlineCount">59,776</b> Online</span>
          <span class="ticker-sep">|</span>
          <span class="ticker-item" id="tickerChatter"><span style="margin-right:2px">💬</span> "Solo Leveling ep barunya gokil parah!!"</span>
          <span class="ticker-sep">|</span>
          <span class="ticker-item">🔖 Bookmark <b>gembulnime</b></span>
        </div>
      </div>

      <div class="body">
        ${history.length ? `
        <section class="section section-continue" id="secContinue">
          <div class="sec-head">
            <div>
              <h2 class="sec-title" style="display:flex;align-items:center;gap:10px;">
                <span>Continue Watching</span>
              </h2>
              <p class="sec-sub" style="color:var(--text-3);font-size:13.5px;margin-top:2px;">Lanjutkan episode terakhir yang baru saja kamu tonton</p>
            </div>
            <div class="sec-tools">
              <a class="sec-link" href="#/library?tab=history">Semua riwayat</a>
            </div>
          </div>
          <div class="row row-continue">${history.slice(0, 10).map((h) => continueCard(h)).join("")}</div>
        </section>` : ""}

        <section class="section" id="top10Section">
          <div class="sec-head">
            <div>
              <h2 class="sec-title" style="display:flex;align-items:center;gap:10px;">
                <span>🏆 Top 10 Terpopuler</span>
                <span class="badge" style="background:linear-gradient(135deg, #ffd700, #ff8800);color:#000;font-weight:800;border:none;">MINGGU INI</span>
              </h2>
              <p class="sec-sub" style="color:var(--text-3);font-size:13.5px;margin-top:2px;">Anime paling banyak ditonton minggu ini oleh komunitas Gembulnime</p>
            </div>
          </div>
          <div class="row row-top10">${top10.map((a, i) => rankCard(a, i + 1)).join("")}</div>
        </section>

        <div class="split">
          <div>${row("Lagi tayang", ongoing.map((a) => card(a)).join(""), { link: "#/ongoing", count: ongoing.length })}</div>
          <aside class="panel today" aria-labelledby="todayTitle">
            <div class="sec-head" style="margin-bottom:6px">
              <h2 class="sec-title" id="todayTitle">Rilis hari ini<span class="count">${esc(today)}</span></h2>
              <a class="sec-link" href="#/schedule">Jadwal</a>
            </div>
            ${todayList.length
              ? `<div class="today-list">${todayList.map((a, i) => `<a href="#/anime/${enc(a.animeId)}"><span>${String(i + 1).padStart(2, "0")}</span><span>${esc(cleanTitle(a.title))}${favIds.has(a.animeId) ? " · <b style=\"color:var(--gold)\">favoritmu</b>" : ""}</span></a>`).join("")}</div>`
              : `<p class="page-desc" style="padding:0 10px 8px">Belum ada episode ${esc(today)} di daftar terbaru. Lihat jadwal lengkap untuk semua judul.</p>`}
          </aside>
        </div>

        ${row("Baru tamat", completed.map((a) => card(a, { foot: [a.lastReleaseDate].filter(Boolean) })).join(""), { link: "#/completed", count: completed.length })}
        <div id="opLatest">${row("Rilis terbaru di Samehadaku", skCards(8))}</div>
        <section class="section" id="homeGenres"></section>
      </div>`;
    hydrate();
    startHero(heroes);
    initLiveTicker();
    loadGenreStrip();
    loadOpLatest();
    if (history.length) repairHistory();
  }

  // Riwayat yang tersimpan sebelum ganti API bisa tanpa poster, posternya mati, atau judulnya masih judul episode.
  // Lengkapi dari detail anime, simpan, lalu tambal kartu yang sudah tampil tanpa render ulang halaman.
  const imgOk = (u) => new Promise((resolve) => {
    if (!u) return resolve(false);
    const i = new Image();
    i.referrerPolicy = "no-referrer";
    i.onload = () => resolve(true);
    i.onerror = () => resolve(false);
    i.src = u;
  });
  // Entri Oploverz lama (id "op:") tidak bisa dibuka lagi lewat API baru. Cari judul yang sama di Otakudesu:
  // hasil hanya diterima kalau judulnya memuat kata kunci yang dicari, lalu episode dicocokkan lewat nomornya.
  async function otakudesuMatch(title, epLabel) {
    const t = cleanTitle(opSeriesName(title));
    const tail = t.split(/\s:\s|:\s/).slice(1).join(" ").trim();
    for (const q of [...new Set([tail, t, t.split(/\s:\s|:\s/)[0]].filter((s) => s && s.length > 2))]) {
      const list = await api(`/search?q=${enc(q)}`, { quiet: true }).then((r) => r.data?.animeList || [], () => []);
      const a = list.find((x) => norm(x.title).includes(norm(q)));
      if (!a) continue;
      const d = await detailOf(a.animeId);
      const ep = (d.episodeList || []).find((e) => String(e.eps) === String(Number(epLabel)) || epNum(e.title) === String(Number(epLabel)));
      return ep ? { animeId: a.animeId, title: cleanTitle(d.title), poster: d.poster, episodeId: ep.episodeId, epLabel: String(ep.eps ?? epNum(ep.title)) } : null;
    }
    return null;
  }
  async function repairHistory() {
    const list = lib.history().filter((h) => h.episodeId && !isSt(h.episodeId));
    await Promise.all(list.map(async (h) => {
      const op = isOp(h.episodeId) && h.src !== "sh";
      if (isOp(h.episodeId) && !op) return;
      if (!op && h.animeId && !/episode\s*\d/i.test(h.title || "") && await imgOk(h.poster)) return;
      try {
        let fix;
        if (op) {
          fix = await otakudesuMatch(h.title, h.epLabel);
          // tidak ada di Otakudesu: setidaknya pasang cover AniList
          if (!fix) {
            if (await imgOk(h.poster)) return;
            const cover = (await animeMeta(opSeriesName(h.title))).cover;
            if (!cover) return;
            fix = { poster: cover };
          }
        } else {
          const animeId = h.animeId || (await api(`/episode/${enc(h.episodeId)}`, { quiet: true })).data?.animeId;
          if (!animeId) return;
          const d = await detailOf(animeId);
          if (!d?.poster) return;
          fix = { animeId, title: cleanTitle(d.title) || h.title, poster: d.poster };
        }
        // entri lama bisa ternyata anime yang sama dengan entri lain: sisakan yang terbaru
        const keys = new Set();
        store.set("history", lib.history().map((x) => (x.episodeId === h.episodeId ? { ...x, ...fix } : x))
          .filter((x) => !keys.has(lib.histKey(x)) && keys.add(lib.histKey(x))));
        if (fix.episodeId) {
          const s = lib.seen();
          s[fix.episodeId] = 1;
          store.set("seen", s);
        }
        const item = { ...h, ...fix };
        if (item.animeId) setPoster(item.animeId, item.poster);
        $$(`.card[href="${watchHref(h.episodeId)}"]`, app).forEach((c) => {
          const box = $(".card-img", c);
          $("img", box)?.remove();
          box.classList.remove("noimg");
          box.insertAdjacentHTML("afterbegin", `<img data-src="${esc(item.poster)}" alt="" referrerpolicy="no-referrer" />`);
          $(".card-title", c).textContent = cleanTitle(item.title);
          c.setAttribute("href", watchHref(item.episodeId));
          const badge = $(".badge-ep", c);
          if (badge) badge.textContent = "EP " + item.epLabel;
          const sub = $(".card-sub", c);
          if (sub?.textContent.startsWith("Terakhir episode")) sub.textContent = "Terakhir episode " + item.epLabel;
          c.closest(".card-wrap")?.querySelector("[data-remove]")?.setAttribute("data-remove", lib.histKey(item));
          hydrate(c);
        });
      } catch { /* episode/anime sudah tidak ada di sumber */ }
    }));
  }

  // sumber kedua: episode terbaru Samehadaku (judul yang sering tidak ada di Otakudesu: One Piece, Bleach, dll)
  async function loadOpLatest() {
    const el = $("#opLatest");
    if (!el) return;
    try {
      const { data } = await api("/home", { base: OP_API, quiet: true });
      const list = (data.recent?.animeList || []).filter((a) => a.episodeId);
      if (!el.isConnected) return;
      if (!list.length) return el.remove();
      // tanpa animeId di kartu: poster di sini cuplikan episode, jangan masuk cache poster seri
      el.innerHTML = row("Rilis terbaru di Samehadaku", list.map((a) => card(
        { title: a.title, poster: a.poster },
        { href: `#/op/watch/${enc(a.episodeId)}`, epLabel: a.episodes, foot: [a.releasedOn].filter(Boolean), sub: "Samehadaku" },
      )).join(""), { count: list.length });
      hydrate(el);
    } catch { el.remove(); }
  }

  function startHero(heroes) {
    const hero = $("#hero");
    const bgs = $$(".hero-bg", hero);
    const thumbs = $$(".hs", hero);
    const copy = $("#heroCopy");
    const poster = $("#heroPoster");
    if (!heroes.length) return;
    let i = 0;
    const show = (n, focus) => {
      i = (n + heroes.length) % heroes.length;
      const a = heroes[i];
      bgs.forEach((b, k) => b.classList.toggle("on", k === i));
      thumbs.forEach((t, k) => {
        t.classList.remove("on");
        t.setAttribute("aria-selected", k === i);
        if (k === i) { void t.offsetWidth; t.classList.add("on"); }
      });
      if (focus) thumbs[i].focus();
      // geser strip saja; scrollIntoView ikut menggeser halaman secara horizontal
      const strip = thumbs[i].parentElement, t = thumbs[i];
      if (t.offsetLeft < strip.scrollLeft || t.offsetLeft + t.offsetWidth > strip.scrollLeft + strip.clientWidth)
        strip.scrollTo({ left: t.offsetLeft - 16, behavior: "smooth" });
      poster.href = `#/anime/${enc(a.animeId)}`;
      $("img", poster).src = a.poster;
      copy.innerHTML = `
        <h1 class="hero-title">${esc(cleanTitle(a.title))}</h1>
        <div class="meta" data-meta>
          ${a.score ? `<span class="chip score">★ ${esc(cleanScore(a.score))}</span>` : ""}
          ${a.releaseDay ? `<span class="chip">📅 ${esc(a.releaseDay)}</span>` : ""}
          ${a.episodes ? `<span class="chip">${esc(a.episodes)} Episode</span>` : ""}
          <span class="chip live">Ongoing</span>
        </div>
        <p class="hero-syn" data-syn></p>
        <div class="actions">
          <a class="btn btn-primary btn-play-pill" data-watch href="#/anime/${enc(a.animeId)}">${icon.play} <span>Nonton Sekarang</span></a>
          <button class="btn-circle btn-hero-fav" data-fav-id="${esc(a.animeId)}" aria-label="Simpan ke Koleksi" title="Simpan ke Koleksi">${icon.bookmark}</button>
          <a class="btn-circle btn-hero-info" href="#/anime/${enc(a.animeId)}" aria-label="Detail Anime" title="Detail Anime">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="8.01"/><line x1="12" y1="12" x2="12" y2="16"/></svg>
          </a>
        </div>`;
      const favBtn = $(".btn-hero-fav", copy);
      if (favBtn) {
        const on = lib.isFav(a.animeId);
        favBtn.setAttribute("aria-pressed", on);
        favBtn.style.color = on ? "var(--gold)" : "";
      }
      copy.classList.remove("swap"); void copy.offsetWidth; copy.classList.add("swap");
      enrichHero(a, i);
      playTrailer(a, i);
    };

    // ---- trailer: video tampil di latar, selesai = lanjut ke anime berikutnya ----
    const sound = $("#heroSound");
    const playBtn = $("#heroPlay");
    let yt = null, ytReady = null, slideToken = 0, video = false, guard = null, progressTimer = null;
    // trailer selalu mulai otomatis tiap buka beranda; tombol jeda hanya berlaku sampai halaman ditinggal
    let useTrailer = true;
    const setPlayBtn = (state) => {
      playBtn.hidden = !state;
      if (state === "pause") playBtn.innerHTML = `${icon.pause} Jeda trailer`;
      if (state === "play") playBtn.innerHTML = `${icon.play} Putar trailer`;
    };
    playBtn.onclick = () => {
      useTrailer = !video;
      if (useTrailer) playTrailer(heroes[i], i);
      else { slideToken++; stopVideo(); setPlayBtn("play"); startTimer(); }
    };

    const startTimer = () => {
      clearInterval(heroTimer);
      if (!hero.classList.contains("paused")) heroTimer = setInterval(() => show(i + 1), 7000);
    };
    const stopVideo = () => {
      video = false;
      hero.classList.remove("playing");
      sound.hidden = true;
      clearTimeout(guard);
      clearInterval(progressTimer);
      thumbs.forEach((t) => { t.classList.remove("video"); $("i", t).style.transform = ""; });
      try { yt?.pauseVideo(); } catch { /* player belum siap */ }
    };
    const fallback = (token) => {
      if (token !== slideToken) return;
      stopVideo();
      thumbs[i].classList.remove("on"); void thumbs[i].offsetWidth; thumbs[i].classList.add("on");
      startTimer();
    };
    const getPlayer = () => ytReady ||= ytPlayer("ytHost", {
      onPlay: (pl) => {
        if (!video) return;
        clearTimeout(guard);
        // tunda sedikit supaya judul overlay bawaan YouTube tidak ikut terlihat
        setTimeout(() => video && hero.classList.add("playing"), 700);
        sound.hidden = false;
        setPlayBtn("pause");
        clearInterval(progressTimer);
        progressTimer = setInterval(() => {
          const d = pl.getDuration(), t = pl.getCurrentTime();
          if (d) $("i", thumbs[i]).style.transform = `scaleX(${Math.min(1, t / d)})`;
        }, 250);
      },
      onEnd: () => video && show(i + 1),
      onFail: () => fallback(slideToken),
    }).then((p) => (yt = p.raw, p));

    async function playTrailer(a, idx) {
      const token = ++slideToken;
      stopVideo();
      clearInterval(heroTimer);
      setPlayBtn(null);
      if (!useTrailer) startTimer();
      const meta = await metaFor(a);
      if (token !== slideToken || !document.body.contains(hero)) return;
      const when = nextLabel(meta.next);
      if (when) $("[data-next]", copy)?.replaceChildren(when);
      if (!meta.trailers.length) { setPlayBtn(null); return useTrailer ? fallback(token) : undefined; }
      if (!useTrailer) return setPlayBtn("play");
      clearInterval(heroTimer);
      try {
        const p = await getPlayer();
        if (token !== slideToken) return;
        video = true;
        thumbs[idx].classList.add("video");
        p.play(meta.trailers);
        // autoplay diblok / video tidak jalan dalam 10 detik: kembali ke timer biasa
        guard = setTimeout(() => fallback(token), 10000);
      } catch { fallback(token); }
      // siapkan data slide berikutnya supaya trailernya langsung jalan
      metaFor(heroes[(idx + 1) % heroes.length]);
    }
    heroCleanup = () => { slideToken++; stopVideo(); ytReady?.then((p) => p.destroy()); };

    sound.onclick = () => {
      if (!yt) return;
      const on = sound.getAttribute("aria-pressed") !== "true";
      on ? (yt.unMute(), yt.setVolume(70)) : yt.mute();
      sound.setAttribute("aria-pressed", on);
      sound.setAttribute("aria-label", on ? "Matikan suara trailer" : "Nyalakan suara trailer");
      sound.innerHTML = on ? icon.sound : icon.muted;
    };
    thumbs.forEach((t, k) => {
      t.onclick = () => show(k);
      t.onkeydown = (e) => {
        if (e.key === "ArrowRight") { e.preventDefault(); show(i + 1, true); }
        if (e.key === "ArrowLeft") { e.preventDefault(); show(i - 1, true); }
      };
    });
    // jeda saat kursor/fokus di hero supaya pengguna sempat membaca (slide tanpa trailer saja;
    // trailer tetap jalan dan pindah sendiri saat selesai)
    const pause = () => { hero.classList.add("paused"); clearInterval(heroTimer); };
    const resume = () => { hero.classList.remove("paused"); if (!video) startTimer(); };
    hero.addEventListener("mouseenter", pause);
    hero.addEventListener("mouseleave", resume);
    hero.addEventListener("focusin", pause);
    hero.addEventListener("focusout", (e) => { if (!hero.contains(e.relatedTarget)) resume(); });
    let x0 = null;
    hero.addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), { passive: true });
    hero.addEventListener("touchend", (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50 && !e.target.closest(".hero-strip")) show(i + (dx < 0 ? 1 : -1));
      x0 = null;
    });
    copy.addEventListener("click", (e) => {
      const favBtn = e.target.closest(".btn-hero-fav");
      if (favBtn) {
        const curA = heroes[i];
        const on = !lib.isFav(curA.animeId);
        lib.setFav(curA, on);
        favBtn.setAttribute("aria-pressed", on);
        favBtn.style.color = on ? "var(--gold)" : "";
        toast(on ? "Disimpan ke Koleksi" : "Dihapus dari Koleksi");
      }
    });
    show(0);
  }

  async function enrichHero(a, idx) {
    try {
      const { data } = await api(`/anime/${enc(a.animeId)}`, { quiet: true });
      const copy = $("#heroCopy");
      if (!copy || $(".hs.on")?.dataset.i != idx) return;
      const d = data.details || data;
      const syn = d.synopsis?.paragraphList?.join(" ") || [d.type, d.studios, d.duration].filter(Boolean).join(" · ");
      $("[data-syn]", copy).textContent = syn;
      const meta = $("[data-meta]", copy);
      if (meta) {
        if (d.score && !meta.querySelector(".score")) {
          meta.insertAdjacentHTML("afterbegin", `<span class="chip score">★ ${esc(cleanScore(d.score))}</span>`);
        }
        if (d.type && !meta.querySelector(".chip-type")) {
          meta.insertAdjacentHTML("beforeend", `<span class="chip chip-type">${esc(d.type)}</span>`);
        }
        (d.genreList || []).slice(0, 3).forEach((g) => {
          meta.insertAdjacentHTML("beforeend", `<a class="chip" href="#/genre/${enc(g.genreId)}">${esc(g.title)}</a>`);
        });
      }
      const latest = d.episodeList?.[0];
      if (latest) $("[data-watch]", copy).href = `#/watch/${enc(latest.episodeId)}`;
    } catch { /* hero tetap tampil tanpa sinopsis */ }
  }

  async function loadGenreStrip() {
    const el = $("#homeGenres");
    if (!el) return;
    try {
      const { data } = await api("/genre", { quiet: true });
      const list = data?.genreList || [];
      if (!list.length) { el.remove(); return; }

      // Bagi genre menjadi 2 baris
      const row1 = list.filter((_, i) => i % 2 === 0);
      const row2 = list.filter((_, i) => i % 2 !== 0);
      const safeRow2 = row2.length ? row2 : row1;

      const buildGroup = (items, isClone = false) => {
        const extra = isClone ? ' aria-hidden="true"' : "";
        const tab = isClone ? ' tabindex="-1"' : "";
        return `<div class="genre-group"${extra}>${items
          .map((g) => `<a class="genre-pill" href="#/genre/${enc(g.genreId)}"${tab}>${esc(g.title)}</a>`)
          .join("")}</div>`;
      };

      el.innerHTML = `
        <div class="sec-head"><h2 class="sec-title">Cari lewat genre</h2><a class="sec-link" href="#/genres">Semua genre</a></div>
        <div class="genre-marquee" aria-label="Cari lewat genre">
          <div class="genre-row genre-row-left" role="region" aria-label="Genre baris atas">
            <div class="genre-track">
              ${buildGroup(row1)}
              ${buildGroup(row1, true)}
              ${buildGroup(row1, true)}
              ${buildGroup(row1, true)}
            </div>
          </div>
          <div class="genre-row genre-row-right" role="region" aria-label="Genre baris bawah">
            <div class="genre-track">
              ${buildGroup(safeRow2)}
              ${buildGroup(safeRow2, true)}
              ${buildGroup(safeRow2, true)}
              ${buildGroup(safeRow2, true)}
            </div>
          </div>
        </div>`;

      initGenreMarquee(el);
    } catch { el.remove(); }
  }

  function initGenreMarquee(container) {
    const trackLeft = $(".genre-row-left .genre-track", container);
    const trackRight = $(".genre-row-right .genre-track", container);
    if (!trackLeft || !trackRight) return;

    let posXLeft = 0;
    let posXRight = 0;
    let isPaused = false;

    const getGroupWidth = (track) => {
      const g = $(".genre-group", track);
      return g ? (g.getBoundingClientRect().width || g.scrollWidth) : 1000;
    };

    // Pause saat mouse diarahkan ke area genre
    container.addEventListener("mouseenter", () => { isPaused = true; });
    container.addEventListener("mouseleave", () => { isPaused = false; });
    container.addEventListener("touchstart", () => { isPaused = true; }, { passive: true });
    container.addEventListener("touchend", () => { isPaused = false; }, { passive: true });

    // Dukung juga scroll roda mouse pada baris genre jika diarahkan
    container.addEventListener("wheel", (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        posXLeft -= e.deltaY * 0.7;
        posXRight += e.deltaY * 0.7;
        const wL = getGroupWidth(trackLeft);
        const wR = getGroupWidth(trackRight);
        while (posXLeft <= -wL) posXLeft += wL;
        while (posXLeft > 0) posXLeft -= wL;
        while (posXRight >= 0) posXRight -= wR;
        while (posXRight < -wR) posXRight += wR;
        trackLeft.style.transform = `translate3d(${posXLeft}px, 0, 0)`;
        trackRight.style.transform = `translate3d(${posXRight}px, 0, 0)`;
      }
    }, { passive: false });

    let lastTime = performance.now();
    const speed = 40; // pixel per detik
    let ready = false;

    function step(now) {
      if (!document.contains(container)) return;
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const wLeft = getGroupWidth(trackLeft);
      const wRight = getGroupWidth(trackRight);

      if (!ready && wRight > 0) {
        posXRight = -wRight;
        trackRight.style.transform = `translate3d(${posXRight}px, 0, 0)`;
        ready = true;
      }

      if (!isPaused) {
        // Baris atas: bergerak ke kiri secara terus menerus
        posXLeft -= speed * dt;
        if (posXLeft <= -wLeft) {
          posXLeft += wLeft;
        }
        trackLeft.style.transform = `translate3d(${posXLeft}px, 0, 0)`;

        // Baris bawah: bergerak ke kanan secara terus menerus
        posXRight += speed * dt;
        if (posXRight >= 0) {
          posXRight -= wRight;
        }
        trackRight.style.transform = `translate3d(${posXRight}px, 0, 0)`;
      }

      requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  async function pageList(kind, page) {
    const title = kind === "ongoing" ? 'Anime <span class="hl">ongoing</span>' : 'Anime <span class="hl">tamat</span>';
    const desc = kind === "ongoing" ? "Masih tayang, episode baru tiap minggu." : "Sudah lengkap, aman untuk maraton.";
    app.innerHTML = `<div class="page"><div class="page-head"><div><h1 class="page-title">${title}</h1><p class="page-desc">${desc}</p></div></div><div id="filter"></div><div class="grid">${skCards(18)}</div></div>`;
    const res = await api(`/${kind}?page=${page}`);
    const list = res.data.animeList || [];
    const grid = $(".grid", app);
    const draw = (day) => {
      const shown = day ? list.filter((a) => a.releaseDay === day) : list;
      grid.innerHTML = shown.length ? shown.map((a) => card(a)).join("") : `<div style="grid-column:1/-1">${emptyBox("Kosong", "Tidak ada judul untuk filter ini di halaman ini.")}</div>`;
      hydrate(grid);
    };
    // filter hari rilis (khusus ongoing): bantu cari "yang keluar hari ini"
    if (kind === "ongoing") {
      const days = DAYS.filter((d) => list.some((a) => a.releaseDay === d));
      const f = $("#filter");
      f.innerHTML = `<div class="seg" role="tablist" aria-label="Filter hari rilis">
        <button role="tab" aria-selected="true" data-d="">Semua <span class="n">${list.length}</span></button>
        ${days.map((d) => `<button role="tab" aria-selected="false" data-d="${esc(d)}">${esc(d)}${d === todayName() ? ' <span class="tag">Hari ini</span>' : ""}</button>`).join("")}
      </div>`;
      $$("button", f).forEach((b) => (b.onclick = () => {
        $$("button", f).forEach((x) => x.setAttribute("aria-selected", x === b));
        draw(b.dataset.d);
      }));
    }
    draw("");
    $(".page", app).insertAdjacentHTML("beforeend", pager(res.pagination, `#/${kind}`));
  }

  async function pageSearch(q) {
    const input = $("#searchInput");
    input.value = q;
    app.innerHTML = `<div class="page"><div class="page-head"><div><h1 class="page-title">Hasil untuk <span class="hl">${esc(q)}</span></h1><p class="page-desc" aria-live="polite">Mencari…</p></div></div><div class="grid">${skCards(12)}</div></div>`;
    if (!q.trim()) {
      $(".page", app).innerHTML = emptyBox("Mau nonton apa?", "Ketik judul anime di kolom pencarian di atas.");
      return;
    }
    remember(q);
    // dua sumber dicari bersamaan; Samehadaku menyusul tanpa menahan hasil Otakudesu.
    // Hasil Samehadaku campur seri dan episode ("... Episode 4"): episode digabung per seri, yang terbaru saja.
    const opReq = api(`/search?q=${enc(q)}`, { base: OP_API, quiet: true }).then((r) => {
      const names = new Set();
      return (r.data?.animeList || []).map((a) => {
        const isEp = /-episode-\d+/.test(a.animeId);
        return { ...a, isEp, series: isEp ? opSeriesName(a.title) : cleanTitle(a.title) };
      }).filter((a) => !names.has(norm(a.series)) && names.add(norm(a.series)));
    }, () => null);
    const { data } = await api(`/search?q=${enc(q)}`);
    const list = data.animeList || [];
    const page = $(".page", app);
    const desc = $(".page-desc", app);
    desc.textContent = `${list.length} judul di Otakudesu · mencari di Samehadaku…`;
    $(".grid", app).outerHTML = list.length
      ? `<div class="grid">${list.map((a) => card(a, { sub: [cleanStatus(a.status), (a.genreList || []).slice(0, 2).map((g) => g.title).join(", ")].filter(Boolean).join(" · ") })).join("")}</div>`
      : `<p class="page-desc">Tidak ada di Otakudesu.</p>`;
    page.insertAdjacentHTML("beforeend", `<section class="section" id="opResults"><div class="sec-head"><h2 class="sec-title">Dari Samehadaku</h2></div><div class="grid">${skCards(6)}</div></section>`);
    hydrate();

    const opList = await opReq;
    const box = $("#opResults");
    if (!box?.isConnected) return;
    const opCount = opList?.length || 0;
    desc.textContent = `${list.length} judul di Otakudesu · ${opList ? `${opCount} di Samehadaku` : "Samehadaku tidak merespons"}`;
    if (opCount) {
      box.innerHTML = `<div class="sec-head"><h2 class="sec-title">Dari Samehadaku<span class="count">${opCount}</span></h2></div>
        <div class="grid">${opList.map((a) => a.isEp
          ? card({ title: a.series, poster: a.poster }, { href: `#/op/watch/${enc(a.animeId)}`, epLabel: epNum(a.title), foot: [], sub: ["Episode terbaru", a.status].filter(Boolean).join(" · ") })
          : card({ title: a.series, poster: a.poster, animeId: "op:" + a.animeId, score: String(a.score ?? "").replace("★", "").trim() }, { foot: [], sub: [a.type, a.status].filter(Boolean).join(" · ") })).join("")}</div>`;
      hydrate(box);
    } else box.remove();
    if (!list.length && !opCount) {
      page.insertAdjacentHTML("beforeend", emptyBox(`Tidak ada hasil untuk "${esc(q)}"`, "Coba judul Jepang atau Inggris-nya, atau kata kunci yang lebih pendek.", '<a class="btn btn-secondary btn-sm" href="#/genres">Cari lewat genre</a>'));
    }
  }

  let cachedGenres = null;
  async function getAllGenres() {
    if (cachedGenres && cachedGenres.length) return cachedGenres;
    try {
      const { data } = await api("/genre");
      cachedGenres = data.genreList || [];
    } catch {
      cachedGenres = [];
    }
    return cachedGenres;
  }

  async function pageGenres() {
    app.innerHTML = `
      <div class="page">
        <div class="page-head">
          <div>
            <h1 class="page-title">Semua <span class="hl">genre</span></h1>
            <p class="page-desc">Pilih satu atau lebih genre untuk menemukan anime yang cocok.</p>
          </div>
        </div>
        <div class="genre-toolbar">
          <div class="genre-search">
            ${icon.search}
            <input id="genreSearchInput" type="search" placeholder="Cari nama genre (mis. Romance, Action, Fantasy)..." aria-label="Cari nama genre" />
          </div>
          <div class="genre-toolbar-meta">
            <span id="genreHint">Klik genre untuk memilih beberapa sekaligus</span>
            <button type="button" class="btn btn-quiet btn-sm" id="genreResetAllBtn" hidden>Batal Pilih</button>
          </div>
        </div>
        <div class="genre-grid">${Array.from({ length: 24 }, () => '<div class="sk" style="height:60px;border-radius:var(--r-lg)"></div>').join("")}</div>
        <div class="genre-action-bar" id="genreActionBar" hidden>
          <div class="genre-bar-content">
            <div class="genre-bar-info">
              <span class="genre-bar-count"><strong id="genreSelectedCount">0</strong> genre dipilih:</span>
              <div class="genre-bar-chips" id="genreBarChips"></div>
            </div>
            <div class="genre-bar-actions">
              <div class="genre-mode-toggle" role="group" aria-label="Mode kecocokan genre">
                <button type="button" class="genre-mode-btn on" data-mode="and" title="Anime harus memiliki SEMUA genre ini">Semua (AND)</button>
                <button type="button" class="genre-mode-btn" data-mode="or" title="Anime memiliki minimal SALAH SATU genre ini">Salah Satu (OR)</button>
              </div>
              <button type="button" class="btn btn-secondary btn-sm" id="genreBarReset">Reset</button>
              <a class="btn btn-primary" id="genreBarApply" href="#/genres">Tampilkan Anime ›</a>
            </div>
          </div>
        </div>
      </div>`;

    const genreList = await getAllGenres();
    const grid = $(".genre-grid", app);
    const selected = new Set();
    let currentMode = "and";

    const updateActionBar = () => {
      const bar = $("#genreActionBar");
      const chips = $("#genreBarChips");
      const countEl = $("#genreSelectedCount");
      const resetBtn = $("#genreResetAllBtn");
      const applyBtn = $("#genreBarApply");

      const count = selected.size;
      if (!bar) return;

      if (count === 0) {
        bar.hidden = true;
        if (resetBtn) resetBtn.hidden = true;
      } else {
        bar.hidden = false;
        if (resetBtn) resetBtn.hidden = false;
        if (countEl) countEl.textContent = count;
        if (chips) {
          chips.innerHTML = [...selected].map((id) => {
            const g = genreList.find((x) => x.genreId === id);
            const title = g?.title || id;
            return `<span class="genre-chip-tag">${esc(title)} <button type="button" data-unpick="${esc(id)}" aria-label="Hapus ${esc(title)}">×</button></span>`;
          }).join("");
          $$("[data-unpick]", chips).forEach((b) => (b.onclick = (e) => {
            e.stopPropagation();
            toggleGenre(b.dataset.unpick);
          }));
        }
        if (applyBtn) {
          const ids = [...selected].join(",");
          applyBtn.href = `#/genre/${enc(ids)}?mode=${currentMode}`;
          applyBtn.textContent = `Tampilkan Anime (${count}) ›`;
        }
      }
    };

    const toggleGenre = (genreId) => {
      if (selected.has(genreId)) {
        selected.delete(genreId);
      } else {
        selected.add(genreId);
      }
      const tile = $(`.genre-tile[data-id="${genreId}"]`, grid);
      if (tile) {
        const isSel = selected.has(genreId);
        tile.classList.toggle("selected", isSel);
        tile.setAttribute("aria-checked", isSel);
      }
      updateActionBar();
    };

    grid.innerHTML = genreList.map((g) => `
      <div class="genre-tile" data-id="${esc(g.genreId)}" data-title="${esc(g.title.toLowerCase())}" role="checkbox" aria-checked="false" tabindex="0">
        <div class="genre-tile-main">
          <span class="genre-check" aria-hidden="true">${icon.check}</span>
          <span class="genre-title">${esc(g.title)}</span>
        </div>
        <a class="genre-tile-arrow" href="#/genre/${enc(g.genreId)}" title="Buka genre ${esc(g.title)} saja" aria-label="Buka genre ${esc(g.title)} saja">›</a>
      </div>
    `).join("");

    // Klik tile untuk multi-pilih
    $$(".genre-tile", grid).forEach((t) => {
      t.onclick = (e) => {
        if (e.target.closest(".genre-tile-arrow")) return; // biarkan link langsung bekerja
        toggleGenre(t.dataset.id);
      };
      t.onkeydown = (e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          toggleGenre(t.dataset.id);
        }
      };
    });

    // Mode toggle di action bar
    $$(".genre-mode-btn", app).forEach((b) => {
      b.onclick = () => {
        $$(".genre-mode-btn", app).forEach((x) => x.classList.toggle("on", x === b));
        currentMode = b.dataset.mode;
        updateActionBar();
      };
    });

    // Reset buttons
    const doReset = () => {
      selected.clear();
      $$(".genre-tile", grid).forEach((t) => {
        t.classList.remove("selected");
        t.setAttribute("aria-checked", "false");
      });
      updateActionBar();
    };
    const resetTopBtn = $("#genreResetAllBtn");
    if (resetTopBtn) resetTopBtn.onclick = doReset;
    const resetBarBtn = $("#genreBarReset");
    if (resetBarBtn) resetBarBtn.onclick = doReset;

    // Search filter input
    const searchInp = $("#genreSearchInput");
    if (searchInp) {
      searchInp.oninput = () => {
        const q = searchInp.value.trim().toLowerCase();
        $$(".genre-tile", grid).forEach((t) => {
          const match = !q || t.dataset.title.includes(q) || t.dataset.id.includes(q);
          t.hidden = !match;
        });
      };
    }
  }

  async function pageGenre(genreParam, page, mode = "and") {
    const rawIds = String(genreParam ?? "").split(/[,+]/).map((x) => x.trim().toLowerCase()).filter(Boolean);
    if (!rawIds.length) {
      location.hash = "#/genres";
      return;
    }

    const genreListAll = await getAllGenres();
    const genreMap = new Map(genreListAll.map((g) => [g.genreId.toLowerCase(), g]));
    const activeGenres = rawIds.map((id) => genreMap.get(id) || { genreId: id, title: id.replace(/-/g, " ") });
    const isMulti = activeGenres.length > 1;

    // Header info
    const pageTitle = isMulti
      ? `Filter <span class="hl">Multi-Genre</span>`
      : `Genre <span class="hl" style="text-transform:capitalize">${esc(activeGenres[0].title)}</span>`;
    const pageDesc = isMulti
      ? `Kombinasi ${activeGenres.length} genre (${mode === "or" ? "Salah satu cocok" : "Semua cocok"})`
      : `Halaman ${page}`;

    app.innerHTML = `
      <div class="page">
        <div class="page-head">
          <div>
            <h1 class="page-title">${pageTitle}</h1>
            <p class="page-desc" id="genreResultDesc">${pageDesc}</p>
          </div>
          <div class="actions">
            <a class="btn btn-secondary btn-sm" href="#/genres">Pilih genre lain</a>
          </div>
        </div>

        <div class="genre-filter-panel" id="genreFilterPanel">
          <div class="genre-filter-top">
            <div class="genre-pills-list">
              <span style="font-size:13px;font-weight:700;color:var(--text-3);margin-right:4px">Genre aktif:</span>
              ${activeGenres.map((g) => `
                <span class="active-genre-pill">
                  ${esc(g.title)}
                  <button type="button" data-remove-id="${esc(g.genreId)}" title="Hapus genre ${esc(g.title)}" aria-label="Hapus genre ${esc(g.title)}">×</button>
                </span>
              `).join("")}
              <button type="button" class="btn btn-secondary btn-sm" id="toggleAddGenreBtn" style="height:32px;gap:6px">
                ${icon.plus} Tambah Genre
              </button>
            </div>
            ${isMulti ? `
              <div class="genre-mode-toggle" role="group" aria-label="Mode kecocokan">
                <button type="button" class="genre-mode-btn ${mode === "and" ? "on" : ""}" data-set-mode="and" title="Harus memiliki semua genre">Semua (AND)</button>
                <button type="button" class="genre-mode-btn ${mode === "or" ? "on" : ""}" data-set-mode="or" title="Cukup salah satu genre">Salah Satu (OR)</button>
              </div>` : ""
            }
          </div>
          <div class="genre-picker-drawer" id="genrePickerDrawer" hidden>
            <span style="font-size:12.5px;font-weight:700;color:var(--text-3)">Pilih genre untuk digabungkan:</span>
            <div class="genre-picker-chips">
              ${genreListAll.map((g) => {
                const inUse = activeGenres.some((x) => x.genreId === g.genreId);
                return `<button type="button" class="genre-add-chip${inUse ? " in-use" : ""}" data-add-id="${esc(g.genreId)}">${esc(g.title)}</button>`;
              }).join("")}
            </div>
          </div>
        </div>

        <div class="grid">${skCards(18)}</div>
      </div>`;

    // Event handlers untuk filter bar
    // Hapus genre
    $$("[data-remove-id]", app).forEach((b) => {
      b.onclick = () => {
        const removeId = b.dataset.removeId;
        const remain = activeGenres.filter((g) => g.genreId !== removeId).map((g) => g.genreId);
        if (!remain.length) location.hash = "#/genres";
        else location.hash = `#/genre/${enc(remain.join(","))}?mode=${mode}`;
      };
    });

    // Tambah genre drawer toggle
    const drawer = $("#genrePickerDrawer");
    const toggleBtn = $("#toggleAddGenreBtn");
    if (toggleBtn && drawer) {
      toggleBtn.onclick = () => {
        drawer.hidden = !drawer.hidden;
        toggleBtn.setAttribute("aria-expanded", !drawer.hidden);
      };
      $$("[data-add-id]", drawer).forEach((b) => {
        b.onclick = () => {
          const addId = b.dataset.addId;
          if (activeGenres.some((g) => g.genreId === addId)) return;
          const nextIds = [...activeGenres.map((g) => g.genreId), addId];
          location.hash = `#/genre/${enc(nextIds.join(","))}?mode=${mode}`;
        };
      });
    }

    // Switch mode AND/OR
    $$("[data-set-mode]", app).forEach((b) => {
      b.onclick = () => {
        const nextMode = b.dataset.setMode;
        const ids = activeGenres.map((g) => g.genreId).join(",");
        location.hash = `#/genre/${enc(ids)}?mode=${nextMode}`;
      };
    });

    // Fetching data
    if (!isMulti) {
      // Single genre
      const singleId = activeGenres[0].genreId;
      const res = await api(`/genre/${enc(singleId)}?page=${page}`);
      const list = res.data?.animeList || [];
      $(".grid", app).outerHTML = list.length
        ? `<div class="grid">${list.map((a) => card(a, { sub: [a.season, a.studios].filter(Boolean).join(" · ") })).join("")}</div>`
        : emptyBox("Belum ada judul", "Genre ini kosong di sumber.");
      $(".page", app).insertAdjacentHTML("beforeend", pager(res.pagination, `#/genre/${enc(singleId)}`));
      hydrate();
    } else {
      // Multi genre
      // Ambil hal 1 & hal 2 dari genre-genre yang dipilih secara paralel
      const fetches = [];
      activeGenres.slice(0, 4).forEach((g) => {
        fetches.push(api(`/genre/${enc(g.genreId)}?page=1`, { quiet: true }).catch(() => null));
        fetches.push(api(`/genre/${enc(g.genreId)}?page=2`, { quiet: true }).catch(() => null));
      });
      const responses = await Promise.all(fetches);

      const animeMap = new Map();
      responses.forEach((res) => {
        (res?.data?.animeList || []).forEach((a) => {
          if (!animeMap.has(a.animeId)) animeMap.set(a.animeId, a);
        });
      });
      const pool = [...animeMap.values()];
      const reqNorms = new Set(activeGenres.map((g) => norm(g.genreId)));

      let matched = [];
      if (mode === "and") {
        matched = pool.filter((a) => {
          const aGenres = new Set((a.genreList || []).map((g) => norm(g.genreId || g.title)));
          return [...reqNorms].every((id) => aGenres.has(id));
        });
      } else {
        matched = pool.filter((a) => {
          const aGenres = new Set((a.genreList || []).map((g) => norm(g.genreId || g.title)));
          return [...reqNorms].some((id) => aGenres.has(id));
        }).sort((a, b) => {
          const gSetA = new Set((a.genreList || []).map((g) => norm(g.genreId || g.title)));
          const gSetB = new Set((b.genreList || []).map((g) => norm(g.genreId || g.title)));
          const countA = [...reqNorms].filter((id) => gSetA.has(id)).length;
          const countB = [...reqNorms].filter((id) => gSetB.has(id)).length;
          return countB - countA || (parseFloat(b.score) || 0) - (parseFloat(a.score) || 0);
        });
      }

      const descEl = $("#genreResultDesc");
      if (descEl) {
        descEl.textContent = `${matched.length} judul anime ditemukan (${mode === "and" ? "Memiliki semua genre" : "Memiliki minimal satu genre"})`;
      }

      if (matched.length) {
        $(".grid", app).outerHTML = `<div class="grid">${matched.map((a) => {
          const genresStr = (a.genreList || []).slice(0, 3).map((g) => g.title).join(", ");
          return card(a, { sub: [a.season || a.studios, genresStr].filter(Boolean).join(" · ") });
        }).join("")}</div>`;
      } else {
        const ids = activeGenres.map((g) => g.genreId).join(",");
        const switchBtn = mode === "and"
          ? `<button class="btn btn-primary btn-sm" id="switchOrModeBtn">Coba Mode "Salah Satu (OR)"</button>`
          : "";
        $(".grid", app).outerHTML = emptyBox(
          "Tidak ada anime yang cocok",
          mode === "and"
            ? "Belum ditemukan anime yang memiliki semua genre ini sekaligus di katalog awal."
            : "Tidak ada judul anime yang ditemukan untuk kombinasi ini.",
          `${switchBtn} <a class="btn btn-secondary btn-sm" href="#/genres">Pilih ulang genre</a>`
        );
        const orBtn = $("#switchOrModeBtn");
        if (orBtn) orBtn.onclick = () => { location.hash = `#/genre/${enc(ids)}?mode=or`; };
      }
      hydrate();
    }
  }

  async function pageSchedule() {
    const head = `<div class="page-head"><div><h1 class="page-title">Jadwal <span class="hl">rilis</span></h1><p class="page-desc">Anime ongoing per hari tayang. Aktifkan pengingat agar tidak ketinggalan episode baru.</p></div></div>`;
    app.innerHTML = `<div class="page">${head}<div class="sched-list">${Array.from({ length: 9 }, () => '<div class="sk" style="height:96px;border-radius:var(--r-xl)"></div>').join("")}</div></div>`;

    const applyPoster = (animeId, posterUrl) => {
      if (!animeId || !posterUrl) return;
      setPoster(animeId, posterUrl);
      $$(`img[data-poster-id="${animeId}"]`, app).forEach((img) => {
        img.onload = () => {
          img.classList.add("loaded");
          const fb = img.nextElementSibling;
          if (fb?.classList.contains("sched-poster-fallback")) fb.remove();
        };
        img.src = posterUrl;
        if (img.complete && img.naturalWidth > 0) {
          img.classList.add("loaded");
          const fb = img.nextElementSibling;
          if (fb?.classList.contains("sched-poster-fallback")) fb.remove();
        }
      });
    };

    // Pancing poster dari anime ongoing (hal 1 & 2) secara cepat di latar belakang
    api("/ongoing?page=1", { quiet: true }).then((r) => {
      (r.data?.animeList || []).forEach((a) => applyPoster(a.animeId, a.poster));
    }).catch(() => {});
    api("/ongoing?page=2", { quiet: true }).then((r) => {
      (r.data?.animeList || []).forEach((a) => applyPoster(a.animeId, a.poster));
    }).catch(() => {});

    const { data } = await api("/schedule");
    const days = (Array.isArray(data) ? data : data?.scheduleList || []).map((d) => ({
      title: d.day || d.title || "",
      animeList: (d.anime_list || d.animeList || []).map((a) => {
        const animeId = a.slug || a.animeId;
        if (a.poster && animeId) setPoster(animeId, a.poster);
        return {
          title: a.title,
          animeId,
          poster: a.poster || getPoster(animeId) || "",
          ...a
        };
      })
    }));
    const today = todayName();
    let cur = Math.max(0, days.findIndex((d) => norm(d.title) === norm(today)));
    let showingReminders = false;

    const render = () => {
      const favIds = new Set(lib.favs().map((f) => f.animeId));
      const reminderList = lib.reminders();
      const remindedIds = new Set(reminderList.map((r) => r.animeId));

      let list = [];
      let currentDayTitle = "";

      if (showingReminders) {
        currentDayTitle = "Pengingat Saya";
        list = reminderList;
      } else {
        currentDayTitle = days[cur]?.title || "";
        list = [...(days[cur]?.animeList || [])].sort((a, b) => {
          const scoreB = (favIds.has(b.animeId) ? 2 : 0) + (remindedIds.has(b.animeId) ? 1 : 0);
          const scoreA = (favIds.has(a.animeId) ? 2 : 0) + (remindedIds.has(a.animeId) ? 1 : 0);
          return scoreB - scoreA;
        });
      }

      const tabsHtml = `
        <div class="seg" role="tablist" aria-label="Hari">
          ${days.map((d, i) => `<button role="tab" aria-selected="${!showingReminders && i === cur}" data-i="${i}"><span class="seg-title">${esc(d.title)}</span> <span class="n">${d.animeList?.length || 0}</span>${norm(d.title) === norm(today) ? ' <span class="tag">Hari ini</span>' : ""}</button>`).join("")}
          <button role="tab" aria-selected="${showingReminders}" data-tab="reminders">🔔 Pengingat <span class="n">${reminderList.length}</span></button>
        </div>`;

      let contentHtml = "";
      if (!list.length) {
        contentHtml = showingReminders
          ? emptyBox("Belum ada pengingat", "Tekan ikon lonceng pada kartu anime di jadwal untuk mengaktifkan pengingat rilisnya.", "")
          : emptyBox("Tidak ada jadwal", "Hari ini kosong.");
      } else {
        contentHtml = `<div class="sched-list">${list.map((a, i) => {
          const isFav = favIds.has(a.animeId);
          const isReminded = remindedIds.has(a.animeId);
          const poster = getPoster(a.animeId) || a.poster || "";
          const dayLabel = showingReminders ? (a.releaseDay || "Jadwal rilis") : currentDayTitle;
          const initial = (cleanTitle(a.title || "").charAt(0) || "G").toUpperCase();

          return `
            <div class="sched-item-wrap${isFav ? " fav" : ""}${isReminded ? " reminded" : ""}">
              <a class="sched-item" href="#/anime/${enc(a.animeId)}">
                <div class="sched-poster-box">
                  ${poster
                    ? `<img class="sched-img loaded" src="${esc(poster)}" alt="Poster ${esc(cleanTitle(a.title))}" loading="lazy" referrerpolicy="no-referrer" />`
                    : `<img class="sched-img" data-poster-id="${esc(a.animeId)}" alt="Poster ${esc(cleanTitle(a.title))}" loading="lazy" referrerpolicy="no-referrer" /><div class="sched-poster-fallback">${esc(initial)}</div>`
                  }
                </div>
                <div class="sched-info">
                  <div class="sched-title-wrap">
                    <span class="sched-n">${isFav ? "★" : String(i + 1).padStart(2, "0")}</span>
                    <span class="sched-title">${esc(cleanTitle(a.title))}</span>
                  </div>
                  <div class="sched-meta">
                    <span class="sched-day-tag">${esc(dayLabel)}</span>
                    ${isReminded ? '<span class="sched-remind-tag">🔔 Pengingat aktif</span>' : ''}
                  </div>
                </div>
              </a>
              <button class="sched-remind-btn" data-remind="${esc(a.animeId)}" aria-pressed="${isReminded}" aria-label="Pengingat untuk ${esc(cleanTitle(a.title))}" title="${isReminded ? "Pengingat aktif (Klik untuk matikan)" : "Aktifkan pengingat rilis"}">
                ${isReminded ? icon.bellFill : icon.bell}
              </button>
            </div>`;
        }).join("")}</div>`;
      }

      $(".page", app).innerHTML = `${head}${tabsHtml}${contentHtml}`;

      // Tab navigasi
      $$(".seg button[data-i]", app).forEach((b) => (b.onclick = () => {
        showingReminders = false;
        cur = +b.dataset.i;
        render();
        $(`.seg [data-i="${cur}"]`, app)?.focus();
      }));

      const remTab = $('.seg [data-tab="reminders"]', app);
      if (remTab) {
        remTab.onclick = () => {
          showingReminders = true;
          render();
          $('.seg [data-tab="reminders"]', app)?.focus();
        };
      }

      const activeTab = $('.seg [aria-selected="true"]', app);
      if (activeTab) activeTab.parentElement.scrollLeft = activeTab.offsetLeft - 16;

      // Event listener tombol pengingat
      $$("[data-remind]", app).forEach((b) => {
        b.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          const id = b.dataset.remind;
          const item = list.find((x) => x.animeId === id);
          if (!item) return;
          const active = lib.toggleReminder(item, currentDayTitle);
          b.setAttribute("aria-pressed", active);
          b.innerHTML = active ? icon.bellFill : icon.bell;
          b.title = active ? "Pengingat aktif (Klik untuk matikan)" : "Aktifkan pengingat rilis";
          const wrap = b.closest(".sched-item-wrap");
          if (wrap) wrap.classList.toggle("reminded", active);

          if (active) {
            toast(`🔔 Pengingat aktif untuk ${cleanTitle(item.title)}!`);
          } else {
            toast(`Pengingat dinonaktifkan untuk ${cleanTitle(item.title)}`);
            if (showingReminders) render();
          }
        };
      });

      // Fetch gambar poster yang belum ada di cache secara bertahap
      list.forEach((a) => {
        if (!getPoster(a.animeId)) {
          api(`/anime/${enc(a.animeId)}`, { quiet: true }).then((res) => {
            const p = res.data?.details?.poster || res.data?.poster;
            if (p) applyPoster(a.animeId, p);
          }).catch(() => {});
        }
      });
    };

    render();
  }

  async function pageAnime(id) {
    app.innerHTML = `<div class="detail-grid"><div class="detail-poster sk"></div><div><div class="sk" style="height:46px;width:70%"></div><div class="sk" style="height:16px;width:40%;margin-top:14px"></div><div class="sk" style="height:64px;margin-top:28px;max-width:760px"></div><div class="sk" style="height:90px;margin-top:20px;max-width:760px"></div></div></div>`;
    const { data } = await api(`/anime/${enc(id)}`);
    const d = data.details || data;
    const eps = realEps(d.episodeList);
    const seen = lib.seen();
    const hist = lib.history().find((h) => h.animeId === id);
    const firstEp = eps[eps.length - 1];
    const paras = d.synopsis?.paragraphList || [];
    const meta = { animeId: id, title: d.title, poster: d.poster, score: d.score, episodes: d.episodes };
    const fav = lib.isFav(id);
    const reminded = lib.isReminded(id);

    const fact = (k, v, cls = "") => (v ? `<div class="fact ${cls}"><dt>${k}</dt><dd>${esc(v)}</dd></div>` : "");
    const primary = hist
      ? `<a class="btn btn-primary" href="#/watch/${enc(hist.episodeId)}">${icon.play} Lanjut episode ${esc(hist.epLabel)}</a>`
      : firstEp ? `<a class="btn btn-primary" href="#/watch/${enc(firstEp.episodeId)}">${icon.play} Mulai dari episode ${esc(epNum(firstEp.title))}</a>` : "";
    const secondary = hist && firstEp ? `<a class="btn btn-secondary" href="#/watch/${enc(firstEp.episodeId)}">Dari episode ${esc(epNum(firstEp.title))}</a>` : "";

    app.innerHTML = `
      <section class="detail-hero" id="detailHero">
        <div class="detail-bg" style="background-image:url('${esc(d.poster)}')"></div>
        <div class="detail-video" aria-hidden="true"><div id="dtHost"></div></div>
        <div class="detail-grid">
          <div class="detail-poster"><img src="${esc(d.poster)}" alt="Poster ${esc(cleanTitle(d.title))}" referrerpolicy="no-referrer" /></div>
          <div>
            <div class="eyebrow">${d.status === "Ongoing" ? '<span class="chip live">Ongoing</span>' : `<span class="chip">${esc(d.status || "Anime")}</span>`}<span>${esc(d.type || "")}</span></div>
            <h1 class="detail-title">${esc(cleanTitle(d.title))}</h1>
            ${d.japanese ? `<div class="detail-jp" lang="ja">${esc(d.japanese)}</div>` : ""}
            <div class="meta">${(d.genreList || []).map((g) => `<a class="chip" href="#/genre/${enc(g.genreId)}">${esc(g.title)}</a>`).join("")}</div>
            <dl class="facts">
              ${fact("Skor", d.score, "score")}
              ${fact("Episode", d.episodes)}
              ${fact("Durasi", d.duration)}
              ${fact("Tayang", d.aired)}
              ${fact("Studio", d.studios)}
            </dl>
            ${paras.length ? `<div class="syn clamp" id="syn">${paras.map((p) => `<p>${esc(p)}</p>`).join("")}</div><button class="more" id="synMore" aria-expanded="false">Baca sinopsis lengkap</button>` : ""}
            <div class="actions" style="margin-top:24px">
              ${primary}${secondary}
              <button class="btn btn-secondary" id="trailerBtn" hidden>${icon.film} Tonton trailer</button>
              <button class="btn btn-secondary" id="favBtn" aria-pressed="${fav}">${icon.bookmark}<span>${fav ? "Tersimpan" : "Simpan"}</span></button>
              <button class="btn btn-secondary" id="remindBtn" aria-pressed="${reminded}">${reminded ? icon.bellFill : icon.bell}<span>${reminded ? "Pengingat aktif" : "Ingatkan rilis"}</span></button>
              <button class="icon-btn" id="shareBtn" aria-label="Bagikan">${icon.share}</button>
            </div>
          </div>
        </div>
      </section>

      <div class="body">
        <section class="section" id="episodes">
          <div class="sec-head">
            <h2 class="sec-title">Daftar episode<span class="count">${eps.length}</span></h2>
            ${eps.length > 12 ? `<div class="ep-tools"><input class="field" id="epFilter" type="search" inputmode="numeric" placeholder="No. episode" aria-label="Cari nomor episode" /><button class="btn btn-quiet btn-sm" id="epSort" aria-label="Balik urutan">Terlama dulu</button></div>` : ""}
          </div>
          ${eps.length ? `<div class="ep-grid" id="epGrid"></div>
            <div class="legend"><span><i></i>Sudah ditonton</span>${hist ? '<span><i class="a"></i>Terakhir ditonton</span>' : ""}</div>`
            : emptyBox("Belum ada episode", "Episode pertama belum rilis di sumber.")}
        </section>
        ${d.recommendedAnimeList?.length ? row("Mirip dengan ini", d.recommendedAnimeList.map((a) => card(a, { foot: [] })).join("")) : ""}
      </div>`;

    let asc = true;
    const drawEps = (f = "") => {
      const g = $("#epGrid");
      if (!g) return;
      const list = (asc ? [...eps].reverse() : eps).filter((e) => !f || epNum(e.title).includes(f));
      const link = (e) => {
        const cls = hist?.episodeId === e.episodeId ? " seen last" : seen[e.episodeId] ? " seen" : "";
        return `<a class="ep${cls}" href="#/watch/${enc(e.episodeId)}" aria-label="Episode ${esc(epNum(e.title))}${cls ? ", sudah ditonton" : ""}">${esc(epNum(e.title))}</a>`;
      };
      g.innerHTML = list.length
        ? (f ? list.map(link).join("") : epGaps(list, (e) => epNum(e.title), link))
        : `<p class="page-desc" style="grid-column:1/-1">Episode ${esc(f)} tidak ada.</p>`;
    };
    drawEps();
    $("#epFilter")?.addEventListener("input", (e) => drawEps(e.target.value.trim()));
    $("#epSort")?.addEventListener("click", (e) => {
      asc = !asc;
      e.currentTarget.textContent = asc ? "Terlama dulu" : "Terbaru dulu";
      drawEps($("#epFilter").value.trim());
    });
    $("#synMore")?.addEventListener("click", (e) => {
      const clamped = $("#syn").classList.toggle("clamp");
      e.target.textContent = clamped ? "Baca sinopsis lengkap" : "Ringkas sinopsis";
      e.target.setAttribute("aria-expanded", !clamped);
    });
    const favBtn = $("#favBtn");
    const setFavUI = (on) => { favBtn.setAttribute("aria-pressed", on); $("span", favBtn).textContent = on ? "Tersimpan" : "Simpan"; };
    favBtn.onclick = () => {
      const on = !lib.isFav(id);
      lib.setFav(meta, on);
      setFavUI(on);
      toast(on ? "Disimpan ke Koleksi" : "Dihapus dari Koleksi", on ? null : { label: "Urungkan", fn: () => { lib.setFav(meta, true); setFavUI(true); } });
    };
    const remindBtn = $("#remindBtn");
    if (remindBtn) {
      remindBtn.onclick = () => {
        const on = lib.toggleReminder(meta, d.aired || "");
        remindBtn.setAttribute("aria-pressed", on);
        remindBtn.innerHTML = `${on ? icon.bellFill : icon.bell}<span>${on ? "Pengingat aktif" : "Ingatkan rilis"}</span>`;
        toast(on ? `🔔 Pengingat rilis aktif untuk ${cleanTitle(d.title)}` : `Pengingat dinonaktifkan`);
      };
    }
    $("#shareBtn").onclick = () => share(cleanTitle(d.title));
    document.title = `${cleanTitle(d.title)} · Gembulnime`;
    hydrate();
    enrichDetail(d);
  }

  // detail: banner AniList (lebih tajam dari poster yang di-blur), warna khas anime, jadwal episode
  // berikutnya, trailer di latar (tanpa suara) dan tombol trailer bersuara
  async function enrichDetail(d) {
    const hero = $("#detailHero");
    const m = await animeMeta(d.title, d.japanese);
    if (!hero?.isConnected) return;
    if (m.color) hero.style.setProperty("--amb", m.color);
    if (m.banner) {
      const bg = $(".detail-bg", hero);
      bg.style.backgroundImage = `url('${m.banner}')`;
      bg.classList.add("banner");
    }
    const when = nextLabel(m.next);
    if (when) $(".facts", hero).insertAdjacentHTML("beforeend", `<div class="fact next"><dt>Episode berikutnya</dt><dd>${esc(when.replace(/^EP \d+ /, `EP ${m.next.episode}, `))}</dd></div>`);
    if (!m.trailers.length) return;
    const btn = $("#trailerBtn");
    btn.hidden = false;
    btn.onclick = () => openTrailer(m.trailers, cleanTitle(d.title));
    let token = {}, player = null;
    heroCleanup = () => { token = null; player?.destroy(); };
    player = await ytPlayer("dtHost", {
      onPlay: () => setTimeout(() => token && hero.classList.add("playing"), 700),
      onEnd: () => hero.classList.remove("playing"),
      onFail: () => hero.classList.remove("playing"),
    }).catch(() => null);
    if (!token) return player?.destroy();
    player?.play(m.trailers);
  }

  // modal trailer bersuara dengan kontrol YouTube; Esc / klik luar / tombol tutup
  async function openTrailer(ids, title) {
    const dlg = document.createElement("dialog");
    dlg.className = "tmodal";
    dlg.setAttribute("aria-label", `Trailer ${title}`);
    dlg.innerHTML = `<div class="tmodal-head"><b>Trailer · ${esc(title)}</b><button class="icon-btn" aria-label="Tutup trailer">${icon.x}</button></div><div class="tmodal-frame"><div></div></div>`;
    document.body.appendChild(dlg);
    let p = null;
    const close = () => { if (dlg.open) dlg.close(); };
    dlg.addEventListener("close", () => { p?.destroy(); dlg.remove(); });
    dlg.addEventListener("click", (e) => { if (e.target === dlg) close(); });
    $(".icon-btn", dlg).onclick = close;
    dlg.showModal();
    p = await ytPlayer($(".tmodal-frame > div", dlg), { controls: true, mute: false, onFail: () => { toast("Trailer tidak bisa diputar di sini"); close(); } }).catch(() => null);
    if (!dlg.isConnected) return p?.destroy();
    p ? p.play(ids) : (toast("YouTube gagal dimuat"), close());
  }

  async function pageWatch(epId) {
    app.innerHTML = `<div class="page"><div class="watch"><div><div class="player"><div class="player-msg"><div><div class="spinner"></div>Memuat episode…</div></div></div><div class="sk" style="height:28px;width:60%;margin-top:20px"></div></div><div class="sk" style="height:320px;border-radius:16px"></div></div></div>`;
    const res = await api(`/episode/${enc(epId)}`);
    const data = res?.data;
    if (!data) {
      const cleanName = epId.replace(/-episode.*$/i, "").replace(/-/g, " ");
      app.innerHTML = `
        <div class="page">
          <div class="empty">
            <div class="glyph" aria-hidden="true">⚠️</div>
            <h3>Video Episode Belum Tersedia di Otakudesu</h3>
            <p class="page-desc">Episode ini sedang dalam tahap pembaruan atau belum diunggah oleh server Otakudesu. Silakan coba tonton di server Samehadaku atau kembali ke daftar episode.</p>
            <div class="actions">
              <a class="btn btn-primary btn-sm" href="#/op/search?q=${enc(cleanName)}">Cari di Samehadaku</a>
              <button class="btn btn-secondary btn-sm" onclick="history.back()">Kembali</button>
            </div>
          </div>
        </div>`;
      return;
    }
    const d = data.details || data;
    let anime = null;
    try { if (d.animeId) anime = await detailOf(d.animeId); } catch { /* poster opsional */ }
    // daftar episode di respons episode kadang nomornya terpotong ("Episode 71" untuk 171) dan tanpa nomor;
    // daftar dari detail anime lebih rapi, jadi itu yang dipakai kalau ada
    const eps = anime?.episodeList?.length ? anime.episodeList : realEps(d.info?.episodeList);
    const sideEps = (list) => epGaps([...list].reverse(), (e) => epNum(e.title), (e) =>
      `<a class="ep${e.episodeId === epId ? " cur" : seen[e.episodeId] ? " seen" : ""}" href="#/watch/${enc(e.episodeId)}"${e.episodeId === epId ? ' aria-current="page"' : ""}>${esc(epNum(e.title))}</a>`);
    const label = epNum(d.title);
    const animeTitle = cleanTitle(anime?.title || d.title.replace(/\s*episode.*$/i, ""));
    lib.watched({ animeId: d.animeId, title: animeTitle, poster: anime?.poster || getPoster(d.animeId) || "", episodeId: epId, epLabel: label });
    const seen = lib.seen();
    const hasDefault = !!d.defaultStreamingUrl;
    const rawQualities = d.server?.qualities || d.server?.qualityList || [];
    const qualities = rawQualities.filter((q) => q.serverList?.length && q.title.trim() && !q.title.toLowerCase().includes("bantuan"));
    const dlFromQualities = (d.downloadUrl?.qualities || []).map((q) => ({
      title: q.title,
      size: q.size,
      urlList: q.urls || q.urlList || []
    }));
    const dlFromDownload = (d.download?.qualityList || []).map((q) => ({
      title: q.title,
      size: q.size,
      urlList: q.urlList || q.urls || []
    }));
    const downloads = dlFromQualities.length ? dlFromQualities : dlFromDownload;
    const prevHref = d.prevEpisode ? `#/watch/${enc(d.prevEpisode.episodeId)}` : "";
    const nextHref = d.nextEpisode ? `#/watch/${enc(d.nextEpisode.episodeId)}` : "";

    app.innerHTML = `
      <div class="cinema-veil" id="veil"></div>
      <button class="btn btn-secondary btn-sm cinema-exit" id="cinemaExit">${icon.x} Keluar mode bioskop</button>
      <div class="page">
        <div class="watch">
          <div>
            <div class="player-wrap">
              <div class="player-glow"></div>
              <div class="player" id="player"><div class="player-msg">Pilih server di bawah untuk mulai menonton.</div></div>
            </div>
            <div class="watch-head">
              <div>
                <h1 class="watch-title">${esc(animeTitle)}</h1>
                <div class="watch-sub"><span class="eyebrow" style="display:inline-flex;margin:0"><span class="epnum">EP ${esc(label)}</span></span>${d.releaseTime ? ` · rilis ${esc(d.releaseTime)}` : ""}</div>
              </div>
              <button class="icon-btn" id="shareBtn" aria-label="Bagikan episode ini">${icon.share}</button>
            </div>
            <div class="watch-bar">
              <div class="grp">
                <a class="btn btn-secondary btn-sm" ${prevHref ? `href="${prevHref}"` : 'aria-disabled="true"'} title="Pintasan: P">${icon.prev} Sebelumnya</a>
                <a class="btn btn-primary btn-sm" ${nextHref ? `href="${nextHref}"` : 'aria-disabled="true"'} title="Pintasan: N">Episode berikutnya ${icon.next}</a>
              </div>
              <div class="grp">
                <button class="btn btn-quiet btn-sm" id="cinema" title="Pintasan: T">${icon.cinema} Mode bioskop</button>
              </div>
            </div>

            ${(hasDefault || qualities.length) ? `
              <section class="block" aria-labelledby="srvTitle">
                <div class="block-title"><span id="srvTitle">Pilih Server Video</span><small>Ganti server jika pemutar macet atau lambat</small></div>
                <div class="srv-container">
                  ${hasDefault ? `
                    <div class="srv-row srv-row-main">
                      <span class="srv-q">UTAMA</span>
                      <div class="srv-list">
                        <button class="srv" aria-pressed="false" data-role="default" data-url="${esc(d.defaultStreamingUrl)}" data-name="Server Utama">
                          <span>Server Utama (Bawaan)</span>
                          <span class="srv-badge-clean">Bebas Iklan</span>
                        </button>
                      </div>
                    </div>` : ""}
                  ${qualities.map((q) => {
                    const cleanQTitle = q.title.replace(/mirror/i, "").trim() || "Mirror";
                    return `
                      <div class="srv-row">
                        <span class="srv-q">${esc(cleanQTitle)}</span>
                        <div class="srv-list">${q.serverList.map((s) => {
                          const isClean = /odstream|ondesu|desu|otakuwatch|mega|odcdn/i.test(s.title);
                          const badge = isClean ? '<span class="srv-badge-clean">Bebas Iklan</span>' : '';
                          return `<button class="srv" aria-pressed="false" data-id="${esc(s.serverId)}" data-name="${esc(s.title)}"><span>${esc(s.title)}</span>${badge}</button>`;
                        }).join("")}</div>
                      </div>`;
                  }).join("")}
                </div>
              </section>` : ""}

            ${downloads.length ? `
              <details class="block">
                <summary>Download episode ${icon.down}</summary>
                <div class="dl">
                ${downloads.map((q) => `
                  <div class="dl-row">
                    <strong>${esc(q.title)}<small>${esc(q.size || "")}</small></strong>
                    <div>${(q.urlList || []).map((u) => `<a href="${esc(u.url)}" target="_blank" rel="noopener noreferrer">${esc(u.title)}</a>`).join("")}</div>
                  </div>`).join("")}
                </div>
              </details>` : ""}
          </div>

          <aside class="panel side">
            ${anime ? `
              <a class="side-anime" href="#/anime/${enc(d.animeId)}">
                <img src="${esc(anime.poster)}" alt="" referrerpolicy="no-referrer" />
                <div><b>${esc(cleanTitle(anime.title))}</b>
                <div class="card-sub">${esc([anime.type, anime.status, anime.score && "★ " + anime.score].filter(Boolean).join(" · "))}</div></div>
              </a>` : ""}
            <div class="block-title"><span>Episode</span><small id="epTotal">${eps.length} total</small></div>
            <div class="side-eps"><div class="ep-grid" id="sideEps">
              ${sideEps(eps)}
            </div></div>
          </aside>
        </div>
        ${anime?.recommendedAnimeList?.length ? row("Setelah ini, coba", anime.recommendedAnimeList.map((a) => card(a, { foot: [] })).join("")) : ""}
      </div>`;

    const player = $("#player");
    const frame = (url) => {
      const src = cleanEmbedUrl(url);
      return `<iframe src="${esc(src)}" title="Pemutar ${esc(animeTitle)} episode ${esc(label)}" allowfullscreen allow="autoplay; fullscreen; encrypted-media; picture-in-picture; web-share" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"></iframe>`;
    };
    const srvButtons = $$(".srv", app);
    const playServer = async (b) => {
      srvButtons.forEach((x) => x.setAttribute("aria-pressed", x === b));
      player.innerHTML = `<div class="player-msg"><div><div class="spinner"></div>Menghubungkan ke ${esc(b.dataset.name)}…</div></div>`;
      if (b.dataset.role === "default") {
        const url = b.dataset.url;
        if (!url) {
          b.classList.add("dead");
          return false;
        }
        player.innerHTML = frame(url);
        store.set("server", "default");
        if (!$(".ok", b)) b.insertAdjacentHTML("afterbegin", '<span class="ok" aria-hidden="true"></span>');
        return true;
      }
      try {
        const r = await api(`/server/${enc(b.dataset.id)}`);
        const url = r.data?.details?.url || r.data?.url;
        if (!url || url === "No iframe found" || !url.startsWith("http")) {
          throw new Error("Link server tidak valid");
        }
        player.innerHTML = frame(url);
        store.set("server", b.dataset.name);
        if (!$(".ok", b)) b.insertAdjacentHTML("afterbegin", '<span class="ok" aria-hidden="true"></span>');
        return true;
      } catch {
        b.classList.add("dead");
        b.title = "Server ini sedang tidak dapat dimuat";
        return false;
      }
    };

    let pref = store.get("server", "");
    if (pref && /vidhide/i.test(pref)) {
      pref = "";
      store.set("server", "");
    }
    const srvRank = (name) => {
      const n = String(name).trim().toLowerCase();
      if (pref && (n === pref.toLowerCase() || (pref === "default" && (n === "server utama" || n.includes("utama"))))) return -1;
      // 1. Direct stream archive/odcloud (paling stabil & no-ad)
      if (/odstream/i.test(n)) return 1;
      if (/odcdn/i.test(n)) return 2;
      if (/ondesu/i.test(n)) return 3;
      // 2. Mega (sangat stabil & ad-free)
      if (/mega/i.test(n)) return 4;
      if (/filedon|filelions|mp4load|pdrain|kraken/i.test(n)) return 5;
      if (n.includes("utama") || n.includes("bawaan")) return 6;
      if (/blogs|blogger/i.test(n)) return 7;
      if (/otakuwatch/i.test(n)) return 8;
      if (/vidhide/i.test(n)) return 15;
      return 20;
    };

    // Auto-fallback: coba server dari urutan terbaik hingga berhasil
    const tryPlayBestServer = async () => {
      const sorted = [...srvButtons].sort((a, b) => srvRank(a.dataset.name) - srvRank(b.dataset.name));
      for (const btn of sorted) {
        if (btn.classList.contains("dead")) continue;
        const ok = await playServer(btn);
        if (ok) return true;
      }
      if (hasDefault && d.defaultStreamingUrl) {
        player.innerHTML = frame(d.defaultStreamingUrl);
        return true;
      }
      player.innerHTML = `<div class="player-msg"><div>Semua server video di Otakudesu sedang tidak dapat dimuat.<br><br><a class="btn btn-primary btn-sm" href="#/op/search?q=${enc(animeTitle)}">Coba Tonton di Samehadaku</a></div></div>`;
      return false;
    };

    srvButtons.forEach((b) => (b.onclick = async () => {
      const ok = await playServer(b);
      if (!ok) {
        toast(`Server ${b.dataset.name} sedang tidak dapat diakses. Mencoba server lain...`);
        tryPlayBestServer();
      }
    }));

    tryPlayBestServer();

    const toggleCinema = (on) => document.body.classList.toggle("cinema", on);
    $("#cinema").onclick = () => toggleCinema(true);
    $("#cinemaExit").onclick = () => toggleCinema(false);
    $("#veil").onclick = () => toggleCinema(false);
    $("#shareBtn").onclick = () => share(`${animeTitle} episode ${label}`);
    watchKeys = { next: nextHref, prev: prevHref, cinema: () => toggleCinema(!document.body.classList.contains("cinema")) };
    const cur = $(".side-eps .cur");
    if (cur) cur.parentElement.parentElement.scrollTop = cur.offsetTop - 80;
    document.title = `EP ${label} ${animeTitle} · Gembulnime`;
    hydrate();
  }
  let watchKeys = null;

  function pageLibrary(tab = "favs") {
    const h = lib.history();
    const f = lib.favs();
    const r = lib.reminders();
    let body = "";
    if (tab === "favs") {
      body = f.length ? `<div class="grid">${f.map((a) => card(a, { foot: [] })).join("")}</div>`
        : emptyBox("Belum ada favorit", 'Tekan "Simpan" di halaman anime supaya judulnya muncul di sini dan ditandai di jadwal.', '<a class="btn btn-primary btn-sm" href="#/ongoing">Lihat anime ongoing</a>');
    } else if (tab === "reminders") {
      body = r.length ? `<div class="grid">${r.map((a) => card(a, { foot: [a.releaseDay].filter(Boolean), removable: true })).join("")}</div>`
        : emptyBox("Belum ada pengingat", "Tekan ikon lonceng pada anime di jadwal rilis untuk mengaktifkan pengingat.", '<a class="btn btn-primary btn-sm" href="#/schedule">Ke jadwal rilis</a>');
    } else {
      body = h.length ? `<div class="grid grid-continue">${h.map((a) => continueCard(a)).join("")}</div>`
        : emptyBox("Riwayat kosong", "Episode yang kamu tonton akan muncul di sini, lengkap dengan tombol lanjut.", '<a class="btn btn-primary btn-sm" href="#/">Ke beranda</a>');
    }
    app.innerHTML = `
      <div class="page">
        <div class="page-head"><div><h1 class="page-title">Koleksi <span class="hl">kamu</span></h1><p class="page-desc">${authUser ? `Tersinkron ke akun ${esc(authUser.email || "Supabase")}.` : 'Tersimpan di browser ini saja. <a href="#/login">Masuk</a> untuk menyinkronkan koleksi lintas perangkat.'}</p></div>
          ${tab === "history" && h.length ? '<button class="btn btn-quiet btn-sm" id="clearHist">Hapus semua riwayat</button>' : ""}</div>
        <div class="seg" role="tablist" aria-label="Koleksi">
          <button role="tab" aria-selected="${tab === "favs"}" data-t="favs">Favorit <span class="n">${f.length}</span></button>
          <button role="tab" aria-selected="${tab === "reminders"}" data-t="reminders">🔔 Pengingat <span class="n">${r.length}</span></button>
          <button role="tab" aria-selected="${tab === "history"}" data-t="history">Riwayat <span class="n">${h.length}</span></button>
        </div>
        ${body}
      </div>`;
    $$(".seg button", app).forEach((b) => (b.onclick = () => { history.replaceState(null, "", `#/library?tab=${b.dataset.t}`); pageLibrary(b.dataset.t); $(`[data-t="${b.dataset.t}"]`, app)?.focus(); }));
    $$("[data-remove]", app).forEach((b) => (b.onclick = () => {
      const id = b.dataset.remove;
      if (tab === "reminders") {
        const item = lib.removeReminder(id);
        pageLibrary("reminders");
        toast(`Pengingat ${cleanTitle(item?.title)} dihapus`);
      } else {
        const before = lib.history();
        const item = lib.removeHistory(id);
        pageLibrary("history");
        toast(`${cleanTitle(item?.title)} dihapus dari riwayat`, { label: "Urungkan", fn: () => { store.set("history", before); pageLibrary("history"); } });
      }
    }));
    $("#clearHist")?.addEventListener("click", () => {
      const before = { h: lib.history(), s: lib.seen() };
      store.set("history", []);
      store.set("seen", {});
      pageLibrary("history");
      toast("Riwayat dihapus", { label: "Urungkan", fn: () => { store.set("history", before.h); store.set("seen", before.s); pageLibrary("history"); } });
    });
    hydrate();
    if (tab === "history" && h.length) repairHistory();
  }

  // ---------- Samehadaku (sumber kedua): halaman seri & nonton ----------
  // Lewat Sanka API: /samehadaku/anime/:id, /samehadaku/episode/:id, /samehadaku/server/:serverId.
  // Rute & awalan id tetap "op" supaya link lama di riwayat/favorit tidak berubah bentuk.
  const shApi = (path) => api(path, { base: OP_API }).then((r) => {
    if (!r.data) throw new Error(r.message || "Data Samehadaku tidak ditemukan");
    return r.data;
  });
  const shEpLabel = (t) => {
    const n = epNum(t);
    return /^\d+(\.\d+)?$/.test(n) ? n : "SP";
  };

  async function pageOpAnime(slug) {
    const id = "op:" + slug;
    app.innerHTML = `<div class="detail-grid"><div class="detail-poster sk"></div><div><div class="sk" style="height:46px;width:70%"></div><div class="sk" style="height:16px;width:40%;margin-top:14px"></div><div class="sk" style="height:64px;margin-top:28px;max-width:760px"></div></div></div>`;
    const d = await shApi(`/anime/${enc(slug)}`);
    const title = cleanTitle(d.title);
    const poster = d.poster || getPoster(id);
    setPoster(id, poster);
    // episodeList dari API: terbaru dulu, judulnya berupa nomor episode
    const eps = (d.episodeList || []).map((e) => ({ id: e.episodeId, label: shEpLabel(String(e.title)) }));
    const seen = lib.seen();
    const hist = lib.history().find((h) => h.animeId === id);
    const latest = eps[0];
    const oldest = eps[eps.length - 1];
    const fav = lib.isFav(id);
    const score = d.score?.value || "";
    const synopsis = (d.synopsis?.paragraphs || []).filter(Boolean);

    const primary = hist
      ? `<a class="btn btn-primary" href="${watchHref(hist.episodeId)}">${icon.play} Lanjut episode ${esc(hist.epLabel)}</a>`
      : latest ? `<a class="btn btn-primary" href="#/op/watch/${enc(latest.id)}">${icon.play} Tonton episode ${esc(latest.label)}</a>` : "";
    const facts = [
      ["Episode tersedia", eps.length],
      ["Status", d.status],
      ["Tipe", d.type],
      ["Musim", d.season],
      ["Studio", d.studios],
      ["Skor", score && "★ " + score],
    ].filter(([, v]) => v);

    app.innerHTML = `
      <section class="detail-hero" id="detailHero">
        <div class="detail-bg" style="background-image:url('${esc(poster)}')"></div>
        <div class="detail-video" aria-hidden="true"><div id="dtHost"></div></div>
        <div class="detail-grid">
          <div class="detail-poster">${poster ? `<img src="${esc(poster)}" alt="Poster ${esc(title)}" referrerpolicy="no-referrer" />` : ""}</div>
          <div>
            <div class="eyebrow"><span class="chip">Sumber: Samehadaku</span></div>
            <h1 class="detail-title">${esc(title)}</h1>
            <dl class="facts">${facts.map(([k, v]) => `<div class="fact"><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
            ${synopsis.length ? `<p class="page-desc" style="max-width:760px;margin-top:18px">${esc(synopsis.join(" "))}</p>` : ""}
            <div class="actions" style="margin-top:24px">
              ${primary}
              ${eps.length > 1 ? `<a class="btn btn-secondary" href="#/op/watch/${enc(oldest.id)}">Dari episode awal</a>` : ""}
              <button class="btn btn-secondary" id="trailerBtn" hidden>${icon.film} Tonton trailer</button>
              <button class="btn btn-secondary" id="favBtn" aria-pressed="${fav}">${icon.bookmark}<span>${fav ? "Tersimpan" : "Simpan"}</span></button>
              <button class="icon-btn" id="shareBtn" aria-label="Bagikan">${icon.share}</button>
            </div>
          </div>
        </div>
      </section>
      <div class="body">
        <section class="section">
          <div class="sec-head">
            <h2 class="sec-title">Daftar episode<span class="count">${eps.length}</span></h2>
            ${eps.length > 12 ? `<div class="ep-tools"><input class="field" id="epFilter" type="search" inputmode="numeric" placeholder="No. episode" aria-label="Cari nomor episode" /><button class="btn btn-quiet btn-sm" id="epSort">Terbaru dulu</button></div>` : ""}
          </div>
          ${eps.length ? `<div class="ep-grid" id="epGrid"></div>
            <div class="legend"><span><i></i>Sudah ditonton</span>${hist ? '<span><i class="a"></i>Terakhir ditonton</span>' : ""}</div>`
            : emptyBox("Belum ada episode", "Seri ini belum punya episode di Samehadaku.")}
        </section>
      </div>`;

    let newestFirst = true;
    const drawEps = (f = "") => {
      const g = $("#epGrid");
      if (!g) return;
      const list = (newestFirst ? eps : [...eps].reverse()).filter((e) => !f || e.label.includes(f));
      g.innerHTML = list.length
        ? list.map((e) => {
          const eid = "op:" + e.id;
          const cls = hist?.episodeId === eid ? " seen last" : seen[eid] ? " seen" : "";
          return `<a class="ep${cls}" href="#/op/watch/${enc(e.id)}">${esc(e.label)}</a>`;
        }).join("")
        : `<p class="page-desc" style="grid-column:1/-1">Episode ${esc(f)} tidak ada.</p>`;
    };
    drawEps();
    $("#epFilter")?.addEventListener("input", (e) => drawEps(e.target.value.trim()));
    $("#epSort")?.addEventListener("click", (e) => {
      newestFirst = !newestFirst;
      e.currentTarget.textContent = newestFirst ? "Terbaru dulu" : "Terlama dulu";
      drawEps($("#epFilter")?.value.trim() || "");
    });
    const favBtn = $("#favBtn");
    const favMeta = () => ({ animeId: id, title, poster, episodes: String(eps.length) });
    const setFavUI = (on) => { favBtn.setAttribute("aria-pressed", on); $("span", favBtn).textContent = on ? "Tersimpan" : "Simpan"; };
    favBtn.onclick = () => {
      const on = !lib.isFav(id);
      lib.setFav(favMeta(), on);
      setFavUI(on);
      toast(on ? "Disimpan ke Koleksi" : "Dihapus dari Koleksi", on ? null : { label: "Urungkan", fn: () => { lib.setFav(favMeta(), true); setFavUI(true); } });
    };
    $("#shareBtn").onclick = () => share(title);
    document.title = `${title} · Gembulnime`;
    hydrate();
    enrichDetail({ title, japanese: d.japanese });
  }

  async function pageOpWatch(slug) {
    app.innerHTML = `<div class="page"><div class="watch"><div><div class="player"><div class="player-msg"><div><div class="spinner"></div>Memuat episode…</div></div></div><div class="sk" style="height:28px;width:60%;margin-top:20px"></div></div><div class="sk" style="height:320px;border-radius:16px"></div></div></div>`;
    const d = await shApi(`/episode/${enc(slug)}`);
    const seriesSlug = d.animeId || "";
    const animeId = "op:" + seriesSlug;
    // detail seri: poster asli (poster episode berupa cuplikan 16:9) + daftar episode di samping
    let anime = null;
    try { if (seriesSlug) anime = await shApi(`/anime/${enc(seriesSlug)}`); } catch { /* opsional */ }
    const series = cleanTitle(anime?.title || opSeriesName(d.title));
    const poster = anime?.poster || getPoster(animeId) || d.poster || "";
    if (anime?.poster) setPoster(animeId, anime.poster);
    const label = shEpLabel(d.title);
    const epId = "op:" + slug;
    // src "sh": entri Samehadaku, bukan entri Oploverz lama yang perlu dipindah (lihat repairHistory)
    lib.watched({ animeId, title: series, poster, episodeId: epId, epLabel: label, src: "sh" });
    const seen = lib.seen();
    // episode lama (di luar 100 terbaru) tidak punya prev/next dari API: tebak dari slug "<seri>-episode-<n>",
    // dibatasi nomor episode terbaru yang diketahui
    const slugNum = slug.match(/^(.+)-episode-(\d+)$/);
    const newest = Math.max(0, ...(anime?.episodeList || []).map((e) => Number(e.title)).filter(Number.isInteger));
    const guess = (n) => (slugNum && n >= 1 && (!newest || n <= newest) ? `${slugNum[1]}-episode-${n}` : "");
    const prevId = d.prevEpisode?.episodeId || guess(Number(slugNum?.[2]) - 1);
    const nextId = d.nextEpisode?.episodeId || guess(Number(slugNum?.[2]) + 1);
    const prevHref = prevId ? `#/op/watch/${enc(prevId)}` : "";
    const nextHref = nextId ? `#/op/watch/${enc(nextId)}` : "";
    const downloads = (d.downloadUrl?.formats || []).flatMap((fmt) => (fmt.qualities || []).map((q) => ({ title: `${q.title} ${fmt.title}`.trim(), urlList: q.urls || [] })));
    // episode lama: defaultStreamingUrl berisi teks "No iframe found", bukan URL
    const hasDefault = /^https?:\/\//.test(d.defaultStreamingUrl || "");
    const qualities = (d.server?.qualities || []).filter((q) => q.serverList?.length);

    const frame = (url) => `<iframe src="${esc(cleanEmbedUrl(url))}" title="Pemutar ${esc(series)} episode ${esc(label)}" allowfullscreen allow="autoplay; fullscreen; encrypted-media; picture-in-picture" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"></iframe>`;

    app.innerHTML = `
      <div class="cinema-veil" id="veil"></div>
      <button class="btn btn-secondary btn-sm cinema-exit" id="cinemaExit">${icon.x} Keluar mode bioskop</button>
      <div class="page">
        <div class="watch">
          <div>
            <div class="player-wrap">
              <div class="player-glow"></div>
              <div class="player" id="player">
                ${hasDefault ? frame(d.defaultStreamingUrl) : `<div class="player-msg">Video episode ini belum tersedia. Coba server lain atau link download di bawah.</div>`}
              </div>
            </div>
            <div class="watch-head">
              <div>
                <h1 class="watch-title">${esc(series)}</h1>
                <div class="watch-sub"><span class="eyebrow" style="display:inline-flex;margin:0"><span class="epnum">EP ${esc(label)}</span></span>${d.releasedOn ? ` · rilis ${esc(d.releasedOn)}` : ""} · Samehadaku</div>
              </div>
              <button class="icon-btn" id="shareBtn" aria-label="Bagikan episode ini">${icon.share}</button>
            </div>
            <div class="watch-bar">
              <div class="grp">
                <a class="btn btn-secondary btn-sm" ${prevHref ? `href="${prevHref}"` : 'aria-disabled="true"'} title="Pintasan: P">${icon.prev} Sebelumnya</a>
                <a class="btn btn-primary btn-sm" ${nextHref ? `href="${nextHref}"` : 'aria-disabled="true"'} title="Pintasan: N">Episode berikutnya ${icon.next}</a>
              </div>
              <div class="grp">
                <button class="btn btn-quiet btn-sm" id="cinema" title="Pintasan: T">${icon.cinema} Mode bioskop</button>
              </div>
            </div>

            ${(hasDefault || qualities.length) ? `
              <section class="block" aria-labelledby="srvTitle">
                <div class="block-title"><span id="srvTitle">Pilih Server Video</span><small>Ganti server jika pemutar macet atau lambat</small></div>
                <div class="srv-container">
                  ${hasDefault ? `
                    <div class="srv-row srv-row-main">
                      <span class="srv-q">UTAMA</span>
                      <div class="srv-list">
                        <button class="srv" aria-pressed="true" data-url="${esc(d.defaultStreamingUrl)}" data-name="Server Utama"><span>Server Utama (Streaming)</span></button>
                      </div>
                    </div>` : ""}
                  ${qualities.map((q) => `
                    <div class="srv-row">
                      <span class="srv-q">${esc(/unknown/i.test(q.title) ? "MIRROR" : q.title)}</span>
                      <div class="srv-list">
                        ${q.serverList.map((s) => `<button class="srv" aria-pressed="false" data-server="${esc(s.serverId)}" data-name="${esc(s.title)}"><span>${esc(s.title)}</span></button>`).join("")}
                      </div>
                    </div>`).join("")}
                </div>
              </section>` : ""}

            ${downloads.length ? `
              <details class="block">
                <summary>Download episode ${icon.down}</summary>
                <div class="dl">
                ${downloads.map((q) => `
                  <div class="dl-row">
                    <strong>${esc(q.title)}</strong>
                    <div>${q.urlList.map((u) => `<a href="${esc(u.url)}" target="_blank" rel="noopener noreferrer">${esc(u.title)}</a>`).join("")}</div>
                  </div>`).join("")}
                </div>
              </details>` : ""}
          </div>
          <aside class="panel side">
            ${seriesSlug ? `
              <a class="side-anime" href="#/op/anime/${enc(seriesSlug)}">
                ${poster ? `<img src="${esc(poster)}" alt="" referrerpolicy="no-referrer" />` : ""}
                <div><b>${esc(series)}</b><div class="card-sub">Samehadaku · semua episode</div></div>
              </a>` : ""}
            <div class="block-title"><span>Episode</span><small id="opEpCount"></small></div>
            <div class="side-eps"><div class="ep-grid" id="opEps"></div></div>
          </aside>
        </div>
      </div>`;

    // server mirror: url-nya baru diambil saat tombol ditekan (/samehadaku/server/:serverId)
    const player = $("#player");
    const srvButtons = $$(".srv", app);
    srvButtons.forEach((b) => {
      b.onclick = async () => {
        srvButtons.forEach((x) => x.setAttribute("aria-pressed", x === b));
        let url = b.dataset.url;
        if (!url && b.dataset.server) {
          player.innerHTML = `<div class="player-msg"><div><div class="spinner"></div>Memuat server ${esc(b.dataset.name)}…</div></div>`;
          try { url = b.dataset.url = (await shApi(`/server/${enc(b.dataset.server)}`)).url?.replace(/&#038;/g, "&") || ""; } catch { url = ""; }
        }
        if (!url || !url.startsWith("http")) {
          b.classList.add("dead");
          b.title = "Server ini tidak dapat dimuat";
          player.innerHTML = `<div class="player-msg"><div>Server <b>${esc(b.dataset.name)}</b> tidak tersedia. Silakan pilih server lain.</div></div>`;
          return false;
        }
        player.innerHTML = frame(url);
        if (!$(".ok", b)) b.insertAdjacentHTML("afterbegin", '<span class="ok" aria-hidden="true"></span>');
        return true;
      };
    });
    // tanpa server utama: coba mirror satu per satu sampai ada yang memberi url
    if (!hasDefault) (async () => {
      for (const b of srvButtons) if (!player.isConnected || await b.onclick()) return;
    })();

    const toggleCinema = (on) => document.body.classList.toggle("cinema", on);
    $("#cinema").onclick = () => toggleCinema(true);
    $("#cinemaExit").onclick = () => toggleCinema(false);
    $("#veil").onclick = () => toggleCinema(false);
    $("#shareBtn").onclick = () => share(`${series} episode ${label}`);
    watchKeys = { next: nextHref, prev: prevHref, cinema: () => toggleCinema(!document.body.classList.contains("cinema")) };
    document.title = `EP ${label} ${series} · Gembulnime`;

    const grid = $("#opEps");
    const eps = anime?.episodeList || [];
    if (!eps.length) {
      grid.replaceChildren(Object.assign(document.createElement("p"), { className: "page-desc", textContent: "Daftar episode tidak bisa dimuat. Pakai tombol sebelumnya/berikutnya." }));
      return;
    }
    $("#opEpCount").textContent = `${eps.length} total`;
    grid.innerHTML = [...eps].reverse().map((e) => {
      const eid = "op:" + e.episodeId;
      return `<a class="ep${eid === epId ? " cur" : seen[eid] ? " seen" : ""}" href="#/op/watch/${enc(e.episodeId)}"${eid === epId ? ' aria-current="page"' : ""}>${esc(shEpLabel(String(e.title)))}</a>`;
    }).join("");
    const cur = $(".cur", grid);
    if (cur) grid.parentElement.scrollTop = cur.offsetTop - 80;
  }

  // ---------- Stream / anime-indo (sumber ketiga): halaman nonton ----------
  // /stream/episode/:slug → title, poster, stream_links[{server,url}], download_links, prev_slug, next_slug
  // /stream/anime/:slug   → title, poster, episodes[{eps_title, eps_slug}] (terlama dulu)
  async function pageStWatch(slug) {
    app.innerHTML = `<div class="page"><div class="watch"><div><div class="player"><div class="player-msg"><div><div class="spinner"></div>Memuat episode…</div></div></div><div class="sk" style="height:28px;width:60%;margin-top:20px"></div></div><div class="sk" style="height:320px;border-radius:16px"></div></div></div>`;
    const r = await api(`/episode/${enc(slug)}`, { base: ST_API });
    const d = r.data;
    if (!d?.title) throw new Error(r.message || "Episode tidak ditemukan");
    const seriesSlug = slug.replace(/-episode-[\d.-]+$/, "");
    let anime = null;
    try { anime = (await api(`/anime/${enc(seriesSlug)}`, { base: ST_API, quiet: true })).data; } catch { /* daftar episode opsional */ }
    const series = cleanTitle(anime?.title || opSeriesName(d.title.replace(/\s*sub indo\s*$/i, "")));
    // episode gabungan "...-episode-227-228" (atau salah ketik "227-288") ditampilkan "227–228"
    const dbl = slug.match(/-episode-(\d+)-(\d+)$/);
    const label = dbl && Number(dbl[2]) > Number(dbl[1])
      ? `${Number(dbl[1])}–${Number(dbl[2]) - Number(dbl[1]) <= 3 ? Number(dbl[2]) : Number(dbl[1]) + 1}`
      : String(Number(epNum(d.title)) || epNum(d.title));
    const poster = anime?.poster || d.poster || "";
    const epId = "st:" + slug;
    lib.watched({ animeId: "st:" + seriesSlug, title: series, poster, episodeId: epId, epLabel: label, src: "st" });
    setPoster("st:" + seriesSlug, poster);
    const seen = lib.seen();
    const prevHref = d.prev_slug ? `#/st/watch/${enc(d.prev_slug)}` : "";
    const nextHref = d.next_slug ? `#/st/watch/${enc(d.next_slug)}` : "";
    const servers = (d.stream_links || []).filter((s) => /^https?:\/\//.test(s.url || ""));
    const downloads = (d.download_links || []).filter((s) => s.url);
    const frame = (url) => `<iframe src="${esc(url)}" title="Pemutar ${esc(series)} episode ${esc(label)}" allowfullscreen allow="autoplay; fullscreen; encrypted-media; picture-in-picture" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"></iframe>`;

    app.innerHTML = `
      <div class="cinema-veil" id="veil"></div>
      <button class="btn btn-secondary btn-sm cinema-exit" id="cinemaExit">${icon.x} Keluar mode bioskop</button>
      <div class="page">
        <div class="watch">
          <div>
            <div class="player" id="player">
              ${servers.length ? frame(servers[0].url) : `<div class="player-msg">Video episode ini belum tersedia. Coba link download di bawah.</div>`}
            </div>
            <div class="watch-head">
              <div>
                <h1 class="watch-title">${esc(series)}</h1>
                <div class="watch-sub"><span class="eyebrow" style="display:inline-flex;margin:0"><span class="epnum">EP ${esc(label)}</span></span> · Stream (anime-indo)</div>
              </div>
              <button class="icon-btn" id="shareBtn" aria-label="Bagikan episode ini">${icon.share}</button>
            </div>
            <div class="watch-bar">
              <div class="grp">
                <a class="btn btn-secondary btn-sm" ${prevHref ? `href="${prevHref}"` : 'aria-disabled="true"'} title="Pintasan: P">${icon.prev} Sebelumnya</a>
                <a class="btn btn-primary btn-sm" ${nextHref ? `href="${nextHref}"` : 'aria-disabled="true"'} title="Pintasan: N">Episode berikutnya ${icon.next}</a>
              </div>
              <div class="grp">
                <button class="btn btn-quiet btn-sm" id="cinema" title="Pintasan: T">${icon.cinema} Mode bioskop</button>
              </div>
            </div>

            ${servers.length ? `
              <section class="block" aria-labelledby="srvTitle">
                <div class="block-title"><span id="srvTitle">Pilih Server Video</span><small>Ganti server jika video tidak muncul atau "file deleted"</small></div>
                <div class="srv-container">
                  <div class="srv-row">
                    <span class="srv-q">SERVER</span>
                    <div class="srv-list">
                      ${servers.map((s, i) => `<button class="srv" aria-pressed="${i === 0}" data-url="${esc(s.url)}"><span>${esc(s.server)}</span></button>`).join("")}
                    </div>
                  </div>
                </div>
              </section>` : ""}

            ${downloads.length ? `
              <details class="block">
                <summary>Download episode ${icon.down}</summary>
                <div class="dl"><div class="dl-row"><strong>Download</strong><div>${downloads.map((u) => `<a href="${esc(u.url)}" target="_blank" rel="noopener noreferrer">${esc(u.server)}</a>`).join("")}</div></div></div>
              </details>` : ""}
          </div>
          <aside class="panel side">
            <div class="side-anime">
              ${poster ? `<img src="${esc(poster)}" alt="" referrerpolicy="no-referrer" />` : ""}
              <div><b>${esc(series)}</b><div class="card-sub">Stream (anime-indo)</div></div>
            </div>
            <div class="block-title"><span>Episode</span><small>${anime?.episodes?.length ? `${anime.episodes.length} total` : ""}</small></div>
            <div class="side-eps"><div class="ep-grid" id="stEps"></div></div>
          </aside>
        </div>
      </div>`;

    const player = $("#player");
    const srvButtons = $$(".srv", app);
    srvButtons.forEach((b) => (b.onclick = () => {
      srvButtons.forEach((x) => x.setAttribute("aria-pressed", x === b));
      player.innerHTML = frame(b.dataset.url);
    }));
    const toggleCinema = (on) => document.body.classList.toggle("cinema", on);
    $("#cinema").onclick = () => toggleCinema(true);
    $("#cinemaExit").onclick = () => toggleCinema(false);
    $("#veil").onclick = () => toggleCinema(false);
    $("#shareBtn").onclick = () => share(`${series} episode ${label}`);
    watchKeys = { next: nextHref, prev: prevHref, cinema: () => toggleCinema(!document.body.classList.contains("cinema")) };
    document.title = `EP ${label} ${series} · Gembulnime`;

    const grid = $("#stEps");
    const eps = anime?.episodes || [];
    if (!eps.length) {
      grid.replaceChildren(Object.assign(document.createElement("p"), { className: "page-desc", textContent: "Daftar episode tidak bisa dimuat. Pakai tombol sebelumnya/berikutnya." }));
      return;
    }
    grid.innerHTML = eps.map((e) => {
      const eid = "st:" + e.eps_slug;
      const n = String(Number(epNum(e.eps_title)) || epNum(e.eps_title));
      return `<a class="ep${eid === epId ? " cur" : seen[eid] ? " seen" : ""}" href="#/st/watch/${enc(e.eps_slug)}"${eid === epId ? ' aria-current="page"' : ""}>${esc(n)}</a>`;
    }).join("");
    const cur = $(".cur", grid);
    if (cur) grid.parentElement.scrollTop = cur.offsetTop - 80;
  }

  // ---------- Komik (Sanka Comic API, sumber Komiku) ----------
  // /comic/trending, /terbaru, /populer, /search?q=, /genres, /genre/:g, /comic/:slug, /chapter/:slug
  const COMIC = API.replace(/\/anime$/, "") + "/comic";
  const comicApi = (path, quiet) => api(path, { base: COMIC, quiet });
  const comicMode = () => location.hash.startsWith("#/comic");
  // link Komiku bisa sudah ter-encode ("tokyo%e5%8d%8drevengers"): decode dulu supaya tidak dobel saat dipakai di URL
  const comicSlug = (link) => {
    const s = String(link || "").match(/manga\/([^/?#]+)/)?.[1] || "";
    try { return decodeURIComponent(s); } catch { return s; }
  };
  const chNum = (s) => String(s ?? "").match(/(\d+(?:\.\d+)?)/)?.[1] || "";
  const comicLib = {
    history: () => store.get("comic_history", []),
    seen: () => store.get("comic_seen", {}),
    read(entry) {
      const h = comicLib.history().filter((x) => x.slug !== entry.slug);
      store.set("comic_history", [{ ...entry, ts: Date.now() }, ...h].slice(0, 40));
      const s = comicLib.seen();
      s[entry.chapter] = 1;
      store.set("comic_seen", s);
    },
  };

  // daftar terbaru/populer/genre/trending memakai bentuk yang sama: title, link, image, chapter
  const comicCard = (c, sub) => {
    const slug = c.slug || comicSlug(c.link);
    if (!slug) return "";
    const n = chNum(c.chapter);
    return card({ title: c.title, poster: c.image || c.thumbnail }, { href: `#/comic/d/${enc(slug)}`, badge: n ? `CH ${n}` : "", foot: [c.time_ago].filter(Boolean), sub });
  };
  const comicPager = (cur, hasMore, base) => {
    if (cur < 2 && !hasMore) return "";
    const sep = base.includes("?") ? "&" : "?";
    return `<nav class="pager" aria-label="Halaman">
      <a class="${cur > 1 ? "" : "off"}" href="${base}${sep}page=${cur - 1}" aria-label="Halaman sebelumnya">‹</a>
      <span class="cur" aria-current="page">${cur}</span>
      <a class="${hasMore ? "" : "off"}" href="${base}${sep}page=${cur + 1}" aria-label="Halaman berikutnya">›</a></nav>`;
  };
  const comicTabs = (on) => `
    <div class="seg" role="tablist" aria-label="Jelajah komik">
      ${[["", "Beranda"], ["terbaru", "Terbaru"], ["populer", "Populer"]].map(([k, t]) =>
        `<a role="tab" href="#/comic${k ? "/" + k : ""}" aria-selected="${on === (k || "home")}">${t}</a>`).join("")}
    </div>`;

  async function pageComicHome() {
    app.innerHTML = `
      <div class="page">
        <div class="page-head"><div><h1 class="page-title">Baca <span class="hl">komik</span></h1><p class="page-desc">Manga, manhwa, dan manhua bahasa Indonesia dari Komiku.</p></div></div>
        ${comicTabs("home")}
        <div id="comicRows">${row("Trending hari ini", skCards(8))}${row("Update terbaru", skCards(8))}</div>
      </div>`;
    const [trending, latest, popular, genres] = await Promise.allSettled([
      comicApi("/trending"), comicApi("/terbaru"), comicApi("/populer", true), comicApi("/genres", true),
    ]);
    const val = (r, k) => (r.status === "fulfilled" ? r.value?.[k] || [] : []);
    const hist = comicLib.history();
    const rows = [
      hist.length && row("Lanjut baca", hist.slice(0, 12).map((h) => card({ title: h.title, poster: h.image },
        { href: `#/comic/read/${enc(h.chapter)}`, badge: h.chLabel ? `CH ${h.chLabel}` : "", foot: [], sub: "Terakhir chapter " + h.chLabel })).join("")),
      val(trending, "trending").length && row("Trending hari ini", val(trending, "trending").map((c) => comicCard(c)).join("")),
      val(latest, "comics").length && row("Update terbaru", val(latest, "comics").map((c) => comicCard(c)).join(""), { link: "#/comic/terbaru" }),
      val(popular, "comics").length && row("Populer", val(popular, "comics").map((c) => comicCard(c)).join(""), { link: "#/comic/populer" }),
    ].filter(Boolean);
    const gl = val(genres, "data");
    $("#comicRows").innerHTML = (rows.length ? rows.join("") : emptyBox("Komik gagal dimuat", "API komik sedang tidak merespons. Coba lagi sebentar lagi."))
      + (gl.length ? `<section class="section"><div class="sec-head"><h2 class="sec-title">Cari lewat genre</h2></div>
          <div class="genre-wrap">${gl.map((g) => `<a class="genre-pill" href="#/comic/genre/${enc(g.value)}">${esc(g.name)}</a>`).join("")}</div></section>` : "");
    document.title = "Komik · Gembulnime";
    hydrate();
  }

  async function pageComicList(kind, page, genre) {
    const title = kind === "genre" ? `Genre <span class="hl">${esc(genre)}</span>` : kind === "populer" ? `Komik <span class="hl">populer</span>` : `Update <span class="hl">terbaru</span>`;
    app.innerHTML = `<div class="page"><div class="page-head"><div><h1 class="page-title">${title}</h1></div></div>${comicTabs(kind)}<div class="grid">${skCards(12)}</div></div>`;
    const path = kind === "genre" ? `/genre/${enc(genre)}` : `/${kind}`;
    const r = await comicApi(`${path}?page=${page}`);
    const list = r.comics || [];
    $(".grid", app).outerHTML = list.length
      ? `<div class="grid">${list.map((c) => comicCard(c)).join("")}</div>${comicPager(page, r.pagination?.has_more, kind === "genre" ? `#/comic/genre/${enc(genre)}` : `#/comic/${kind}`)}`
      : emptyBox("Belum ada komik", "Halaman ini kosong. Coba halaman sebelumnya.", '<a class="btn btn-secondary btn-sm" href="#/comic">Ke beranda komik</a>');
    document.title = `${kind === "genre" ? genre : kind} · Komik · Gembulnime`;
    hydrate();
  }

  async function pageComicSearch(q) {
    input.value = q;
    app.innerHTML = `<div class="page"><div class="page-head"><div><h1 class="page-title">Komik <span class="hl">${esc(q)}</span></h1><p class="page-desc" aria-live="polite">Mencari…</p></div></div><div class="grid">${skCards(12)}</div></div>`;
    if (!q.trim()) {
      $(".page", app).innerHTML = emptyBox("Mau baca apa?", "Ketik judul komik di kolom pencarian di atas.");
      return;
    }
    const r = await comicApi(`/search?q=${enc(q)}`);
    const list = r.data || [];
    $(".page-desc", app).textContent = `${list.length} judul di Komiku`;
    $(".grid", app).outerHTML = list.length
      ? `<div class="grid">${list.map((c) => comicCard(c, [c.type, c.genre].filter(Boolean).join(" · "))).join("")}</div>`
      : emptyBox(`Tidak ada komik "${esc(q)}"`, "Coba kata kunci yang lebih pendek atau judul aslinya.");
    hydrate();
  }

  async function pageComicDetail(slug) {
    app.innerHTML = `<div class="detail-grid"><div class="detail-poster sk"></div><div><div class="sk" style="height:46px;width:70%"></div><div class="sk" style="height:16px;width:40%;margin-top:14px"></div><div class="sk" style="height:64px;margin-top:28px;max-width:760px"></div></div></div>`;
    const d = await comicApi(`/comic/${enc(slug)}`);
    if (!d.title) throw new Error("Komik tidak ditemukan");
    const chs = (d.chapters || []).map((c) => ({ slug: c.slug, label: chNum(c.chapter) || c.chapter, date: c.date })); // terbaru dulu
    const seen = comicLib.seen();
    const hist = comicLib.history().find((h) => h.slug === slug);
    const first = chs[chs.length - 1], latest = chs[0];
    const m = d.metadata || {};
    const facts = [["Tipe", m.type], ["Status", m.status], ["Pengarang", m.author], ["Chapter", chs.length], ["Arah baca", m.reading_direction]].filter(([, v]) => v);
    const syn = d.synopsis_full || d.synopsis || "";

    app.innerHTML = `
      <section class="detail-hero">
        <div class="detail-bg" style="background-image:url('${esc(d.image)}')"></div>
        <div class="detail-grid">
          <div class="detail-poster">${d.image ? `<img src="${esc(d.image)}" alt="Sampul ${esc(d.title)}" referrerpolicy="no-referrer" />` : ""}</div>
          <div>
            <div class="eyebrow"><span class="chip">Komik · Komiku</span></div>
            <h1 class="detail-title">${esc(d.title)}</h1>
            ${d.title_indonesian && d.title_indonesian !== d.title ? `<p class="page-desc">${esc(d.title_indonesian)}</p>` : ""}
            <dl class="facts">${facts.map(([k, v]) => `<div class="fact"><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
            ${(d.genres || []).length ? `<div class="genre-wrap" style="margin-top:16px">${d.genres.map((g) => `<a class="genre-pill" href="#/comic/genre/${enc(g.slug)}">${esc(g.name)}</a>`).join("")}</div>` : ""}
            ${syn ? `<div class="syn clamp" id="syn" style="margin-top:18px"><p>${esc(syn)}</p></div><button class="btn btn-quiet btn-sm" id="synMore" aria-expanded="false" style="margin-top:6px">Baca sinopsis lengkap</button>` : ""}
            <div class="actions" style="margin-top:24px">
              ${hist ? `<a class="btn btn-primary" href="#/comic/read/${enc(hist.chapter)}">${icon.play} Lanjut chapter ${esc(hist.chLabel)}</a>`
                : first ? `<a class="btn btn-primary" href="#/comic/read/${enc(first.slug)}">${icon.play} Mulai chapter ${esc(first.label)}</a>` : ""}
              ${latest && latest !== first ? `<a class="btn btn-secondary" href="#/comic/read/${enc(latest.slug)}">Chapter terbaru (${esc(latest.label)})</a>` : ""}
              <button class="icon-btn" id="shareBtn" aria-label="Bagikan">${icon.share}</button>
            </div>
          </div>
        </div>
      </section>
      <div class="body">
        <section class="section">
          <div class="sec-head">
            <h2 class="sec-title">Daftar chapter<span class="count">${chs.length}</span></h2>
            ${chs.length > 12 ? `<div class="ep-tools"><input class="field" id="epFilter" type="search" inputmode="numeric" placeholder="No. chapter" aria-label="Cari nomor chapter" /><button class="btn btn-quiet btn-sm" id="epSort">Terbaru dulu</button></div>` : ""}
          </div>
          ${chs.length ? `<div class="ep-grid" id="epGrid"></div><div class="legend"><span><i></i>Sudah dibaca</span>${hist ? '<span><i class="a"></i>Terakhir dibaca</span>' : ""}</div>`
            : emptyBox("Belum ada chapter", "Komik ini belum punya chapter.")}
        </section>
      </div>`;

    let newestFirst = true;
    const drawChs = (f = "") => {
      const g = $("#epGrid");
      if (!g) return;
      const list = (newestFirst ? chs : [...chs].reverse()).filter((c) => !f || String(c.label).includes(f));
      g.innerHTML = list.length
        ? list.map((c) => `<a class="ep${hist?.chapter === c.slug ? " seen last" : seen[c.slug] ? " seen" : ""}" href="#/comic/read/${enc(c.slug)}" title="${esc(c.date || "")}">${esc(c.label)}</a>`).join("")
        : `<p class="page-desc" style="grid-column:1/-1">Chapter ${esc(f)} tidak ada.</p>`;
    };
    drawChs();
    $("#epFilter")?.addEventListener("input", (e) => drawChs(e.target.value.trim()));
    $("#epSort")?.addEventListener("click", (e) => {
      newestFirst = !newestFirst;
      e.currentTarget.textContent = newestFirst ? "Terbaru dulu" : "Terlama dulu";
      drawChs($("#epFilter")?.value.trim() || "");
    });
    $("#synMore")?.addEventListener("click", (e) => {
      const clamped = $("#syn").classList.toggle("clamp");
      e.target.textContent = clamped ? "Baca sinopsis lengkap" : "Ringkas sinopsis";
      e.target.setAttribute("aria-expanded", !clamped);
    });
    $("#shareBtn").onclick = () => share(d.title);
    document.title = `${d.title} · Komik · Gembulnime`;
  }

  async function pageComicRead(chSlug) {
    app.innerHTML = `<div class="page reader-page"><div class="sk" style="height:28px;width:50%;margin:0 auto 20px"></div><div class="sk" style="height:70vh;max-width:820px;margin:0 auto;border-radius:12px"></div></div>`;
    const d = await comicApi(`/chapter/${enc(chSlug)}`);
    const nav = d.navigation || {};
    const mangaSlug = nav.chapterList || "";
    // gambar pertama Komiku biasanya banner promosi, bukan halaman komik
    const pages = (d.images || []).map((src, i) => ({ src, alt: d.imagesproxy?.[i] || "" })).filter((p) => !/komiku-promosi/i.test(p.src));
    const label = chNum(d.chapter_title) || d.chapter_title || "";
    const title = d.manga_title || "";
    let detail = null;
    try { if (mangaSlug) detail = await comicApi(`/comic/${enc(mangaSlug)}`, true); } catch { /* sampul opsional */ }
    if (mangaSlug) comicLib.read({ slug: mangaSlug, title: detail?.title || title, image: detail?.image || "", chapter: chSlug, chLabel: label });
    const prevHref = nav.previousChapter ? `#/comic/read/${enc(nav.previousChapter)}` : "";
    const nextHref = nav.nextChapter ? `#/comic/read/${enc(nav.nextChapter)}` : "";
    const bar = (where) => `
      <div class="reader-bar">
        <a class="btn btn-secondary btn-sm" ${prevHref ? `href="${prevHref}"` : 'aria-disabled="true"'} title="Pintasan: P">${icon.prev} Sebelumnya</a>
        ${mangaSlug ? `<a class="btn btn-quiet btn-sm" href="#/comic/d/${enc(mangaSlug)}">Daftar chapter</a>` : ""}
        <a class="btn btn-primary btn-sm" ${nextHref ? `href="${nextHref}"` : 'aria-disabled="true"'} title="Pintasan: N"${where === "top" ? "" : ' id="readerNext"'}>Berikutnya ${icon.next}</a>
      </div>`;

    app.innerHTML = `
      <div class="page reader-page">
        <div class="reader-head">
          <h1 class="watch-title">${esc(title)}</h1>
          <div class="watch-sub"><span class="epnum">Chapter ${esc(label)}</span> · ${pages.length} halaman</div>
        </div>
        ${bar("top")}
        <div class="reader" id="reader">
          ${pages.length ? pages.map((p, i) => `<img src="${esc(p.src)}" data-alt="${esc(p.alt)}" alt="Halaman ${i + 1}" loading="${i < 3 ? "eager" : "lazy"}" referrerpolicy="no-referrer" />`).join("")
            : `<div class="player-msg">Gambar chapter ini tidak tersedia.</div>`}
        </div>
        ${bar("bottom")}
        ${!nextHref ? `<p class="page-desc" style="text-align:center;margin-top:14px">Ini chapter terbaru. Cek lagi nanti untuk update berikutnya.</p>` : ""}
      </div>`;
    // gambar gagal dari server Komiku: coba lewat proxy Sanka sekali
    $$("#reader img", app).forEach((img) => {
      img.onerror = () => {
        if (img.dataset.alt && img.src !== img.dataset.alt) img.src = img.dataset.alt;
        else img.classList.add("dead");
      };
    });
    watchKeys = { next: nextHref, prev: prevHref, cinema: () => {} };
    document.title = `${title} Chapter ${label} · Komik · Gembulnime`;
  }

  // ---------- search suggestions ----------
  const input = $("#searchInput");
  const sugg = $("#suggest");
  let sgIndex = -1, sgTimer, sgToken = 0;

  function remember(q) {
    const r = store.get("recent", []).filter((x) => x.toLowerCase() !== q.toLowerCase());
    store.set("recent", [q, ...r].slice(0, 6));
  }
  function openSuggest(html) {
    sugg.innerHTML = html;
    sugg.hidden = false;
    input.setAttribute("aria-expanded", "true");
    sgIndex = -1;
  }
  function closeSuggest() {
    sugg.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }
  const sgItems = () => $$(".sg", sugg);
  function moveSg(dir) {
    const items = sgItems();
    if (!items.length) return;
    sgIndex = (sgIndex + dir + items.length) % items.length;
    items.forEach((el, i) => el.setAttribute("aria-selected", i === sgIndex));
    input.setAttribute("aria-activedescendant", items[sgIndex].id);
    items[sgIndex].scrollIntoView({ block: "nearest" });
  }
  function showRecent() {
    const r = store.get("recent", []);
    if (!r.length) { closeSuggest(); return; }
    openSuggest(`<div class="suggest-head"><span>Pencarian terakhir</span><button type="button" id="sgClear">Hapus</button></div>` +
      r.map((q, i) => `<div class="sg" role="option" id="sg${i}" data-href="#/search?q=${enc(q)}"><span class="sg-ico">${icon.clock}</span><b>${esc(q)}</b></div>`).join(""));
    $("#sgClear").onmousedown = (e) => { e.preventDefault(); store.set("recent", []); closeSuggest(); };
  }
  async function liveSearch(q) {
    const token = ++sgToken;
    openSuggest(`<div class="sg-note"><div class="spinner" style="width:22px;height:22px;border-width:2px;margin-bottom:6px"></div>Mencari "${esc(q)}"…</div>`);
    try {
      const { data } = await api(`/search?q=${enc(q)}`, { quiet: true });
      if (token !== sgToken || input.value.trim() !== q) return;
      const list = (data.animeList || []).slice(0, 6);
      openSuggest(list.length
        ? list.map((a, i) => `<div class="sg" role="option" id="sg${i}" data-href="#/anime/${enc(a.animeId)}"><img src="${esc(a.poster)}" alt="" referrerpolicy="no-referrer" /><div><b>${esc(cleanTitle(a.title))}</b><small>${esc([cleanStatus(a.status), cleanScore(a.score) && "★ " + cleanScore(a.score)].filter(Boolean).join(" · "))}</small></div></div>`).join("") +
          `<div class="sg sg-all" role="option" id="sgAll" data-href="#/search?q=${enc(q)}">Lihat semua hasil untuk "${esc(q)}"</div>`
        : `<div class="sg-note">Tidak ada judul yang cocok dengan "${esc(q)}".</div>`);
    } catch {
      if (token === sgToken) openSuggest(`<div class="sg-note">Pencarian gagal. Cek koneksi API.</div>`);
    }
  }
  input.addEventListener("focus", () => { if (!input.value.trim() && !comicMode()) showRecent(); });
  input.addEventListener("input", () => {
    clearTimeout(sgTimer);
    if (comicMode()) return;
    const q = input.value.trim();
    if (q.length < 2) { sgToken++; showRecent(); return; }
    sgTimer = setTimeout(() => liveSearch(q), 350);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); if (sugg.hidden) input.value.trim() ? liveSearch(input.value.trim()) : showRecent(); else moveSg(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); moveSg(-1); }
    else if (e.key === "Escape") { closeSuggest(); input.blur(); }
    else if (e.key === "Enter" && sgIndex >= 0 && !sugg.hidden) {
      e.preventDefault();
      const el = sgItems()[sgIndex];
      if (el.dataset.href.includes("/anime/")) remember(input.value.trim());
      location.hash = el.dataset.href;
      closeSuggest(); input.blur();
    }
  });
  input.addEventListener("blur", () => setTimeout(closeSuggest, 120));
  sugg.addEventListener("mousedown", (e) => {
    const el = e.target.closest(".sg");
    if (!el) return;
    e.preventDefault();
    if (el.dataset.href.includes("/anime/") && input.value.trim()) remember(input.value.trim());
    location.hash = el.dataset.href;
    closeSuggest(); input.blur();
  });
  $("#searchForm").onsubmit = (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    closeSuggest();
    input.blur();
    location.hash = comicMode() ? `#/comic/search?q=${enc(q)}` : `#/search?q=${enc(q)}`;
  };

  // ---------- router ----------
  async function route() {
    clearInterval(heroTimer);
    heroCleanup?.();
    heroCleanup = null;
    watchKeys = null;
    document.body.classList.remove("cinema");
    closeSuggest();
    const hash = location.hash.slice(1) || "/";
    const [path, qs] = hash.split("?");
    const params = new URLSearchParams(qs || "");
    const page = Math.max(1, parseInt(params.get("page"), 10) || 1);
    const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
    const key = parts[0] || "home";
    if (key !== "search" && !(key === "comic" && parts[1] === "search")) input.value = "";
    // di bagian komik, kolom cari di nav mencari komik (tanpa saran langsung dari API anime)
    const ph = key === "comic" ? "Cari judul komik" : "Cari judul anime";
    input.placeholder = ph;
    input.setAttribute("aria-label", ph);

    const navKey = key === "genre" ? "genres" : key === "completed" && innerWidth <= 860 ? "ongoing" : key;
    $$("[data-route]").forEach((a) => {
      const on = a.dataset.route === navKey;
      a.classList.toggle("active", on);
      on ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current");
    });
    document.title = SITE;
    window.scrollTo({ top: 0, behavior: "instant" });

    try {
      if (key === "home") await pageHome();
      else if (key === "ongoing" || key === "completed") await pageList(key, page);
      else if (key === "search") await pageSearch(params.get("q") || "");
      else if (key === "genres") {
        if (params.get("g")) await pageGenre(params.get("g"), page, params.get("mode") || "and");
        else await pageGenres();
      }
      else if (key === "genre" && parts[1]) await pageGenre(parts[1], page, params.get("mode") || "and");
      else if (key === "schedule") await pageSchedule();
      else if (key === "anime" && parts[1]) await pageAnime(parts[1]);
      else if (key === "watch" && parts[1]) await pageWatch(parts[1]);
      else if (key === "op" && parts[1] === "anime" && parts[2]) await pageOpAnime(parts[2]);
      else if (key === "op" && parts[1] === "watch" && parts[2]) await pageOpWatch(parts[2]);
      else if (key === "st" && parts[1] === "watch" && parts[2]) await pageStWatch(parts[2]);
      else if (key === "comic" && !parts[1]) await pageComicHome();
      else if (key === "comic" && (parts[1] === "terbaru" || parts[1] === "populer")) await pageComicList(parts[1], page);
      else if (key === "comic" && parts[1] === "genre" && parts[2]) await pageComicList("genre", page, parts[2]);
      else if (key === "comic" && parts[1] === "search") await pageComicSearch(params.get("q") || "");
      else if (key === "comic" && parts[1] === "d" && parts[2]) await pageComicDetail(parts[2]);
      else if (key === "comic" && parts[1] === "read" && parts[2]) await pageComicRead(parts[2]);
      else if (key === "library") pageLibrary(params.get("tab") === "history" ? "history" : "favs");
      else if (key === "login") pageAuth("login");
      else if (key === "signup") pageAuth("signup");
      else if (key === "account") pageAccount();
      else app.innerHTML = `<div class="page">${emptyBox("Halaman tidak ditemukan", "Link-nya mungkin salah ketik.", '<a class="btn btn-primary btn-sm" href="#/">Ke beranda</a>')}</div>`;
    } catch (e) {
      console.error(e);
      app.innerHTML = errorBox(e);
      $("#retry").onclick = route;
    }
  }

  // ---------- pratinjau kartu (desktop): trailer + ringkasan saat kursor diam di atas kartu ----------
  // Hanya untuk mouse; di HP/keyboard semua info yang sama ada di halaman detail.
  const canPeek = matchMedia("(hover: hover) and (pointer: fine) and (min-width: 861px)");
  const peek = document.createElement("div");
  peek.className = "peek";
  peek.hidden = true;
  peek.innerHTML = `<div class="peek-media"><img alt="" referrerpolicy="no-referrer" /><div class="peek-yt"><div id="peekHost"></div></div></div><div class="peek-body"></div>`;
  document.body.appendChild(peek);
  let peekTimer, peekHideTimer, peekCard = null, peekToken = 0, peekPlayer = null;

  function hidePeek() {
    clearTimeout(peekTimer);
    peekToken++;
    peekCard = null;
    peek.classList.remove("show", "playing");
    peek.hidden = true;
    peekPlayer?.then((p) => p?.stop());
  }
  async function showPeek(c) {
    const token = ++peekToken;
    peekCard = c;
    const id = c.dataset.anime;
    const title = $(".card-title", c).textContent;
    const img = $(".peek-media img", peek);
    img.src = $("img", c)?.src || "";
    $(".peek-body", peek).innerHTML = `<div class="peek-title">${esc(title)}</div><div class="sk sk-line"></div><div class="sk sk-line" style="width:70%"></div>`;
    peek.classList.remove("playing");
    peek.hidden = false;
    // posisi: tengah kartu, dijaga tetap di dalam layar
    const r = c.getBoundingClientRect(), w = 340, h = peek.offsetHeight || 420;
    peek.style.left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), innerWidth - w - 12) + "px";
    peek.style.top = Math.min(Math.max(76, r.top + r.height / 2 - h / 2), innerHeight - h - 12) + "px";
    peek.classList.remove("show"); void peek.offsetWidth; peek.classList.add("show");

    let d;
    try { d = await detailOf(id); } catch { return; }
    if (token !== peekToken) return;
    const eps = d.episodeList || [];
    const hist = lib.history().find((x) => x.animeId === id);
    const target = hist ? { id: hist.episodeId, label: `Lanjut EP ${hist.epLabel}` }
      : eps.length ? (d.status === "Ongoing" ? { id: eps[0].episodeId, label: `Tonton EP ${epNum(eps[0].title)}` } : { id: eps[eps.length - 1].episodeId, label: "Mulai EP 1" })
      : null;
    const fav = lib.isFav(id);
    const metaLine = [d.score && `<span class="score">★ ${esc(d.score)}</span>`, d.type, d.episodes && d.episodes !== "Unknown" && `${esc(d.episodes)} eps`, d.status]
      .filter(Boolean).map((x) => (x.startsWith("<") ? x : `<span>${esc(x)}</span>`)).join("");
    $(".peek-body", peek).innerHTML = `
      <div class="peek-title">${esc(cleanTitle(d.title))}</div>
      <div class="peek-meta">${metaLine}</div>
      <div class="peek-next" data-next hidden></div>
      <p class="peek-syn">${esc(d.synopsis?.paragraphList?.join(" ") || "")}</p>
      <div class="peek-genres">${(d.genreList || []).slice(0, 3).map((g) => `<span>${esc(g.title)}</span>`).join("")}</div>
      <div class="actions">
        ${target ? `<a class="btn btn-primary btn-sm" href="#/watch/${enc(target.id)}">${icon.play} ${esc(target.label)}</a>` : ""}
        <a class="btn btn-secondary btn-sm" href="#/anime/${enc(id)}">Detail</a>
        <button class="icon-btn peek-fav" aria-pressed="${fav}" aria-label="${fav ? "Hapus dari Koleksi" : "Simpan ke Koleksi"}">${icon.bookmark}</button>
      </div>`;
    $(".peek-fav", peek).onclick = (e) => {
      const on = !lib.isFav(id);
      lib.setFav({ animeId: id, title: d.title, poster: d.poster, score: d.score, episodes: d.episodes }, on);
      e.currentTarget.setAttribute("aria-pressed", on);
      toast(on ? "Disimpan ke Koleksi" : "Dihapus dari Koleksi");
    };

    const m = await animeMeta(d.title, d.japanese);
    if (token !== peekToken) return;
    if (m.banner) img.src = m.banner;
    const when = nextLabel(m.next);
    if (when) Object.assign($("[data-next]", peek), { hidden: false, textContent: when });
    if (!m.trailers.length) return;
    peekPlayer ||= ytPlayer("peekHost", {
      onPlay: () => setTimeout(() => peekCard && peek.classList.add("playing"), 600),
      onEnd: () => peek.classList.remove("playing"),
      onFail: () => peek.classList.remove("playing"),
    }).catch(() => null);
    const p = await peekPlayer;
    if (token === peekToken) p?.play(m.trailers);
  }

  document.addEventListener("mouseover", (e) => {
    if (!canPeek.matches) return;
    if (e.target.closest(".peek")) { clearTimeout(peekHideTimer); return; }
    const c = e.target.closest(".card[data-anime]");
    if (!c || c === peekCard) { if (c) clearTimeout(peekHideTimer); return; }
    clearTimeout(peekTimer);
    peekTimer = setTimeout(() => showPeek(c), 650);
  });
  document.addEventListener("mouseout", (e) => {
    const from = e.target.closest(".card[data-anime], .peek");
    const to = e.relatedTarget;
    if (!from || (to && from.contains(to))) return;
    if (to?.closest?.(".peek") || (peekCard && to && peekCard.contains(to))) return;
    clearTimeout(peekTimer);
    if (!peek.hidden) { clearTimeout(peekHideTimer); peekHideTimer = setTimeout(hidePeek, 150); }
  });
  window.addEventListener("scroll", () => { if (!peek.hidden) hidePeek(); }, { passive: true });
  window.addEventListener("hashchange", hidePeek);

  // ---------- global UI ----------
  window.addEventListener("hashchange", route);
  const totop = $("#totop");
  const onScroll = () => {
    nav.classList.toggle("solid", scrollY > 20);
    totop.hidden = scrollY < 900;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  totop.onclick = () => { window.scrollTo({ top: 0, behavior: "smooth" }); app.focus({ preventScroll: true }); };

  // ---------- random anime picker ----------
  async function pickRandomAnime() {
    toast("🎲 Memilihkan anime seru untukmu...");
    try {
      const { data } = await api("/home");
      const list = [...(data.ongoing?.animeList || []), ...(data.completed?.animeList || [])];
      if (!list.length) return toast("Gagal memilih anime acak.");
      const chosen = list[Math.floor(Math.random() * list.length)];
      toast(`🎲 Terpilih: ${cleanTitle(chosen.title)}! Membuka...`);
      setTimeout(() => {
        location.hash = `#/anime/${enc(chosen.animeId)}`;
      }, 500);
    } catch {
      toast("Gagal memilih anime acak.");
    }
  }

  // ---------- command palette modal (Ctrl + K) ----------
  const cmdModal = $("#cmdModal");
  const cmdInput = $("#cmdInput");
  const cmdClose = $("#cmdClose");
  const cmdResults = $("#cmdResults");
  const cmdTrending = $("#cmdTrending");
  const cmdRandomBtn = $("#cmdRandomBtn");
  let cmdTimer = null;

  function openCmdModal() {
    if (!cmdModal) return;
    if (typeof cmdModal.showModal === "function") {
      try { cmdModal.showModal(); } catch { cmdModal.setAttribute("open", ""); }
    } else {
      cmdModal.setAttribute("open", "");
    }
    cmdInput.value = "";
    cmdResults.hidden = true;
    cmdTrending.hidden = false;
    setTimeout(() => cmdInput.focus(), 60);
  }

  function closeCmdModal() {
    if (!cmdModal) return;
    if (typeof cmdModal.close === "function") {
      try { cmdModal.close(); } catch { cmdModal.removeAttribute("open"); }
    } else {
      cmdModal.removeAttribute("open");
    }
  }

  if (cmdClose) cmdClose.onclick = closeCmdModal;
  if (cmdModal) {
    cmdModal.addEventListener("click", (e) => {
      const rect = cmdModal.getBoundingClientRect();
      const inDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
      if (!inDialog || e.target === cmdModal) closeCmdModal();
    });
  }

  const searchKbdBadge = $("#searchKbdBadge");
  if (searchKbdBadge) {
    searchKbdBadge.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      openCmdModal();
    };
  }

  const btnRandomNav = $("#btnRandomNav");
  if (btnRandomNav) {
    btnRandomNav.onclick = () => pickRandomAnime();
  }

  if (cmdRandomBtn) {
    cmdRandomBtn.onclick = () => {
      closeCmdModal();
      pickRandomAnime();
    };
  }

  $$(".cmd-chip").forEach((chip) => {
    chip.onclick = () => {
      const q = chip.dataset.q;
      cmdInput.value = q;
      execCmdSearch(q);
    };
  });

  async function execCmdSearch(q) {
    if (!q || q.length < 2) {
      cmdResults.hidden = true;
      cmdTrending.hidden = false;
      return;
    }
    cmdTrending.hidden = true;
    cmdResults.hidden = false;
    cmdResults.innerHTML = `<div class="sg-note" style="padding:18px;text-align:center"><div class="spinner" style="width:24px;height:24px;border-width:2.5px;margin:0 auto 10px"></div>Mencari "${esc(q)}"…</div>`;
    try {
      const otakuP = api(`/search?q=${enc(q)}`, { quiet: true })
        .then((r) => (r.data?.animeList || []).map((a) => ({
          title: cleanTitle(a.title),
          poster: a.poster,
          status: cleanStatus(a.status),
          score: a.score,
          href: `#/anime/${enc(a.animeId)}`
        })))
        .catch(() => []);

      const shP = api(`/search?q=${enc(q)}`, { base: OP_API, quiet: true })
        .then((r) => (r.data?.animeList || []).map((a) => {
          const isEp = /-episode-\d+/.test(a.animeId);
          return {
            title: isEp ? opSeriesName(a.title) : cleanTitle(a.title),
            poster: a.poster,
            status: a.status || (isEp ? "Samehadaku" : ""),
            score: a.score,
            href: isEp ? `#/op/watch/${enc(a.animeId)}` : `#/op/anime/${enc(a.animeId)}`
          };
        }))
        .catch(() => []);

      const [otakuList, shList] = await Promise.all([otakuP, shP]);
      const combined = [...otakuList, ...shList];
      const seenTitles = new Set();
      const list = combined.filter((a) => {
        const k = norm(a.title);
        return k && !seenTitles.has(k) && seenTitles.add(k);
      }).slice(0, 8);

      if (!list.length) {
        cmdResults.innerHTML = `<div class="sg-note" style="padding:18px;text-align:center;color:var(--text-3)">Tidak ada anime yang cocok dengan "${esc(q)}".</div>`;
        return;
      }
      cmdResults.innerHTML = `
        <div class="cmd-label">Hasil Pencarian (${list.length})</div>
        ` + list.map((a) => `
          <a class="cmd-item" href="${esc(a.href)}">
            <img src="${esc(a.poster)}" alt="" referrerpolicy="no-referrer" />
            <div class="cmd-item-info">
              <div class="cmd-item-title">${esc(cleanTitle(a.title))}</div>
              <div class="cmd-item-meta">
                <span>${esc(a.status || "Sub Indo")}</span>
                ${a.score && cleanScore(a.score) !== "0" ? `<span class="score">★ ${esc(cleanScore(a.score))}</span>` : ""}
              </div>
            </div>
            <span class="cmd-arrow">→</span>
          </a>
        `).join("");
      $$(".cmd-item", cmdResults).forEach((item) => {
        item.onclick = () => closeCmdModal();
      });
    } catch {
      cmdResults.innerHTML = `<div class="sg-note" style="padding:18px;text-align:center;color:var(--text-3)">Gagal mencari. Silakan coba lagi.</div>`;
    }
  }

  if (cmdInput) {
    cmdInput.addEventListener("input", () => {
      clearTimeout(cmdTimer);
      const q = cmdInput.value.trim();
      if (!q) {
        cmdResults.hidden = true;
        cmdTrending.hidden = false;
        return;
      }
      cmdTimer = setTimeout(() => execCmdSearch(q), 300);
    });
    cmdInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeCmdModal();
      if (e.key === "Enter") {
        const first = $(".cmd-item", cmdResults);
        if (first) {
          first.click();
        } else if (cmdInput.value.trim()) {
          location.hash = `#/search?q=${enc(cmdInput.value.trim())}`;
          closeCmdModal();
        }
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    const typing = /input|textarea|select/i.test(document.activeElement.tagName);
    if (e.key === "Escape") {
      document.body.classList.remove("cinema");
      hidePeek();
      closeCmdModal();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openCmdModal();
      return;
    }
    if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "/") {
      e.preventDefault();
      openCmdModal();
      return;
    }
    if (!watchKeys) return;
    const k = e.key.toLowerCase();
    if (k === "n" && watchKeys.next) location.hash = watchKeys.next;
    else if (k === "p" && watchKeys.prev) location.hash = watchKeys.prev;
    else if (k === "t") watchKeys.cinema();
  });

  const btnCommunity = $("#btnCommunity");
  if (btnCommunity) {
    btnCommunity.onclick = () => {
      toast("💬 Komunitas Gembulnime: Tempat diskusi & request anime subtitle Indonesia.");
    };
  }
  const btnMore = $("#btnMore");
  if (btnMore) {
    btnMore.onclick = () => {
      location.hash = "#/genres";
    };
  }

  updateAuthNav();
  checkReminders();
  if (supabase) {
    let previousUserId = null;
    supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user || null;
      const nextUserId = nextUser?.id || null;
      if (previousUserId && previousUserId !== nextUserId) archiveAccountLibrary(previousUserId);
      authUser = nextUser;
      updateAuthNav();
      if (nextUserId && nextUserId !== previousUserId) setTimeout(() => syncLibraryFromCloud(), 0);
      previousUserId = nextUserId;
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) throw error;
      authUser = data.session?.user || null;
      previousUserId = authUser?.id || null;
      updateAuthNav();
      route();
    }).catch((error) => {
      console.error("Supabase session initialization failed:", error);
      authUser = null;
      updateAuthNav();
      route();
    });
  } else {
    route();
  }
})();
