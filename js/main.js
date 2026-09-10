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

async function fetchDailyPrayerFromGithub() {
  const todayStr = getTodayString();
  const rawUrl = `https://raw.githubusercontent.com/Hunsuk1977/devotion/main/meditations/${todayStr}.md`;

  const koEl = document.getElementById('prayer-text-ko');
  const enEl = document.getElementById('prayer-text-en');

  try {
    const response = await fetch(rawUrl);
    if (!response.ok) {
      if (koEl) koEl.innerText = "오늘 날짜의 기도문 파일이 존재하지 않습니다.";
      return;
    }

    const text = await response.text();

    // 마크다운에서 '기도' 섹션 간단 파싱
    // 파일 내용 중 '## 기도' 또는 '### 기도' 다음 텍스트 추출
    let prayerKo = text;
    if (text.includes('기도')) {
      const parts = text.split(/#+\s*기도/i);
      if (parts.length > 1) {
        // '기도' 헤더 다음 내용 중 다음 헤더(#) 전까지 잘라내기
        prayerKo = parts[1].split(/\n#+/)[0].trim();
      }
    }

    if (koEl) koEl.innerText = prayerKo;
    if (enEl) enEl.innerText = prayerKo; // 영어 파일이 따로 없을 경우

  } catch (error) {
    console.error(error);
    if (koEl) koEl.innerText = "기도문을 불러오는 중 오류가 발생했습니다.";
  }
}

// Markdown에서 '## 기도' 또는 '## Prayer' 헤더 아래 문장 추출 함수
function parsePrayerSection(text, lang) {
  const lines = text.split('\n');
  let isPrayerSection = false;
  let prayerContent = [];

  const targetHeader = lang === 'ko' ? ['기도', '오늘의 기도'] : ['prayer', 'daily prayer'];

  for (let line of lines) {
    const trimmed = line.trim();

    // 헤더 체크 (e.g., ## 기도 / ### Prayer)
    if (trimmed.startsWith('#')) {
      const headerText = trimmed.replace(/^#+\s*/, '').toLowerCase();
      if (targetHeader.some(h => headerText.includes(h))) {
        isPrayerSection = true;
        continue;
      } else if (isPrayerSection) {
        // 다음 다른 헤더를 만나면 추출 종료
        break;
      }
    }

    if (isPrayerSection && trimmed !== '') {
      prayerContent.push(trimmed);
    }
  }

  // 섹션 분리가 안 되어 있거나 텍스트 전체일 경우의 기본 처리
  if (prayerContent.length === 0) {
    return lang === 'ko' ? text.trim() : "Prayer content not found in markdown.";
  }

  return prayerContent.join('\n');
}

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', fetchDailyPrayerFromGithub);

  
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
