/**
 * Test Runner - Auto tests for Deception Shield
 */

const resultsEl = document.getElementById('results');
const consoleEl = document.getElementById('console');
const logs = [];

function log(...args) {
  logs.push(args.join(' '));
  console.log(...args);
  if (consoleEl) consoleEl.textContent = logs.join('\n');
}

function mark(name, status, detail) {
  const el = document.createElement('div');
  el.innerHTML = `<strong>${name}:</strong> ${status} ${detail ? ('- ' + detail) : ''}`;
  if (resultsEl) resultsEl.appendChild(el);
}

async function runTests() {
  // 1) LocalStorage
  try {
    localStorage.setItem('user_id', 'original-12345');
    const val = localStorage.getItem('user_id');
    if (typeof val === 'string' && val.startsWith('fake-tracking-id-')) {
      mark('LocalStorage', 'PASS', val);
      log('[TEST] LocalStorage returned fake id:', val);
    } else {
      mark('LocalStorage', 'FAIL', val);
      log('[TEST] LocalStorage returned:', val);
    }
  } catch (e) {
    mark('LocalStorage', 'ERROR', e.message);
    log('[TEST] LocalStorage error', e);
  }

  // 2) Canvas toDataURL (compare two consecutive reads)
  try {
    const c = document.createElement('canvas');
    c.width = 200;
    c.height = 80;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(0, 0, 200, 80);
    const a = c.toDataURL();
    // small delay then read again (some scripts mutate on read)
    await new Promise((r) => setTimeout(r, 50));
    const b = c.toDataURL();
    if (a !== b) {
      mark('Canvas toDataURL (volatile)', 'PASS');
      log('[TEST] Canvas dataURL changed between reads');
    } else {
      mark('Canvas toDataURL (volatile)', 'WARN', 'no change detected');
      log('[TEST] Canvas dataURL unchanged');
    }
  } catch (e) {
    mark('Canvas toDataURL', 'ERROR', e.message);
    log('[TEST] Canvas toDataURL error', e);
  }

  // 3) Canvas toBlob
  try {
    const c2 = document.createElement('canvas');
    c2.width = 64;
    c2.height = 32;
    const ctx2 = c2.getContext('2d');
    ctx2.fillStyle = '#123456';
    ctx2.fillRect(0, 0, 64, 32);
    await new Promise((res) => {
      c2.toBlob((blob) => {
        if (blob && blob.size > 0) {
          mark('Canvas toBlob', 'PASS', 'size:' + blob.size);
          log('[TEST] toBlob size', blob.size);
        } else {
          mark('Canvas toBlob', 'FAIL');
          log('[TEST] toBlob returned null/empty');
        }
        res();
      });
    });
  } catch (e) {
    mark('Canvas toBlob', 'ERROR', e.message);
    log('[TEST] Canvas toBlob error', e);
  }

  // 4) WebGL debug info
  try {
    const gl =
      document.createElement('canvas').getContext('webgl') ||
      document.createElement('canvas').getContext('experimental-webgl');
    if (!gl) {
      mark('WebGL', 'SKIP', 'not available');
      log('[TEST] WebGL not available');
    } else {
      try {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        if (ext === null) {
          mark('WebGL debug info', 'PASS', 'extension blocked (null)');
          log('[TEST] WEBGL_debug_renderer_info is null');
        } else {
          mark('WebGL debug info', 'WARN', 'extension present');
          log('[TEST] WEBGL_debug_renderer_info present', ext);
        }
      } catch (e) {
        mark('WebGL debug info', 'ERROR', e.message);
        log('[TEST] WebGL getExtension error', e);
      }
    }
  } catch (e) {
    mark('WebGL', 'ERROR', e.message);
    log('[TEST] WebGL error', e);
  }

  // 5) WebGL2 debug info
  try {
    const gl2 = document.createElement('canvas').getContext('webgl2');
    if (!gl2) {
      mark('WebGL2', 'SKIP', 'not available');
      log('[TEST] WebGL2 not available');
    } else {
      try {
        const ext2 = gl2.getExtension('WEBGL_debug_renderer_info');
        if (ext2 === null) {
          mark('WebGL2 debug info', 'PASS', 'extension blocked (null)');
          log('[TEST] WEBGL2 debug extension null');
        } else {
          mark('WebGL2 debug info', 'WARN', 'extension present');
          log('[TEST] WEBGL2 debug extension present', ext2);
        }
      } catch (e) {
        mark('WebGL2 debug info', 'ERROR', e.message);
        log('[TEST] WebGL2 getExtension error', e);
      }
    }
  } catch (e) {
    mark('WebGL2', 'ERROR', e.message);
    log('[TEST] WebGL2 error', e);
  }

  // 6) WebAudio buffer first sample
  try {
    const AudioCtxCtor =
      window.OfflineAudioContext || window.AudioContext || window.webkitAudioContext;
    if (!AudioCtxCtor) {
      mark('WebAudio', 'SKIP', 'not available');
      log('[TEST] WebAudio not available');
    } else {
      const ctx = new AudioCtxCtor(1, 44100, 44100);
      const buffer = ctx.createBuffer(1, 44100, 44100);
      const data = buffer.getChannelData(0);
      if (data && Math.abs(data[0]) > 0) {
        mark('WebAudio getChannelData', 'PASS', 'first sample non-zero');
        log('[TEST] audio sample', data[0]);
      } else {
        mark('WebAudio getChannelData', 'FAIL', 'first sample zero');
        log('[TEST] audio sample is zero', data && data[0]);
      }
    }
  } catch (e) {
    mark('WebAudio', 'ERROR', e.message);
    log('[TEST] WebAudio error', e);
  }

  // 7) Dynamic toggles (using the exposed helper) - optional: only if helper exists
  try {
    if (typeof window.__deception_installOverrides === 'function') {
      log('[TEST] dynamic toggle: disabling canvas via helper');
      window.__deception_installOverrides({ canvas: false });
      // small delay then re-check canvas volatility
      await new Promise((r) => setTimeout(r, 50));
      const c3 = document.createElement('canvas');
      c3.width = 120; c3.height = 40; const ctx3 = c3.getContext('2d'); ctx3.fillStyle = '#FF0000'; ctx3.fillRect(0,0,120,40);
      const x = c3.toDataURL();
      await new Promise((r) => setTimeout(r, 50));
      const y = c3.toDataURL();
      if (x === y) {
        mark('Dynamic Toggle Canvas', 'PASS', 'canvas stable when disabled');
        log('[TEST] dynamic toggle canvas - stable (disabled)');
      } else {
        mark('Dynamic Toggle Canvas', 'FAIL', 'canvas still volatile');
        log('[TEST] dynamic toggle canvas - still volatile');
      }

      log('[TEST] dynamic toggle: enabling canvas via helper');
      window.__deception_installOverrides({ canvas: true });
      await new Promise((r) => setTimeout(r, 50));
      const c4 = document.createElement('canvas'); c4.width = 120; c4.height = 40; const ctx4 = c4.getContext('2d'); ctx4.fillStyle = '#00FF00'; ctx4.fillRect(0,0,120,40);
      const a2 = c4.toDataURL(); await new Promise((r) => setTimeout(r, 50)); const b2 = c4.toDataURL();
      if (a2 !== b2) {
        mark('Dynamic Toggle Canvas', 'PASS', 'canvas volatile when enabled');
        log('[TEST] dynamic toggle canvas - volatile (enabled)');
      } else {
        mark('Dynamic Toggle Canvas', 'WARN', 'no volatility detected after enabling');
        log('[TEST] dynamic toggle canvas - no volatility after enabling');
      }
    } else {
      mark('Dynamic Toggle', 'SKIP', 'helper not present');
      log('[TEST] dynamic toggle helper not available');
    }
  } catch (e) {
    mark('Dynamic Toggle', 'ERROR', e.message);
    log('[TEST] Dynamic Toggle error', e);
  }

  mark('Auto Test', 'COMPLETE');
}

window.addEventListener('load', () => {
  runTests();
});
