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

// 날짜 문자열 함수

  function getTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function fetchRobustPrayer() {
  const todayStr = getTodayString(); 
  
  const dateEl = document.getElementById('prayer-date');
  if (dateEl) dateEl.textContent = todayStr;

  const rawUrl = `https://raw.githubusercontent.com/Hunsuk1977/devotion/main/meditations/${todayStr}.md`;
  
  const koEl = document.getElementById('prayer-text-ko');
  const enEl = document.getElementById('prayer-text-en');

  try {
    const response = await fetch(rawUrl);
    if (!response.ok) {
      if (koEl) koEl.innerText = "오늘 날짜의 묵상 파일이 존재하지 않습니다.";
      if (enEl) enEl.innerText = "Today's devotion file was not found.";
      return;
    }

    const markdownText = await response.text();
    const { prayerKo, prayerEn } = extractPrayerSmart(markdownText);

    if (koEl) koEl.innerText = prayerKo;
    if (enEl) enEl.innerText = prayerEn;

  } catch (error) {
    console.error('Fetch error:', error);
    if (koEl) koEl.innerText = "기도문을 불러오는 중 오류가 발생했습니다.";
  }
}

// 📌 [핵심] 가장 강력한 기도문 추출 로직
function extractPrayerSmart(text) {
  // 빈 줄 제거 및 배열화
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  let prayerLines = [];

  // 1단계: '기도' 또는 'Prayer' 라는 글자가 포함된 헤더(##)를 뒤에서부터 탐색
  let headerIndex = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].match(/^#+\s*.*(기도|prayer)/i)) {
      headerIndex = i;
      break;
    }
  }

  // 2단계: 문장 수집
  if (headerIndex !== -1) {
    // 헤더가 발견되면 그 아래에 있는 문장을 다음 헤더 전까지 긁어옴
    for (let i = headerIndex + 1; i < lines.length; i++) {
      if (lines[i].startsWith('#')) break; 
      prayerLines.push(cleanString(lines[i]));
    }
  } else {
    // 헤더가 없으면 맨 아래 4줄 중 헤더가 아닌 문장만 긁어옴
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].startsWith('#')) break;
      prayerLines.unshift(cleanString(lines[i])); // 밑에서부터 찾았으니 unshift로 순서 맞춤
      if (prayerLines.length >= 4) break; 
    }
  }

  // 3단계: 한글과 영어 완벽 분리
  let prayerKo = "";
  let prayerEn = "";

  prayerLines.forEach(line => {
    // 한글이 하나라도 포함되어 있으면 한국어 기도로 분류
    if (/[가-힣]/.test(line)) {
      prayerKo += (prayerKo ? "\n" : "") + line;
    } 
    // 한글은 없고 알파벳이 포함되어 있으면 영어 기도로 분류
    else if (/[a-zA-Z]/.test(line)) {
      prayerEn += (prayerEn ? "\n" : "") + line;
    }
  });

  return {
    prayerKo: prayerKo || "한국어 기도문을 찾을 수 없습니다.",
    prayerEn: prayerEn || "English prayer could not be found."
  };
}

// 마크다운 인용구 기호 및 따옴표 제거 유틸 함수
function cleanString(str) {
  return str.replace(/^>\s*/, '').replace(/^["“]|["”]$/g, '').trim();
}

document.addEventListener('DOMContentLoaded', fetchRobustPrayer);
  
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
