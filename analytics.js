/**
 * Static site GA4 loader (IMI / Intek Space).
 * page_view only — no profile scrape, no Meta pixel, no fingerprint suite.
 * Requires analytics-config.js first (SITE_ANALYTICS.ga4MeasurementId).
 */
(function () {
  function start() {
    var cfg = window.SITE_ANALYTICS || {};
    var ga4 = String(cfg.ga4MeasurementId || "").trim();
    var site = cfg.site || "site";

    // Reject obvious placeholders so we never ship G-xxxx into production by mistake
    if (!ga4 || /^G-x+$/i.test(ga4) || /placeholder|xxxx|yyyy/i.test(ga4)) {
      if (typeof console !== "undefined") {
        console.info(
          "[" + site + " analytics] No real GA4 ID yet — set analytics-config.js ga4MeasurementId"
        );
      }
      return;
    }

    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;
    gtag("js", new Date());

    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(ga4);
    document.head.appendChild(s);

    var path = (location.pathname || "/").replace(/\/$/, "") || "/";
    var cfgOpts = {
      send_page_view: true,
      page_path: path + (location.search || ""),
      page_title: document.title || path,
      cookie_flags: "SameSite=None;Secure",
    };
    if (cfg.anonymizeIp !== false) {
      cfgOpts.anonymize_ip = true;
    }
    gtag("config", ga4, cfgOpts);

    if (typeof console !== "undefined") {
      console.info("[" + site + " analytics] GA4 page_view →", ga4);
    }
  }

  if (window.SITE_ANALYTICS) {
    start();
  } else {
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      if (window.SITE_ANALYTICS || tries > 40) {
        clearInterval(t);
        start();
      }
    }, 25);
  }
})();
