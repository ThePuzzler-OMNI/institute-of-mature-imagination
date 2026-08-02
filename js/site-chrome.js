/**
 * IMI — shared header/footer from site-registry.json (public web discipline).
 */
(function () {
  if (window.__imiSiteChrome) return;
  window.__imiSiteChrome = true;

  function year() {
    return new Date().getFullYear();
  }
  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function buildHeader(chrome) {
    var desktop = (chrome.nav || [])
      .map(function (item) {
        var ext = item.external ? ' target="_blank" rel="noopener"' : '';
        return (
          '<a href="' +
          esc(item.href) +
          '" class="text-sm text-star/80 hover:text-star"' +
          ext +
          '>' +
          esc(item.label) +
          '</a>'
        );
      })
      .join('');
    var mobile = (chrome.nav || [])
      .map(function (item) {
        var ext = item.external ? ' target="_blank" rel="noopener"' : '';
        return (
          '<a href="' +
          esc(item.href) +
          '" class="block px-3 py-2 rounded-lg hover:bg-white/5"' +
          ext +
          '>' +
          esc(item.label) +
          '</a>'
        );
      })
      .join('');
    var primary = chrome.brand_primary || 'Institute of Mature Imagination';
    var secondary =
      chrome.brand_secondary ||
      "In memory of a father's idea · stewarded for the public";
    return (
      '<div class="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">' +
      '<a href="' +
      esc(chrome.home_href || 'index.html') +
      '" class="flex items-center gap-2 text-star font-semibold min-w-0" title="' +
      esc(primary + ' — ' + secondary) +
      '">' +
      '<span class="w-8 h-8 shrink-0 rounded-lg glass flex items-center justify-center text-xs text-accent">' +
      esc(chrome.mark || 'IMI') +
      '</span><span class="flex flex-col leading-tight min-w-0">' +
      '<span class="text-sm sm:text-base leading-snug truncate">' +
      esc(primary) +
      '</span>' +
      '<span class="text-[10px] sm:text-[11px] font-normal text-glow/80 tracking-wide truncate">' +
      esc(secondary) +
      '</span></span></a>' +
      '<nav class="hidden md:flex items-center gap-5 shrink-0">' +
      desktop +
      '</nav>' +
      '<button type="button" id="imi-nav-toggle" class="md:hidden text-star p-2 shrink-0" aria-label="Menu" aria-controls="imi-mobile-menu">☰</button>' +
      '</div><div id="imi-mobile-menu" class="hidden md:hidden border-t border-white/10 px-4 py-3 space-y-1">' +
      mobile +
      '</div>'
    );
  }

  function buildFooter(chrome) {
    var sisters = (chrome.sister_links || [])
      .map(function (s) {
        return (
          '<a class="hover:text-star" href="' +
          esc(s.href) +
          '" target="_blank" rel="noopener">' +
          esc(s.label) +
          '</a>'
        );
      })
      .join(' · ');
    return (
      '<div class="max-w-5xl mx-auto px-4 py-10 text-sm text-star/60 space-y-3">' +
      '<div>© <span id="y">' +
      year() +
      '</span> Institute of Mature Imagination</div>' +
      '<div>Sister network: ' +
      sisters +
      '</div>' +
      '<p class="text-xs text-glow/70">' +
      esc(
        chrome.brand_secondary ||
          "In memory of a father's idea · stewarded for the public"
      ) +
      '</p>' +
      '<p class="text-xs text-star/40">Archive stewarded for the public record. Analytics may run on sister sites.</p>' +
      '</div>'
    );
  }

  function bindMobile() {
    var btn = document.getElementById('imi-nav-toggle');
    var menu = document.getElementById('imi-mobile-menu');
    if (!btn || !menu) return;
    btn.addEventListener('click', function () {
      menu.classList.toggle('hidden');
    });
  }

  function apply(reg) {
    var chrome = reg.chrome || {};
    var headers = document.querySelectorAll('header');
    if (!headers.length) {
      var h = document.createElement('header');
      h.className = 'sticky top-0 z-40 glass';
      h.innerHTML = buildHeader(chrome);
      document.body.insertBefore(h, document.body.firstChild);
    } else {
      headers.forEach(function (el, i) {
        if (el.getAttribute('data-site-chrome') === 'skip') return;
        if (i > 0) return;
        el.className = 'sticky top-0 z-40 glass';
        el.setAttribute('data-site-chrome', 'ready');
        el.innerHTML = buildHeader(chrome);
      });
    }
    bindMobile();
    var footers = document.querySelectorAll('footer');
    if (!footers.length) {
      var f = document.createElement('footer');
      f.className = 'mt-16 border-t border-white/10';
      f.innerHTML = buildFooter(chrome);
      document.body.appendChild(f);
    } else {
      footers.forEach(function (f) {
        if (f.getAttribute('data-site-chrome') === 'skip') return;
        f.className = 'mt-16 border-t border-white/10';
        f.setAttribute('data-site-chrome', 'ready');
        f.innerHTML = buildFooter(chrome);
      });
    }
  }

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
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
