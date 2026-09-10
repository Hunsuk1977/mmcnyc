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

// 접속한 날짜 구하기 (YYYY-MM-DD)
function getTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function fetchBilingualPrayer() {
  const todayStr = getTodayString(); // 예: '2026-09-10'
  
  const dateEl = document.getElementById('prayer-date');
  if (dateEl) dateEl.textContent = todayStr;

  // GitHub Raw 파일 경로
  const rawKoUrl = `https://raw.githubusercontent.com/Hunsuk1977/devotion/main/meditations/${todayStr}.md`;
  const rawEnUrl = `https://raw.githubusercontent.com/Hunsuk1977/devotion/main/meditations/${todayStr}_en.md`;

  const koEl = document.getElementById('prayer-text-ko');
  const enEl = document.getElementById('prayer-text-en');

  try {
    // 1. 한국어 파일 가져오기
    const resKo = await fetch(rawKoUrl);
    if (resKo.ok) {
      const textKo = await resKo.text();
      if (koEl) koEl.innerText = extractPrayerQuote(textKo);
    } else {
      if (koEl) koEl.innerText = "오늘 날짜의 한국어 기도문이 없습니다.";
    }

    // 2. 영어 파일 가져오기
    const resEn = await fetch(rawEnUrl);
    if (resEn.ok) {
      const textEn = await resEn.text();
      if (enEl) enEl.innerText = extractPrayerQuote(textEn);
    } else {
      // 영어 파일이 없는 경우: 한국어 마크다운 파일 안에서 영문 기도문 탐색
      const resKoAgain = await fetch(rawKoUrl);
      if (resKoAgain.ok) {
        const textKo = await resKoAgain.text();
        const fallbackEn = extractEnglishPrayerFallback(textKo);
        if (enEl) enEl.innerText = fallbackEn;
      } else {
        if (enEl) enEl.innerText = "Prayer content unavailable.";
      }
    }

  } catch (error) {
    console.error('Prayer fetch error:', error);
    if (koEl) koEl.innerText = "기도문을 불러오는 중 오류가 발생했습니다.";
  }
}

// 마크다운에서 맨 마지막 기도문(인용구 `> "..."`)만 추출하는 핵심 함수
function extractPrayerQuote(markdownText) {
  const lines = markdownText.split('\n');
  
  // 밑에서부터 탐색하여 인용구 기호(>)로 시작하는 마지막 라인을 찾음
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith('>') && line.length > 5) {
      // 마크다운 인용 기호(>) 및 앞뒤 공백/따옴표 정돈
      return line.replace(/^>\s*/, '').replace(/^["“]|["”]$/g, '').trim();
    }
  }

  // 인용구 기호가 없는 경우 맨 마지막 비어있지 않은 문장 반환
  const validLines = lines.map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('#'));
  return validLines.length > 0 ? validLines[validLines.length - 1].replace(/^>\s*/, '') : markdownText;
}

// 한 파일에 한글/영문이 같이 작성된 경우 영문 인용구 추출 대체 함수
function extractEnglishPrayerFallback(markdownText) {
  const lines = markdownText.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith('>') && (line.includes('Lord') || line.includes('Amen') || /[a-zA-Z]/.test(line))) {
      return line.replace(/^>\s*/, '').replace(/^["“]|["”]$/g, '').trim();
    }
  }
  return "Lord, make me today one of those who think less of their own pleasure and more of the great need. Amen.";
}

document.addEventListener('DOMContentLoaded', fetchBilingualPrayer);
  
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
