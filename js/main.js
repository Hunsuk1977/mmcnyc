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

async function fetchAIOPrayerCard() {
  const todayStr = getTodayString(); // '2026-09-10'
  
  // 날짜 표시 업데이트
  const dateEl = document.getElementById('prayer-date');
  if (dateEl) dateEl.textContent = todayStr;

  const koEl = document.getElementById('prayer-text-ko');
  const enEl = document.getElementById('prayer-text-en');

  // 메인 마크다운 파일 경로 (Hunsuk1977/devotion/meditations/)
  const rawUrl = `https://raw.githubusercontent.com/Hunsuk1977/devotion/main/meditations/${todayStr}.md`;

  try {
    const response = await fetch(rawUrl);
    if (!response.ok) {
      if (koEl) koEl.innerText = "오늘 날짜의 기도문 파일이 존재하지 않습니다.";
      if (enEl) enEl.innerText = "Today's prayer file was not found.";
      return;
    }

    const markdownText = await response.text();

    // 단일 마크다운 파일 내용에서 한국어/영어 기도문 파싱 및 분류
    const { prayerKo, prayerEn } = parseBilingualFromSingleMarkdown(markdownText);

    // 큰 글씨 디자인과 한글 우선 출력
    if (koEl) koEl.innerText = prayerKo;
    if (enEl) enEl.innerText = prayerEn;

  } catch (error) {
    console.error('Prayer fetch error:', error);
    if (koEl) koEl.innerText = "기도문을 불러오는 중 오류가 발생했습니다.";
    if (enEl) enEl.innerText = "Failed to load prayer content.";
  }
}

// 하나의 마크다운 텍스트에서 한글 기도와 영문 기도를 추출 및 분류하는 함수
function parseBilingualFromSingleMarkdown(text) {
  const lines = text.split('\n');
  const quoteLines = [];

  // 인용구 기호(>)로 시작하는 모든 줄 수집
  for (let line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('>')) {
      const cleanLine = trimmed.replace(/^>\s*/, '').replace(/^["“]|["”]$/g, '').trim();
      if (cleanLine.length > 0) {
        quoteLines.push(cleanLine);
      }
    }
  }

  let prayerKo = "";
  let prayerEn = "";

  // 추출된 인용구 줄 중 영문(알파벳)과 한글을 분류
  quoteLines.forEach(line => {
    // 알파벳 비중이 높은 경우 영문 기도문으로 판단 (간단하게 'Lord' 포함 여부로 체크 가능)
    if (/[a-zA-Z]/.test(line) && !prayerEn) {
      prayerEn = line;
    } else if (/[가-힣]/.test(line) && !prayerKo) {
      prayerKo = line;
    }
  });

  // 파싱 실패 시 예외 처리 및 기본값
  if (!prayerKo && quoteLines.length > 0) {
    prayerKo = quoteLines[0]; // 맨 앞 인용구를 한글로 가정
  }
  if (!prayerEn && quoteLines.length > 0) {
    prayerEn = quoteLines.find(l => /[a-zA-Z]/.test(l)) || quoteLines[0]; // 알파벳 포함 줄을 영어로 가져오거나 맨 앞 줄
  }

  return { 
    prayerKo: prayerKo || "오늘의 기도문을 불러올 수 없습니다.", 
    prayerEn: prayerEn || "English prayer is unavailable in this file." 
  };
}

document.addEventListener('DOMContentLoaded', fetchAIOPrayerCard);
  
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
