// injected_overrides.js — runs in page context, overrides native APIs based on flags provided by the content script
(function(){
  'use strict';

  // Default flags used if content script doesn't reply
  const DEFAULT_FLAGS = { popup:true, canvas:true, webgl:true, audio:true, localStorage:true, fetch:true };

  // Configurable constants (easy tuning)
  // More aggressive-but-safe defaults for stronger fingerprint perturbation
  // Audio: increase slightly so differences are measurable but still tiny
  const AUDIO_NOISE_AMPLITUDE = 1e-6; // amplitude added to a few audio samples
  // localStorage: use a distinct prefix + longer random suffix
  const LOCALSTORAGE_FAKE_PREFIX = 'decep-id-';
  const LOCALSTORAGE_FAKE_LENGTH = 16; // length of random id suffix

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
  // store originals so we can restore on disable
  var ORIG = {
    canvas: {},
    webgl: { webgl1: {}, webgl2: {} },
    audio: {},
    storage: {},
    fetch: {},
    popup: { open: null, Date: null, referrer: null }
  };

  // current applied flags
  var CURRENT_FLAGS = Object.assign({}, DEFAULT_FLAGS);

  function enableCanvas(){
    if (!HTMLCanvasElement || !HTMLCanvasElement.prototype) return;
    if (!ORIG.canvas.toDataURL) ORIG.canvas.toDataURL = HTMLCanvasElement.prototype.toDataURL;
    if (!ORIG.canvas.toBlob) ORIG.canvas.toBlob = HTMLCanvasElement.prototype.toBlob;
    function maybeAlterCanvas(canvas){
      try{
        var ctx = canvas.getContext('2d'); if(!ctx) return false;
        var w = canvas.width, h = canvas.height; if(w===0||h===0) return false;
        var x = Math.floor(Math.random()*Math.max(1,w));
        var y = Math.floor(Math.random()*Math.max(1,h));
        try{
          var img = ctx.getImageData(x,y,1,1);
          img.data[0] = (img.data[0] + (Math.random()>0.5 ? 1 : 255)) & 255;
          ctx.putImageData(img,x,y);
          return true;
        }catch(e){return false;}
      }catch(e){return false;}
    }
    HTMLCanvasElement.prototype.toDataURL = function(){ maybeAlterCanvas(this); return ORIG.canvas.toDataURL.apply(this, arguments); };
    HTMLCanvasElement.prototype.toBlob = function(){ maybeAlterCanvas(this); return ORIG.canvas.toBlob.apply(this, arguments); };
    CURRENT_FLAGS.canvas = true;
    console.info('[Injection] Canvas overrides installed');
  }

  function disableCanvas(){
    try{
      if (ORIG.canvas.toDataURL) HTMLCanvasElement.prototype.toDataURL = ORIG.canvas.toDataURL;
      if (ORIG.canvas.toBlob) HTMLCanvasElement.prototype.toBlob = ORIG.canvas.toBlob;
      CURRENT_FLAGS.canvas = false;
      console.info('[Injection] Canvas overrides removed');
    }catch(e){}
  }

  function enableWebGL(){
    try{
      var maskVendor = function(){ return 'Google Inc. (Masque)'; };
      var maskRenderer = function(){ return 'ANGLE (Masque)'; };
      function wrapGetParameter(proto, store){
        if (!proto) return;
        if (!store.origGetParameter) store.origGetParameter = proto.getParameter;
        proto.getParameter = function(pname){
          try{
            if (pname === 37445 || pname === proto.VENDOR || String(pname).toUpperCase().includes('VENDOR')) return maskVendor();
            if (pname === 37446 || pname === proto.RENDERER || String(pname).toUpperCase().includes('RENDERER')) return maskRenderer();
          }catch(e){}
          return store.origGetParameter.apply(this, arguments);
        };
      }
      function wrapGetExtension(proto, store){
        if (!proto) return;
        if (!store.origGetExtension) store.origGetExtension = proto.getExtension;
        proto.getExtension = function(name){ try{ if(!name) return store.origGetExtension.apply(this, arguments); var n=String(name); if(n.toLowerCase().includes('webgl_debug_renderer_info')) return null; }catch(e){} return store.origGetExtension.apply(this, arguments); };
      }
      if (window.WebGLRenderingContext){ wrapGetParameter(WebGLRenderingContext.prototype, ORIG.webgl.webgl1); wrapGetExtension(WebGLRenderingContext.prototype, ORIG.webgl.webgl1); }
      if (window.WebGL2RenderingContext){ wrapGetParameter(WebGL2RenderingContext.prototype, ORIG.webgl.webgl2); wrapGetExtension(WebGL2RenderingContext.prototype, ORIG.webgl.webgl2); }
      CURRENT_FLAGS.webgl = true;
      console.info('[Injection] WebGL/WebGL2 overrides installed');
    }catch(e){}
  }

  function disableWebGL(){
    try{
      if (ORIG.webgl.webgl1.origGetParameter && window.WebGLRenderingContext){ WebGLRenderingContext.prototype.getParameter = ORIG.webgl.webgl1.origGetParameter; }
      if (ORIG.webgl.webgl1.origGetExtension && window.WebGLRenderingContext){ WebGLRenderingContext.prototype.getExtension = ORIG.webgl.webgl1.origGetExtension; }
      if (ORIG.webgl.webgl2.origGetParameter && window.WebGL2RenderingContext){ WebGL2RenderingContext.prototype.getParameter = ORIG.webgl.webgl2.origGetParameter; }
      if (ORIG.webgl.webgl2.origGetExtension && window.WebGL2RenderingContext){ WebGL2RenderingContext.prototype.getExtension = ORIG.webgl.webgl2.origGetExtension; }
      CURRENT_FLAGS.webgl = false;
      console.info('[Injection] WebGL/WebGL2 overrides removed');
    }catch(e){}
  }

  function enableAudio(){
    try{
      if (window.AudioBuffer && AudioBuffer.prototype && AudioBuffer.prototype.getChannelData){
        if (!ORIG.audio.getChannelData) ORIG.audio.getChannelData = AudioBuffer.prototype.getChannelData;
        AudioBuffer.prototype.getChannelData = function(){
          var data = ORIG.audio.getChannelData.apply(this, arguments);
          try{ for(var i=0;i<Math.min(4, data.length); i++){ data[i] = data[i] + (Math.random() - 0.5) * AUDIO_NOISE_AMPLITUDE; } }catch(e){}
          return data;
        };
      }
      CURRENT_FLAGS.audio = true;
      console.info('[Injection] WebAudio overrides installed');
    }catch(e){}
  }

  function disableAudio(){
    try{ if (ORIG.audio.getChannelData) AudioBuffer.prototype.getChannelData = ORIG.audio.getChannelData; CURRENT_FLAGS.audio = false; console.info('[Injection] WebAudio overrides removed'); }catch(e){}
  }

  function enableLocalStorage(){
    try{
      if (!ORIG.storage.getItem) ORIG.storage.getItem = Storage.prototype.getItem;
      Storage.prototype.getItem = function(key){
        try{ var k = String(key || ''); if(/user|id|client|uuid|visitor|ga|analytics/i.test(k)){ var rnd = Math.random().toString(36).slice(2, 2 + LOCALSTORAGE_FAKE_LENGTH); return LOCALSTORAGE_FAKE_PREFIX + rnd; } }catch(e){}
        return ORIG.storage.getItem.apply(this, arguments);
      };
      CURRENT_FLAGS.localStorage = true;
      console.info('[Injection] localStorage overrides installed');
    }catch(e){}
  }

  function disableLocalStorage(){
    try{ if (ORIG.storage.getItem) Storage.prototype.getItem = ORIG.storage.getItem; CURRENT_FLAGS.localStorage = false; console.info('[Injection] localStorage overrides removed'); }catch(e){}
  }

  function enableFetch(){
    try{
      if (!ORIG.fetch.fetch) ORIG.fetch.fetch = window.fetch;
      if (!ORIG.fetch.open) ORIG.fetch.open = XMLHttpRequest.prototype.open;
      if (!ORIG.fetch.send) ORIG.fetch.send = XMLHttpRequest.prototype.send;
      if (window.fetch){ window.fetch = function(input, init){ try{ var url = (typeof input==='string')?input:(input&&input.url)||''; if(/analytics|google-analytics|collect|pixel|tracking/i.test(String(url))){ try{ if(init && init.method && init.method.toUpperCase()==='POST' && init.body){ var body=init.body; try{ body=JSON.parse(body); body._deception=true; init.body=JSON.stringify(body);}catch(e){} } }catch(e){} } }catch(e){} return ORIG.fetch.fetch.apply(this, arguments); }; }
      XMLHttpRequest.prototype.open = function(method, url){ this.__deception_url = url; return ORIG.fetch.open.apply(this, arguments); };
      XMLHttpRequest.prototype.send = function(body){ try{ if(this.__deception_url && /analytics|collect|pixel|tracking/i.test(this.__deception_url)){ try{ this.setRequestHeader && this.setRequestHeader('X-Deception','1'); }catch(e){} } }catch(e){} return ORIG.fetch.send.apply(this, arguments); };
      CURRENT_FLAGS.fetch = true;
      console.info('[Injection] fetch/XHR overrides installed');
    }catch(e){}
  }

  function disableFetch(){
    try{ if (ORIG.fetch.fetch) window.fetch = ORIG.fetch.fetch; if (ORIG.fetch.open) XMLHttpRequest.prototype.open = ORIG.fetch.open; if (ORIG.fetch.send) XMLHttpRequest.prototype.send = ORIG.fetch.send; CURRENT_FLAGS.fetch = false; console.info('[Injection] fetch/XHR overrides removed'); }catch(e){}
  }

  function enablePopupAndCloak(){
    try{
      if (!ORIG.popup.open) ORIG.popup.open = window.open;
      window.open = function(){ return null; };
      if (!ORIG.popup.Date) ORIG.popup.Date = Date;
      var offset = (Math.floor(Math.random()*5)+1) * 60 * 1000;
      function FakeDate(){ if (arguments.length === 0) return new ORIG.popup.Date(ORIG.popup.Date.now() + offset); var args = Array.prototype.slice.call(arguments); var bound = Function.prototype.bind.apply(ORIG.popup.Date, [null].concat(args)); return new bound(); }
      FakeDate.now = function(){ return ORIG.popup.Date.now() + offset; };
      FakeDate.prototype = ORIG.popup.Date.prototype;
      window.Date = FakeDate;
      try{ ORIG.popup.referrer = Object.getOwnPropertyDescriptor(document, 'referrer') || null; }catch(e){}
      try{ Object.defineProperty(document, 'referrer', { get: function(){ return 'https://www.google.com/'; } }); }catch(e){}
      CURRENT_FLAGS.popup = true;
      console.info('[Injection] window.open overridden (popups blocked) and cloaking applied');
    }catch(e){}
  }

  function disablePopupAndCloak(){
    try{ if (ORIG.popup.open) window.open = ORIG.popup.open; if (ORIG.popup.Date) window.Date = ORIG.popup.Date; if (ORIG.popup.referrer) Object.defineProperty(document, 'referrer', ORIG.popup.referrer); CURRENT_FLAGS.popup = false; console.info('[Injection] popup/cloaking removed'); }catch(e){}
  }

  // install or remove overrides according to provided flags (partial dynamic update)
  function installOverrides(flags){
    flags = Object.assign({}, DEFAULT_FLAGS, flags || {});
    // canvas
    if (flags.canvas && !CURRENT_FLAGS.canvas) enableCanvas();
    if (!flags.canvas && CURRENT_FLAGS.canvas) disableCanvas();
    // webgl
    if (flags.webgl && !CURRENT_FLAGS.webgl) enableWebGL();
    if (!flags.webgl && CURRENT_FLAGS.webgl) disableWebGL();
    // audio
    if (flags.audio && !CURRENT_FLAGS.audio) enableAudio();
    if (!flags.audio && CURRENT_FLAGS.audio) disableAudio();
    // localStorage
    if (flags.localStorage && !CURRENT_FLAGS.localStorage) enableLocalStorage();
    if (!flags.localStorage && CURRENT_FLAGS.localStorage) disableLocalStorage();
    // fetch
    if (flags.fetch && !CURRENT_FLAGS.fetch) enableFetch();
    if (!flags.fetch && CURRENT_FLAGS.fetch) disableFetch();
    // popup/cloak
    if (flags.popup && !CURRENT_FLAGS.popup) enablePopupAndCloak();
    if (!flags.popup && CURRENT_FLAGS.popup) disablePopupAndCloak();
  }

  // Main: request flags then install overrides
  // expose helper so developer can toggle overrides manually in console:
  // window.__deception_installOverrides({ canvas:false, audio:false })
  // This calls installOverrides with the provided flags.
  function exposeHelpers(){
    try{ window.__deception_installOverrides = function(flags){ try{ installOverrides(flags); return true; }catch(e){ return false; } }; }catch(e){}
    // also listen for incoming DECEPTION_FLAGS messages (from injector) to update in runtime
    try{
      window.addEventListener('message', function onFlags(e){
        try{
          if (!e || !e.data) return;
          if (e.data.type === 'DECEPTION_FLAGS' && e.data.flags){
            installOverrides(e.data.flags);
          }
        }catch(err){}
      });
    }catch(e){}
  }

  (async function main(){
    try{
      const flags = await requestFlags();
      installOverrides(flags);
      exposeHelpers();
    }catch(e){ console.error('[Injection] error during install', e); installOverrides(null); }
  })();

})();
