(function () {
  'use strict';

  var root = document.documentElement;
  var I18N = window.I18N || {};
  var START_YEAR = 2020;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function lang() { return root.lang === 'ar' ? 'ar' : 'en'; }
  function t(key) { return (I18N[lang()] || {})[key] || (I18N.en || {})[key] || ''; }
  function pick(obj) { return obj ? (obj[lang()] || obj.en || '') : ''; }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return String(n).padStart(2, '0'); }

  /* Pick a readable text colour for a placeholder sheet tone */
  function inkFor(hex) {
    var h = hex.replace('#', '');
    var r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#141413' : '#F3F2F0';
  }

  var ARROW = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 11.5 11.5 4.5M5.5 4.5h6v6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ---------- Renderers ---------- */
  function renderProjects() {
    var list = document.getElementById('projects');
    if (!list) return;
    var items = window.PROJECTS || [];

    list.innerHTML = items.map(function (p, i) {
      var title = pick(p.title);
      var isPh = !p.images || !p.images.length;
      // Two images fan out as a pair: the first in front on the right, the second behind on the left
      var pair = !isPh && p.images.length === 2;
      var sheets = (pair ? [1, 0] : [0, 1, 2]).map(function (s) {
        var cls = 'sheet sheet--' + (pair ? (s ? 1 : 3) : s + 1);
        if (!isPh && p.images[s]) {
          return '<div class="' + cls + '"><img src="' + esc(p.images[s]) + '" alt="" loading="lazy" decoding="async"></div>';
        }
        var tone = (p.tones && p.tones[s]) || '#D9D5CE';
        return '<div class="' + cls + '" style="--tone:' + tone + ';--tone-ink:' + inkFor(tone) + '">' +
          '<div class="sheet__ph"><span>' + esc(t('work.image')) + ' ' + pad(s + 1) + '</span><span>' + pad(i + 1) + '</span></div></div>';
      }).join('');

      var label = title + ' — ' + pick(p.category) + ', ' + pick(p.year) + '. ' + t('work.view');

      return '<li class="project reveal" style="--d:' + (i % 3) * 90 + 'ms">' +
        '<a class="folder" href="#work" data-project="' + i + '" aria-haspopup="dialog" aria-label="' + esc(label) + '">' +
          '<div class="folder__back" aria-hidden="true"></div>' +
          '<div class="folder__sheets' + (pair ? ' folder__sheets--pair' : '') + '" aria-hidden="true">' + sheets + '</div>' +
          '<div class="folder__front">' +
            (isPh ? '<span class="folder__badge">' + esc(t('work.placeholder')) + '</span>' : '') +
            '<p class="folder__meta"><span>' + esc(pick(p.category)) + '</span><span>' + esc(pick(p.year)) + '</span></p>' +
            '<h3 class="folder__title">' + esc(title) + '</h3>' +
            '<p class="folder__desc">' + esc(pick(p.description)) + '</p>' +
            '<span class="folder__arrow" aria-hidden="true">' + ARROW + '</span>' +
          '</div>' +
        '</a></li>';
    }).join('');

    // Each folder opens its case study (bound once; the list is re-rendered on language switch)
    if (!list.dataset.bound) {
      list.dataset.bound = '1';
      list.addEventListener('click', function (e) {
        var a = e.target.closest('[data-project]');
        if (!a) return;
        e.preventDefault();
        openCase(+a.getAttribute('data-project'), a);
      });
    }
  }

  // Best work in two rows sliding opposite ways under the hero; each set is drawn twice so the
  // loop has no seam, and every image keeps its own shape (width from its w / h)
  function renderShowcase() {
    var box = document.getElementById('showcase');
    var projects = window.PROJECTS || [];
    var rows = (window.SHOWCASE || []).map(function (row) {
      return row.filter(function (it) { return projects[it.project]; });
    }).filter(function (row) { return row.length; });
    if (!box || !rows.length) return;
    box.innerHTML = rows.map(function (row, r) {
      var set = row.map(function (it) {
        var p = projects[it.project];
        return '<button class="showcase__item' + (it.book ? ' showcase__item--book' : '') + '" type="button" data-project="' + it.project + '" style="--ar: ' + it.w + ' / ' + it.h + '">' +
          (it.book ? bookHTML(it.book, true)
            : /\.(mp4|webm)$/i.test(it.src) ? '<video src="' + esc(it.src) + '" autoplay muted loop playsinline preload="auto"></video>'
            : '<img src="' + esc(it.src) + '" alt="" width="' + it.w + '" height="' + it.h + '" decoding="async">') +
          '<span class="showcase__label">' + esc(pick(p.title)) + '</span></button>';
      }).join('');
      return '<div class="showcase__track' + (r % 2 ? ' showcase__track--reverse' : '') + '" dir="ltr"><div class="showcase__group">' + set + '</div>' +
        '<div class="showcase__group" aria-hidden="true">' + set.replace(/<button /g, '<button tabindex="-1" ') + '</div></div>';
    }).join('');
    box.querySelectorAll('.flip').forEach(initBook);

    if (!box.dataset.bound) {
      box.dataset.bound = '1';
      box.addEventListener('click', function (e) {
        var b = e.target.closest('[data-project]');
        if (b) openCase(+b.getAttribute('data-project'), b);
      });
    }
  }

  function renderTimeline() {
    var ol = document.getElementById('timeline');
    if (!ol) return;
    ol.innerHTML = (window.TIMELINE || []).map(function (row, i) {
      return '<li class="reveal' + (row.pending ? ' is-pending' : '') + '" style="--d:' + i * 80 + 'ms">' +
        '<span class="timeline__period">' + esc(pick(row.period)) + '</span>' +
        '<div><p class="timeline__role">' + esc(pick(row.role)) + '</p>' +
        '<p class="timeline__org">' + esc(pick(row.org)) + '</p></div></li>';
    }).join('');
  }

  // A small still scene for each skill card
  function logo(name) { return '<img src="assets/logos/' + name + '.svg" alt="" width="28" height="28" loading="lazy" decoding="async">'; }
  var SKILL_SCENES = {
    english: '<div class="sv sv-english"><span class="sv-english__bubble">Let\u2019s talk.</span></div>',
    organized: '<ul class="sv sv-check"><li><b></b><i></i></li><li><b></b><i></i></li><li><b></b><i></i></li></ul>',
    backup: '<div class="sv sv-backup"><span>' + logo('googledrive') + '</span><i></i>' +
      '<span class="sv-backup__folders"><b></b><b></b><b></b></span><i></i>' +
      '<span><svg viewBox="0 0 24 24" fill="none" stroke="#212529" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="3" y="12" width="18" height="8" rx="2"/><path d="M5.5 12 8 4h8l2.5 8"/><path d="M7 16h.01M10 16h.01"/></svg></span></div>',
    teamtools: '<div class="sv sv-logos">' + ['trello', 'asana', 'discord', 'notion', 'obsidian'].map(function (n) {
      return '<span>' + logo(n) + '</span>'; }).join('') + '</div>',
    workspaces: '<div class="sv sv-grid">' + ['googledrive', 'microsoftteams', 'googlemeet', 'notion'].map(function (n) {
      return '<span>' + logo(n) + '</span>'; }).join('') + '</div>',
    remote: '<div class="sv sv-clock"><i class="sv-clock__h"></i><i class="sv-clock__m"></i></div>',
    deadlines: '<div class="sv sv-progress"><span><i></i></span><b></b></div>',
    feedback: '<div class="sv sv-chat"><i></i><i></i><i></i></div>',
    learning: '<div class="sv sv-grow"><i></i><i></i><i></i><i></i></div>'
  };

  function renderSkills() {
    var wrap = document.getElementById('skills-groups');
    if (!wrap) return;
    wrap.innerHTML = (window.SKILLS || []).map(function (sk, i) {
      return '<article class="glass skill-card reveal" style="--d: ' + (i % 4) * 80 + 'ms">' +
        '<div class="skill-card__scene" aria-hidden="true">' + (SKILL_SCENES[sk.kind] || '') + '</div>' +
        '<h3 class="skill-card__title">' + esc(pick(sk.title)) + '</h3>' +
        '<p class="skill-card__desc">' + esc(pick(sk.desc)) + '</p></article>';
    }).join('');
  }

  function renderContact() {
    var ul = document.getElementById('contact-links');
    if (!ul) return;
    ul.innerHTML = (window.CONTACT || []).map(function (c) {
      var inner = '<span class="contact__label">' + esc(pick(c.label)) + '</span>' +
        (c.value ? '<span class="contact__value">' + esc(pick(c.value)) + '</span>' : '') +
        '<span class="contact__arrow" aria-hidden="true">' + ARROW + '</span>';
      // Pending links render as plain text so there are no dead links
      var href = (c.booking && window.BOOKING_URL) || c.href;
      if (c.pending || !href || href === '#') {
        return '<li><div class="contact__row is-pending">' + inner + '</div></li>';
      }
      var ext = /^https?:/.test(href);
      return '<li><a class="contact__row" href="' + esc(href) + '"' +
        (ext ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + inner + '</a></li>';
    }).join('');
  }

  function renderCountries() {
    var ul = document.getElementById('countries');
    if (!ul) return;
    ul.innerHTML = (window.COUNTRIES || []).map(function (c) {
      var name = esc(pick(c.name));
      return '<li class="flag-stack__item" title="' + name + '">' +
        '<svg viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + c.flag + '</svg>' +
        '<span class="visually-hidden">' + name + '</span></li>';
    }).join('');
  }

  // Tool logo path: SVG by default; app-store icons are stored with their own extension
  function logoSrc(icon) {
    return 'assets/logos/' + esc(icon) + (/\.\w+$/.test(icon) ? '' : '.svg');
  }

  function renderTools() {
    var wrap = document.getElementById('tool-strips');
    if (!wrap) return;
    wrap.setAttribute('aria-label', t('tools.aria'));
    wrap.setAttribute('role', 'region');
    wrap.innerHTML = (window.TOOLS || []).map(function (cat, i) {
      var items = cat.items.map(function (tool) {
        var mark = tool.icon
          ? '<img src="' + logoSrc(tool.icon) + '" alt="" width="22" height="22" loading="lazy" decoding="async">'
          : '<span class="tool__mono" aria-hidden="true">' + esc(tool.name.charAt(0)) + '</span>';
        return '<li class="tool">' + mark + '<span>' + esc(tool.name) + '</span></li>';
      }).join('');
      // Visual copy for a seamless loop; screen readers read the first list only
      var copy = items.replace(/<li class="tool">/g, '<li class="tool" aria-hidden="true">');
      var dur = Math.max(28, cat.items.length * 4.5);
      return '<div class="tool-strip glass reveal" style="--d:' + i * 80 + 'ms">' +
        '<span class="tool-strip__label">' + esc(pick(cat.label)) + '</span>' +
        '<div class="tool-strip__viewport" dir="ltr"><div class="tool-strip__track' + (i % 2 ? ' is-reverse' : '') + '" style="--dur:' + dur + 's">' +
        '<ul class="tool-strip__group" role="list">' + items + copy + '</ul>' +
        '<ul class="tool-strip__group" role="list" aria-hidden="true">' + copy + copy + '</ul>' +
        '</div></div></div>';
    }).join('');
  }

  // Hero band as an empty editing timeline: a running ruler over empty V1 / A1 tracks
  var CLIP_WIDTHS = [180, 120, 240, 90, 160, 210, 130, 260, 110, 150];
  function timecode(px) {
    var frames = Math.round(px / 100 * 25); // 100px = 1s at 25fps
    function two(n) { return (n < 10 ? '0' : '') + n; }
    return '00:' + two(Math.floor(frames / 1500) % 60) + ':' + two(Math.floor(frames / 25) % 60) + ':' + two(frames % 25);
  }

  function renderHeroBand() {
    var track = document.querySelector('.hero__band-track');
    if (!track) return;
    var clips = CLIP_WIDTHS.map(function (w) {
      return '<div class="tl__seg" style="width: ' + w + 'px"><span class="tl__tc"></span></div>';
    }).join('');
    var group = '<div class="hero__band-group">' + clips + '</div>';
    track.innerHTML = group + group;
    // Ruler timecodes follow each clip's start, continuing into the repeated group
    var segs = track.querySelectorAll('.tl__seg');
    var origin = segs.length ? segs[0].offsetLeft : 0;
    segs.forEach(function (seg) {
      seg.querySelector('.tl__tc').textContent = timecode(seg.offsetLeft - origin);
    });
  }

  function renderRibbons() {
    // Ribbon A: design + video tools; B: audio, AI + workflow tools; C (the level middle one): Adobe apps only
    // (all from TOOLS in content.js)
    var tools = window.TOOLS || [];
    function isAdobe(tool) { return /^adobe/.test(tool.icon || ''); }
    function notAdobe(tool) { return !isAdobe(tool); }
    var all = [].concat.apply([], tools.map(function (cat) { return cat.items || []; }));
    var sets = [
      [].concat((tools[0] || {}).items || [], (tools[1] || {}).items || []).filter(notAdobe),
      [].concat((tools[2] || {}).items || [], (tools[3] || {}).items || [], (tools[4] || {}).items || []).filter(notAdobe),
      all.filter(isAdobe)
    ];
    document.querySelectorAll('.ribbon__track').forEach(function (track, i) {
      var items = (sets[i] || []).map(function (tool) {
        var mark = tool.icon
          ? '<img src="' + logoSrc(tool.icon) + '" alt="" width="22" height="22" decoding="async">'
          : '<span class="tool__mono">' + esc(tool.name.charAt(0)) + '</span>';
        return '<span class="ribbon__item">' + mark + '<span>' + esc(tool.name) + '</span></span>';
      }).join('');
      // Repeat so each group is wider than the (150vw) ribbon, then duplicate for a seamless loop
      var reps = Math.max(2, Math.ceil(16 / Math.max(1, (sets[i] || []).length)));
      var group = '<div class="ribbon__group">' + new Array(reps + 1).join(items) + '</div>';
      track.innerHTML = group + group;
    });

    var cta = document.getElementById('hero-cta');
    if (cta && window.BOOKING_URL) {
      cta.href = window.BOOKING_URL;
      cta.target = '_blank';
      cta.rel = 'noopener noreferrer';
    }
  }

  var STAR = '<svg viewBox="0 0 20 20"><path d="M10 1.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.6 7.7l5.8-.8z"/></svg>';

  function renderReviews() {
    var big = document.querySelector('.stars--lg');
    // 4.5 average: the last star is half filled
    if (big) big.innerHTML = [0, 1, 2, 3, 4].map(function (i) {
      return i < 4
        ? '<span class="star" style="--i:' + i + '">' + STAR + '</span>'
        : '<span class="star star--part" style="--i:' + i + '">' + STAR + '<span class="star__fill">' + STAR + '</span></span>';
    }).join('');

    var box = document.getElementById('reviews');
    // Shuffled on every load so Arabic and English reviews mix
    var list = (window.REVIEWS || []).slice();
    for (var j = list.length - 1; j > 0; j--) {
      var r = Math.floor(Math.random() * (j + 1)), tmp = list[j];
      list[j] = list[r]; list[r] = tmp;
    }
    if (!box || !list.length) return;
    var text = function (v) { return typeof v === 'string' ? v : pick(v); };
    box.innerHTML =
      '<div class="testi__stage">' + list.map(function (r, i) {
        var dir = r.lang === 'ar' ? 'rtl' : 'ltr';
        return '<figure class="testi__slide' + (i === 0 ? ' is-on' : '') + '" dir="' + dir + '"' + (i ? ' aria-hidden="true"' : '') + '>' +
          '<blockquote class="testi__quote"' + (r.lang ? ' lang="' + r.lang + '"' : '') + '>' + esc(text(r.quote)) + '</blockquote>' +
          '<figcaption><span class="testi__name" dir="auto">' + esc(text(r.name)) + '</span>' +
          '<span class="testi__role" dir="auto">' + esc(pick(r.role)) + '</span></figcaption></figure>';
      }).join('') + '</div>' +
      '<div class="testi__bar" aria-hidden="true"><i class="testi__fill"></i></div>';

    var at = 0;
    var show = function (n) {
      at = (n + list.length) % list.length;
      box.querySelectorAll('.testi__slide').forEach(function (el, i) {
        el.classList.toggle('is-on', i === at);
        if (i === at) el.removeAttribute('aria-hidden'); else el.setAttribute('aria-hidden', 'true');
      });
    };
    box._next = function () {
      show(at + 1);
      // Restart the loading bar for the next review
      var fill = box.querySelector('.testi__fill');
      fill.style.animation = 'none';
      void fill.offsetWidth;
      fill.style.animation = '';
    };
    // The loading bar under the review fills in 6 s, then the next review shows
    // (bound once; the box is re-rendered on language switch; paused on hover in CSS)
    if (!box.dataset.bound) {
      box.dataset.bound = '1';
      box.addEventListener('animationend', function (e) {
        if (e.target.classList.contains('testi__fill')) box._next();
      });
    }
  }

  /* ---------- Services: glass tabs + example preview ---------- */
  // Placeholder mock-ups per kind of work, shown until a real example image is set
  var MOCKS = {
    social: '<div class="mk mk-social"><i></i><i></i><i></i><i></i><i></i><i></i></div>',
    brand: '<div class="mk mk-brand"><b class="mk-brand__mark"></b><span class="mk-brand__type">Aa</span><span class="mk-brand__sw"><i></i><i></i><i></i><i></i></span></div>',
    video: '<div class="mk mk-video"><b class="mk-video__play"></b><span class="mk-video__bar"><i></i></span></div>',
    motion: '<div class="mk mk-motion"><i></i><i></i><i></i></div>',
    podcast: '<div class="mk mk-podcast"><span class="mk-podcast__cams"><i></i><i></i></span><span class="mk-podcast__wave">' + new Array(24).join('<i></i>') + '</span></div>',
    print: '<div class="mk mk-print"><i class="mk-print__flyer"></i><i class="mk-print__card"></i></div>',
    docs: '<div class="mk mk-docs"><span class="mk-docs__title"></span><span class="mk-docs__chart"><i></i><i></i><i></i><i></i><i></i></span></div>',
    ads: '<div class="mk mk-ads"><span class="mk-ads__line"></span><span class="mk-ads__line mk-ads__line--short"></span><b class="mk-ads__cta"></b></div>',
    email: '<div class="mk mk-email"><span class="mk-email__top"><i></i><b></b></span><span class="mk-email__hero"></span>' +
      '<span class="mk-email__line"></span><span class="mk-email__line mk-email__line--short"></span><b class="mk-email__cta"></b></div>',
    editorial: '<div class="mk mk-book"><span class="mk-book__page"><i class="mk-book__img"></i><i></i><i></i></span>' +
      '<span class="mk-book__page"><b class="mk-book__head"></b><i></i><i></i><i></i><i></i><i></i></span></div>',
    game: '<div class="mk mk-game"><b class="mk-game__hero"></b><span class="mk-game__hp"><i></i></span><span class="mk-game__slots"><i></i><i></i><i></i></span></div>'
  };
  function renderServices() {
    var grid = document.getElementById('svc-grid');
    var list = window.SERVICES || [];
    var projects = window.PROJECTS || [];
    if (!grid || !list.length) return;
    grid.innerHTML = list.map(function (svc, i) {
      var work = (svc.work || []).filter(function (p) { return projects[p]; });
      // Real work: a strip of up to 3 shots; otherwise the single image or the placeholder mock-up
      var shots = (svc.shots || work.map(function (p) { return projects[p].images[0]; })).filter(Boolean).slice(0, 3);
      var media = shots.length
        ? '<div class="svc-shots svc-shots--' + shots.length + '">' + shots.map(function (src) {
            return '<img src="' + esc(src) + '" alt="" loading="lazy" decoding="async">';
          }).join('') + '</div>'
        : svc.image
          ? '<img src="' + esc(svc.image) + '" alt="' + esc(pick(svc.title)) + '" loading="lazy" decoding="async">'
          : (MOCKS[svc.kind] || '');
      var links = work.length
        ? '<p class="svc-tile__work">' + work.map(function (p) {
            return '<button type="button" data-case="' + p + '">' + esc(pick(projects[p].title)) + '</button>';
          }).join('') + '</p>'
        : '';
      return '<article class="svc-tile glass reveal' + (shots.length ? ' svc-tile--real' : '') + '" style="--d: ' + (i % 4) * 70 + 'ms"' +
        ' data-svc="' + i + '">' +
        '<div class="svc-tile__body">' +
          '<span class="svc-tile__cat">' + esc(pick(svc.cat)) + '</span>' +
          '<h3 class="svc-tile__title">' + esc(pick(svc.title)) + '</h3>' +
          '<p class="svc-tile__desc">' + esc(pick(svc.desc)) + '</p>' +
          links +
        '</div></article>';
    }).join('');

  }

  /* ---------- Service details popup ---------- */
  var SVC_ICONS = {
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
  };

  // Building blocks for the animated examples (sized in container units of the stage)
  function rep(n, f) { var s = ''; for (var i = 0; i < n; i++) s += f(i); return s; }
  function ln(w, cls, i) {
    return '<i class="l' + (cls ? ' ' + cls : '') + '" style="--w:' + w + '%' + (i != null ? ';--i:' + i : '') + '"></i>';
  }
  function win(body) { return '<div class="sc-win"><span class="sc-win__bar"><i></i><i></i><i></i></span><div class="sc-win__body">' + body + '</div></div>'; }
  function phone(body, dark) { return '<div class="sc-phone"><div class="scr' + (dark ? ' sc-dark' : '') + '">' + body + '</div></div>'; }
  // Three simple video frames that cross-fade
  var FRAMES = rep(3, function (i) { return '<span class="sc-layer sc-fr sc-fr--' + (i + 1) + ' sc-on' + (i + 1) + '"><i></i><i></i></span>'; });

  // One looping scene per example (see SERVICE_DETAILS in content.js)
  var SCENES = {
    feed: function () {
      var post = function (c) {
        return '<span class="sc-post"><span class="sc-post__head"><i class="sc-av"></i>' + ln(40) + '</span><i class="sc-img ' + c + '"></i>' + ln(80) + ln(55) + '</span>';
      };
      return phone('<span class="sc-feed__col">' + ['ca', 'ck', 'cb', 'cc', 'ca', 'ck', 'cb', 'cc'].map(post).join('') + '</span>');
    },
    carousel: function () {
      var slides = [
        '<span class="sc-car__slide ca">' + ln(80, 'ck') + ln(50, 'ck') + '</span>',
        '<span class="sc-car__slide ck"><i class="sc-car__orb"></i>' + ln(60, 'cw') + ln(40, 'cf') + '</span>',
        '<span class="sc-car__slide cb"><i class="sc-img cc"></i>' + ln(70, 'ck') + '</span>'
      ];
      return '<div class="sc-car"><span class="sc-post__head"><i class="sc-av"></i>' + ln(36) + '</span>' +
        '<span class="sc-car__view"><span class="sc-car__track">' + slides.join('') + slides[0] + '</span></span>' +
        '<span class="sc-dots">' + rep(3, function (i) { return '<i><b class="sc-on' + (i + 1) + '"></b></i>'; }) + '</span></div>';
    },
    story: function () {
      return phone(
        '<span class="sc-layer ca sc-on1"><span class="sc-story__txt">' + ln(75, 'ck') + ln(50, 'ck') + '</span></span>' +
        '<span class="sc-layer ck sc-on2"><i class="sc-story__orb"></i><span class="sc-story__txt">' + ln(60, 'cw') + ln(35, 'cf') + '</span></span>' +
        '<span class="sc-layer cb sc-on3"><i class="sc-story__card"></i><span class="sc-story__txt">' + ln(70, 'ck') + ln(40, 'ck') + '</span></span>' +
        '<span class="sc-bars">' + rep(3, function (i) { return '<i><b class="sc-seg' + (i + 1) + '"></b></i>'; }) + '</span>' +
        '<span class="sc-story__head"><i class="sc-av"></i>' + ln(30, 'ck') + '</span>');
    },
    newsletter: function () {
      return win('<span class="sc-scroll sc-nl"><span class="sc-nl__top"><i class="sc-av"></i>' + ln(30) + '</span>' +
        '<i class="sc-img ca sc-nl__hero"></i>' + ln(70, 'ck') + ln(95) + ln(85) + ln(60) + '<b class="sc-btn"></b>' +
        '<span class="sc-nl__two"><span><i class="sc-img cb"></i>' + ln(80) + ln(50) + '</span><span><i class="sc-img cc"></i>' + ln(70) + ln(55) + '</span></span>' +
        ln(90) + ln(75) + ln(40) + '</span>');
    },
    promo: function () {
      return win('<span class="sc-promo"><span class="sc-promo__hero ck"><em class="sc-promo__pct sc-pop">-30%</em>' + ln(55, 'cf') + '</span>' +
        ln(80) + ln(60) + '<span class="sc-promo__count"><em>02</em><em>14</em><em>37</em></span><b class="sc-btn sc-pulse"></b></span>');
    },
    inbox: function () {
      return win('<span class="sc-inbox">' + rep(6, function (i) {
        return '<span class="sc-row' + (i === 0 ? ' sc-row--new' : '') + '"><i class="sc-av' + ['', ' ca', ' cc'][i % 3] + '"></i>' +
          '<span class="sc-row__txt">' + ln(30 + (i * 13) % 30, i === 0 ? 'ck' : '') + ln(70 - (i * 7) % 25) + '</span></span>';
      }) + '</span>');
    },
    logo: function () {
      return '<div class="sc-lg"><span class="sc-lg__set"><b class="sc-lg__mark sc-pop"></b><span class="sc-lg__word">' + ln(100, 'ck sc-grow', 4) + ln(60, 'sc-grow', 6) + '</span></span>' +
        '<span class="sc-lg__sw">' + ['ck', 'ca', 'cb', 'cc'].map(function (c, i) { return '<i class="' + c + ' sc-pop" style="--i:' + (8 + i) + '"></i>'; }).join('') + '</span></div>';
    },
    palette: function () {
      return '<span class="sc-pal">' + ['ck', 'ca', 'cb', 'cc', 'cd'].map(function (c, i) { return '<i class="' + c + ' sc-rise" style="--i:' + i + '"><b></b></i>'; }).join('') + '</span>';
    },
    stationery: function () {
      return '<span class="sc-stat">' +
        '<span class="sc-stat__letter sc-slide" style="--i:0;--dx:-14cqw"><i class="sc-mark-sm"></i>' + ln(40, 'ck') + rep(6, function (i) { return ln(90 - (i * 11) % 35); }) + '</span>' +
        '<span class="sc-stat__env sc-slide" style="--i:2;--dx:14cqw"><i class="sc-mark-sm"></i>' + ln(40) + '</span>' +
        '<span class="sc-stat__card ck sc-slide" style="--i:4;--dy:10cqw"><i class="sc-mark-sm cw"></i></span></span>';
    },
    player: function () {
      return '<div class="sc-screen">' + FRAMES + '<b class="sc-play"></b><span class="sc-player__bar"><i><b class="sc-fill"></b></i>' + ln(12, 'cf') + '</span></div>';
    },
    reel: function () {
      var words = lang() === 'ar' ? ['شاهد', 'الفكرة', 'كاملة'] : ['Watch', 'this', 'idea'];
      return phone(FRAMES + '<span class="sc-reel__side"><i></i><i></i><i></i></span>' +
        '<span class="sc-reel__cap">' + words.map(function (w, i) { return '<em class="sc-on' + (i + 1) + '">' + esc(w) + '</em>'; }).join('') + '</span>' +
        '<span class="sc-reel__bar"><b class="sc-fill"></b></span>', true);
    },
    timeline: function () {
      var rows = [
        [[30, 22, 'cc']],
        [[0, 28, 'ca'], [29, 34, 'cb'], [64, 36, 'cg']],
        [[0, 100, 'sc-tl__audio']]
      ];
      return '<div class="sc-tl"><div class="sc-tl__view">' + FRAMES + '</div><div class="sc-tl__tracks">' + rows.map(function (r) {
        return '<span class="sc-tl__row">' + r.map(function (c) { return '<i class="' + c[2] + '" style="left:' + c[0] + '%;width:' + c[1] + '%"></i>'; }).join('') + '</span>';
      }).join('') + '<i class="sc-head"></i></div></div>';
    },
    reveal: function () {
      return '<i class="sc-rv__disc"></i><span class="sc-rv"><b class="sc-rv__mark sc-pop" style="--i:6"></b><span class="sc-rv__word">' + ln(100, 'cw sc-grow', 9) + ln(60, 'cf sc-grow', 11) + '</span></span>';
    },
    kinetic: function () {
      var words = lang() === 'ar' ? ['أفكار', 'جريئة', 'تتحرك'] : ['Bold', 'ideas', 'move.'];
      return '<span class="sc-kin">' + words.map(function (w, i) {
        return '<em class="sc-slide" dir="auto" style="--i:' + i * 2 + ';--dx:' + (i % 2 ? '' : '-') + '18cqw">' + esc(w) + '</em>';
      }).join('') + '<i class="sc-kin__bar ca sc-grow" style="--i:7"></i></span>';
    },
    shapes: function () {
      return MOCKS.motion + '<span class="sc-shapes__cap">' + ln(50, 'ck sc-grow', 2) + ln(32, 'sc-grow', 4) + '</span>';
    },
    studio: function () {
      return '<div class="sc-st"><span class="sc-st__grid">' + [['ca', 'sc-half1'], ['cc', 'sc-half2']].map(function (c) {
        return '<span class="sc-cam"><i class="sc-cam__ring ' + c[1] + '"></i><i class="sc-cam__head ' + c[0] + '"></i><i class="sc-cam__body ' + c[0] + '"></i><span class="sc-cam__name">' + ln(100, 'cf') + '</span></span>';
      }).join('') + '</span><span class="sc-st__bar"><i class="sc-rec"></i>' + ln(10, 'ck') +
        '<span class="sc-mini">' + rep(18, function (i) { return '<i style="--i:' + i % 7 + '"></i>'; }) + '</span></span></div>';
    },
    wave: function () {
      return '<div class="sc-wv"><span class="sc-wv__bars">' + rep(44, function (i) { return '<i style="--h:' + (22 + (i * 37) % 70) + '%;--i:' + i % 7 + '"></i>'; }) + '</span>' +
        '<i class="sc-wv__cut" style="left:30%"></i><i class="sc-wv__cut" style="left:68%"></i><i class="sc-head"></i></div>';
    },
    episode: function () {
      return '<div class="sc-ep"><b class="sc-ep__cover ck"><i class="sc-mark-sm cw"></i>' + ln(70, 'cw') + ln(45, 'cf') + '</b><span class="sc-ep__list">' + rep(3, function (i) {
        return '<span class="sc-ep__row"><i class="sc-ep__play' + (i === 0 ? ' ck' : '') + '"></i><span>' + ln(70 - i * 10, i === 0 ? 'ck' : '') + ln(45) +
          (i === 0 ? '<i class="sc-ep__prog"><b class="sc-fill"></b></i>' : '') + '</span></span>';
      }) + '</span></div>';
    },
    card: function () {
      return '<div class="sc-flip"><span class="sc-flip__face ck"><i class="sc-mark"></i></span>' +
        '<span class="sc-flip__face sc-flip__back"><i class="sc-mark-sm"></i>' + ln(55, 'ck') + ln(40) + ln(48) + '</span></div>';
    },
    brochure: function () {
      return '<div class="sc-bro">' +
        '<span class="sc-bro__p sc-bro__l"><i class="sc-img cb"></i>' + ln(70, 'ck') + ln(90) + ln(80) + ln(60) + '</span>' +
        '<span class="sc-bro__p sc-bro__m">' + ln(60, 'ck') + ln(90) + ln(85) + '<i class="sc-img ca"></i>' + ln(70) + '</span>' +
        '<span class="sc-bro__p sc-bro__r"><i class="sc-mark-sm"></i>' + ln(80, 'ck') + ln(50) + '<i class="sc-img cc"></i></span></div>';
    },
    flyer: function () {
      return '<span class="sc-fly sc-fly--back cb"></span><span class="sc-fly"><i class="sc-img ca sc-fly__img"><b></b></i>' + ln(80, 'ck') + ln(55, 'ck') + ln(90) + ln(70) +
        '<span class="sc-fly__foot">' + ln(40) + '<i class="sc-fly__qr"></i></span></span>';
    },
    spread: function () {
      return '<div class="sc-book">' +
        '<span class="sc-book__pg"><i class="sc-img cb"></i>' + ln(90) + ln(80) + ln(85) + ln(60) + '</span>' +
        '<span class="sc-book__pg">' + ln(70, 'ck') + ln(95) + ln(90) + ln(85) + ln(92) + ln(70) + ln(88) + ln(50) + '</span>' +
        '<span class="sc-book__turn"><span class="sc-book__pg sc-book__front">' + ln(60, 'ck') + '<i class="sc-img ca"></i>' + ln(90) + ln(75) + '</span>' +
        '<span class="sc-book__pg sc-book__back">' + ln(85) + ln(90) + ln(70) + '<i class="sc-img cc"></i>' + ln(80) + '</span></span></div>';
    },
    cover: function () {
      return '<span class="sc-mag sc-mag--back"></span><span class="sc-mag"><em class="sc-mag__mast">' + (lang() === 'ar' ? 'استوديو' : 'STUDIO') + '</em><i class="sc-mag__fig"></i>' +
        '<span class="sc-mag__lines">' + ln(90, 'cw sc-slide', 3) + ln(60, 'cw sc-slide', 4) + ln(75, 'cf sc-slide', 5) + '</span><i class="sc-mag__code"></i></span>';
    },
    columns: function () {
      return '<div class="sc-cols"><span class="sc-cols__head">' + ln(50, 'ck sc-grow', 0) + '</span><span class="sc-cols__grid">' + rep(3, function (c) {
        return '<span>' + (c === 1 ? '<i class="sc-img cb sc-pop" style="--i:2"></i>' : '') +
          rep(c === 1 ? 4 : 8, function (r) { return ln(100 - (r * 17 + c * 7) % 30, 'sc-grow', 2 + c * 2 + r); }) + '</span>';
      }) + '</span></div>';
    },
    deck: function () {
      var slides = [
        '<span class="sc-dk__s"><i class="sc-mark-sm"></i><span class="sc-dk__t">' + ln(70, 'ck') + ln(45) + '</span></span>',
        '<span class="sc-dk__s sc-dk__s--chart"><span class="sc-dk__bars"><i style="height:40%"></i><i style="height:65%"></i><i style="height:50%"></i><i style="height:85%"></i></span>' +
          '<span class="sc-dk__t">' + ln(80, 'ck') + ln(60) + ln(70) + '</span></span>',
        '<span class="sc-dk__s ck"><em class="sc-dk__num">3x</em>' + ln(50, 'cf') + '</span>'
      ];
      return '<div class="sc-dk"><span class="sc-dk__view"><span class="sc-dk__track">' + slides.join('') + slides[0] + '</span></span>' +
        '<span class="sc-dk__thumbs">' + rep(3, function (i) { return '<i><b class="sc-on' + (i + 1) + '"></b></i>'; }) + '</span></div>';
    },
    chart: function () {
      return '<div class="sc-ch"><span class="sc-ch__card">' + ln(40, 'ck') + '<span class="sc-ch__bars">' +
        [35, 55, 45, 70, 60, 90].map(function (h, i) { return '<i class="sc-rise' + (i === 5 ? ' ck' : '') + '" style="--i:' + i + ';height:' + h + '%"></i>'; }).join('') +
        '<svg class="sc-ch__line" viewBox="0 0 100 40" preserveAspectRatio="none"><path pathLength="1" d="M2 30 L20 24 L38 27 L56 15 L74 12 L98 3"/></svg></span></span>' +
        '<span class="sc-ch__side"><i class="sc-ch__donut sc-pop" style="--i:6"></i>' + ln(70, 'ck') + ln(50) + '</span></div>';
    },
    report: function () {
      return '<div class="sc-rep"><span class="sc-scroll sc-rep__body"><i class="sc-mark-sm"></i>' + ln(70, 'ck') + ln(45) + ln(95) + ln(90) + ln(85) + ln(60) +
        '<span class="sc-rep__table">' + rep(4, function (r) { return '<span>' + ln(30, r ? '' : 'ck') + ln(20, r ? '' : 'ck') + ln(25, r ? '' : 'ck') + '</span>'; }) + '</span>' +
        '<span class="sc-rep__bars"><i style="height:45%"></i><i style="height:70%"></i><i style="height:55%"></i><i style="height:90%"></i><i style="height:65%"></i></span>' +
        ln(90) + ln(85) + ln(70) + ln(40) + '</span></div>';
    },
    offer: function () {
      return '<div class="sc-ad"><em class="sc-ad__pct sc-pop" style="--i:2">-30%</em>' + ln(70, 'ck') + ln(45, 'ck') + '<b class="sc-ad__cta"></b>' +
        '<svg class="sc-cursor" viewBox="0 0 24 24"><path d="M5 3l14 8-6.2 1.6L10 19z"/></svg></div>';
    },
    banners: function () {
      return '<div class="sc-ban"><span class="sc-ban__lb ca sc-pop"><i class="sc-mark-sm"></i>' + ln(40, 'ck') + '<b class="sc-ban__cta"></b></span>' +
        '<span class="sc-ban__sq ck sc-pop" style="--i:3">' + ln(70, 'cw') + ln(45, 'cf') + '<b class="sc-ban__cta cw"></b></span>' +
        '<span class="sc-ban__sky cb sc-pop" style="--i:6"><i class="sc-img cc"></i>' + ln(80, 'ck') + ln(55, 'ck') + '<b class="sc-ban__cta"></b></span></div>';
    },
    storyad: function () {
      return phone('<span class="sc-sad ca"><span class="sc-bars"><i><b class="sc-fill"></b></i></span><span class="sc-story__head"><i class="sc-av"></i>' + ln(30, 'ck') + '</span>' +
        '<i class="sc-sad__prod ck"></i>' + ln(70, 'ck') + ln(45, 'ck') + '<span class="sc-sad__up"><i></i>' + ln(40, 'ck') + '</span></span>');
    },
    hero: function () {
      return '<div class="sc-gm"><span class="sc-gm__stage"><i class="sc-gm__shadow"></i><span class="sc-gm__char"><i class="sc-gm__head"></i><i class="sc-gm__body"></i></span></span>' +
        '<span class="sc-gm__stats">' + ln(50, 'cw') + ln(30, 'cf') + '<i class="sc-gm__hp"><b></b></i><span class="sc-gm__stars"><i></i><i></i><i></i></span></span></div>';
    },
    icons: function () {
      return '<div class="sc-ico">' + ['circle', 'diamond', 'tri', 'star', 'hex', 'plus', 'drop', 'ring', 'bolt'].map(function (s, i) {
        return '<i class="sc-pop" style="--i:' + i + '"><b class="sc-ico__' + s + '"></b></i>';
      }).join('') + '</div>';
    },
    hud: function () {
      return '<div class="sc-hd"><span class="sc-hd__bars"><i class="sc-hd__hp"><b></b></i><i class="sc-hd__mp"><b></b></i></span><i class="sc-hd__map"><b></b></i>' +
        '<span class="sc-hd__slots">' + rep(5, function () { return '<i><b></b></i>'; }) + '<i class="sc-hd__sel"></i></span><b class="sc-hd__btn"></b></div>';
    }
  };

  var svcModal = document.getElementById('svc-modal');
  var svcAt = -1, svcEx = 0, svcFrom = null;

  function svcDetails(i) {
    var svc = (window.SERVICES || [])[i];
    return svc ? (window.SERVICE_DETAILS || {})[svc.kind] || {} : {};
  }
  function toolName(icon) {
    var found = icon;
    (window.TOOLS || []).forEach(function (cat) {
      (cat.items || []).forEach(function (it) { if (it.icon === icon) found = it.name; });
    });
    return found;
  }
  function sceneHTML(ex) {
    if (ex.src) {
      return /\.(mp4|webm)$/i.test(ex.src)
        ? '<video src="' + esc(ex.src) + '" autoplay muted loop playsinline></video>'
        : '<img src="' + esc(ex.src) + '" alt="' + esc(pick(ex.label)) + '">';
    }
    return SCENES[ex.scene] ? '<div class="sc sc--' + ex.scene + '" aria-hidden="true">' + SCENES[ex.scene]() + '</div>' : '';
  }

  // Show the current example and restart its progress line under the tab
  function renderSvcStage() {
    var exs = svcDetails(svcAt).examples || [];
    var stage = document.getElementById('svc-stage');
    if (stage) stage.innerHTML = exs[svcEx] ? sceneHTML(exs[svcEx]) : '';
    svcModal.querySelectorAll('.svc-modal__tab').forEach(function (tab, i) {
      var on = i === svcEx;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
      var fill = tab.querySelector('.svc-modal__fill');
      fill.style.animation = 'none';
      void fill.offsetWidth;
      fill.style.animation = '';
    });
  }

  function renderSvcModal() {
    var svc = (window.SERVICES || [])[svcAt];
    if (!svc) return;
    var d = svcDetails(svcAt), exs = d.examples || [];
    var block = function (title, html) { return '<div class="svc-modal__block"><h3>' + esc(title) + '</h3>' + html + '</div>'; };
    document.getElementById('svc-modal-body').innerHTML =
      '<div class="svc-modal__show">' +
        '<div class="svc-modal__stage" id="svc-stage" dir="ltr"></div>' +
        (exs.length > 1 ? '<div class="svc-modal__tabs" role="tablist" aria-label="' + esc(t('services.examples')) + '">' + exs.map(function (ex, i) {
          return '<button class="svc-modal__tab" type="button" role="tab" data-ex="' + i + '"><span>' + esc(pick(ex.label)) + '</span>' +
            '<span class="svc-modal__track"><i class="svc-modal__fill"></i></span></button>';
        }).join('') + '</div>' : '') +
      '</div>' +
      '<div class="svc-modal__info">' +
        '<div class="svc-modal__head"><span class="svc-modal__cat">' + esc(pick(svc.cat)) + '</span>' +
          '<h2 class="svc-modal__title" id="svc-modal-title">' + esc(pick(svc.title)) + '</h2></div>' +
        '<p class="svc-modal__about">' + esc(pick(d.about) || pick(svc.desc)) + '</p>' +
        (d.includes ? block(t('services.includes'), '<ul class="svc-modal__list" role="list">' + d.includes.map(function (it) {
          return '<li>' + SVC_ICONS.check + '<span>' + esc(pick(it)) + '</span></li>';
        }).join('') + '</ul>') : '') +
        '<div class="svc-modal__meta">' +
          (d.tools ? block(t('services.tools'), '<div class="svc-modal__tools">' + d.tools.map(function (n) {
            var name = esc(toolName(n));
            return '<span title="' + name + '"><img src="' + logoSrc(n) + '" alt="' + name + '" width="22" height="22"></span>';
          }).join('') + '</div>') : '') +
          (d.formats ? block(t('services.formats'), '<p class="svc-modal__formats">' + esc(pick(d.formats)) + '</p>') : '') +
        '</div>' +
        '<div class="svc-modal__foot">' +
          '<a class="svc-modal__cta" href="#contact" data-act="contact">' + esc(t('services.cta')) + SVC_ICONS.arrow + '</a>' +
          '<div class="svc-modal__nav">' +
            '<button type="button" data-act="prev" aria-label="' + esc(t('services.prev')) + '">' + SVC_ICONS.prev + '</button>' +
            '<button type="button" data-act="next" aria-label="' + esc(t('services.next')) + '">' + SVC_ICONS.next + '</button>' +
          '</div></div>' +
      '</div>';
    renderSvcStage();
  }

  function openSvc(i, from) {
    if (!svcModal || svcModal.open) return;
    svcAt = i; svcEx = 0; svcFrom = from || null;
    renderSvcModal();
    svcModal.classList.remove('is-closing');
    root.classList.add('modal-open');
    svcModal.showModal();
    svcModal.querySelector('.svc-modal__scroll').scrollTop = 0;
  }
  function closeSvc(then) {
    if (!svcModal.open || svcModal.classList.contains('is-closing')) return;
    svcModal.classList.add('is-closing');
    setTimeout(function () { svcModal.close(); if (then) then(); }, reduceMotion.matches ? 0 : 220);
  }
  // Move to the previous / next service without closing the popup
  function stepSvc(dir) {
    var n = (window.SERVICES || []).length;
    svcAt = (svcAt + dir + n) % n;
    svcEx = 0;
    svcModal.classList.add('is-swapping');
    setTimeout(function () {
      renderSvcModal();
      svcModal.querySelector('.svc-modal__scroll').scrollTop = 0;
      svcModal.classList.remove('is-swapping');
      var b = svcModal.querySelector('[data-act="' + (dir > 0 ? 'next' : 'prev') + '"]');
      if (b) b.focus({ preventScroll: true });
    }, reduceMotion.matches ? 0 : 180);
  }

  if (svcModal) {
    svcModal.addEventListener('click', function (e) {
      if (e.target === svcModal) { closeSvc(); return; } // click outside the card
      var tab = e.target.closest('[data-ex]');
      if (tab) { svcEx = +tab.getAttribute('data-ex'); renderSvcStage(); return; }
      var a = e.target.closest('[data-act]');
      if (!a) return;
      var act = a.getAttribute('data-act');
      if (act === 'close') closeSvc();
      else if (act === 'prev') stepSvc(-1);
      else if (act === 'next') stepSvc(1);
      else if (act === 'contact') {
        e.preventDefault();
        closeSvc(function () {
          var c = document.getElementById('contact');
          if (c) c.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth' });
        });
      }
    });
    svcModal.addEventListener('cancel', function (e) { e.preventDefault(); closeSvc(); });
    svcModal.addEventListener('close', function () {
      if (svcModal.open) return; // reopened before this event arrived
      svcModal.classList.remove('is-closing', 'is-swapping');
      root.classList.remove('modal-open');
      document.getElementById('svc-modal-body').innerHTML = '';
      if (svcFrom) svcFrom.focus({ preventScroll: true });
    });
    // Arrow keys switch examples on the tabs, and services everywhere else
    svcModal.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      var step = (e.key === 'ArrowRight' ? 1 : -1) * (root.dir === 'rtl' ? -1 : 1);
      if (e.target.closest('.svc-modal__tab')) {
        var n = (svcDetails(svcAt).examples || []).length;
        svcEx = (svcEx + step + n) % n;
        renderSvcStage();
        svcModal.querySelectorAll('.svc-modal__tab')[svcEx].focus();
      } else {
        stepSvc(step);
      }
      e.preventDefault();
    });
    // When the progress line under the active tab fills, play the next example
    svcModal.addEventListener('animationend', function (e) {
      if (!e.target.classList.contains('svc-modal__fill')) return;
      var n = (svcDetails(svcAt).examples || []).length;
      if (n < 2) return;
      svcEx = (svcEx + 1) % n;
      renderSvcStage();
    });
  }

  /* ---------- Project case study popup ---------- */
  var csModal = document.getElementById('cs-modal');
  var csAt = -1, csFrom = null, csIO = null, csTimer = null;

  // Image or looping video, or a labelled placeholder in one of the project's tones
  function csMedia(src, alt, tone, label, poster) {
    if (src) {
      return /\.(mp4|webm)$/i.test(src)
        // with a poster the video is a film to watch with sound: controls and no autoplay
        ? (poster ? '<video src="' + esc(src) + '" poster="' + esc(poster) + '" controls controlslist="nodownload noplaybackrate" disablepictureinpicture playsinline preload="none"></video>'
          : '<video src="' + esc(src) + '" autoplay muted loop playsinline></video>')
        : '<img src="' + esc(src) + '" alt="' + esc(alt) + '" loading="lazy" decoding="async">';
    }
    return '<div class="cs-ph" style="--tone:' + tone + ';--tone-ink:' + inkFor(tone) + '"><span>' + esc(label) + '</span></div>';
  }

  function renderCase() {
    var list = window.PROJECTS || [];
    var p = list[csAt];
    if (!p) return;
    var c = p.case || {};
    var tones = p.tones && p.tones.length ? p.tones : ['#D9D5CE', '#C8C0B3', '#8F9A8B'];
    var tone = function (n) { return tones[n % tones.length]; };
    var tbd = function (v) { return pick(v) || t('case.tbd'); };
    var next = list[(csAt + 1) % list.length];

    // Steps that play one after another, with their names along the bottom
    var framesHTML = function (frames) {
      return '<div class="cs-frames">' + frames.map(function (f, n) {
        return '<img src="' + esc(f.src) + '" alt="' + esc(pick(f.label)) + '"' + (n ? ' loading="lazy"' : '') + ' decoding="async">';
      }).join('') + '<p class="cs-frames__steps">' + frames.map(function (f, n) {
        return '<span><b>' + pad(n + 1) + '</b> ' + esc(pick(f.label)) + '</span>';
      }).join('') + '</p></div>';
    };
    var pct = function (v) { return (v * 100).toFixed(3) + '%'; };
    // A screen rebuilt from its PSD layers; each layer animates in when the stage scrolls into view
    // scene: a full-bleed stage used as a cover, with no phone frame
    var stageHTML = function (st, scene) {
      var W = st.w || 610, H = st.h || 1080;
      return '<div class="cs-stage cs-r' + (scene ? ' cs-stage--scene' : '') + (st.glow ? ' cs-stage--glow' : '') + '" style="aspect-ratio:' + W + ' / ' + H + '" aria-hidden="true">' +
        '<img class="cs-stage__bg' + (st.fx ? ' cs-fx-' + st.fx : '') + '" src="' + esc(st.bg) + '" alt="" loading="lazy" decoding="async">' +
        (st.layers || []).map(function (l) {
          return '<div class="cs-stage__l cs-a-' + (l.anim || 'fade') + '" style="left:' + pct(l.x / W) + ';top:' + pct(l.y / H) + ';width:' + pct(l.w / W) + ';--t:' + (l.t || 0) + 'ms' + (l.blend ? ';mix-blend-mode:' + esc(l.blend) : '') + '">' +
            '<img' + (l.loop ? ' class="cs-loop-' + l.loop + '"' : '') + ' src="' + esc(l.src) + '" alt="" loading="lazy" decoding="async"></div>';
        }).join('') + '</div>';
    };

    // Hero cover: launch posts tilt in from the sides while three phone screens rise in the middle
    var heroHTML = function (h) {
      var posts = h.posts || [];
      return '<div class="cs-hero"' + (h.bg ? ' style="--hero-bg:url(&quot;' + esc(h.bg) + '&quot;)"' : '') + '>' +
        posts.map(function (src, n) {
          return '<img class="cs-hero__post cs-hero__post--' + (n ? 'r' : 'l') + '" src="' + esc(src) + '" alt="" decoding="async">';
        }).join('') +
        '<div class="cs-hero__phones">' + (h.screens || []).map(function (src, n) {
          return '<div class="cs-hero__phone" style="--i:' + n + '"><img src="' + esc(src) + '" alt="" decoding="async"></div>';
        }).join('') + '</div></div>';
    };

    var frames = Array.isArray(c.cover) ? c.cover : null;
    var hero = !!(c.cover && c.cover.hero);
    var cover = frames
      ? framesHTML(frames)
      : hero
      ? heroHTML(c.cover.hero)
      : c.cover && c.cover.stage
      ? stageHTML(c.cover.stage, true)
      : c.cover && c.cover.screens
      ? '<div class="cs-screens">' + c.cover.screens.map(function (src, n) {
          return '<img src="' + esc(src) + '" alt="" style="--i:' + n + '" decoding="async">';
        }).join('') + '</div>'
      : c.cover
      ? csMedia(c.cover, pick(p.title))
      : '<div class="cs-cover-ph" aria-hidden="true">' + [0, 1, 2].map(function (n) {
          return '<span class="cs-cover-ph__sheet" style="--tone:' + tone(n) + ';--tone-ink:' + inkFor(tone(n)) + '">' +
            '<b>' + esc(t('work.image')) + ' ' + pad(n + 1) + '</b></span>';
        }).join('') + '<em>' + esc(t('case.cover')) + '</em></div>';

    var facts = [
      ['case.client', tbd(c.client)],
      ['case.role', tbd(c.role)],
      ['case.deliverables', c.deliverables && c.deliverables.length ? c.deliverables.map(pick).join(', ') : t('case.tbd')]
    ];

    var story = ['challenge', 'approach', 'solution'].map(function (k, n) {
      return '<div class="cs__step cs-r" style="--d:' + n * 90 + 'ms"><span class="cs__num">' + pad(n + 1) + '</span>' +
        '<h3>' + esc(t('case.' + k)) + '</h3><p>' + esc(pick(c[k]) || t('case.text')) + '</p></div>';
    }).join('');

    var galleryHTML = function (items) { return items.map(function (g, n) {
        var cap = pick(g.caption);
        var size = g.size === 'half' || g.size === 'third' ? g.size : 'wide';
        return '<figure class="cs__shot cs__shot--' + size + (g.fit === 'contain' ? ' cs__shot--contain' : '') + ' cs-r"' +
          (g.ratio ? ' style="--ratio:' + esc(g.ratio) + '"' : '') + '>' +
          csMedia(g.src, cap || pick(p.title), tone(n + 1), t('work.image') + ' ' + pad(n + 1), g.poster) +
          (cap ? '<figcaption>' + esc(cap) + '</figcaption>' : '') + '</figure>';
      }).join(''); };
    var gallery = galleryHTML(c.gallery && c.gallery.length ? c.gallery : [{ size: 'wide' }, { size: 'half' }, { size: 'half' }, { size: 'wide' }]);

    // Story chapters: text beside an animated screen, steps or a phone shot; galleries run full width under their text
    var chapters = (c.story || []).map(function (ch, n) {
      // Screens sit in a phone frame on a soft panel tinted with the project's tones
      var media = ch.book ? '<div class="cs-r">' + bookHTML(ch.book) + '</div>'
        : ch.stage ? '<div class="cs-panel">' + stageHTML(ch.stage) + '</div>'
        : ch.frames ? '<div class="cs-ch__frames cs-r">' + framesHTML(ch.frames) + '</div>'
        : ch.image ? '<div class="cs-panel"><div class="cs-phone cs-r"><img src="' + esc(ch.image) + '" alt="' + esc(pick(ch.title)) + '" loading="lazy" decoding="async"></div></div>'
        : ch.gallery ? '<div class="cs__gallery">' + galleryHTML(ch.gallery) + '</div>' : '';
      var wide = !!(ch.gallery || ch.frames || ch.book);
      return '<section class="cs-ch' + (wide ? ' cs-ch--wide' : n % 2 ? ' cs-ch--flip' : '') + '">' +
        '<div class="cs-ch__text cs-r"><span class="cs__num">' + pad(n + 1) + '</span>' +
          '<h3>' + esc(pick(ch.title)) + '</h3><p>' + esc(pick(ch.text)) + '</p></div>' +
        '<div class="cs-ch__media">' + media + '</div></section>';
    }).join('');

    var quote = c.quote || {};
    var said = function (v) { return typeof v === 'string' ? v : pick(v); };
    // A client message kept in its original language, styled like a WhatsApp chat (typing dots, then the message)
    var quoteHTML = quote.chat
      ? '<figure class="cs__chat cs-r" dir="' + (quote.lang === 'ar' ? 'rtl' : 'ltr') + '"' + (quote.lang ? ' lang="' + esc(quote.lang) + '"' : '') + '>' +
          '<figcaption class="cs__chat-head"><span class="cs__chat-av" aria-hidden="true">' + esc(said(quote.name).charAt(0)) + '</span>' +
            '<span><b>' + esc(said(quote.name)) + '</b><small>' + esc(said(quote.role)) + '</small></span></figcaption>' +
          '<div class="cs__chat-body"><span class="cs__chat-typing" aria-hidden="true"><i></i><i></i><i></i></span>' +
            '<blockquote class="cs__chat-msg"><p>' + esc(said(quote.text)) + '</p></blockquote></div></figure>'
      : '<blockquote class="cs__quote cs-r"><p>' + esc(said(quote.text) || t('case.quote')) + '</p>' +
          '<cite>' + esc(said(quote.name) || t('case.tbd')) + '</cite></blockquote>';

    document.getElementById('cs-modal-body').innerHTML =
      '<article class="cs" style="--c1:' + tone(0) + ';--c2:' + tone(1) + ';--c3:' + tone(2) + '">' +
        '<header class="cs__head cs-r">' +
          '<p class="cs__meta"><span>' + esc(t('case.study')) + '</span><span>' + esc(pick(p.category)) + '</span><span>' + esc(pick(p.year)) + '</span></p>' +
          '<h2 class="cs__title" id="cs-modal-title">' + esc(pick(p.title)) + '</h2>' +
          '<p class="cs__lede">' + esc(pick(p.description)) + '</p>' +
        '</header>' +
        '<div class="cs__cover' + (hero ? ' cs__cover--hero' : '') + ' cs-r">' + cover + '</div>' +
        '<dl class="cs__facts cs-r">' + facts.map(function (f) {
          return '<div><dt>' + esc(t(f[0])) + '</dt><dd>' + esc(f[1]) + '</dd></div>';
        }).join('') +
          (c.tools && c.tools.length ? '<div><dt>' + esc(t('case.tools')) + '</dt><dd class="svc-modal__tools">' + c.tools.map(function (n) {
            var name = esc(toolName(n));
            return '<span title="' + name + '"><img src="' + logoSrc(n) + '" alt="' + name + '" width="22" height="22"></span>';
          }).join('') + '</dd></div>' : '') +
        '</dl>' +
        (chapters ? '<div class="cs-chapters">' + chapters + '</div>'
          : '<section class="cs__story">' + story + '</section><section class="cs__gallery">' + gallery + '</section>') +
        // A finished story without a review shows no quote rather than a placeholder
        (c.quote || !c.story ? quoteHTML : '') +
        '<footer class="cs__foot">' +
          '<div class="cs__ctas">' +
            '<a class="svc-modal__cta" href="#contact" data-act="contact">' + esc(t('services.cta')) + SVC_ICONS.arrow + '</a>' +
            (p.url && p.url !== '#' ? '<a class="cs__live" href="' + esc(p.url) + '" target="_blank" rel="noopener">' + esc(t('case.live')) + ARROW + '</a>' : '') +
          '</div>' +
          '<div class="cs__next">' +
            '<button type="button" class="cs__nextbtn" data-act="next" aria-label="' + esc(t('case.next') + ': ' + pick(next.title)) + '">' +
              '<span>' + esc(t('case.next')) + '</span><b>' + esc(pick(next.title)) + '</b></button>' +
            '<div class="svc-modal__nav">' +
              '<button type="button" data-act="prev" aria-label="' + esc(t('case.prev')) + '">' + SVC_ICONS.prev + '</button>' +
              '<button type="button" data-act="next" aria-label="' + esc(t('case.next')) + '">' + SVC_ICONS.next + '</button>' +
            '</div></div>' +
        '</footer>' +
      '</article>';

    // Step sequences: show each step in turn (only the final step with reduced motion)
    clearInterval(csTimer);
    var seqs = Array.prototype.map.call(csModal.querySelectorAll('.cs-frames'), function (box) {
      var n = box.querySelectorAll('img').length;
      return { n: n, step: reduceMotion.matches ? n - 1 : 0, els: box.querySelectorAll('img, .cs-frames__steps span') };
    });
    var showSteps = function () {
      seqs.forEach(function (q) { q.els.forEach(function (el, k) { el.classList.toggle('is-on', k % q.n === q.step); }); });
    };
    showSteps();
    if (seqs.length && !reduceMotion.matches) {
      csTimer = setInterval(function () {
        seqs.forEach(function (q) { q.step = (q.step + 1) % q.n; });
        showSteps();
      }, 1800);
    }

    // Sections fade up as they scroll into view inside the popup.
    // Looping motion only runs while a section is on screen (is-live), so off-screen stages cost nothing.
    csModal.querySelectorAll('.flip').forEach(initBook);
    var els = csModal.querySelectorAll('.cs-r');
    if (csIO) csIO.disconnect();
    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    csIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) en.target.classList.add('is-in');
        en.target.classList.toggle('is-live', en.isIntersecting);
      });
    }, { root: csModal.querySelector('.svc-modal__scroll'), rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { csIO.observe(el); });
  }

  /* ---------- Flipbook: a magazine read page by page ---------- */
  // book: { dir: 'assets/.../q3/', pages: 72, ext: 'webp' } — pages are 000.webp, 001.webp …
  // Spread 0 is the cover alone on the right; spread k shows pages 2k-1 and 2k.
  var FLIP_ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
  function bookHTML(b, auto) {
    return '<div class="flip' + (auto ? ' flip--auto' : '') + '" dir="ltr" data-dir="' + esc(b.dir) + '" data-pages="' + b.pages + '" data-ext="' + esc(b.ext || 'webp') + '"' + (auto ? ' data-auto="1"' + (b.spreads ? ' data-spreads="' + b.spreads.join(',') + '"' : '') : '') + '>' +
      '<div class="flip__stage"><div class="flip__book">' +
        '<div class="flip__page flip__page--l"><img alt=""></div>' +
        '<div class="flip__page flip__page--r"><img alt=""></div>' +
        '<div class="flip__leaf"><div class="flip__face flip__face--front"><img alt=""></div><div class="flip__face flip__face--back"><img alt=""></div></div>' +
      '</div></div>' + (auto ? '</div>' :
      '<div class="flip__bar">' +
        '<button class="flip__btn flip__btn--prev" type="button" aria-label="' + esc(t('flip.prev')) + '">' + FLIP_ARROW + '</button>' +
        '<span class="flip__count"></span>' +
        '<button class="flip__btn flip__btn--next" type="button" aria-label="' + esc(t('flip.next')) + '">' + FLIP_ARROW + '</button>' +
      '</div></div>');
  }

  function initBook(el) {
    var dir = el.getAttribute('data-dir'), n = +el.getAttribute('data-pages'), ext = el.getAttribute('data-ext');
    var book = el.querySelector('.flip__book'), leaf = el.querySelector('.flip__leaf');
    var L = el.querySelector('.flip__page--l img'), R = el.querySelector('.flip__page--r img');
    var F = el.querySelector('.flip__face--front img'), B = el.querySelector('.flip__face--back img');
    var last = Math.ceil(n / 2), s = 0, busy = false, count = el.querySelector('.flip__count');
    var url = function (p) { return p >= 0 && p < n ? dir + ('00' + p).slice(-3) + '.' + ext : ''; };
    var left = function (k) { return k > 0 ? 2 * k - 1 : -1; };
    var right = function (k) { return 2 * k < n ? 2 * k : -1; };
    var set = function (img, p) { var u = url(p); img.parentNode.classList.toggle('is-empty', !u); if (u) img.src = u; else img.removeAttribute('src'); };
    var preload = function (k) { [left(k), right(k)].forEach(function (p) { var u = url(p); if (u) (new Image()).src = u; }); };
    function draw() {
      set(L, left(s)); set(R, right(s));
      book.classList.toggle('is-cover', s === 0);
      book.classList.toggle('is-back', right(s) < 0);
      if (count) {
        count.textContent = s === 0 ? '1 / ' + n : (left(s) + 1) + (right(s) >= 0 ? '–' + (right(s) + 1) : '') + ' / ' + n;
        el.querySelector('.flip__btn--prev').disabled = s === 0;
        el.querySelector('.flip__btn--next').disabled = s === last;
      }
      preload(s + 1); preload(s - 1);
    }
    function turn(dirn) { go(s + dirn); }
    function go(to) {
      var dirn = to > s ? 1 : -1;
      if (busy || to === s || to < 0 || to > last) return;
      if (reduceMotion.matches) { s = to; draw(); return; }
      busy = true;
      // the leaf lifts off the side being turned; underneath, the next page is already in place
      if (dirn > 0) { set(F, right(s)); set(B, left(to)); set(R, right(to)); }
      else { set(F, left(s)); set(B, right(to)); set(L, left(to)); }
      leaf.className = 'flip__leaf is-' + (dirn > 0 ? 'next' : 'prev');
      book.classList.toggle('is-cover', to === 0);
      book.classList.toggle('is-back', right(to) < 0);
      void leaf.offsetWidth;
      leaf.classList.add('is-turning');
      setTimeout(function () { s = to; draw(); leaf.className = 'flip__leaf'; busy = false; }, 720);
    }
    if (el.hasAttribute('data-auto')) {
      // carousel copy: turn through the chosen spreads (or every spread), then back to the cover
      var seq = (el.getAttribute('data-spreads') || '').split(',').filter(Boolean).map(Number);
      if (!seq.length) for (var k = 0; k <= last; k++) seq.push(k);
      var at = 0;
      draw();
      setInterval(function () {
        if (document.hidden || !el.isConnected || busy || el.closest('.is-offscreen')) return;
        at = (at + 1) % seq.length;
        go(seq[at]);
      }, 2400);
      return;
    }
    el.querySelector('.flip__btn--prev').addEventListener('click', function () { turn(-1); });
    el.querySelector('.flip__btn--next').addEventListener('click', function () { turn(1); });
    var x0 = null, swiped = false;
    el.querySelector('.flip__page--r').addEventListener('click', function () { if (!swiped) turn(1); });
    el.querySelector('.flip__page--l').addEventListener('click', function () { if (!swiped) turn(-1); });
    book.addEventListener('pointerdown', function (e) { x0 = e.clientX; swiped = false; });
    book.addEventListener('pointerup', function (e) {
      if (x0 === null) return;
      var dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) { swiped = true; turn(dx < 0 ? 1 : -1); }
    });
    draw();
  }

  function openCase(i, from) {
    if (!csModal || csModal.open) return;
    csAt = i; csFrom = from || null;
    csModal.classList.remove('is-closing');
    root.classList.add('modal-open', 'cs-open');
    csModal.showModal();
    csModal.querySelector('.svc-modal__scroll').scrollTop = 0;
    renderCase();
  }
  function closeCase(then) {
    if (!csModal.open || csModal.classList.contains('is-closing')) return;
    csModal.classList.add('is-closing');
    setTimeout(function () { csModal.close(); if (then) then(); }, reduceMotion.matches ? 0 : 220);
  }
  // Move to the previous / next project without closing the popup
  function stepCase(dir) {
    var n = (window.PROJECTS || []).length;
    csAt = (csAt + dir + n) % n;
    csModal.classList.add('is-swapping');
    setTimeout(function () {
      csModal.querySelector('.svc-modal__scroll').scrollTop = 0;
      renderCase();
      csModal.classList.remove('is-swapping');
      var b = csModal.querySelector('.svc-modal__nav [data-act="' + (dir > 0 ? 'next' : 'prev') + '"]');
      if (b) b.focus({ preventScroll: true });
    }, reduceMotion.matches ? 0 : 180);
  }

  if (csModal) {
    csModal.addEventListener('click', function (e) {
      if (e.target === csModal) { closeCase(); return; } // click outside the card
      var a = e.target.closest('[data-act]');
      if (!a) return;
      var act = a.getAttribute('data-act');
      if (act === 'close') closeCase();
      else if (act === 'prev') stepCase(-1);
      else if (act === 'next') stepCase(1);
      else if (act === 'contact') {
        e.preventDefault();
        closeCase(function () {
          var c = document.getElementById('contact');
          if (c) c.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth' });
        });
      }
    });
    csModal.addEventListener('cancel', function (e) { e.preventDefault(); closeCase(); });
    csModal.addEventListener('close', function () {
      if (csModal.open) return; // reopened before this event arrived
      csModal.classList.remove('is-closing', 'is-swapping');
      root.classList.remove('modal-open', 'cs-open');
      if (csIO) csIO.disconnect();
      clearInterval(csTimer);
      document.getElementById('cs-modal-body').innerHTML = '';
      if (csFrom) csFrom.focus({ preventScroll: true });
    });
    csModal.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      stepCase((e.key === 'ArrowRight' ? 1 : -1) * (root.dir === 'rtl' ? -1 : 1));
      e.preventDefault();
    });
  }

  function renderYears() {
    var el = document.getElementById('years-count');
    if (el) el.textContent = (new Date().getFullYear() - START_YEAR) + '+';
    var y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
  }

  /* ---------- Language ---------- */
  function applyStatic() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n'));
      if (v) el.textContent = v;
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n-html'));
      if (v) el.innerHTML = v; // trusted strings from content.js
    });
    document.querySelectorAll('[data-i18n-alt]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n-alt'));
      if (v) el.setAttribute('alt', v);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n-aria'));
      if (v) el.setAttribute('aria-label', v);
    });
    document.title = t('meta.title');
    var sw = document.getElementById('lang-switch');
    if (sw) sw.setAttribute('aria-label', t('lang.switchTo'));
    var brand = document.querySelector('.nav__brand');
    if (brand) brand.setAttribute('aria-label', t('nav.brand'));
    var menu = document.getElementById('menu-toggle');
    if (menu) {
      menu.querySelector('.nav__menu-label').textContent =
        menu.getAttribute('aria-expanded') === 'true' ? t('nav.close') : t('nav.menu');
    }
  }

  // Discourage saving the work: no right-click menu, dragging or long-press save on images and videos.
  // (Anything shown on screen can still be captured; this only removes the easy ways.)
  function guardMedia() {
    var media = function (e) { return e.target.closest && e.target.closest('img, video, picture, .flip, .showcase__item, .cs__cover, .folder'); };
    document.addEventListener('contextmenu', function (e) { if (media(e)) e.preventDefault(); });
    document.addEventListener('dragstart', function (e) { if (media(e)) e.preventDefault(); });
  }
  guardMedia();

  function renderAll() {
    applyStatic();
    renderProjects();
    renderShowcase();
    renderTimeline();
    renderSkills();
    renderContact();
    renderCountries();
    renderRibbons();
    renderHeroBand();
    renderReviews();
    renderServices();
    renderTools();
    renderYears();
    observeReveals();
    if (csModal && csModal.open) renderCase();
  }

  function setLang(next) {
    root.lang = next;
    root.dir = next === 'ar' ? 'rtl' : 'ltr';
    try { localStorage.setItem('md-lang', next); } catch (e) {}
    renderAll();
  }

  /* ---------- Reveal on scroll ---------- */
  var io = null;
  function observeReveals() {
    var els = document.querySelectorAll('.reveal:not(.is-in)');
    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    }
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Navigation ---------- */
  function initNav() {
    var nav = document.querySelector('.nav');
    var menu = document.getElementById('menu-toggle');
    var links = document.getElementById('nav-links');

    function setMenu(open) {
      menu.setAttribute('aria-expanded', String(open));
      links.classList.toggle('is-open', open);
      menu.querySelector('.nav__menu-label').textContent = open ? t('nav.close') : t('nav.menu');
    }
    menu.addEventListener('click', function () { setMenu(menu.getAttribute('aria-expanded') !== 'true'); });
    links.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { setMenu(false); menu.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (menu.getAttribute('aria-expanded') === 'true' && !e.target.closest('.nav__bar')) setMenu(false);
    });

    var onScroll = function () { nav.classList.toggle('is-scrolled', window.scrollY > 24); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Highlight the section in view
    if ('IntersectionObserver' in window) {
      var map = {};
      links.querySelectorAll('a[href^="#"]').forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var a = map[e.target.id];
          if (!a) return;
          if (e.isIntersecting) {
            Object.keys(map).forEach(function (k) { map[k].removeAttribute('aria-current'); });
            a.setAttribute('aria-current', 'true');
          }
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) spy.observe(s); });
    }
  }

  /* ---------- Stat counters ---------- */
  function initCounters() {
    var els = document.querySelectorAll('[data-count]');
    els.forEach(function (el) {
      var v = el.getAttribute('data-count');
      el.dataset.target = v === 'years' ? (new Date().getFullYear() - START_YEAR) : parseInt(v, 10);
      el.textContent = (+el.dataset.target).toLocaleString('en-US');
    });
    if (reduceMotion.matches || !('IntersectionObserver' in window)) return;

    function run(el) {
      var target = +el.dataset.target, t0 = null, dur = 1600;
      function step(ts) {
        if (!t0) t0 = ts;
        var p = Math.min((ts - t0) / dur, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString('en-US');
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { run(e.target); co.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    els.forEach(function (el) { el.textContent = '0'; co.observe(el); });
  }

  /* ---------- Init ---------- */
  // "#top" is the fixed nav, so jumping to it does nothing: scroll the page to the top instead
  document.querySelectorAll('a[href="#top"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    });
  });
  // A reload always opens at the top: drop any #section from the address and reset the scroll
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  window.scrollTo(0, 0);

  document.getElementById('lang-switch').addEventListener('click', function () {
    setLang(lang() === 'ar' ? 'en' : 'ar');
  });
  initNav();
  renderAll();
  initCounters();

  // Pause looping motion in sections that are off screen, so scrolling only pays for what is visible
  if ('IntersectionObserver' in window) {
    var offIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        e.target.classList.toggle('is-offscreen', !e.isIntersecting);
        // carousel clips stop decoding while the carousel is out of view
        e.target.querySelectorAll('.showcase video').forEach(function (v) {
          if (e.isIntersecting) { var p = v.play(); if (p) p.catch(function () {}); } else v.pause();
        });
      });
    }, { rootMargin: '100px 0px' });
    document.querySelectorAll('main > section, header.hero, .hero').forEach(function (s) { offIO.observe(s); });
  }

  // Start the hero entrance once the fonts and the portrait are ready (at most 1.5s wait)
  (function () {
    var img = document.querySelector('.hero__photo img');
    var waits = [document.fonts ? document.fonts.ready : null];
    if (img && img.decode) waits.push(img.decode().catch(function () {}));
    var ready = function () { root.classList.add('is-ready'); };
    var assets = Promise.race([
      Promise.all(waits),
      new Promise(function (done) { setTimeout(done, 1500); })
    ]);

    // Language picker: the hero entrance plays only after a language is chosen
    var gate = document.getElementById('lang-gate');
    var chosen = new Promise(function (done) {
      if (!gate || !root.classList.contains('gate')) { done(); return; }
      var first = gate.querySelector('.lang-gate__btn[data-lang="' + lang() + '"]') || gate.querySelector('.lang-gate__btn');
      first.focus();
      gate.addEventListener('click', function (e) {
        var b = e.target.closest('.lang-gate__btn');
        if (!b) return;
        if (b.getAttribute('data-lang') !== lang()) setLang(b.getAttribute('data-lang'));
        try { sessionStorage.setItem('md-lang-picked', '1'); } catch (err) {}
        root.classList.add('gate-out');
        setTimeout(function () { root.classList.remove('gate', 'gate-out'); done(); }, reduceMotion.matches ? 0 : 450);
      });
    });

    // rAF lets the closing popup paint first; the timeout covers tabs where rAF is paused
    Promise.all([assets, chosen]).then(function () { requestAnimationFrame(ready); setTimeout(ready, 120); }, ready);
  })();
})();
