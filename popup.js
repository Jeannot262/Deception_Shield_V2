/**
 * Logique pour la Pop-up de l'Extension (popup.js)
 * Gère l'état du bloqueur de pop-up via chrome.storage.local.
 */

const popupToggle = document.getElementById('popupToggle');
const STORAGE_KEY = 'popupBlockingEnabled';

if (!popupToggle) {
    console.warn('[Popup] Élément #popupToggle introuvable dans popup.html — aucun état géré.');
} else {
    /**
     * 1. Chargement de l'état enregistré au démarrage de la pop-up.
     */
    chrome.storage.local.get([STORAGE_KEY], (result) => {
        // Si la clé existe, utiliser sa valeur, sinon le bloquer par défaut (true)
        const isEnabled = result[STORAGE_KEY] !== false; 
        
        popupToggle.checked = isEnabled;
        
        // Déclencher le changement visuel initial
        popupToggle.dispatchEvent(new Event('change'));
        
        console.log(`[Popup] Statut initial du bloqueur : ${isEnabled ? 'Activé' : 'Désactivé'}`);
    });

    /**
     * 2. Écoute les changements et enregistre l'état dans le stockage.
     */
    popupToggle.addEventListener('change', (event) => {
        const isChecked = event.target.checked;
        
        chrome.storage.local.set({ [STORAGE_KEY]: isChecked }, () => {
            console.log(`[Popup] Nouveau statut du bloqueur enregistré : ${isChecked ? 'Activé' : 'Désactivé'}`);
            console.info("Veuillez recharger la page pour appliquer ce changement.");
        });
    });
}