/**
 * Fichier de Déception JavaScript (Simule un Content Script d'Extension)
 *
 * Ce script est conçu pour être injecté dans la page web. Il remplace (override)
 * les fonctions natives du navigateur pour intercepter les tentatives de stockage
 * de données et les remplacer par des valeurs aléatoires ou incohérentes.
 */

// --- Fonction Utilitaire pour la Génération de Données ---

/**
 * Génère une chaîne d'identifiant aléatoire et non traçable.
 * @returns {string} Un identifiant unique aléatoire.
 */
function generateFakeId() {
    // Utilise crypto.randomUUID pour une chaîne UUID unique, parfaite pour le masquage.
    return 'fake-tracking-id-' + crypto.randomUUID();
}

/**
 * Génère un événement ou une valeur aléatoire pour empoisonner les statistiques.
 * @returns {number} Un nombre aléatoire entre 1 et 1000.
 */
function generateRandomMetric() {
    return Math.floor(Math.random() * 1000) + 1;
}

// --- 1. Déception du Local Storage ---
// (Cible les stockages de session et les préférences utilisateur)

console.log("Anti-Tracking: Interception de l'API LocalStorage...");

// Sauvegarder des références aux fonctions originales (liaison au bon this)
const originalLocalStorageSetItem = window.localStorage && window.localStorage.setItem ? window.localStorage.setItem.bind(window.localStorage) : null;
const originalLocalStorageGetItem = window.localStorage && window.localStorage.getItem ? window.localStorage.getItem.bind(window.localStorage) : null;

// Remplacer setItem/getItem de façon sûre en évitant la récursion
if (originalLocalStorageSetItem && originalLocalStorageGetItem) {
    window.localStorage.setItem = function(key, value) {
        const trackingKeys = ['user_id', 'client_id', 'tracker_session', 'cart_id'];

        if (trackingKeys.includes(key) || (typeof key === 'string' && (key.includes('google') || key.includes('fb_')))) {
            const fakeValue = generateFakeId();
            console.warn(`[DECEPTION ACTIF] localStorage.setItem intercepté pour la clé: ${key}. Stockage de la valeur fausse: ${fakeValue}`);
            return originalLocalStorageSetItem(key, fakeValue);
        }

        return originalLocalStorageSetItem(key, value);
    };

    window.localStorage.getItem = function(key) {
        if (key === 'user_id' || key === 'client_id') {
            const fakeId = generateFakeId();
            console.log(`[DECEPTION ACTIF] localStorage.getItem intercepté pour la clé: ${key}. Retourne un ID volatil: ${fakeId}`);
            return fakeId; // Retourne un ID volatile non persistant
        }
        return originalLocalStorageGetItem(key);
    };
} else {
    console.warn('[DECEPTION] API localStorage non disponible ou restreinte dans ce contexte.');
}


// --- 2. Déception des Appels de Pixel de Suivi (Fetch/XHR) ---
// (Cible l'envoi de données d'activité au serveur)

console.log("Anti-Tracking: Interception des requêtes Fetch...");

const originalFetch = window.fetch;

window.fetch = async (resource, options) => {
    // Vérifie si l'URL est un endpoint de tracking connu (ex: Google Analytics, Matomo, etc.)
    const isTrackingRequest = (typeof resource === 'string' && (resource.includes('google-analytics') || resource.includes('pixel') || resource.includes('tracking')));

    if (isTrackingRequest) {
        let modifiedOptions = { ...options };

        if (modifiedOptions.body) {
            // Tentative de modifier le corps de la requête (utile pour les requêtes POST)
            try {
                // Si c'est du JSON, injecter de fausses métriques
                const body = JSON.parse(modifiedOptions.body);
                body.timeSpent = generateRandomMetric();
                body.events = body.events ? [...body.events, 'fake_interaction_polluted'] : ['fake_interaction_polluted'];
                modifiedOptions.body = JSON.stringify(body);
            } catch (e) {
                // Si c'est un autre format (ex: form data), on peut simplement ajouter un paramètre pollueur
                modifiedOptions.body += `&fake_metric=${generateRandomMetric()}`;
            }
        }
        console.warn(`[DECEPTION ACTIF] Requête de suivi interceptée et polluée: ${resource}.`);
        return originalFetch(resource, modifiedOptions);

    } else {
        // Laisse passer toutes les requêtes non-tracking normales
        return originalFetch(resource, options);
    }
};

console.log("Anti-Tracking Démarré. Les scripts de suivi recevront des données incohérentes.");

/**
 * NOTE SUR LES COOKIES :
 * Pour les cookies HTTP, le navigateur lui-même les gère. Une extension
 * pourrait utiliser l'API 'chrome.cookies' (non disponible dans un Content Script)
 * pour définir des cookies expirant immédiatement ou avec des valeurs aléatoires
 * après que le bandeau de consentement ait simulé l'acceptation.
 */


