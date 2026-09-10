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

async function fetchBulletproofPrayer() {
  const todayStr = getTodayString(); 
  
  const dateEl = document.getElementById('prayer-date');
  if (dateEl) dateEl.textContent = todayStr;

  const rawUrl = `https://raw.githubusercontent.com/Hunsuk1977/devotion/main/meditations/${todayStr}.md`;
  const rawUrl = `https://raw.githubusercontent.com/Hunsuk1977/devotion/main/meditations/${todayStr}.en.md`;

  
  const koEl = document.getElementById('prayer-text-ko');
  const enEl = document.getElementById('prayer-text-en');

  // [중요] 이전 CSS에서 display: none 등으로 숨겨진 경우를 대비해 강제 노출
  if (koEl) koEl.style.display = 'block';
  if (enEl) enEl.style.display = 'block';

  try {
    const response = await fetch(rawUrl);
    
    // 파일이 없으면 에러 메시지
    if (!response.ok) {
      if (koEl) koEl.innerText = "오늘 날짜의 묵상 파일을 찾을 수 없습니다.";
      if (enEl) enEl.innerText = "Today's devotion file was not found.";
      return;
    }

    const markdownText = await response.text();
    
    // 1. 엔터 두 번(빈 줄)을 기준으로 텍스트를 '문단(Paragraph)' 단위로 쪼갭니다.
    const paragraphs = markdownText.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
    
    let prayerKo = "";
    let prayerEn = "";

    // 2. 파일의 맨 뒤에서부터 역순으로 4개의 문단을 검사합니다. (기도는 항상 마지막에 있으므로)
    const tailParagraphs = paragraphs.slice(-4).reverse();

    for (let p of tailParagraphs) {
      // 마크다운 기호(>, #) 및 불필요한 따옴표 깔끔하게 제거
      const cleanP = p.replace(/^[>#]+\s*/gm, '').replace(/["“”,]/g, '').trim();
      
      // 한국어가 포함된 문단을 찾으면 (아직 안 찾았을 때만)
      if (/[가-힣]/.test(cleanP) && !prayerKo) {
        prayerKo = cleanP;
      }
      // 한국어는 없고 알파벳만 포함된 문단을 찾으면
      else if (/[a-zA-Z]/.test(cleanP) && !/[가-힣]/.test(cleanP) && !prayerEn) {
        prayerEn = cleanP;
      }
    }

    // 3. 화면에 출력
    if (koEl) koEl.innerText = prayerKo || "마크다운에서 한국어 기도문을 찾지 못했습니다.";
    if (enEl) enEl.innerText = prayerEn || "Could not find English prayer in markdown.";

  } catch (error) {
    console.error('Fetch error:', error);
    if (koEl) koEl.innerText = "통신 중 오류가 발생했습니다.";
  }
}

document.addEventListener('DOMContentLoaded', fetchBulletproofPrayer);
  
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
