/* =======================================================
   PC HELPER: install page (download the password-protected installer zip, check the
   helper on this PC) and the eHIS menu's Open eHIS and Order bloods. The helper itself is pc-helper/ in
   the repo; scripts/build_dist.py zips it into downloads/eddoc-pc-helper.zip.
   ======================================================= */
const EHIS_HELPER_VERSION = '2026.11.25';   // keep equal to $HelperVersion in pc-helper/ehis-to-eddoc.ps1 (build checks)

function openPcHelperModal() {
  document.getElementById('pcHelperStatus').textContent = '';
  const modal = document.getElementById('pcHelperModal');
  modal.classList.add('active');
  openModalA11y(modal);
}

function closePcHelperModal() {
  const modal = document.getElementById('pcHelperModal');
  modal.classList.remove('active');
  closeModalA11y(modal);
}

function setPcHelperStatus(text, ok) {
  const el = document.getElementById('pcHelperStatus');
  el.textContent = text;
  el.style.color = ok ? 'var(--accent)' : '';
}

function checkPcHelper() {
  setPcHelperStatus('Checking this PC...', false);
  return ehisRequest('ver', document.getElementById('btnPcHelperCheck'), 'Check this PC', (d) => {
    if (d.version === EHIS_HELPER_VERSION) setPcHelperStatus(`Installed and up to date (version ${d.version}).`, true);
    else setPcHelperStatus(`Installed, but version ${d.version || '?'} is not the current ${EHIS_HELPER_VERSION}. Download the installer above and run install.bat again.`, false);
  }, () => setPcHelperStatus(`Not installed, or older than version ${EHIS_HELPER_VERSION} (older ones cannot answer). Download the installer above and run install.bat.`, false));
}

// eHIS menu (header). Nothing comes back to the page for either: the PC helper runs the
// eHIS auto-login, or opens the order picker on top of everything.
function openEhis() {
  window.location.href = 'eddoc-ehis://login';
  showToast('Opening eHIS... (only on PCs with the PC helper)', 4000);
}

function orderBloods() {
  window.location.href = 'eddoc-ehis://order';
  showToast('Opening the order picker on this PC... (needs the PC helper and an open eHIS chart)', 5000);
}

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('pcHelperModal');
  if (!modal) return;
  bindBackdropClose(modal, closePcHelperModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active') && !isTypingInField()) closePcHelperModal();
  });
});
