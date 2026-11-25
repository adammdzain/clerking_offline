// Event delegation for declarative handlers.
// Replaces inline on*="..." attributes so the page can run under a strict CSP (no 'unsafe-inline' scripts).
// Markup: <button data-on-click="fnName" data-args='[...]'>
// data-args is a JSON array; {"this":true} = the element, {"thisValue":true} = element.value,
// {"thisChecked":true} = element.checked, {"event":true} = the DOM event.
// Loaded before every other script so this listener runs before any other document listener.
(function () {
  'use strict';
  var EVENTS = ['click', 'change', 'input'];

  // Only these functions can be named in data-on-*: if markup were ever injected, it could
  // not call window.open, fetch or any other global. A new handler must be added here.
  var HANDLERS = new Set([
    // index.html and its scripts
    'addTimestamp', 'appendFieldChip', 'changeDictationLanguage', 'clearAllExamSystems',
    'clearAllHopiSections', 'clearDocArea', 'clearExamSystem', 'clearQuickExam', 'clearSection',
    'clearTraumaPins', 'clearTraumaSection', 'closeBt105Modal', 'closeFisioterapiModal',
    'closePat301Modal', 'closeRa301Modal', 'closeRujukanModal', 'copyFromDocAreaToPat301',
    'copyFromDocAreaToRa301', 'copyFromDocAreaToRujukan', 'copyNotes', 'copyPromptToClipboard',
    'downloadBt105Pdf', 'downloadFisioterapiPdf', 'downloadNotes', 'downloadNotesPdf',
    'downloadPat301Pdf', 'downloadRa301Pdf', 'downloadRujukanPdf', 'exportTraumaClerkingPdf',
    'handleExamDiagramClick', 'handleTraumaDiagramClick', 'insertAllExamSystems',
    'insertAllHopiSections', 'insertExamSystem', 'insertQuickExam', 'insertTemplateSection',
    'insertTraumaNote', 'navigateTo', 'openBt105Modal', 'openFisioterapiModal', 'openOrShareBt105Pdf',
    'openOrShareFisioterapiPdf', 'openOrSharePat301Pdf', 'openOrShareRa301Pdf',
    'openOrShareRujukanPdf', 'openPat301Modal', 'openRa301Modal', 'openRujukanModal',
    'printBt105Pdf', 'printClinicalNotes', 'printFisioterapiPdf', 'printPat301Pdf', 'printRa301Pdf',
    'printRujukanPdf', 'refreshBt105Preview', 'refreshFisioterapiPreview', 'refreshPat301Preview',
    'refreshRa301Preview', 'refreshRujukanPreview', 'regenPat301Summary', 'regenRa301Summary',
    'regenRujukanLetter', 'saveBt105Defaults', 'savePat301Defaults', 'saveRa301Defaults',
    'saveRujukanDefaults', 'selectAirwayPatency', 'selectTraumaTool', 'setExamMode',
    'setPat301Diagnosis', 'setPat301TimeToNow', 'setRa301TimeToNow', 'setRujukanTimeToNow',
    'setTraumaEyeReact', 'setTraumaEyeSize', 'setTraumaGcsE', 'setTraumaGcsM', 'setTraumaGcsV',
    'switchExamFormat', 'switchExamSystem', 'switchTraumaView', 'toggleBt105MobileView',
    'toggleFisioterapiMobileView', 'toggleFormsMenu', 'togglePat301LainChip',
    'togglePat301MobileView', 'toggleQeChip', 'toggleRa301MobileView', 'toggleRujukanMobileView',
    'toggleSurveyNormal', 'toggleTheme', 'toggleVoiceDictation', 'triggerPWAInstall',
    'undoExamAction', 'undoTraumaPin', 'wipePatientData',
    'addSerialColumn', 'clearSerialPatient', 'closeSerialModal', 'downloadSerialPdf', 'getSerialLabs',
    'openOrShareSerialPdf', 'openSerialModal', 'printSerialPdf', 'refreshSerialPreview',
    'toggleSerialMobileView', 'openEhis', 'orderBloods', 'openPcHelperModal', 'closePcHelperModal', 'checkPcHelper', 'openPcHelperSetup',
    // schema_editor.html and schema-editor.js
    'addChips', 'chooseSetupFile', 'closeAddModal', 'closeChipModal', 'deleteChip', 'deleteField',
    'deleteSubmenu', 'downloadTemplatesFile', 'loadSetupFile', 'moveChip', 'moveField',
    'moveFieldTo', 'moveSubmenu', 'openAddModal', 'openChipModal', 'renderBoard',
    'resetAllToBaseline', 'resetSubmenu', 'revertField', 'setFieldOption', 'setTypeFilter',
    'shareSetup', 'syncAddNewSubmenu', 'syncAddSubmenus', 'toggleNoteSheet', 'toggleSection',
    'toggleSubmenu', 'updateField', 'updateLine', 'updateSubmenu'
  ]);

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
      if (!HANDLERS.has(name)) {
        console.error('[events] "' + name + '" is not in the handler list in 00-events.js');
        continue;
      }
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
  // Only ED Doc's own pages: never another site or a javascript:/data: address.
  var PAGES = ['index.html', 'schema_editor.html'];
  window.navigateTo = function (url) {
    if (PAGES.indexOf(url) === -1) {
      console.error('[events] navigateTo refused "' + url + '"');
      return;
    }
    window.location.href = url;
  };
})();
