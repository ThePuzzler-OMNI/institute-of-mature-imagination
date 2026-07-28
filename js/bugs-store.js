/**
 * Bug / feature board store + GitHub shared inbox helpers.
 */
(function (global) {
  var INBOX_KEY = "omni_bug_inbox_v1";
  var SECONDS_KEY = "omni_bug_seconds_v1";
  var ADMIN_KEY = "omni_bug_admin_v1";
  var DEVICE_KEY = "omni_bug_device_id";

  function deviceId() {
    try {
      var id = localStorage.getItem(DEVICE_KEY);
      if (!id) {
        id = "d_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(DEVICE_KEY, id);
      }
      return id;
    } catch (e) {
      return "anon";
    }
  }

  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
      return true;
    } catch (e) {
      return false;
    }
  }

  function loadPublished() {
    return fetch("data/bugs.json", { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("bugs.json " + r.status);
        return r.json();
      })
      .catch(function () {
        return {
          version: 1,
          items: [],
          currency: "USD",
          contactEmail: "techsupport@onemissionnetworkandinstitute.org"
        };
      });
  }

  /** Public GitHub issues labeled site-feedback (shared multi-user inbox) */
  function loadGithubFeedback() {
    var cfg = (global.OMNI_SITE && global.OMNI_SITE.feedbackRepo) || {
      owner: "ThePuzzler-OMNI",
      repo: "mirror-grok",
      labelAll: "site-feedback"
    };
    var url =
      "https://api.github.com/repos/" +
      cfg.owner +
      "/" +
      cfg.repo +
      "/issues?state=open&labels=" +
      encodeURIComponent(cfg.labelAll) +
      "&per_page=50";
    return fetch(url, {
      headers: { Accept: "application/vnd.github+json" }
    })
      .then(function (r) {
        if (!r.ok) throw new Error("github " + r.status);
        return r.json();
      })
      .then(function (issues) {
        return (issues || [])
          .filter(function (i) {
            return !i.pull_request;
          })
          .map(function (i) {
            var labels = (i.labels || []).map(function (l) {
              return l.name;
            });
            var type = labels.indexOf(cfg.labelFeature) >= 0 ? "feature" : "bug";
            return {
              id: "GH-" + i.number,
              type: type,
              title: i.title,
              description: (i.body || "").slice(0, 2000),
              pageUrl: i.html_url,
              status: "open",
              priority: "medium",
              hoursEstimated: null,
              hoursActual: null,
              seconds: i.reactions && i.reactions["+1"] ? i.reactions["+1"] : 0,
              potCents: 0,
              donationUrl: "",
              createdAt: i.created_at,
              updatedAt: i.updated_at,
              reporterName: i.user ? i.user.login : "github",
              reporterEmail: "",
              adminNotes: "GitHub issue #" + i.number,
              source: "github",
              githubNumber: i.number,
              githubUrl: i.html_url
            };
          });
      })
      .catch(function () {
        return [];
      });
  }

  function getInbox() {
    return readJson(INBOX_KEY, []);
  }

  function addInbox(item) {
    var list = getInbox();
    item.id = item.id || "INB-" + Date.now();
    item.createdAt = item.createdAt || new Date().toISOString();
    item.status = item.status || "inbox";
    item.seconds = item.seconds || 0;
    item.potCents = item.potCents || 0;
    list.unshift(item);
    writeJson(INBOX_KEY, list);
    return item;
  }

  function getSecondsMap() {
    return readJson(SECONDS_KEY, {});
  }

  function secondItem(id) {
    var map = getSecondsMap();
    var dev = deviceId();
    if (!map[id]) map[id] = [];
    if (map[id].indexOf(dev) === -1) {
      map[id].push(dev);
      writeJson(SECONDS_KEY, map);
      return true;
    }
    return false;
  }

  function secondsCount(id, base) {
    var map = getSecondsMap();
    var extra = (map[id] && map[id].length) || 0;
    return (base || 0) + extra;
  }

  function getAdminOverrides() {
    return readJson(ADMIN_KEY, { items: {}, deletedInbox: [] });
  }

  function saveAdminOverrides(data) {
    writeJson(ADMIN_KEY, data);
  }

  function mergeForPublic(published) {
    var admin = getAdminOverrides();
    var items = (published.items || []).map(function (it) {
      var o = admin.items[it.id] || {};
      return Object.assign({}, it, o);
    });
    Object.keys(admin.items).forEach(function (id) {
      if (!items.some(function (x) { return x.id === id; }) && admin.items[id].title) {
        items.push(admin.items[id]);
      }
    });
    return items;
  }

  function formatMoney(cents) {
    return "$" + ((cents || 0) / 100).toFixed(2);
  }

  function fundUrl(item) {
    if (item && item.donationUrl) return item.donationUrl;
    var site = global.OMNI_SITE || {};
    return site.defaultDonationUrl || "";
  }

  global.OmniBugs = {
    loadPublished: loadPublished,
    loadGithubFeedback: loadGithubFeedback,
    getInbox: getInbox,
    addInbox: addInbox,
    secondItem: secondItem,
    secondsCount: secondsCount,
    getAdminOverrides: getAdminOverrides,
    saveAdminOverrides: saveAdminOverrides,
    mergeForPublic: mergeForPublic,
    formatMoney: formatMoney,
    fundUrl: fundUrl,
    deviceId: deviceId,
    INBOX_KEY: INBOX_KEY,
    ADMIN_KEY: ADMIN_KEY
  };
})(window);
