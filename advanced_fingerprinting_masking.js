/**
 * Fichier de Masquage Avancé d'Empreinte (Content Script)
 *
 * Ce script cible les API utilisées pour le Fingerprinting avancé :
 * 1. Web Audio API : Génère un hachage unique du traitement audio.
 * 2. WebGL API : Utilise le rendu 3D du GPU pour une empreinte graphique unique.
 */

console.log("Anti-Tracking: Démarrage de l'interception des API Web Audio et WebGL...");

// --- Fonction Utilitaire ---
/**
 * Génère un bruit aléatoire minuscule pour modifier le hachage.
 * @returns {number} Un petit décalage aléatoire.
 */
function getNoise() {
  return (Math.random() - 0.5) * 0.00000001;
}

function applyAudioMasking() {
  // ========================================================================
  // 1. Masquage Web Audio API (Audio Fingerprinting)
  // ========================================================================
  if (
    typeof window.AudioBuffer !== 'undefined' &&
    window.AudioBuffer.prototype &&
    typeof window.AudioBuffer.prototype.getChannelData === 'function'
  ) {
    const originalGetChannelData = window.AudioBuffer.prototype.getChannelData;

    window.AudioBuffer.prototype.getChannelData = function (...args) {
      try {
        console.warn('[DECEPTION ACTIF] Web Audio API intercepté. Injection de bruit.');
        const data = originalGetChannelData.apply(this, args);
        if (data && data.length > 0) {
          data[0] = data[0] + getNoise();
        }
        return data;
      } catch (e) {
        return originalGetChannelData.apply(this, args);
      }
    };
  } else {
    console.log('Web Audio API (AudioBuffer) non disponible, skipping audio masking.');
  }
}

// ========================================================================
// 2. Masquage WebGL API (GPU Fingerprinting)
// ========================================================================

// Les traqueurs lisent les propriétés uniques du GPU/driver.
// Nous allons renvoyer des valeurs génériques ou aléatoires pour masquer le vrai matériel.

function applyWebGLMasking() {
  // ========================================================================
  // 2. Masquage WebGL API (GPU Fingerprinting)
  // ========================================================================
  if (typeof WebGLRenderingContext !== 'undefined' && WebGLRenderingContext.prototype) {
    const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
    const originalGetExtension = WebGLRenderingContext.prototype.getExtension;

    WebGLRenderingContext.prototype.getParameter = function (...args) {
      try {
        const parameter = args[0];
        const GL = WebGLRenderingContext;

        if (parameter === GL.VENDOR || parameter === GL.RENDERER) {
          console.warn(`[DECEPTION ACTIF] WebGL getParameter intercepté pour ${parameter}. Retourne une valeur masquée.`);
          const fakeRendererId = Math.floor(Math.random() * 99999);

          if (parameter === GL.VENDOR) {
            return 'Google Inc. (Masque)';
          }
          if (parameter === GL.RENDERER) {
            return `ANGLE (${fakeRendererId} - Masque)`;
          }
        }
      } catch (e) {
        // En cas d'erreur, on laisse tomber dans le comportement par défaut
      }
      return originalGetParameter.apply(this, args);
    };

    // On s'assure que les extensions WebGL renvoient une empreinte bruitée
    WebGLRenderingContext.prototype.getExtension = function (...args) {
      try {
        if (args[0] === 'WEBGL_debug_renderer_info') {
          console.warn('[DECEPTION ACTIF] WebGL getExtension intercepté (Debug Info). Retourne null.');
          return null;
        }
      } catch (e) {}
      return originalGetExtension.apply(this, args);
    };
  } else {
    console.log('WebGL non disponible dans cet environnement, skipping WebGL masking.');
  }
}

// Protection pour WebGL2 (si disponible) — même logique que pour WebGL classique
function applyWebGL2Masking() {
  // Protection pour WebGL2 (si disponible) — même logique que pour WebGL classique
  if (typeof WebGL2RenderingContext !== 'undefined' && WebGL2RenderingContext.prototype) {
    const originalGetParameter2 = WebGL2RenderingContext.prototype.getParameter;
    const originalGetExtension2 = WebGL2RenderingContext.prototype.getExtension;

    WebGL2RenderingContext.prototype.getParameter = function (...args) {
      try {
        const parameter = args[0];
        const GL = WebGL2RenderingContext;

        if (parameter === GL.VENDOR || parameter === GL.RENDERER) {
          console.warn(`[DECEPTION ACTIF] WebGL2 getParameter intercepté pour ${parameter}. Retourne une valeur masquée.`);
          const fakeRendererId = Math.floor(Math.random() * 99999);

          if (parameter === GL.VENDOR) {
            return 'Google Inc. (Masque)';
          }
          if (parameter === GL.RENDERER) {
            return `ANGLE (${fakeRendererId} - Masque)`;
          }
        }
      } catch (e) {}
      return originalGetParameter2.apply(this, args);
    };

    WebGL2RenderingContext.prototype.getExtension = function (...args) {
      try {
        if (args[0] === 'WEBGL_debug_renderer_info') {
          console.warn('[DECEPTION ACTIF] WebGL2 getExtension intercepté (Debug Info). Retourne null.');
          return null;
        }
      } catch (e) {}
      return originalGetExtension2.apply(this, args);
    };
  } else {
    console.log('WebGL2 non disponible, skipping WebGL2 masking.');
  }
}

// ========================================================================
// 3. Masquage de l'Énumération des Polices (Conceptual)
// ========================================================================

// C'est plus complexe à override, mais on peut simuler un support de polices limité
// pour que la liste des polices installées ne soit pas unique.

if (document.fonts && document.fonts.check) {
  const originalCheck = document.fonts.check;

  document.fonts.check = function (font) {
    // On prétend ne connaître que les polices web standards pour masquer les polices locales
    if (font.includes("Custom")) {
      console.log("[DECEPTION ACTIF] Font Check intercepté. Fausse réponse.");
      return false;
    }
    // Sinon, on laisse le comportement normal pour ne pas casser la mise en page
    return originalCheck.apply(this, arguments);
  };
}

console.log("Anti-Tracking: Protection avancée Web Audio/WebGL active.");

// Lire les préférences et appliquer les masquages conditionnellement
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
  chrome.storage.local.get(['audioMaskingEnabled','webglMaskingEnabled','canvasMaskingEnabled'], (res) => {
    const audioEnabled = res.audioMaskingEnabled === undefined ? true : !!res.audioMaskingEnabled;
    const webglEnabled = res.webglMaskingEnabled === undefined ? true : !!res.webglMaskingEnabled;
    // canvasMasking est géré dans canvas_masking.js, mais on lit la clé pour cohérence
    const canvasEnabled = res.canvasMaskingEnabled === undefined ? true : !!res.canvasMaskingEnabled;

    if (audioEnabled) applyAudioMasking();
    if (webglEnabled) { applyWebGLMasking(); applyWebGL2Masking(); }
  });
} else {
  // En dehors d'une extension, activer par défaut
  applyAudioMasking();
  applyWebGLMasking();
  applyWebGL2Masking();
}
