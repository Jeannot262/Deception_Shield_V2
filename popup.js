/**
 * Logique pour la Pop-up de l'Extension (popup.js)
 * Gère l'état du bloqueur de pop-up via chrome.storage.local.
 */

const popupToggle = document.getElementById("popupToggle");

// Module toggles
const canvasToggle = document.getElementById("canvasToggle");
const webglToggle = document.getElementById("webglToggle");
const audioToggle = document.getElementById("audioToggle");
const localStorageToggle = document.getElementById("localStorageToggle");
const fetchToggle = document.getElementById("fetchToggle");

const STORAGE_KEYS = {
  popup: "popupBlockingEnabled",
  canvas: "canvasMaskingEnabled",
  webgl: "webglMaskingEnabled",
  audio: "audioMaskingEnabled",
  localStorage: "localStorageMaskingEnabled",
  fetch: "fetchMaskingEnabled",
};

function initToggle(element, storageKey, defaultValue = true) {
  if (!element) return;
  chrome.storage.local.get([storageKey], (res) => {
    const val = res[storageKey];
    const isEnabled = val === undefined ? defaultValue : val;
    element.checked = !!isEnabled;
    element.dispatchEvent(new Event("change"));
    console.log(`[Popup] ${storageKey} initial : ${isEnabled}`);
  });

  element.addEventListener("change", (e) => {
    const checked = !!e.target.checked;
    chrome.storage.local.set({ [storageKey]: checked }, () => {
      console.log(`[Popup] ${storageKey} mis à jour : ${checked}`);
    });
  });

  // Notify active tab so content script can apply changes immediately
  element.addEventListener("change", () => {
    try{
      chrome.tabs && chrome.tabs.query && chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        try{ if (tabs && tabs[0] && tabs[0].id) chrome.tabs.sendMessage(tabs[0].id, { type: 'DECEPTION_STORAGE_UPDATED' }); }catch(e){}
      });
    }catch(e){}
  });
}

// Initialize core popup toggle
if (!popupToggle) {
  console.warn(
    "[Popup] Élément #popupToggle introuvable dans popup.html — aucun état géré."
  );
} else {
  initToggle(popupToggle, STORAGE_KEYS.popup, true);
}

// Initialize module toggles
initToggle(canvasToggle, STORAGE_KEYS.canvas, true);
initToggle(webglToggle, STORAGE_KEYS.webgl, true);
initToggle(audioToggle, STORAGE_KEYS.audio, true);
initToggle(localStorageToggle, STORAGE_KEYS.localStorage, true);
initToggle(fetchToggle, STORAGE_KEYS.fetch, true);

// Link to test runner (use runtime.getURL to point to extension resource)
const linkEl = document.createElement("div");
linkEl.style.marginTop = "10px";
const runnerLink = document.createElement('a');
runnerLink.textContent = 'Ouvrir l\'auto-test';
runnerLink.className = 'text-sm text-blue-600';
runnerLink.target = '_blank';
// Prefer the local dev server so content scripts run on the test page.
// If you run `npm run serve`, the test runner is available at http://127.0.0.1:8000/test_runner.html
try{
  runnerLink.href = 'http://127.0.0.1:8000/test_runner.html';
}catch(e){ runnerLink.href = chrome.runtime && chrome.runtime.getURL ? chrome.runtime.getURL('test_runner.html') : 'test_runner.html'; }
// Open the test runner in a new tab using chrome.tabs to ensure it opens even from the popup
runnerLink.addEventListener('click', function(evt){
  evt.preventDefault();
  var url = runnerLink.href;
  try{
    if (chrome.tabs && chrome.tabs.create){
      chrome.tabs.create({ url: url });
    } else {
      window.open(url, '_blank');
    }
  }catch(e){ window.open(url, '_blank'); }
});
linkEl.appendChild(runnerLink);
document.body.appendChild(linkEl);
