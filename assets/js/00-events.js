// Event delegation for declarative handlers.
// Replaces inline on*="..." attributes so the page can run under a strict CSP (no 'unsafe-inline' scripts).
// Markup: <button data-on-click="fnName" data-args='[...]'>
// data-args is a JSON array; {"this":true} = the element, {"thisValue":true} = element.value,
// {"thisChecked":true} = element.checked, {"event":true} = the DOM event.
// Loaded before every other script so this listener runs before any other document listener.
(function () {
  'use strict';
  var EVENTS = ['click', 'change', 'input'];

  function resolveArgs(el, event, raw) {
    return raw.map(function (a) {
      if (a !== null && typeof a === 'object') {
        if (a.this) return el;
        if (a.thisValue) return el.value;
        if (a.thisChecked) return el.checked;
        if (a.event) return event;
      }
      return a;
    });
  }

  function dispatch(event) {
    var attr = 'data-on-' + event.type;
    // Walk from the target up to the document, like inline handlers did during bubbling.
    for (var node = event.target; node && node.nodeType === 1; node = node.parentElement) {
      var name = node.getAttribute(attr);
      if (!name) continue;
      var fn = window[name];
      if (typeof fn !== 'function') {
        console.error('[events] No handler named "' + name + '" for ' + event.type);
        continue;
      }
      var args = [];
      try { args = JSON.parse(node.getAttribute('data-args') || '[]'); } catch (e) {
        console.error('[events] Bad data-args on', node, e);
      }
      fn.apply(node, resolveArgs(node, event, args));
    }
  }

  EVENTS.forEach(function (type) { document.addEventListener(type, dispatch); });

  // Used by the header/menu links that previously set window.location inline.
  window.navigateTo = function (url) { window.location.href = url; };
})();
