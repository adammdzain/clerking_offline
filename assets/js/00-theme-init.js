// Apply saved theme before first paint (loaded synchronously in <head>).
(function () {
  try {
    var t = localStorage.getItem('ed_doc_theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) { document.documentElement.setAttribute('data-theme', 'dark'); }
})();
