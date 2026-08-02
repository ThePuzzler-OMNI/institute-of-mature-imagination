/**
 * Sitewide bug / feature request button — brain-dump first, durable Bug Desk SSOT.
 * POST /api/bugs with Content-Type: text/plain (JSON body as string — Azure-safe).
 * Email: short notify after durable success; full body only if durable fails.
 * Soft limit 8000 on brain dump — visible count; block over limit (no silent truncation).
 */
(function () {
  if (window.__omniFeedbackLoaded) return;
  window.__omniFeedbackLoaded = true;

  var BRAIN_MAX = 8000;
  var BUGS_API = 'https://onemissionnetworkandinstitute.org/api/bugs';
  var ADMIN_BASE = 'https://onemissionnetworkandinstitute.org/bug-desk-admin.html';

  function loadScript(src, cb) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = cb;
    s.onerror = cb;
    document.head.appendChild(s);
  }

  function ensureDeps(cb) {
    // Never block send on local inbox helper — durable /api/bugs is SSOT
    function done() {
      try {
        cb();
      } catch (e) {
        var st = document.getElementById('omni-fb-status');
        if (st) {
          st.style.color = '#fbbf24';
          st.textContent = 'Widget error: ' + (e && e.message ? e.message : String(e));
        }
      }
    }
    function next() {
      if (!window.OmniBugs) return loadScript('js/bugs-store.js', done);
      done();
    }
    if (!window.OMNI_SITE) loadScript('js/site-config.js', next);
    else next();
  }

  function detectSite() {
    var h = (location.hostname || '').toLowerCase();
    var path = (location.pathname || '').toLowerCase();
    if (h.indexOf('intekspace') !== -1) return 'intekspace';
    if (h.indexOf('instituteofmatureimagination') !== -1 || h.indexOf('imi') !== -1) return 'imi';
    if (h.indexOf('onemission') !== -1) return 'onemission';
    if (path.indexOf('/sites/intekspace') === 0 || path.indexOf('intekspace') !== -1) return 'intekspace';
    if (path.indexOf('/sites/imi') === 0) return 'imi';
    if (path.indexOf('/sites/onemission') === 0) return 'onemission';
    return h || 'onemission';
  }

  function siteIdFromCtx(site) {
    var s = String(site || '').toLowerCase();
    if (s.indexOf('intek') !== -1) return 'intekspace';
    if (s.indexOf('imi') !== -1 || s.indexOf('mature') !== -1) return 'imi';
    if (s.indexOf('onemission') !== -1 || s === 'omni' || s === 'unknown') return 'onemission';
    return 'onemission';
  }

  function detectMembership(cb) {
    var result = { role: 'guest', member: false, name: '', email: '', userId: '', provider: '' };
    function finish(p) {
      if (p) {
        result.userId = p.userId || '';
        result.name = p.name || p.userDetails || '';
        result.email =
          p.email ||
          (p.userDetails && String(p.userDetails).indexOf('@') !== -1 ? p.userDetails : '') ||
          '';
        result.provider = p.identityProvider || p.provider || '';
        if (window.OMNI_ACCESS && typeof window.OMNI_ACCESS.resolveRole === 'function') {
          result.role = window.OMNI_ACCESS.resolveRole(p);
        } else {
          result.role = result.email || result.userId ? 'member' : 'guest';
        }
        result.member = result.role === 'member' || result.role === 'steward';
      }
      cb(result);
    }
    if (window.OMNI_AUTH && typeof window.OMNI_AUTH.getPrincipal === 'function') {
      window.OMNI_AUTH.getPrincipal()
        .then(finish)
        .catch(function () {
          finish(null);
        });
    } else {
      try {
        var raw = localStorage.getItem('omni_auth') || sessionStorage.getItem('omni_auth');
        if (raw) {
          var s = JSON.parse(raw);
          finish({
            userId: s.userId,
            userDetails: s.userDetails || s.email,
            name: s.name,
            email: s.email,
            identityProvider: s.provider || 'google',
          });
          return;
        }
      } catch (e) {}
      finish(null);
    }
  }

  function collectContext(membership) {
    var site = detectSite();
    return {
      site: site,
      pageUrl: location.href,
      pageTitle: document.title || '',
      referrer: document.referrer || '',
      userAgent: navigator.userAgent || '',
      language: navigator.language || '',
      viewport: (window.innerWidth || 0) + 'x' + (window.innerHeight || 0),
      screen: (screen.width || 0) + 'x' + (screen.height || 0),
      timezone: (Intl.DateTimeFormat && Intl.DateTimeFormat().resolvedOptions().timeZone) || '',
      member: !!(membership && membership.member),
      role: (membership && membership.role) || 'guest',
      reporterName: (membership && membership.name) || '',
      reporterEmail: (membership && membership.email) || '',
      reporterUserId: (membership && membership.userId) || '',
      provider: (membership && membership.provider) || '',
      capturedAt: new Date().toISOString(),
    };
  }

  function firstLineTitle(brain) {
    var line = String(brain || '')
      .split(/\r?\n/)
      .map(function (l) {
        return l.trim();
      })
      .filter(Boolean)[0] || '';
    if (line.length > 120) line = line.slice(0, 117) + '…';
    return line;
  }

  function resolveTitle(f) {
    var t = (f.title || '').trim();
    if (t) return t;
    return firstLineTitle(f.desc) || 'Untitled report';
  }

  function githubNewIssueUrl(type, title, desc, steps, severity, ctx) {
    var cfg = window.OMNI_SITE && window.OMNI_SITE.feedbackRepo;
    if (!cfg) return null;
    var labels = [
      cfg.labelAll || 'site-feedback',
      type === 'feature' ? cfg.labelFeature || 'site-feature' : cfg.labelBug || 'site-bug',
      'site:' + (ctx.site || 'unknown'),
      ctx.member ? 'member:yes' : 'member:no',
    ];
    if (severity) labels.push('severity:' + severity);
    var body = [
      '### Type',
      type,
      '',
      '### Severity',
      severity || '—',
      '',
      '### Site',
      ctx.site,
      '',
      '### Brain dump',
      desc,
      '',
      '### Steps',
      steps || '—',
      '',
      '### Page',
      ctx.pageUrl,
      '',
      '---',
      '_feedback-widget_',
    ].join('\n');
    return (
      'https://github.com/' +
      cfg.owner +
      '/' +
      cfg.repo +
      '/issues/new?labels=' +
      encodeURIComponent(labels.join(',')) +
      '&title=' +
      encodeURIComponent('[' + type + '][' + (ctx.site || '') + '] ' + title) +
      '&body=' +
      encodeURIComponent(body)
    );
  }

  /** Durable SSOT — text/plain body (JSON string) for reliable SWA Functions parsing */
  function postToBugDesk(f, ctx, item) {
    var desk = (window.OMNI_SITE && window.OMNI_SITE.bugDesk) || {};
    var api = desk.api || desk.apiAzure || BUGS_API;
    var siteId = siteIdFromCtx(ctx.site);
    var title = resolveTitle(f);

    var payload = {
      siteId: siteId,
      type: f.type === 'feature' ? 'feature' : f.type === 'other' ? 'other' : 'bug',
      severity: f.severity || 'medium',
      title: title,
      description: f.desc,
      steps: f.steps || '',
      isMember: !!ctx.member,
      member: !!ctx.member,
      userId: ctx.reporterUserId || '',
      reporterName: ctx.reporterName || (f.email ? f.email.split('@')[0] : 'Guest'),
      reporterEmail: ctx.reporterEmail || f.email || '',
      pageUrl: ctx.pageUrl || location.href,
      pageTitle: ctx.pageTitle || document.title || '',
      userAgent: ctx.userAgent || navigator.userAgent || '',
      viewport: ctx.viewport || '',
      screen: ctx.screen || '',
      language: ctx.language || '',
      timezone: ctx.timezone || '',
      referrer: ctx.referrer || '',
      context: ctx,
      localId: item && item.id ? item.id : '',
    };

    return fetch(api, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain; charset=utf-8', Accept: 'application/json' },
      body: JSON.stringify(payload),
    }).then(function (r) {
      return r.text().then(function (text) {
        var j = {};
        try {
          j = text ? JSON.parse(text) : {};
        } catch (e) {
          throw new Error('bug-desk bad JSON ' + r.status);
        }
        if (!r.ok || (j && j.ok === false)) {
          throw new Error((j && j.error) || 'bug-desk ' + r.status);
        }
        return j;
      });
    });
  }

  function formSubmitEndpoint() {
    return (
      (window.OMNI_SITE && window.OMNI_SITE.formSubmitEndpoint) ||
      'https://formsubmit.co/ajax/techsupport@onemissionnetworkandinstitute.org'
    );
  }

  /** Short steward alert only (id + title + admin link) */
  function emailShortNotify(f, ctx, deskId, title) {
    var endpoint = formSubmitEndpoint();
    var admin =
      ADMIN_BASE +
      '?site=' +
      encodeURIComponent(siteIdFromCtx(ctx.site)) +
      '&q=' +
      encodeURIComponent(deskId || '');
    var fd = new FormData();
    fd.append(
      '_subject',
      '[OMNI ' + f.type + '][' + ctx.site + '] ' + (title || '').slice(0, 80)
    );
    fd.append('_template', 'table');
    fd.append('_captcha', 'false');
    fd.append(
      'message',
      [
        'Bug Desk durable save OK.',
        'id: ' + (deskId || '—'),
        'title: ' + (title || '—'),
        'type: ' + f.type + ' · severity: ' + (f.severity || 'medium'),
        'site: ' + (ctx.site || '') + ' · member: ' + (ctx.member ? 'yes' : 'no'),
        'page: ' + (ctx.pageUrl || ''),
        'admin: ' + admin,
        '',
        '(Full brain dump is in Bug Desk — not in this email.)',
      ].join('\n')
    );
    fd.append('bug_desk_id', deskId || '');
    fd.append('email', ctx.reporterEmail || f.email || 'anonymous@feedback.local');
    fd.append('name', ctx.reporterName || 'Guest');
    return fetch(endpoint, { method: 'POST', body: fd, headers: { Accept: 'application/json' } }).catch(
      function () {}
    );
  }

  /** Full body only when durable path failed */
  function emailFullFallback(f, ctx, item, title) {
    var endpoint = formSubmitEndpoint();
    var fd = new FormData();
    fd.append(
      '_subject',
      '[OMNI FAILSAFE ' + f.type + '][' + ctx.site + '] ' + (title || '').slice(0, 80)
    );
    fd.append('_template', 'table');
    fd.append('_captcha', 'false');
    fd.append(
      'message',
      [
        'DURABLE BUG DESK FAILED — full report in email.',
        'local_id: ' + (item && item.id ? item.id : '—'),
        'title: ' + (title || '—'),
        'type: ' + f.type + ' · severity: ' + (f.severity || 'medium'),
        'site: ' + (ctx.site || '') + ' · member: ' + (ctx.member ? 'yes' : 'no'),
        'page: ' + (ctx.pageUrl || ''),
        '',
        '=== BRAIN DUMP ===',
        f.desc,
        '',
        '=== STEPS ===',
        f.steps || '—',
        '',
        'From: ' + (ctx.reporterEmail || f.email || 'anonymous'),
      ].join('\n')
    );
    fd.append('email', ctx.reporterEmail || f.email || 'anonymous@feedback.local');
    fd.append('name', (item && item.reporterName) || 'Guest');
    return fetch(endpoint, { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
  }

  function inject() {
    var css = document.createElement('style');
    css.textContent = [
      '#omni-fb-btn{position:fixed;right:1rem;bottom:1rem;z-index:9999;padding:.75rem 1.1rem;border-radius:9999px;',
      'background:#059669;color:#fff;font:600 13px/1 Inter,system-ui,sans-serif;border:0;cursor:pointer;',
      'box-shadow:0 10px 25px rgba(0,0,0,.35)}',
      '#omni-fb-btn:hover{background:#10b981}',
      '#omni-fb-backdrop{position:fixed;inset:0;background:rgba(2,6,23,.72);z-index:10000;display:none;align-items:flex-end;justify-content:center;padding:1rem}',
      '#omni-fb-backdrop.open{display:flex}',
      '#omni-fb-panel{background:#0f172a;border:1px solid #1e293b;border-radius:1.25rem;width:100%;max-width:30rem;padding:1.25rem;color:#e2e8f0;max-height:92vh;overflow:auto}',
      '#omni-fb-panel h2{margin:0 0 .25rem;font-size:1.15rem}',
      '#omni-fb-panel p.hint{margin:0 0 .75rem;font-size:.75rem;color:#94a3b8}',
      '#omni-fb-panel label{display:block;font-size:.7rem;text-transform:uppercase;letter-spacing:.04em;color:#94a3b8;margin:.65rem 0 .25rem}',
      '#omni-fb-panel input,#omni-fb-panel select,#omni-fb-panel textarea{width:100%;background:#020617;border:1px solid #334155;border-radius:.75rem;padding:.6rem .75rem;color:#e2e8f0;font:14px Inter,system-ui,sans-serif;box-sizing:border-box}',
      '#omni-fb-desc{min-height:9rem;resize:vertical}',
      '#omni-fb-steps{min-height:3rem;resize:vertical}',
      '#omni-fb-count{font-size:.7rem;color:#64748b;margin-top:.25rem;text-align:right}',
      '#omni-fb-count.over{color:#fbbf24;font-weight:600}',
      '#omni-fb-title-suggest{font-size:.7rem;color:#64748b;margin:.25rem 0 0}',
      '#omni-fb-ctx{font-size:.65rem;color:#64748b;margin-top:.5rem;line-height:1.4}',
      '#omni-fb-actions{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:1rem}',
      '#omni-fb-actions button,#omni-fb-actions a{flex:1;min-width:6.5rem;text-align:center;padding:.65rem;border-radius:9999px;font:600 12px Inter,system-ui,sans-serif;text-decoration:none;border:0;cursor:pointer}',
      '#omni-fb-submit{background:#059669;color:#fff}',
      '#omni-fb-gh{background:#1e293b;color:#e2e8f0}',
      '#omni-fb-board{background:transparent;color:#94a3b8;border:1px solid #334155!important}',
      '#omni-fb-close{background:#334155;color:#e2e8f0}',
      '#omni-fb-status{font-size:.75rem;margin-top:.75rem;color:#34d399;min-height:1rem}',
      '#omni-fb-row{display:flex;gap:.5rem}',
      '#omni-fb-row > *{flex:1}',
    ].join('');
    document.head.appendChild(css);

    var btn = document.createElement('button');
    btn.id = 'omni-fb-btn';
    btn.type = 'button';
    btn.textContent = 'Bug / idea';
    btn.setAttribute('aria-label', 'Report a bug or request a feature');
    document.body.appendChild(btn);

    var backdrop = document.createElement('div');
    backdrop.id = 'omni-fb-backdrop';
    backdrop.innerHTML =
      '<div id="omni-fb-panel" role="dialog" aria-modal="true">' +
      '<h2>Report bug or idea</h2>' +
      '<p class="hint">Brain-dump first. Title optional (we suggest the first line). Saved to shared Bug Desk — full text kept for steward.</p>' +
      '<div id="omni-fb-row">' +
      '<div><label for="omni-fb-type">Type</label>' +
      '<select id="omni-fb-type"><option value="bug">Bug</option><option value="feature">Feature / idea</option><option value="other">Other</option></select></div>' +
      '<div><label for="omni-fb-severity">Severity</label>' +
      '<select id="omni-fb-severity"><option value="medium">Medium</option><option value="low">Low</option><option value="high">High</option><option value="critical">Critical</option></select></div>' +
      '</div>' +
      '<label for="omni-fb-desc">Brain dump *</label>' +
      '<textarea id="omni-fb-desc" placeholder="What happened? What do you wish existed? Dump freely — no need for perfect form…"></textarea>' +
      '<div id="omni-fb-count">0 / ' +
      BRAIN_MAX +
      '</div>' +
      '<label for="omni-fb-title-in">Title <span style="text-transform:none;letter-spacing:0;opacity:.8">(optional)</span></label>' +
      '<input id="omni-fb-title-in" maxlength="120" placeholder="Leave blank to use first line of dump" />' +
      '<div id="omni-fb-title-suggest"></div>' +
      '<label for="omni-fb-steps">Steps / expected vs actual <span style="text-transform:none;letter-spacing:0;opacity:.8">(optional)</span></label>' +
      '<textarea id="omni-fb-steps" placeholder="Optional structure if you want it"></textarea>' +
      '<label for="omni-fb-email">Email (recommended)</label>' +
      '<input id="omni-fb-email" type="email" placeholder="so we can reply" />' +
      '<div id="omni-fb-ctx"></div>' +
      '<div id="omni-fb-actions">' +
      '<button type="button" id="omni-fb-submit">Send report</button>' +
      '<button type="button" id="omni-fb-gh">Also open GitHub</button>' +
      '<a id="omni-fb-board" href="' +
      ADMIN_BASE +
      '?site=all" target="_blank" rel="noopener">Bug Desk</a>' +
      '<button type="button" id="omni-fb-close">Close</button>' +
      '</div>' +
      '<div id="omni-fb-status"></div></div>';
    document.body.appendChild(backdrop);

    var cachedMembership = null;
    var cachedCtx = null;

    function updateCount() {
      var desc = document.getElementById('omni-fb-desc');
      var countEl = document.getElementById('omni-fb-count');
      var sug = document.getElementById('omni-fb-title-suggest');
      var titleIn = document.getElementById('omni-fb-title-in');
      if (!desc || !countEl) return;
      var n = (desc.value || '').length;
      countEl.textContent = n + ' / ' + BRAIN_MAX;
      countEl.className = n > BRAIN_MAX ? 'over' : '';
      if (sug) {
        var suggested = firstLineTitle(desc.value);
        if (!(titleIn && titleIn.value.trim()) && suggested) {
          sug.textContent = 'Suggested title: “' + suggested.slice(0, 80) + (suggested.length > 80 ? '…' : '') + '”';
        } else if (titleIn && titleIn.value.trim()) {
          sug.textContent = 'Using your title.';
        } else {
          sug.textContent = '';
        }
      }
    }

    function refreshContextDisplay() {
      detectMembership(function (m) {
        cachedMembership = m;
        cachedCtx = collectContext(m);
        var el = document.getElementById('omni-fb-ctx');
        if (el) {
          el.textContent =
            'Site: ' +
            cachedCtx.site +
            ' · ' +
            (cachedCtx.member ? 'Member (' + cachedCtx.role + ')' : 'Non-member') +
            ' · ' +
            cachedCtx.viewport +
            (m.email ? ' · ' + m.email : '');
        }
        var emailIn = document.getElementById('omni-fb-email');
        if (emailIn && !emailIn.value && m.email) emailIn.value = m.email;
      });
    }

    function open() {
      backdrop.classList.add('open');
      refreshContextDisplay();
      updateCount();
      var d = document.getElementById('omni-fb-desc');
      if (d) d.focus();
    }
    function close() {
      backdrop.classList.remove('open');
    }
    function fields() {
      return {
        type: document.getElementById('omni-fb-type').value,
        severity: document.getElementById('omni-fb-severity').value,
        title: (document.getElementById('omni-fb-title-in').value || '').trim(),
        desc: (document.getElementById('omni-fb-desc').value || '').trim(),
        steps: (document.getElementById('omni-fb-steps').value || '').trim(),
        email: (document.getElementById('omni-fb-email').value || '').trim(),
      };
    }

    btn.addEventListener('click', open);
    document.getElementById('omni-fb-close').addEventListener('click', close);
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) close();
    });
    document.getElementById('omni-fb-desc').addEventListener('input', updateCount);
    document.getElementById('omni-fb-title-in').addEventListener('input', updateCount);

    document.getElementById('omni-fb-submit').addEventListener('click', function () {
      ensureDeps(function () {
        var f = fields();
        var statusEl = document.getElementById('omni-fb-status');
        var title = resolveTitle(f);

        if (!f.desc || f.desc.length < 10) {
          statusEl.style.color = '#fbbf24';
          statusEl.textContent = 'Brain dump at least 10 characters — dump freely.';
          return;
        }
        if (f.desc.length > BRAIN_MAX) {
          statusEl.style.color = '#fbbf24';
          statusEl.textContent =
            'Over ' + BRAIN_MAX + ' characters — trim the dump (no silent truncation). Count shows above.';
          return;
        }

        var ctx = cachedCtx || collectContext(cachedMembership || {});
        if (f.email) ctx.reporterEmail = f.email;

        var item = window.OmniBugs
          ? window.OmniBugs.addInbox({
              type: f.type,
              severity: f.severity,
              title: title,
              description: f.desc,
              steps: f.steps,
              pageUrl: ctx.pageUrl,
              pageTitle: ctx.pageTitle,
              site: ctx.site,
              member: ctx.member,
              role: ctx.role,
              userAgent: ctx.userAgent,
              viewport: ctx.viewport,
              reporterEmail: ctx.reporterEmail || f.email,
              reporterName: ctx.reporterName || (f.email ? f.email.split('@')[0] : 'anonymous'),
              reporterUserId: ctx.reporterUserId,
              status: 'inbox',
              priority: f.severity === 'critical' || f.severity === 'high' ? f.severity : 'medium',
              potCents: 0,
              source: 'widget',
              context: ctx,
            })
          : { id: 'local_' + Date.now().toString(36), reporterName: 'Guest' };

        // Use resolved title for durable post
        f.title = title;

        statusEl.style.color = '#94a3b8';
        statusEl.textContent = 'Saving to Bug Desk…';

        postToBugDesk(f, ctx, item)
          .then(function (saved) {
            // Green only when durable Bug Desk returns bug_* id (not local INB-*)
            var deskId = saved && saved.id ? String(saved.id) : '';
            if (!deskId || deskId.indexOf('bug_') !== 0) {
              throw new Error('No durable bug_* id from Bug Desk');
            }
            var siteLabel = (saved && saved.siteId) || siteIdFromCtx(ctx.site);
            statusEl.style.color = '#34d399';
            statusEl.innerHTML =
              'Saved <strong style="color:#a7f3d0">' +
              deskId +
              '</strong> · ' +
              siteLabel +
              '. Full dump is in Bug Desk for the steward.';
            // Short steward email only after durable success
            emailShortNotify(f, ctx, deskId, title);
            setTimeout(function () {
              try {
                close();
              } catch (e) {}
            }, 2800);
          })
          .catch(function (err) {
            var why = err && err.message ? err.message : 'unknown';
            statusEl.style.color = '#94a3b8';
            statusEl.textContent = 'Bug Desk failed (' + why + ') — sending full report by email…';
            emailFullFallback(f, ctx, item, title)
              .then(function (r) {
                if (!r || !r.ok) throw new Error('email failed');
                statusEl.style.color = '#fbbf24';
                statusEl.textContent =
                  'Email failsafe sent with full dump. Not yet a durable bug_* id — steward will re-enter.';
              })
              .catch(function () {
                statusEl.style.color = '#fbbf24';
                var mailTo =
                  (window.OMNI_SITE &&
                    (window.OMNI_SITE.contactEmail || window.OMNI_SITE.techsupportEmail)) ||
                  'techsupport@onemissionnetworkandinstitute.org';
                var subject = encodeURIComponent('[OMNI ' + f.type + '][' + ctx.site + '] ' + title);
                var body = encodeURIComponent(
                  'Site: ' +
                    ctx.site +
                    '\n\n' +
                    f.desc +
                    '\n\nSteps:\n' +
                    (f.steps || '—')
                );
                statusEl.innerHTML =
                  'Could not reach Bug Desk. <a href="mailto:' +
                  mailTo +
                  '?subject=' +
                  subject +
                  '&body=' +
                  body +
                  '" style="color:#fde68a;text-decoration:underline">Email full dump</a> (page stays put).';
              });
          });
      });
    });

    document.getElementById('omni-fb-gh').addEventListener('click', function () {
      ensureDeps(function () {
        var f = fields();
        var statusEl = document.getElementById('omni-fb-status');
        if (!f.desc || f.desc.length < 10) {
          statusEl.style.color = '#fbbf24';
          statusEl.textContent = 'Add a brain dump first.';
          return;
        }
        if (f.desc.length > BRAIN_MAX) {
          statusEl.style.color = '#fbbf24';
          statusEl.textContent = 'Over limit — trim before GitHub.';
          return;
        }
        var title = resolveTitle(f);
        var ctx = cachedCtx || collectContext(cachedMembership || {});
        if (f.email) ctx.reporterEmail = f.email;
        var url = githubNewIssueUrl(f.type, title, f.desc, f.steps, f.severity, ctx);
        if (!url) {
          statusEl.textContent = 'GitHub config missing.';
          return;
        }
        window.open(url, '_blank', 'noopener');
        statusEl.style.color = '#34d399';
        statusEl.textContent = 'GitHub form opened with full dump.';
      });
    });
  }

  function loadSupportWidget() {
    if (window.__omniSupportLoaded || window.OMNI_SUPPORT) return;
    var s = document.createElement('script');
    s.src = 'js/support-widget.js';
    s.defer = true;
    document.head.appendChild(s);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      inject();
      loadSupportWidget();
    });
  } else {
    inject();
    loadSupportWidget();
  }
})();
