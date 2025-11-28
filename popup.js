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
// Test runner UI (configured in popup.html)
const testRunnerUrlInput = document.getElementById('testRunnerUrl');
const testRunnerOpenBtn = document.getElementById('testRunnerOpen');
const testRunnerCheckBtn = document.getElementById('testRunnerCheck');
const serverStatusEl = document.getElementById('serverStatus');

const DEFAULT_RUNNER_URL = 'http://127.0.0.1:8000/test_runner.html';

function saveRunnerUrl(url){
  try{ chrome.storage.local.set({ testRunnerUrl: url }); }catch(e){}
}

function loadRunnerUrl(cb){
  try{ chrome.storage.local.get(['testRunnerUrl'], (res) => { cb(res.testRunnerUrl || DEFAULT_RUNNER_URL); }); }catch(e){ cb(DEFAULT_RUNNER_URL); }
}

function checkServer(url, timeout = 1500){
  return new Promise((resolve) => {
    try{
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      fetch(url, { method: 'HEAD', mode: 'no-cors', signal: controller.signal }).then(() => { clearTimeout(id); resolve(true); }).catch(() => { clearTimeout(id); resolve(false); });
    }catch(e){ resolve(false); }
  });
}

function updateServerStatus(ok){
  if (!serverStatusEl) return;
  if (ok){ serverStatusEl.textContent = 'Serveur local détecté'; serverStatusEl.style.color = '#059669'; }
  else { serverStatusEl.textContent = 'Serveur local indisponible (sera utilisé la ressource interne)'; serverStatusEl.style.color = '#b91c1c'; }
}

// initialize test runner controls
if (testRunnerUrlInput){
  loadRunnerUrl((url) => {
    testRunnerUrlInput.value = url;
    checkServer(url).then((ok) => updateServerStatus(ok));
  });

  testRunnerCheckBtn && testRunnerCheckBtn.addEventListener('click', () => {
    const url = testRunnerUrlInput.value || DEFAULT_RUNNER_URL;
    checkServer(url).then((ok) => updateServerStatus(ok));
    saveRunnerUrl(url);
  });

  testRunnerUrlInput.addEventListener('change', () => { saveRunnerUrl(testRunnerUrlInput.value); });

  testRunnerOpenBtn && testRunnerOpenBtn.addEventListener('click', () => {
    const url = testRunnerUrlInput.value || DEFAULT_RUNNER_URL;
    // prefer chrome.tabs.create for popup context
    try{
      if (chrome.tabs && chrome.tabs.create){ chrome.tabs.create({ url: url }); }
      else window.open(url, '_blank');
    }catch(e){ window.open(url, '_blank'); }
  });
}
