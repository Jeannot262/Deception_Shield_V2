// injected_overrides.js — runs in page context, overrides native APIs based on flags provided by the content script
(function(){
  'use strict';

  // Default flags used if content script doesn't reply
  const DEFAULT_FLAGS = { popup:true, canvas:true, webgl:true, audio:true, localStorage:true, fetch:true };

  // Configurable constants (easy tuning)
  const AUDIO_NOISE_AMPLITUDE = 1e-7; // amplitude added to a few audio samples
  const LOCALSTORAGE_FAKE_PREFIX = 'fake-tracking-id-';
  const LOCALSTORAGE_FAKE_LENGTH = 10; // length of random id suffix

  // Helpful marker to confirm which version loaded
  try{ console.info('[Injection] injected_overrides.js loaded (v2)'); }catch(e){}

  // Receive flags via postMessage from content script
  function requestFlags(timeout = 250){
    return new Promise((resolve) => {
      let resolved = false;
      function onMessage(e){
        try{
          if (!e || !e.data) return;
          if (e.data.type === 'DECEPTION_FLAGS' && e.data.flags){
            resolved = true;
            window.removeEventListener('message', onMessage);
            resolve(e.data.flags);
          }
        }catch(err){}
      }
      window.addEventListener('message', onMessage);
      try{ window.postMessage({ type:'DECEPTION_REQUEST_FLAGS' }, '*'); }catch(e){}
      setTimeout(()=>{
        if (!resolved){ window.removeEventListener('message', onMessage); resolve(null); }
      }, timeout);
    });
  }

  function safe(fn){ try{ fn(); } catch(e){ console.warn('[Injection] safe error', e); } }

  function installOverrides(flags){
    flags = Object.assign({}, DEFAULT_FLAGS, flags || {});

    // Canvas
    if (flags.canvas && HTMLCanvasElement && HTMLCanvasElement.prototype){
      safe(()=>{
        const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
        const origToBlob = HTMLCanvasElement.prototype.toBlob;
        function maybeAlterCanvas(canvas){
          try{
            const ctx = canvas.getContext('2d'); if(!ctx) return false;
            const w = canvas.width, h = canvas.height; if(w===0||h===0) return false;
            const x = Math.floor(Math.random()*Math.max(1,w));
            const y = Math.floor(Math.random()*Math.max(1,h));
            try{
              const img = ctx.getImageData(x,y,1,1);
              img.data[0] = (img.data[0] + (Math.random()>0.5 ? 1 : 255)) & 255;
              ctx.putImageData(img,x,y);
              return true;
            }catch(e){return false;}
          }catch(e){return false;}
        }
        HTMLCanvasElement.prototype.toDataURL = function(){ maybeAlterCanvas(this); return origToDataURL.apply(this, arguments); };
        HTMLCanvasElement.prototype.toBlob = function(){ maybeAlterCanvas(this); return origToBlob.apply(this, arguments); };
        console.info('[Injection] Canvas overrides installed');
      });
    }

    // WebGL / WebGL2
    if (flags.webgl){
      safe(()=>{
        const maskVendor = ()=> 'Google Inc. (Masque)';
        const maskRenderer = ()=> 'ANGLE (Masque)';
        function wrapGetParameter(proto){
          const orig = proto.getParameter;
          proto.getParameter = function(pname){
            try{
              if (pname === 37445 || pname === proto.VENDOR || String(pname).toUpperCase().includes('VENDOR')) return maskVendor();
              if (pname === 37446 || pname === proto.RENDERER || String(pname).toUpperCase().includes('RENDERER')) return maskRenderer();
            }catch(e){}
            return orig.apply(this, arguments);
          };
        }
        function wrapGetExtension(proto){
          const orig = proto.getExtension;
          proto.getExtension = function(name){ try{ if(!name) return orig.apply(this, arguments); const n=String(name); if(n.toLowerCase().includes('webgl_debug_renderer_info')) return null; }catch(e){} return orig.apply(this, arguments); };
        }
        if (window.WebGLRenderingContext) { wrapGetParameter(WebGLRenderingContext.prototype); wrapGetExtension(WebGLRenderingContext.prototype); }
        if (window.WebGL2RenderingContext) { wrapGetParameter(WebGL2RenderingContext.prototype); wrapGetExtension(WebGL2RenderingContext.prototype); }
        console.info('[Injection] WebGL/WebGL2 overrides installed');
      });
    }

    // WebAudio
    if (flags.audio){
      safe(()=>{
        if (window.AudioBuffer && AudioBuffer.prototype && AudioBuffer.prototype.getChannelData){
          const orig = AudioBuffer.prototype.getChannelData;
          AudioBuffer.prototype.getChannelData = function(){
            var data = orig.apply(this, arguments);
            try{
              for(var i=0;i<Math.min(4, data.length); i++){
                data[i] = data[i] + (Math.random() - 0.5) * AUDIO_NOISE_AMPLITUDE;
              }
            }catch(e){}
            return data;
          };
        }
        console.info('[Injection] WebAudio overrides installed');
      });
    }

    // localStorage
    if (flags.localStorage){
      safe(()=>{
        try{
          const orig = Storage.prototype.getItem;
          Storage.prototype.getItem = function(key){
            try{
              var k = String(key || '');
              if(/user|id|client|uuid|visitor|ga|analytics/i.test(k)){
                var rnd = Math.random().toString(36).slice(2, 2 + LOCALSTORAGE_FAKE_LENGTH);
                return LOCALSTORAGE_FAKE_PREFIX + rnd;
              }
            }catch(e){}
            return orig.apply(this, arguments);
          };
        }catch(e){}
        console.info('[Injection] localStorage overrides installed');
      });
    }

    // fetch / XHR
    if (flags.fetch){
      safe(()=>{
        if (window.fetch){ const origFetch = window.fetch.bind(window); window.fetch = function(input, init){ try{ const url = (typeof input==='string')?input:(input&&input.url)||''; if(/analytics|google-analytics|collect|pixel|tracking/i.test(String(url))){ try{ if(init && init.method && init.method.toUpperCase()==='POST' && init.body){ let body=init.body; try{ body=JSON.parse(body); body._deception=true; init.body=JSON.stringify(body);}catch(e){} } }catch(e){} } }catch(e){} return origFetch(input, init); }; }
        try{ const origOpen = XMLHttpRequest.prototype.open; XMLHttpRequest.prototype.open = function(method, url){ this.__deception_url = url; return origOpen.apply(this, arguments); }; const origSend = XMLHttpRequest.prototype.send; XMLHttpRequest.prototype.send = function(body){ try{ if(this.__deception_url && /analytics|collect|pixel|tracking/i.test(this.__deception_url)){ try{ this.setRequestHeader && this.setRequestHeader('X-Deception','1'); }catch(e){} } }catch(e){} return origSend.apply(this, arguments); }; }catch(e){}
        console.info('[Injection] fetch/XHR overrides installed');
      });
    }

    // popup blocking / cloaking
    if (flags.popup || flags.canvas || flags.webgl || flags.audio || flags.localStorage || flags.fetch) {
      safe(function(){
        if (flags.popup) {
          try {
            window.open = function() { return null; };
            console.info('[Injection] window.open overridden (popups blocked)');
          } catch(e) {}
        }

        try {
          var offset = (Math.floor(Math.random()*5)+1) * 60 * 1000;
          var OrigDate = Date;
          function FakeDate() {
            if (arguments.length === 0) return new OrigDate(OrigDate.now() + offset);
            var args = Array.prototype.slice.call(arguments);
            var bound = Function.prototype.bind.apply(OrigDate, [null].concat(args));
            return new bound();
          }
          FakeDate.now = function() { return OrigDate.now() + offset; };
          FakeDate.prototype = OrigDate.prototype;
          window.Date = FakeDate;
          console.info('[Injection] Date.now overridden (clock cloaking)');
        } catch(e) {}

        try {
          Object.defineProperty(document, 'referrer', { get: function(){ return 'https://www.google.com/'; } });
        } catch(e) {}
      });
    }

  }

  // Main: request flags then install overrides
  // expose helper so developer can toggle overrides manually in console:
  // window.__deception_installOverrides({ canvas:false, audio:false })
  // This calls installOverrides with the provided flags.
  function exposeHelpers(){
    try{ window.__deception_installOverrides = function(flags){ try{ installOverrides(flags); return true; }catch(e){ return false; } }; }catch(e){}
  }

  (async function main(){
    try{
      const flags = await requestFlags();
      installOverrides(flags);
      exposeHelpers();
    }catch(e){ console.error('[Injection] error during install', e); installOverrides(null); }
  })();

})();
