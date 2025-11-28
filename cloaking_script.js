/**
 * Fichier de Cloaking Temporel et de Référence (Content Script)
 *
 * Ce script est mis à jour pour lire la préférence utilisateur et
 * appliquer le blocage des pop-up de manière conditionnelle.
 */

console.log("Anti-Tracking: Démarrage du Cloaking Temporel et de Référence...");

// --- Fonction Principale Asynchrone pour la Déception ---
async function applyDeception() {
    
    // --- 0. Récupération de l'état du Blocage Pop-up ---
    const STORAGE_KEY = 'popupBlockingEnabled';
    let POPUP_BLOCKING_ENABLED = true; // Valeur par défaut : Activé

    try {
        // L'API chrome.storage.local.get est asynchrone
        const result = await new Promise(resolve => {
            // L'API chrome n'est disponible qu'à l'intérieur d'une extension
            // On vérifie que 'chrome' existe avant d'appeler l'API
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get([STORAGE_KEY], resolve);
            } else {
                // Si l'environnement n'est pas une extension (par exemple, lors d'un test), on utilise la valeur par défaut
                resolve({});
            }
        });

        // La pop-up est désactivée si la valeur est explicitement 'false'
        if (result[STORAGE_KEY] === false) {
            POPUP_BLOCKING_ENABLED = false;
        }

    } catch (e) {
        console.error("Impossible de lire les préférences de l'extension. Utilisation du blocage par défaut.", e);
        // Conserve POPUP_BLOCKING_ENABLED = true par défaut en cas d'erreur
    }

    // --- 1. Déception de l'Heure (similaire au code précédent) ---
    const RealDate = window.Date;
    const fakeStartTime = Date.now() - (Math.random() * 9 * 60 * 1000 + 60 * 1000); 

    class FakedDate extends RealDate {
        constructor(...args) {
            if (args.length === 0) {
                return new RealDate(fakeStartTime + (Date.now() - performance.timeOrigin));
            }
            return super(...args);
        }
        static now() {
            return fakeStartTime + (Date.now() - performance.timeOrigin);
        }
    }
    window.Date = FakedDate;
    console.log(`[CLOAKING] Le temps de session est décalé pour simuler une durée de session.`);


    // --- 2. Déception du Referrer (similaire au code précédent) ---
    try {
        Object.defineProperty(document, 'referrer', {
            get: () => {
                const fakeReferrers = ['', 'https://www.google.com/', 'https://duckduckgo.com/'];
                const fakeReferrer = fakeReferrers[Math.floor(Math.random() * fakeReferrers.length)];
                console.warn(`[CLOAKING] document.referrer intercepté. Retourne la fausse référence : ${fakeReferrer}`);
                return fakeReferrer;
            },
            configurable: false,
        });
    } catch (e) {
        // Ignore l'erreur
    }


    // --- 3. Blocage des Pop-up (window.open) CONDITIONNEL ---
    if (POPUP_BLOCKING_ENABLED) {
        console.log("Anti-Tracking: Interception de window.open (blocage des pop-up) activé.");
        const originalWindowOpen = window.open;

        window.open = function(url, windowName, features) {
            console.warn(`[BLOCAGE POP-UP ACTIF] Tentative d'ouverture de pop-up vers : ${url}. Action bloquée.`);
            return null;
        };
    } else {
        console.log("Anti-Tracking: Blocage des pop-up désactivé par l'utilisateur (autorisé).");
    }

    // --- 4. Blocage des Modals Intrusifs (Conceptualisation CSS) ---
    // (Cette partie est rapide et s'exécute toujours pour le confort de navigation)
    const intrusiveModalHidingCSS = `
        .modal-backdrop, .popup-overlay, .cookie-notice-overlay { display: none !important; }
        body.no-scroll { overflow: auto !important; }
    `;
    const styleElement = document.createElement('style');
    styleElement.textContent = intrusiveModalHidingCSS;
    document.head.appendChild(styleElement);
}

// Lancer la fonction principale. C'est le point de départ du Content Script.
applyDeception();


