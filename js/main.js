(function () {
  var root = document.documentElement;
  var KEY = 'mmc-lang';

  function setLang(lang, persist) {
    lang = lang === 'ko' ? 'ko' : 'en';
    root.setAttribute('lang', lang);
    document.querySelectorAll('.lang-toggle button').forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.lang === lang ? 'true' : 'false');
    });
    // Swap <title> if the page provides both
    var t = document.querySelector('title');
    if (t && t.dataset[lang]) t.textContent = t.dataset[lang];
    if (persist) { try { localStorage.setItem(KEY, lang); } catch (e) {} }
  }

  // Initial language: ?lang= > saved > browser
  var params = new URLSearchParams(location.search);
  var initial = params.get('lang');
  if (!initial) { try { initial = localStorage.getItem(KEY); } catch (e) {} }
  if (!initial && /^ko/i.test(navigator.language || '')) initial = 'ko';
  setLang(initial || 'en', false);

  document.addEventListener('click', function (e) {
    var b = e.target.closest('.lang-toggle button');
    if (b) { setLang(b.dataset.lang, true); return; }
    var m = e.target.closest('.menu-btn');
    if (m) {
      var nav = document.querySelector('.nav');
      var open = nav.classList.toggle('open');
      m.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
  });

  // Mark current nav item
  var path = location.pathname.replace(/\/index\.html$/, '/');
  document.querySelectorAll('.nav a').forEach(function (a) {
    var href = a.getAttribute('href');
    if (href === path || (href !== '/' && path.indexOf(href) === 0)) a.setAttribute('aria-current', 'page');
  });

  // Footer year
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // Parallax section backgrounds: the image drifts a little slower than the
  // page scrolls, computed from each section's position in the viewport.
  // Skipped entirely for prefers-reduced-motion.
  var parallaxBgs = Array.prototype.slice.call(document.querySelectorAll('.parallax-bg'));
  if (parallaxBgs.length && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    var pxTicking = false;
    var updateParallax = function () {
      var vh = window.innerHeight;
      parallaxBgs.forEach(function (el) {
        var section = el.parentElement;
        var rect = section.getBoundingClientRect();
        // -1 when the section is a full viewport above, +1 when a full viewport below.
        var progress = (rect.top + rect.height / 2 - vh / 2) / (vh / 2 + rect.height / 2);
        var range = Math.min(48, rect.height * 0.12);
        el.style.transform = 'translate3d(0,' + (progress * range).toFixed(1) + 'px,0)';
      });
      pxTicking = false;
    };
    var onScroll = function () {
      if (!pxTicking) { window.requestAnimationFrame(updateParallax); pxTicking = true; }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    updateParallax();
  }

  // Daily Prayer: to stay clear of the devotional's copyrighted text, we
  // don't reproduce the full reading — only the short closing prayer,
  // pulled straight from today's source file on GitHub, in each language.
  var prayerEl = document.getElementById('daily-prayer');
  if (prayerEl) {
    var enP = prayerEl.querySelector('p.en');
    var koP = prayerEl.querySelector('p.ko');
    var pad2 = function (n) { return String(n).padStart(2, '0'); };

    // The devotional source publishes on US Eastern time. Rather than
    // switching over at each visitor's own local midnight, we hold
    // yesterday's prayer until 8:00 AM Eastern, then roll over to today's —
    // matching when the content actually goes up, wherever the visitor is.
    var effectiveDateStr = function () {
      var parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', hour12: false
      }).formatToParts(new Date());
      var map = {};
      parts.forEach(function (p) { map[p.type] = p.value; });
      var y = parseInt(map.year, 10), m = parseInt(map.month, 10), d = parseInt(map.day, 10);
      var h = parseInt(map.hour, 10);
      if (h === 24) h = 0; // some environments report midnight as "24"
      var ms = Date.UTC(y, m - 1, d);
      if (h < 8) ms -= 24 * 60 * 60 * 1000; // before 8am ET: still show yesterday's
      var eff = new Date(ms);
      return eff.getUTCFullYear() + '-' + pad2(eff.getUTCMonth() + 1) + '-' + pad2(eff.getUTCDate());
    };
    var dateStr = effectiveDateStr();
  var RAW = 'https://raw.githubusercontent.com/Hunsuk1977/devotion/main/meditations/';

  // The devotional repo groups readings into collections (meditations/tozer/…).
  // Files from before that change still sit directly under meditations/, so try
  // the collection folder first and fall back to the old flat path.
  var sourcesFor = function (suffix) {
    return [RAW + 'tozer/' + dateStr + suffix, RAW + dateStr + suffix];
  };

  // The closing prayer is the last quoted block of the reading. Across the
  // source files it appears three ways — as a markdown quote (> "…"), as a
  // bolded quote (**"…"**), or as a plain quoted paragraph — so match on the
  // quotation marks rather than the decoration, and skip the copyright line
  // that sometimes follows it.
  var extractPrayer = function (text) {
    if (!text) return null;
    var body = text.replace(/^---\n[\s\S]*?\n---\n/, '');
    var blocks = body.split(/\n\s*\n/);
    for (var i = blocks.length - 1; i >= 0; i--) {
      var b = blocks[i].replace(/^\s*>\s?/gm, '').replace(/\s+/g, ' ').trim();
      if (!b) continue;
      if (/저작권|Copyright|©|reprinted|발췌/i.test(b)) continue;
      var m = b.match(/^\*{0,2}["“]([\s\S]+)["”]\*{0,2}$/);
      if (m) return m[1].trim();
    }
    return null;
  };

  // Walks the candidate URLs in order; the empty message is only shown once
  // every one of them has come up without a prayer.
  var fetchPrayer = function (urls, el, emptyText) {
    var giveUp = function () {
      el.textContent = emptyText;
      el.setAttribute('data-state', 'empty');
    };
    var attempt = function (i) {
      if (i >= urls.length) { giveUp(); return; }
      fetch(urls[i]).then(function (res) {
        if (!res.ok) throw new Error('not found');
        return res.text();
      }).then(function (text) {
        var prayer = extractPrayer(text);
        if (prayer) {
          el.textContent = '“' + prayer + '”';
          el.removeAttribute('data-state');
        } else {
          attempt(i + 1);
        }
      }).catch(function () { attempt(i + 1); });
    };
    attempt(0);
  };

  if (enP) fetchPrayer(sourcesFor('.en.md'), enP, "Today's prayer isn't posted yet — check back soon.");
  if (koP) fetchPrayer(sourcesFor('.md'), koP, '오늘의 기도가 아직 준비되지 않았습니다 — 잠시 후 다시 확인해 주세요.');

    // Date line next to the "Daily Prayer" label, in the effective (ET) date
    // computed above — not a second en/ko pair, just one line that follows
    // the language toggle directly.
    var dateEl = document.getElementById('prayer-date');
    if (dateEl) {
      var effDate = new Date(dateStr + 'T12:00:00Z'); // noon UTC avoids local-TZ day-shift when formatting
      var enDateStr = effDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      var koDateStr = effDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
      var renderDate = function () {
        dateEl.textContent = root.getAttribute('lang') === 'ko' ? koDateStr : enDateStr;
      };
      renderDate();
      document.querySelectorAll('.lang-toggle button').forEach(function (b) {
        b.addEventListener('click', renderDate);
      });
    }
  }

  // Background videos marked "slow" play back at a gentler pace so they
  // read as ambient motion rather than footage.
  document.querySelectorAll('.hero-bg-video.slow, .prayer-bg-video.slow').forEach(function (v) {
    v.playbackRate = 0.6;
  });

  // Demo video: it loops on its own as an illustration, but never for someone
  // who has asked their system to reduce motion — they get a still first frame
  // and the controls to start it themselves.
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('.demo video').forEach(function (v) {
        v.autoplay = false;
        v.loop = false;
        v.pause();
      });
    }
  } catch (e) {}


})();

/* =====================================================================
   2026-10 — Products menu, media base, logo motion, feature stage,
   Church OBS scene demo, LEBAB typing demo
   ===================================================================== */
(function () {
  var root = document.documentElement;
  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var lang = function () { return root.getAttribute('lang') === 'ko' ? 'ko' : 'en'; };
  var onLang = function (fn) {
    new MutationObserver(function (m) { m.forEach(function (r) { if (r.attributeName === 'lang') fn(); }); })
      .observe(root, { attributes: true });
  };

  // ---------- Media location ----------
  // Videos are referenced as data-media="wordalive/wa-venues-{lang}.mp4".
  // Leave MEDIA_BASE empty to serve them from this repo's /media/ folder.
  // Once the Cloudflare R2 bucket is public, set it to that address, e.g.
  // 'https://media.wordalive.app/mmc/' — every page switches at once.
  var MEDIA_BASE = '';
  var script = document.querySelector('script[src$="js/main.js"]');
  var siteRoot = script ? script.src.replace(/js\/main\.js.*$/, '') : '/';
  var mediaUrl = function (p) { return (MEDIA_BASE || siteRoot + 'media/') + p.replace('{lang}', lang()); };
  var setMedia = function (el) {
    var p = el.getAttribute('data-media'); if (!p) return;
    var url = mediaUrl(p);
    if (el.tagName === 'VIDEO') { if (el.getAttribute('src') !== url) el.setAttribute('src', url); }
    else el.setAttribute('src', url);
    var po = el.getAttribute('data-poster');
    if (po) el.setAttribute('poster', mediaUrl(po));
  };
  document.querySelectorAll('[data-media]').forEach(setMedia);

  // ---------- Current page in the nav (resolved paths, so ../ links match) ----------
  var here = location.pathname.replace(/index\.html$/, '');
  document.querySelectorAll('.nav a').forEach(function (a) {
    var p = a.pathname.replace(/index\.html$/, '');
    if (p.length > 1 && here.indexOf(p) === 0 && p !== siteRoot.replace(location.origin, '')) a.setAttribute('aria-current', 'page');
    else if (a.getAttribute('aria-current')) a.removeAttribute('aria-current');
  });
  document.querySelectorAll('.nav-group').forEach(function (g) {
    if (g.querySelector('a[aria-current]')) g.classList.add('current');
  });

  // ---------- Products dropdown (tap/keyboard; hover handled in CSS) ----------
  document.addEventListener('click', function (e) {
    var t = e.target.closest('.nav-trigger');
    document.querySelectorAll('.nav-group.open').forEach(function (g) {
      if (!t || g !== t.parentElement) { g.classList.remove('open'); g.querySelector('.nav-trigger').setAttribute('aria-expanded', 'false'); }
    });
    if (t) {
      var g = t.parentElement, open = g.classList.toggle('open');
      t.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') document.querySelectorAll('.nav-group.open').forEach(function (g) { g.classList.remove('open'); });
  });

  var whenVisible = function (el, cb, threshold) {
    if (!('IntersectionObserver' in window)) { cb(true); return; }
    new IntersectionObserver(function (es) { es.forEach(function (x) { cb(x.isIntersecting); }); },
      { threshold: threshold || 0.35 }).observe(el);
  };

  // ---------- Logo motion: play once in view, rest on the last frame ----------
  document.querySelectorAll('.logo-stage').forEach(function (box) {
    var v = box.querySelector('video'), btn = box.querySelector('.replay');
    if (!v) return;
    v.muted = true; v.playsInline = true;
    if (reduce) { box.classList.add('done'); return; }   // poster = final logo frame
    var played = false;
    whenVisible(box, function (vis) {
      if (vis && !played) { played = true; v.currentTime = 0; v.play().catch(function () { box.classList.add('done'); }); }
    });
    v.addEventListener('ended', function () { box.classList.add('done'); });
    var replay = function () { box.classList.remove('done'); v.currentTime = 0; v.play().catch(function () {}); };
    if (btn) btn.addEventListener('click', replay);
  });

  // ---------- Feature stage ----------
  document.querySelectorAll('[data-stage]').forEach(function (stage) {
    var items = Array.prototype.slice.call(stage.querySelectorAll('.stage-item'));
    var screen = stage.querySelector('.stage-screen');
    var v = screen.querySelector('video');
    var pp = screen.querySelector('.playpause');
    var cap = stage.querySelector('.stage-caption');
    var idx = 0, visible = false, userPaused = reduce;
    v.muted = true; v.playsInline = true; v.loop = false;

    var load = function (i, autoplay) {
      idx = (i + items.length) % items.length;
      items.forEach(function (b, j) {
        b.setAttribute('aria-selected', j === idx ? 'true' : 'false');
        b.tabIndex = j === idx ? 0 : -1;
        b.style.setProperty('--p', 0);
      });
      var it = items[idx];
      if (cap) { var d = it.querySelector('.d .' + lang()); cap.textContent = d ? d.textContent : ''; }
      v.classList.add('fading');
      setTimeout(function () {
        v.setAttribute('data-media', it.getAttribute('data-clip'));
        v.setAttribute('data-poster', it.getAttribute('data-clip').replace('.mp4', '.jpg'));
        setMedia(v);
        v.load();
        v.addEventListener('loadeddata', function once() {
          v.removeEventListener('loadeddata', once);
          v.classList.remove('fading');
          if (autoplay && visible && !userPaused) v.play().catch(function () {});
        });
      }, 220);
      if (window.innerWidth < 900) it.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    };
    var sync = function () { screen.classList.toggle('paused', v.paused); };
    v.addEventListener('play', sync); v.addEventListener('pause', sync);
    v.addEventListener('timeupdate', function () {
      if (v.duration) items[idx].style.setProperty('--p', (v.currentTime / v.duration).toFixed(3));
    });
    v.addEventListener('ended', function () { load(idx + 1, true); });

    items.forEach(function (b, j) {
      b.addEventListener('click', function () { userPaused = false; load(j, true); });
      b.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); items[(j + 1) % items.length].focus(); items[(j + 1) % items.length].click(); }
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); var k = (j - 1 + items.length) % items.length; items[k].focus(); items[k].click(); }
      });
    });
    var toggle = function () {
      if (v.paused) { userPaused = false; v.play().catch(function () {}); } else { userPaused = true; v.pause(); }
    };
    pp.addEventListener('click', toggle);
    v.addEventListener('click', toggle);

    whenVisible(stage, function (vis) {
      visible = vis;
      if (vis && !userPaused) v.play().catch(function () {}); else if (!vis) v.pause();
    }, 0.4);
    onLang(function () { load(idx, !v.paused); });
    load(0, false);
    sync();
  });

  // ---------- Church OBS: scenes switching on the program monitor ----------
  // Layouts come from a real Church OBS scene file (x, y, w, h as fractions of
  // the program). Each scene is composed from four sources — camera, slide,
  // captions, name — and scene changes crossfade like OBS's fade transition.
  document.querySelectorAll('[data-obs-demo]').forEach(function (demo) {
    var IMG = demo.getAttribute('data-img') || '../img/';
    var SCENES = [
      { cam: [.55, 0, .45, 1, 10], slide: [.03, .04, .49, .6, 6], cap: [0, .67, .55, .33] },
      { wide: [0, 0, 1, 1], slide: [.65, .04, .32, .3, 6], cap: [0, .73, 1, .27] },
      { wide: [0, 0, 1, 1], cap: [0, .69, 1, .31] },
      { slide: [0, 0, 1, 1], cam: [.68, .64, .29, .32, 6], name: [.04, .82, .42, .11] },
      { cam: [0, 0, .45, 1], slide: [.47, .04, .51, .5, 6], cap: [.45, .55, .55, .45] }
    ];
    var LINES = ['Good morning, church.', 'Today we open John chapter 15.', '“I am the vine; you are the branches.”', 'Whoever remains in me will bear much fruit.', 'Apart from me you can do nothing.'];
    var comps = demo.querySelectorAll('.obs-comp');
    var btns = Array.prototype.slice.call(demo.querySelectorAll('.obs-scenes button'));
    var li = 0, cur = 0, front = 0, timer = null, capTimer = null;

    var box = function (el, f) {
      el.style.left = f[0] * 100 + '%'; el.style.top = f[1] * 100 + '%';
      el.style.width = f[2] * 100 + '%'; el.style.height = f[3] * 100 + '%';
      el.style.borderRadius = (f[4] || 0) + 'px';
    };
    var layer = function (cls, f) {
      var d = document.createElement('div'); d.className = 'obs-layer ' + cls; box(d, f); return d;
    };
    var render = function (comp, s) {
      comp.innerHTML = '';
      var SLIDE = '<b>요한복음 John 1:12</b>영접하는 자 곧 그 이름을 믿는 자들에게는 하나님의 자녀가 되는 권세를 주셨으니<span>Yet to all who received him, to those who believed in his name, he gave the right to become children of God</span>';
      if (s.wide) { var w = layer('wide', s.wide); w.innerHTML = '<img src="' + IMG + 'mmcnyc_bg.jpg" alt="">'; comp.appendChild(w); }
      if (s.slide && s.slide[2] === 1) { var sf = layer('slide', s.slide); sf.innerHTML = SLIDE; comp.appendChild(sf); }
      if (s.cam) { var c = layer('cam', s.cam); c.innerHTML = '<img src="' + IMG + 'mmcnyc_bg.jpg" alt="">'; comp.appendChild(c); }
      if (s.slide && s.slide[2] !== 1) { var sl = layer('slide' + (s.slide[2] < .4 ? ' sm' : ''), s.slide); sl.innerHTML = SLIDE; comp.appendChild(sl); }
      if (s.cap) { var cp = layer('cap', s.cap); cp.innerHTML = '<div class="old"></div><div></div>'; comp.appendChild(cp); }
      if (s.name) { var n = layer('name', s.name); n.textContent = 'Pastor · Sunday Service'; comp.appendChild(n); }
      paint(comp);
    };
    var paint = function (comp) {
      var cp = comp.querySelector('.cap'); if (!cp) return;
      cp.children[0].textContent = LINES[li % LINES.length];
      cp.children[1].textContent = LINES[(li + 1) % LINES.length];
    };
    var show = function (i) {
      cur = i % SCENES.length;
      var next = comps[1 - front];
      render(next, SCENES[cur]);
      next.classList.add('on'); comps[front].classList.remove('on');
      front = 1 - front;
      btns.forEach(function (b, j) { b.classList.toggle('on', j === cur); });
    };
    var restart = function () {
      clearInterval(timer);
      if (!reduce) timer = setInterval(function () { show(cur + 1); }, 3400);
    };
    btns.forEach(function (b, j) { b.addEventListener('click', function () { show(j); restart(); }); });
    render(comps[0], SCENES[0]); comps[0].classList.add('on');
    btns[0] && btns[0].classList.add('on');
    whenVisible(demo, function (vis) {
      if (vis) { restart(); clearInterval(capTimer); if (!reduce) capTimer = setInterval(function () { li++; paint(comps[front]); }, 2400); }
      else { clearInterval(timer); clearInterval(capTimer); }
    });
  });

  // ---------- LEBAB: type a church name, the site appears ----------
  document.querySelectorAll('[data-lebab-demo]').forEach(function (demo) {
    var out = demo.querySelector('.lb-type'), go = demo.querySelector('.lb-go'), site = demo.querySelector('.lb-site');
    var url = demo.querySelector('.url'), nm = demo.querySelector('.lb-site .banner b');
    var NAMES = { ko: ['맨하탄선교교회', '은혜교회', '새생명교회'], en: ['Manhattan Mission Church', 'Grace Church', 'New Life Church'] };
    var SLUG = ['mmc', 'grace', 'newlife'];
    var n = 0, running = false;
    var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    var cycle = function () {
      var name = NAMES[lang()][n % 3], slug = SLUG[n % 3];
      site.classList.remove('show'); out.textContent = ''; url.textContent = 'lebab.live';
      var p = wait(700);
      name.split('').forEach(function (ch) { p = p.then(function () { out.textContent += ch; return wait(lang() === 'ko' ? 140 : 70); }); });
      return p.then(function () { return wait(500); })
        .then(function () { go.classList.add('press'); return wait(180); })
        .then(function () {
          go.classList.remove('press'); nm.textContent = name; url.textContent = slug + '.lebab.live';
          site.classList.add('show'); return wait(3600);
        })
        .then(function () { n++; });
    };
    var loop = function () { if (!running) return; cycle().then(loop); };
    if (reduce) { nm.textContent = NAMES[lang()][0]; out.textContent = NAMES[lang()][0]; url.textContent = 'mmc.lebab.live'; site.classList.add('show'); return; }
    whenVisible(demo, function (vis) { if (vis && !running) { running = true; loop(); } else if (!vis) running = false; });
  });
})();
