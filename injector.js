// injector.js — runs as a content script and injects page-level override script
(function(){
  try {
    const keys = [
      'popupBlockingEnabled',
      'canvasMaskingEnabled',
      'webglMaskingEnabled',
      'audioMaskingEnabled',
      'localStorageMaskingEnabled',
      'fetchMaskingEnabled'
    ];

    // Read flags from chrome.storage and inject them into the page, then load injected_overrides.js
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(keys, (res) => {
        const flags = {
          popup: res.popupBlockingEnabled === undefined ? true : !!res.popupBlockingEnabled,
          canvas: res.canvasMaskingEnabled === undefined ? true : !!res.canvasMaskingEnabled,
          webgl: res.webglMaskingEnabled === undefined ? true : !!res.webglMaskingEnabled,
          audio: res.audioMaskingEnabled === undefined ? true : !!res.audioMaskingEnabled,
          localStorage: res.localStorageMaskingEnabled === undefined ? true : !!res.localStorageMaskingEnabled,
          fetch: res.fetchMaskingEnabled === undefined ? true : !!res.fetchMaskingEnabled
        };

        try {
          // Setup a message responder so the page script can request flags without inline scripts
          function handleRequest(event) {
            try {
              if (!event || !event.data || event.data.type !== 'DECEPTION_REQUEST_FLAGS') return;
              // reply with flags
              window.postMessage({ type: 'DECEPTION_FLAGS', flags: flags }, '*');
            } catch (e) { /* ignore */ }
          }
          window.addEventListener('message', handleRequest);

          // Watch for storage changes and push updated flags to the page in real-time
          if (chrome.storage && chrome.storage.onChanged && typeof chrome.storage.onChanged.addListener === 'function'){
            chrome.storage.onChanged.addListener(function(changes, areaName){
              try{
                // rebuild flags from current storage values
                chrome.storage.local.get(keys, (res2) => {
                  const updated = {
                    popup: res2.popupBlockingEnabled === undefined ? true : !!res2.popupBlockingEnabled,
                    canvas: res2.canvasMaskingEnabled === undefined ? true : !!res2.canvasMaskingEnabled,
                    webgl: res2.webglMaskingEnabled === undefined ? true : !!res2.webglMaskingEnabled,
                    audio: res2.audioMaskingEnabled === undefined ? true : !!res2.audioMaskingEnabled,
                    localStorage: res2.localStorageMaskingEnabled === undefined ? true : !!res2.localStorageMaskingEnabled,
                    fetch: res2.fetchMaskingEnabled === undefined ? true : !!res2.fetchMaskingEnabled
                  };
                  // broadcast updated flags to page
                  window.postMessage({ type: 'DECEPTION_FLAGS', flags: updated }, '*');
                  // also update local copy
                  Object.assign(flags, updated);
                });
              }catch(e){}
            });
          }

          // Insert external injected script from extension files (no inline scripts)
          const s = document.createElement('script');
          s.src = chrome.runtime.getURL('injected_overrides.js');
          s.defer = true;
          (document.documentElement || document.head || document.body).appendChild(s);

          // keep handler alive (page may request flags anytime)
        } catch (e) {
          console.error('[Injector] injection failed', e);
        }
      });
    } else {
      // Not running as extension (fallback) — inject default flags = all true
      const inline = document.createElement('script');
      inline.textContent = 'window.__DECEPTION_SHIELD_FLAGS = {popup:true,canvas:true,webgl:true,audio:true,localStorage:true,fetch:true};';
      (document.documentElement || document.head || document.body).appendChild(inline);
      const s = document.createElement('script');
      s.src = '/injected_overrides.js';
      s.defer = true;
      (document.documentElement || document.head || document.body).appendChild(s);
      setTimeout(() => inline.remove(), 2000);
    }
  } catch (err) {
    console.error('[Injector] unexpected error', err);
  }
})();
