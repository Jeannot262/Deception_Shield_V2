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

// Link to test runner
const linkEl = document.createElement("div");
linkEl.style.marginTop = "10px";
linkEl.innerHTML = `<a href="../test_runner.html" target="_blank" class="text-sm text-blue-600">Ouvrir l'auto-test</a>`;
document.body.appendChild(linkEl);
