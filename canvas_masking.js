/**
 * Fichier de Masquage d'Empreinte Canvas (Content Script)
 *
 * Ce script remplace la méthode cruciale 'toDataURL' de l'API Canvas
 * en y ajoutant un bruit aléatoire pour garantir que l'empreinte change
 * à chaque tentative de lecture.
 */

// Vérifier l'option `canvasMaskingEnabled` dans le storage de l'extension
function initCanvasMasking(enabled) {
  if (!enabled) {
    console.log('Canvas masking disabled by user preference.');
    return;
  }

  console.log("Anti-Tracking: Interception de l'API Canvas pour le masquage des empreintes...");

  // Sauvegarder les références originales
  const originalCanvasToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const originalCanvasToBlob = HTMLCanvasElement.prototype.toBlob;

  /**
   * Applique un "bruit" subtil au canvas (travaille sur le contexte 2D).
   * @param {HTMLCanvasElement} canvas - L'élément canvas.
   */
  function applyNoiseToCanvas(canvas) {
    if (!canvas || !canvas.getContext) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const width = canvas.width;
    const height = canvas.height;
    if (width === 0 || height === 0) return;

    try {
      const imageData = context.getImageData(0, 0, width, height);
      const data = imageData.data;
      const x = Math.floor(Math.random() * width);
      const y = Math.floor(Math.random() * height);
      const index = (y * width + x) * 4;
      const delta = Math.floor(Math.random() * 2) + 1; // +1 ou +2

      data[index] = (data[index] + delta) % 256;

      context.putImageData(imageData, 0, 0);

      console.warn(`[DECEPTION ACTIF] Bruit de ${delta} appliqué au pixel (${x}, ${y}) du canvas.`);
    } catch (e) {
      // getImageData peut échouer pour des canvas 'tainted' (CORS). On ignore alors.
    }
  }

  // Intercepter toDataURL sur l'élément canvas (utilisé par la plupart des scripts d'empreinte)
  HTMLCanvasElement.prototype.toDataURL = function (...args) {
    try { applyNoiseToCanvas(this); } catch (e) {}
    return originalCanvasToDataURL.apply(this, args);
  };

  // Intercepter toBlob également (API moderne)
  if (originalCanvasToBlob) {
    HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
      try { applyNoiseToCanvas(this); } catch (e) {}
      return originalCanvasToBlob.apply(this, arguments);
    };
  }

  console.log("Anti-Tracking: L'empreinte Canvas est maintenant volatile.");
}

// Si l'API chrome.storage est disponible, lire la préférence, sinon activer par défaut
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
  chrome.storage.local.get(['canvasMaskingEnabled'], (res) => {
    const enabled = res.canvasMaskingEnabled === undefined ? true : !!res.canvasMaskingEnabled;
    initCanvasMasking(enabled);
  });
} else {
  // En dehors d'une extension (tests), activer le masquage
  initCanvasMasking(true);
}
