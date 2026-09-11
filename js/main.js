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
    var base = 'https://raw.githubusercontent.com/Hunsuk1977/devotion/main/meditations/' + dateStr;

    // The prayer is written as the closing bolded, quoted sentence in the
    // markdown source: **"..."** (straight or curly quotes). Take the last
    // one in the file, in case an earlier line is quoted the same way.
    var extractPrayer = function (text) {
      if (!text) return null;
      var matches = text.match(/\*\*["“]([^*]+?)["”]\*\*/g);
      if (!matches || !matches.length) return null;
      return matches[matches.length - 1].replace(/^\*\*["“]/, '').replace(/["”]\*\*$/, '').trim();
    };

    var fetchPrayer = function (url, el, emptyText) {
      fetch(url).then(function (res) {
        if (!res.ok) throw new Error('not found');
        return res.text();
      }).then(function (text) {
        var prayer = extractPrayer(text);
        if (prayer) {
          el.textContent = '“' + prayer + '”';
          el.removeAttribute('data-state');
        } else {
          el.textContent = emptyText;
          el.setAttribute('data-state', 'empty');
        }
      }).catch(function () {
        el.textContent = emptyText;
        el.setAttribute('data-state', 'empty');
      });
    };

    if (enP) fetchPrayer(base + '.en.md', enP, "Today's prayer isn't posted yet — check back soon.");
    if (koP) fetchPrayer(base + '.md', koP, '오늘의 기도가 아직 준비되지 않았습니다 — 잠시 후 다시 확인해 주세요.');

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

  // Hero background videos marked "slow" play back at a gentler pace so they
  // read as ambient motion rather than footage.
  document.querySelectorAll('.hero-bg-video.slow').forEach(function (v) {
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

  // Contact form -> opens the visitor's mail app with the message prefilled.
  // Works on any static host (GitHub Pages, Netlify, S3) since there is no backend.
  // To switch to Netlify Forms instead, see README.md.
  var form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = form.elements;
      var name = (f.name.value || '').trim();
      var email = (f.email.value || '').trim();
      var church = (f.church.value || '').trim();
      var body = (f.message.value || '').trim();
      if (!name || !email || !body) { form.reportValidity(); return; }

      var ko = root.getAttribute('lang') === 'ko';
      var subject = 'MMC NYC — ' + (ko ? '문의' : 'Inquiry') + ': ' + name;
      var lines = [
        body, '', '—',
        (ko ? '이름' : 'Name') + ': ' + name,
        (ko ? '이메일' : 'Email') + ': ' + email
      ];
      if (church) lines.push((ko ? '교회/단체' : 'Church/organization') + ': ' + church);

      window.location.href = 'mailto:hello@mmcnyc.org'
        + '?subject=' + encodeURIComponent(subject)
        + '&body=' + encodeURIComponent(lines.join('\n'));
    });
  }
})();
