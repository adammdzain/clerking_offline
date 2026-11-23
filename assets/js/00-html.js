// The one HTML escaper for ED Doc and the Template Editor. Anything typed by a user, read from
// storage or from a setup file goes through this before it is put into markup with innerHTML.
// Quotes are escaped too, so the result is also safe inside an attribute value.
function escapeHtml(text) {
  if (text == null) return '';
  return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
