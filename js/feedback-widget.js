/**
 * Sitewide bug / feature request button — scalable context-rich reporter.
 * Captures page, device, membership, site for both logged-in and anonymous users.
 * Primary: Bug Desk /api/bugs (multi-site steward dashboard).
 * Mirror: Azure /api/service-feedback.
 * Backup: FormSubmit email + optional structured GitHub issue.
 */
(function () {
  if (window.__omniFeedbackLoaded) return;
  window.__omniFeedbackLoaded = true;

  function loadScript(src, cb) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = cb;
    s.onerror = cb;
    document.head.appendChild(s);
  }

  function ensureDeps(cb) {
    function next() {
      if (!window.OmniBugs) return loadScript('js/bugs-store.js', cb);
      cb();
    }
    if (!window.OMNI_SITE) loadScript('js/site-config.js', next);
    else next();
  }

  function detectSite() {
    var h = (location.hostname || '').toLowerCase();
    if (h.indexOf('intekspace') !== -1) return 'intekspace';
    if (h.indexOf('instituteofmatureimagination') !== -1 || h.indexOf('imi') !== -1) return 'imi';
    if (h.indexOf('onemission') !== -1) return 'onemission';
    return h || 'unknown';
  }

  function detectMembership(cb) {
    var result = { role: 'guest', member: false, name: '', email: '', userId: '', provider: '' };
    function finish(p) {
      if (p) {
        result.userId = p.userId || '';
        result.name = p.name || p.userDetails || '';
        result.email = p.email || (p.userDetails && p.userDetails.indexOf('@') !== -1 ? p.userDetails : '') || '';
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
      '### Membership',
      (ctx.member ? 'member' : 'non-member') + ' · role=' + (ctx.role || 'guest'),
      '',
      '### Page',
      ctx.pageUrl,
      ctx.pageTitle ? '(' + ctx.pageTitle + ')' : '',
      '',
      '### Details',
      desc,
      '',
      '### Steps / Expected vs actual',
      steps || '—',
      '',
      '### Context',
      '- User-Agent: ' + (ctx.userAgent || '—'),
      '- Viewport: ' + (ctx.viewport || '—') + ' · Screen: ' + (ctx.screen || '—'),
      '- Language: ' + (ctx.language || '—') + ' · TZ: ' + (ctx.timezone || '—'),
      '- Referrer: ' + (ctx.referrer || '—'),
      '- Captured: ' + (ctx.capturedAt || ''),
      '',
      '### Contact',
      (ctx.reporterName || '') + (ctx.reporterEmail ? ' <' + ctx.reporterEmail + '>' : '') || '(anonymous)',
      ctx.reporterUserId ? 'userId: ' + ctx.reporterUserId : '',
      '',
      '---',
      '_Submitted from feedback widget · Hub: #' + (cfg.hubIssue || '5') + '_',
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


  function postToBugDesk(f, ctx, item) {
    var desk = (window.OMNI_SITE && window.OMNI_SITE.bugDesk) || {};
    var api = desk.api || desk.apiAzure || 'https://onemissionnetworkandinstitute.org/api/bugs';
    var siteMap = {
      onemission: 'onemission',
      intekspace: 'intekspace',
      imi: 'imi',
    };
    var siteId = siteMap[ctx.site] || (ctx.site === 'unknown' ? 'other' : 'other');
    if (ctx.site && ctx.site.indexOf('intek') !== -1) siteId = 'intekspace';
    if (ctx.site && (ctx.site.indexOf('imi') !== -1 || ctx.site.indexOf('mature') !== -1)) siteId = 'imi';
    if (ctx.site && ctx.site.indexOf('onemission') !== -1) siteId = 'onemission';

    var payload = {
      siteId: siteId,
      type: f.type === 'feature' ? 'feature' : f.type === 'other' ? 'other' : 'bug',
      severity: f.severity || 'medium',
      title: f.title,
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
    };

    return fetch(api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok || (j && j.ok === false)) {
          throw new Error((j && j.error) || ('bug-desk ' + r.status));
        }
        return j;
      });
    });
  }

  function postToAzure(f, ctx, item) {
    var apiBase =
      (window.OMNI_SITE && window.OMNI_SITE.apiBase) ||
      'https://onemission-omni-chat.azurewebsites.net';
    var kind = f.type === 'feature' ? 'feature' : f.type === 'other' ? 'service' : 'bug';
    // Pack rich context into description so it survives even if metadata is stripped
    var richDesc = [
      f.desc,
      '',
      '---',
      'Steps / Expected vs actual:',
      f.steps || '—',
      '',
      'Context:',
      '- Site: ' + (ctx.site || ''),
      '- Member: ' + (ctx.member ? 'yes' : 'no') + ' (role=' + (ctx.role || 'guest') + ')',
      '- Severity: ' + (f.severity || 'medium'),
      '- Page: ' + (ctx.pageUrl || ''),
      '- Title: ' + (ctx.pageTitle || ''),
      '- UA: ' + (ctx.userAgent || ''),
      '- Viewport: ' + (ctx.viewport || ''),
      '- TZ: ' + (ctx.timezone || ''),
      '- Referrer: ' + (ctx.referrer || ''),
      '- Reporter: ' + (ctx.reporterName || '') + (ctx.reporterEmail ? ' <' + ctx.reporterEmail + '>' : ''),
      '- UserId: ' + (ctx.reporterUserId || ''),
      '- LocalId: ' + (item && item.id ? item.id : ''),
    ].join('\n');

    var payload = {
      source: 'web',
      kind: kind,
      title: f.title,
      description: richDesc,
      page_url: ctx.pageUrl || location.href,
      entra_user_id: ctx.reporterUserId || null,
      metadata: {
        site: ctx.site,
        member: !!ctx.member,
        role: ctx.role || 'guest',
        severity: f.severity || 'medium',
        steps: f.steps || '',
        pageTitle: ctx.pageTitle || '',
        userAgent: ctx.userAgent || '',
        viewport: ctx.viewport || '',
        screen: ctx.screen || '',
        language: ctx.language || '',
        timezone: ctx.timezone || '',
        referrer: ctx.referrer || '',
        reporterEmail: ctx.reporterEmail || f.email || '',
        reporterName: ctx.reporterName || '',
        localId: item && item.id ? item.id : '',
        source: 'feedback-widget',
      },
    };

    return fetch(apiBase.replace(/\/$/, '') + '/api/service-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    }).then(function (r) {
      if (!r.ok) throw new Error('azure ' + r.status);
      return r.json();
    });
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
      '#omni-fb-panel p.hint{margin:0 0 1rem;font-size:.75rem;color:#94a3b8}',
      '#omni-fb-panel label{display:block;font-size:.7rem;text-transform:uppercase;letter-spacing:.04em;color:#94a3b8;margin:.65rem 0 .25rem}',
      '#omni-fb-panel input,#omni-fb-panel select,#omni-fb-panel textarea{width:100%;background:#020617;border:1px solid #334155;border-radius:.75rem;padding:.6rem .75rem;color:#e2e8f0;font:14px Inter,system-ui,sans-serif}',
      '#omni-fb-panel textarea{min-height:4.5rem;resize:vertical}',
      '#omni-fb-ctx{font-size:.65rem;color:#64748b;margin-top:.5rem;line-height:1.4}',
      '#omni-fb-actions{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:1rem}',
      '#omni-fb-actions button,#omni-fb-actions a{flex:1;min-width:6.5rem;text-align:center;padding:.65rem;border-radius:9999px;font:600 12px Inter,system-ui,sans-serif;text-decoration:none;border:0;cursor:pointer}',
      '#omni-fb-submit{background:#059669;color:#fff}',
      '#omni-fb-gh{background:#1e293b;color:#e2e8f0}',
      '#omni-fb-board{background:transparent;color:#94a3b8;border:1px solid #334155!important}',
      '#omni-fb-close{background:#334155;color:#e2e8f0}',
      '#omni-fb-status{font-size:.75rem;margin-top:.75rem;color:#34d399;min-height:1rem}',
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
      '<p class="hint">Context is captured automatically (page, device, membership). Saved to Bug Desk for the steward dashboard (also emailed as backup).</p>' +
      '<label for="omni-fb-type">Type</label>' +
      '<select id="omni-fb-type"><option value="bug">Bug</option><option value="feature">Feature request</option><option value="other">Other</option></select>' +
      '<label for="omni-fb-severity">Severity</label>' +
      '<select id="omni-fb-severity"><option value="medium">Medium</option><option value="low">Low</option><option value="high">High</option><option value="critical">Critical</option></select>' +
      '<label for="omni-fb-title-in">Title *</label>' +
      '<input id="omni-fb-title-in" maxlength="120" placeholder="Short summary" />' +
      '<label for="omni-fb-desc">Details *</label>' +
      '<textarea id="omni-fb-desc" maxlength="4000" placeholder="What happened?"></textarea>' +
      '<label for="omni-fb-steps">Steps / Expected vs actual</label>' +
      '<textarea id="omni-fb-steps" maxlength="2000" placeholder="1. … 2. … Expected: … Actual: …"></textarea>' +
      '<label for="omni-fb-email">Email (recommended for follow-up)</label>' +
      '<input id="omni-fb-email" type="email" placeholder="so we can reply" />' +
      '<div id="omni-fb-ctx"></div>' +
      '<div id="omni-fb-actions">' +
      '<button type="button" id="omni-fb-submit">Send report</button>' +
      '<button type="button" id="omni-fb-gh">Also open GitHub</button>' +
      '<a id="omni-fb-board" href="https://onemissionnetworkandinstitute.org/bug-desk-admin.html" target="_blank" rel="noopener">Bug Desk</a>' +
      '<button type="button" id="omni-fb-close">Close</button>' +
      '</div>' +
      '<div id="omni-fb-status"></div></div>';
    document.body.appendChild(backdrop);

    var cachedMembership = null;
    var cachedCtx = null;

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
      document.getElementById('omni-fb-title-in').focus();
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

    document.getElementById('omni-fb-submit').addEventListener('click', function () {
      ensureDeps(function () {
        var f = fields();
        var statusEl = document.getElementById('omni-fb-status');
        if (!f.title || !f.desc) {
          statusEl.style.color = '#fbbf24';
          statusEl.textContent = 'Please add a title and details.';
          return;
        }
        var ctx = cachedCtx || collectContext(cachedMembership || {});
        if (f.email) ctx.reporterEmail = f.email;

        var item = window.OmniBugs.addInbox({
          type: f.type,
          severity: f.severity,
          title: f.title,
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
          donationUrl: '',
          adminNotes: '',
          source: 'widget',
          context: ctx,
        });

        statusEl.style.color = '#94a3b8';
        statusEl.textContent = 'Saving to Bug Desk…';

        // 1) Primary: multi-site Bug Desk (powers Cmd Cntr + steward dashboard)
        postToBugDesk(f, ctx, item)
          .then(function (saved) {
            statusEl.style.color = '#34d399';
            var deskId = (saved && saved.id) || item.id;
            statusEl.innerHTML =
              'Saved to Bug Desk (' +
              deskId +
              '). <a href="https://onemissionnetworkandinstitute.org/bug-desk-admin.html" target="_blank" rel="noopener" style="color:#6ee7b7;text-decoration:underline">Open dashboard</a>';
            // 2) Also mirror to Azure ServiceFeedback (non-blocking)
            postToAzure(f, ctx, item).catch(function () {});
            // 3) Backup notify steward by email (non-blocking)
            try {
              var endpoint =
                (window.OMNI_SITE && window.OMNI_SITE.formSubmitEndpoint) ||
                'https://formsubmit.co/ajax/techsupport@onemissionnetworkandinstitute.org';
              var fd = new FormData();
              fd.append(
                '_subject',
                '[OMNI ' + f.type + '][' + ctx.site + '][' + (ctx.member ? 'member' : 'guest') + '] ' + f.title
              );
              fd.append('_template', 'table');
              fd.append('_captcha', 'false');
              fd.append('type', f.type);
              fd.append('severity', f.severity);
              fd.append('title', f.title);
              fd.append('message', f.desc);
              fd.append('steps', f.steps || '');
              fd.append('page', ctx.pageUrl);
              fd.append('site', ctx.site);
              fd.append('member', ctx.member ? 'yes' : 'no');
              fd.append('bug_desk_id', deskId);
              fd.append('local_id', item.id);
              fd.append('email', ctx.reporterEmail || f.email || 'anonymous@feedback.local');
              fd.append('name', item.reporterName);
              fetch(endpoint, { method: 'POST', body: fd, headers: { Accept: 'application/json' } }).catch(function () {});
            } catch (e) {}
          })
          .catch(function () {
            // Bug Desk failed — try Azure then FormSubmit
            statusEl.style.color = '#94a3b8';
            statusEl.textContent = 'Bug Desk unavailable — trying backup store…';
            return postToAzure(f, ctx, item).then(function (saved) {
              statusEl.style.color = '#34d399';
              statusEl.textContent =
                'Saved to backup store (' +
                ((saved && saved.id) || item.id) +
                ').';
            });
          })
          .catch(function () {
            // Azure failed — fall back to FormSubmit / mailto so the report is not lost
            statusEl.style.color = '#94a3b8';
            statusEl.textContent = 'Durable store unavailable — sending email…';
            var endpoint =
              (window.OMNI_SITE && window.OMNI_SITE.formSubmitEndpoint) ||
              'https://formsubmit.co/ajax/techsupport@onemissionnetworkandinstitute.org';
            var fd = new FormData();
            fd.append(
              '_subject',
              '[OMNI ' + f.type + '][' + ctx.site + '][' + (ctx.member ? 'member' : 'guest') + '] ' + f.title
            );
            fd.append('_template', 'table');
            fd.append('_captcha', 'false');
            fd.append('type', f.type);
            fd.append('severity', f.severity);
            fd.append('title', f.title);
            fd.append('message', f.desc);
            fd.append('steps', f.steps || '');
            fd.append('page', ctx.pageUrl);
            fd.append('site', ctx.site);
            fd.append('member', ctx.member ? 'yes' : 'no');
            fd.append('local_id', item.id);
            fd.append('email', ctx.reporterEmail || f.email || 'anonymous@feedback.local');
            fd.append('name', item.reporterName);
            fetch(endpoint, { method: 'POST', body: fd, headers: { Accept: 'application/json' } })
              .then(function (r) {
                if (!r.ok) throw new Error('send failed');
                statusEl.style.color = '#34d399';
                statusEl.textContent = 'Sent via email (' + item.id + ').';
              })
              .catch(function () {
                var subject = encodeURIComponent('[OMNI ' + f.type + '][' + ctx.site + '] ' + f.title);
                var body = encodeURIComponent(
                  'ID: ' +
                    item.id +
                    '\nType: ' +
                    f.type +
                    '\nSeverity: ' +
                    f.severity +
                    '\nSite: ' +
                    ctx.site +
                    '\nMember: ' +
                    (ctx.member ? 'yes' : 'no') +
                    '\nPage: ' +
                    ctx.pageUrl +
                    '\n\n' +
                    f.desc +
                    '\n\nSteps:\n' +
                    (f.steps || '—') +
                    '\n\nFrom: ' +
                    (ctx.reporterEmail || f.email || 'anonymous')
                );
                statusEl.style.color = '#fbbf24';
                statusEl.textContent = 'Opening email app…';
                var mailTo = (window.OMNI_SITE && (window.OMNI_SITE.contactEmail || window.OMNI_SITE.techsupportEmail)) || 'techsupport@onemissionnetworkandinstitute.org';
                window.location.href =
                  'mailto:' + mailTo + '?subject=' + subject + '&body=' + body;
              });
          });
      });
    });

    document.getElementById('omni-fb-gh').addEventListener('click', function () {
      ensureDeps(function () {
        var f = fields();
        var statusEl = document.getElementById('omni-fb-status');
        if (!f.title || !f.desc) {
          statusEl.style.color = '#fbbf24';
          statusEl.textContent = 'Please add a title and details first.';
          return;
        }
        var ctx = cachedCtx || collectContext(cachedMembership || {});
        if (f.email) ctx.reporterEmail = f.email;
        var url = githubNewIssueUrl(f.type, f.title, f.desc, f.steps, f.severity, ctx);
        if (!url) {
          statusEl.textContent = 'GitHub config missing.';
          return;
        }
        window.open(url, '_blank', 'noopener');
        statusEl.style.color = '#34d399';
        statusEl.textContent = 'GitHub form opened with full context + labels (site / member). Submit there for the tracker.';
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
