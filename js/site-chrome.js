/**
 * IMI — registry chrome
 * Network template kit v1 · Q-NET-ADOPT-IMI 2026-08-05
 * Explicit CSS (not Tailwind-only). Desktop: text nav + always-on hamburger.
 * Sisters: omit self. Accent: violet void family.
 */
(function () {
  if (window.__imiSiteChrome) return;
  window.__imiSiteChrome = true;

  var KIT = 'network-template-kit-v1';
  var SELF_HOST_MARKERS = [
    'instituteofmatureimagination.org',
    'instituteofmatureimagination.com',
    'matureimagination',
  ];

  function year() {
    return new Date().getFullYear();
  }
  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function isSelfSister(href) {
    var h = String(href || '').toLowerCase();
    for (var i = 0; i < SELF_HOST_MARKERS.length; i++) {
      if (h.indexOf(SELF_HOST_MARKERS[i]) !== -1) return true;
    }
    return false;
  }

  function filterSisters(list) {
    return (list || []).filter(function (s) {
      return s && s.href && s.label && !isSelfSister(s.href);
    });
  }

  var HAMBURGER =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';

  var CHROME_CSS =
    'header[data-site-chrome="ready"]{border-bottom:1px solid rgba(255,255,255,0.08);position:sticky;top:0;z-index:var(--z-header,40);background:rgba(7,6,15,0.9);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);}' +
    '.net-bar{max-width:var(--page-max,56rem);margin:0 auto;padding:0 var(--page-pad,1.25rem);height:var(--header-h,3.5rem);display:flex;align-items:center;justify-content:space-between;gap:0.75rem;}' +
    '.net-brand{display:flex;align-items:center;gap:0.75rem;min-width:0;text-decoration:none;color:#e8e4ff;}' +
    '.net-mark{width:2rem;height:2rem;border-radius:9999px;border:1px solid rgba(139,92,246,0.45);display:inline-flex;align-items:center;justify-content:center;color:#8b5cf6;font-size:0.65rem;font-weight:600;letter-spacing:0.06em;flex-shrink:0;background:rgba(255,255,255,0.04);}' +
    '.net-title{font-weight:600;font-size:0.8rem;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
    '.net-sub{font-size:10px;color:rgba(34,211,238,0.75);letter-spacing:0.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
    '.net-actions{display:flex;align-items:center;gap:0.75rem;flex-shrink:0;}' +
    '.net-nav-desktop{display:none;flex-wrap:wrap;justify-content:flex-end;gap:1.1rem;font-size:0.875rem;}' +
    '.net-nav-desktop a{color:rgba(232,228,255,0.8);text-decoration:none;}' +
    '.net-nav-desktop a:hover{color:#e8e4ff;}' +
    '.net-nav-toggle{display:inline-flex;width:2.5rem;height:2.5rem;align-items:center;justify-content:center;border-radius:9999px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:#e8e4ff;cursor:pointer;padding:0;}' +
    '.net-nav-toggle:hover{border-color:rgba(139,92,246,0.6);}' +
    '.net-nav-toggle:focus-visible{outline:2px solid rgba(139,92,246,0.7);outline-offset:2px;}' +
    '#net-mobile-menu{display:none;border-top:1px solid rgba(255,255,255,0.08);background:rgba(7,6,15,0.98);}' +
    '#net-mobile-menu.open{display:block;}' +
    '#net-mobile-menu a{display:block;padding:0.85rem 1.25rem;color:rgba(232,228,255,0.8);text-decoration:none;border-bottom:1px solid rgba(255,255,255,0.06);font-size:0.95rem;min-height:44px;}' +
    '#net-mobile-menu a:hover{color:#e8e4ff;background:rgba(139,92,246,0.1);}' +
    'footer[data-site-chrome="ready"]{border-top:1px solid rgba(255,255,255,0.08);margin-top:3rem;}' +
    '.net-foot{max-width:var(--page-max,56rem);margin:0 auto;padding:2.5rem var(--page-pad,1.25rem);font-size:0.875rem;color:rgba(232,228,255,0.55);}' +
    '.net-foot a{color:inherit;}' +
    '.net-foot a:hover{color:#e8e4ff;}' +
    '.net-foot-row{display:flex;flex-direction:column;gap:0.75rem;}' +
    '.net-foot-sisters{font-size:0.75rem;color:rgba(232,228,255,0.7);margin-top:1rem;}' +
    '.net-foot-note{font-size:0.75rem;color:rgba(34,211,238,0.55);margin-top:0.75rem;}' +
    '@media (min-width:768px){' +
    '.net-nav-desktop{display:flex;}' +
    '.net-nav-toggle{display:inline-flex !important;}' +
    '.net-foot-row{flex-direction:row;align-items:center;justify-content:space-between;}' +
    '}';

  function ensureCss() {
    if (document.getElementById('net-chrome-css')) return;
    var s = document.createElement('style');
    s.id = 'net-chrome-css';
    s.setAttribute('data-kit', KIT);
    s.textContent = CHROME_CSS;
    document.head.appendChild(s);
  }

  function navLinks(chrome) {
    return (chrome.nav || [])
      .map(function (item) {
        var ext = item.external ? ' target="_blank" rel="noopener"' : '';
        return '<a href="' + esc(item.href) + '"' + ext + '>' + esc(item.label) + '</a>';
      })
      .join('');
  }

  function buildHeader(chrome) {
    var primary = chrome.brand_primary || 'Institute of Mature Imagination';
    var secondary =
      chrome.brand_secondary ||
      "In memory of a father's idea · stewarded for the public";
    return (
      '<div class="net-bar">' +
      '<a class="net-brand" href="' +
      esc(chrome.home_href || 'index.html') +
      '" title="' +
      esc(primary + ' — ' + secondary) +
      '">' +
      '<span class="net-mark">' +
      esc(chrome.mark || 'IMI') +
      '</span>' +
      '<span><div class="net-title">' +
      esc(primary) +
      '</div><div class="net-sub">' +
      esc(secondary) +
      '</div></span></a>' +
      '<div class="net-actions">' +
      '<nav class="net-nav-desktop" aria-label="Primary">' +
      navLinks(chrome) +
      '</nav>' +
      '<button type="button" id="net-nav-toggle" class="net-nav-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="net-mobile-menu">' +
      HAMBURGER +
      '</button></div></div>' +
      '<div id="net-mobile-menu" role="navigation" aria-label="Mobile">' +
      navLinks(chrome) +
      '</div>'
    );
  }

  function buildFooter(chrome) {
    var sisters = filterSisters(chrome.sister_links)
      .map(function (s) {
        return (
          '<a href="' +
          esc(s.href) +
          '" target="_blank" rel="noopener">' +
          esc(s.label) +
          '</a>'
        );
      })
      .join(' · ');
    var local = (chrome.nav || [])
      .filter(function (n) {
        return !n.external;
      })
      .slice(0, 5)
      .map(function (n) {
        return '<a href="' + esc(n.href) + '">' + esc(n.label) + '</a>';
      })
      .join(' · ');
    var secondary =
      chrome.brand_secondary ||
      "In memory of a father's idea · stewarded for the public";
    return (
      '<div class="net-foot">' +
      '<div class="net-foot-row">' +
      '<div>© <span id="y">' +
      year() +
      '</span> Institute of Mature Imagination</div>' +
      '<div style="font-size:0.75rem">' +
      local +
      '</div></div>' +
      '<div class="net-foot-sisters">Sister network: ' +
      (sisters || '—') +
      '</div>' +
      '<p class="net-foot-note">' +
      esc(secondary) +
      '</p>' +
      '<p class="net-foot-note">Archive stewarded for the public record. · kit ' +
      KIT +
      '</p>' +
      '</div>'
    );
  }

  function bindMobile() {
    var btn = document.getElementById('net-nav-toggle');
    var menu = document.getElementById('net-mobile-menu');
    if (!btn || !menu) return;

    function setOpen(o) {
      if (o) menu.classList.add('open');
      else menu.classList.remove('open');
      btn.setAttribute('aria-expanded', o ? 'true' : 'false');
      btn.setAttribute('aria-label', o ? 'Close menu' : 'Open menu');
    }

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(!menu.classList.contains('open'));
    });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        setOpen(false);
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
    document.addEventListener('click', function (e) {
      if (!menu.classList.contains('open')) return;
      if (menu.contains(e.target) || btn.contains(e.target)) return;
      setOpen(false);
    });
  }

  function apply(reg) {
    ensureCss();
    var chrome = reg.chrome || {};
    chrome.sister_links = filterSisters(chrome.sister_links);
    document.documentElement.setAttribute('data-network-kit', KIT);

    var headers = document.querySelectorAll('header');
    if (!headers.length) {
      var h = document.createElement('header');
      h.setAttribute('data-site-chrome', 'ready');
      h.innerHTML = buildHeader(chrome);
      document.body.insertBefore(h, document.body.firstChild);
    } else {
      headers.forEach(function (el, i) {
        if (el.getAttribute('data-site-chrome') === 'skip') return;
        if (i > 0) return;
        el.setAttribute('data-site-chrome', 'ready');
        el.innerHTML = buildHeader(chrome);
      });
    }
    bindMobile();
    var footers = document.querySelectorAll('footer');
    if (!footers.length) {
      var f = document.createElement('footer');
      f.setAttribute('data-site-chrome', 'ready');
      f.innerHTML = buildFooter(chrome);
      document.body.appendChild(f);
    } else {
      footers.forEach(function (f) {
        if (f.getAttribute('data-site-chrome') === 'skip') return;
        f.setAttribute('data-site-chrome', 'ready');
        f.innerHTML = buildFooter(chrome);
      });
    }
  }

  var FALLBACK_CHROME = {
    chrome: {
      mark: 'IMI',
      home_href: 'index.html',
      brand_primary: 'Institute of Mature Imagination',
      brand_secondary: "In memory of a father's idea · stewarded for the public",
      accent: 'imi',
      nav: [
        { href: 'about.html', label: 'About' },
        { href: 'index.html#archive', label: 'Archive' },
        { href: 'videos.html', label: 'Videos' },
        {
          href: 'https://onemissionnetworkandinstitute.org/forge.html',
          label: 'Vision',
          external: true,
        },
      ],
      sister_links: [
        { href: 'https://onemissionnetworkandinstitute.org/', label: 'One Mission' },
        { href: 'https://intekspace.com/', label: 'Intek Space' },
        { href: 'https://onemissionfoundation.org/', label: 'Foundation' },
        { href: 'https://omniexchange.org/', label: 'Exchange' },
      ],
    },
  };

  function boot() {
    if (document.documentElement.getAttribute('data-site-chrome') === 'skip') return;
    fetch('site-registry.json', { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then(apply)
      .catch(function (e) {
        console.warn('[imi site-chrome]', e);
        apply(FALLBACK_CHROME);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
