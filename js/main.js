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

// 오늘 날짜 가져오기

function getTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function loadBilingualPrayer() {
  const todayStr = getTodayString(); // '2026-09-10'

  const dateEl = document.getElementById('prayer-date');
  if (dateEl) dateEl.textContent = todayStr;

  const koEl = document.getElementById('prayer-text-ko');
  const enEl = document.getElementById('prayer-text-en');

  // 강제 노출
  if (koEl) koEl.style.display = 'block';
  if (enEl) enEl.style.display = 'block';

  const baseUrl = 'https://raw.githubusercontent.com/Hunsuk1977/devotion/main/meditations';
  const koUrl = `${baseUrl}/${todayStr}.md`;
  const enUrl = `${baseUrl}/${todayStr}.en.md`;

  // 1. 한국어 파일 독립 로딩
  (async () => {
    try {
      const res = await fetch(koUrl);
      if (res.ok) {
        const text = await res.text();
        if (koEl) koEl.innerText = parsePrayerParagraph(text);
      } else {
        if (koEl) koEl.innerText = `오늘 날짜 파일(${todayStr}.md)을 찾을 수 없습니다.`;
      }
    } catch (e) {
      console.error('KO error:', e);
      if (koEl) koEl.innerText = '한국어 기도문 로딩 실패';
    }
  })();

  // 2. 영어 파일 독립 로딩 (2026-09-10.en.md)
  (async () => {
    try {
      const res = await fetch(enUrl);
      if (res.ok) {
        const text = await res.text();
        if (enEl) enEl.innerText = parsePrayerParagraph(text);
      } else {
        if (enEl) enEl.innerText = `Today's English file (${todayStr}.en.md) was not found.`;
      }
    } catch (e) {
      console.error('EN error:', e);
      if (enEl) enEl.innerText = 'Failed to load English prayer.';
    }
  })();
}

// 안전하게 맨 마지막 기도 문단을 뽑아내는 함수
function parsePrayerParagraph(text) {
  if (!text || typeof text !== 'string') return '';
  
  // 줄바꿈 기준으로 나누어 가장 아래에 위치한 문단/인용구 파싱
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // 뒤에서부터 탐색하여 인용구('>')나 일반 텍스트 문장 추출
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    // 마크다운 제목(#)이나 구절 출처 식별자 등 제외
    if (!line.startsWith('#') && line.length > 5) {
      return line.replace(/^>\s*/, '').replace(/^["“]|["”]$/g, '').trim();
    }
  }
  
  return text.trim();
}

document.addEventListener('DOMContentLoaded', loadBilingualPrayer);
  
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
