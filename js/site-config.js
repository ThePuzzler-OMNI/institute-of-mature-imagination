/**
 * Minimal public config for sister-site Bug / idea widget.
 * Reports to shared One Mission Bug Desk + FormSubmit backup.
 */
(function (g) {
  g.OMNI_SITE = g.OMNI_SITE || {
    apiBase: "https://onemission-omni-chat.azurewebsites.net",
    formSubmitEndpoint: "https://formsubmit.co/ajax/techsupport@onemissionnetworkandinstitute.org",
    bugDesk: {
      api: "https://onemissionnetworkandinstitute.org/api/bugs",
    },
    feedbackRepo: {
      owner: "ThePuzzler-OMNI",
      repo: "mirror-grok",
      hubIssue: 5,
      labelAll: "site-feedback",
      labelBug: "site-bug",
      labelFeature: "site-feature",
    },
  };
})(window);
