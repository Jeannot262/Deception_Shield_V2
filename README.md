# Deception Shield V2

Petit projet d'extension (Content Scripts) visant à rendre le fingerprinting et le tracking moins fiables en polluant ou en masquant certaines API (Canvas, WebGL, WebAudio, localStorage, fetch, etc.).

## Fichiers clés

- `manifest.json` - Manifeste de l'extension (MV3).
- `canvas_masking.js` - Interception de `canvas.toDataURL()` et `toBlob()` (gating via `canvasMaskingEnabled`).
- `advanced_fingerprinting_masking.js` - Masquage WebGL / WebGL2 / WebAudio (gating via `webglMaskingEnabled`, `audioMaskingEnabled`).
- `deception_script.js` - Interception `localStorage`, `fetch` (gating via `localStorageMaskingEnabled`, `fetchMaskingEnabled`).
- `cloaking_script.js` - Décalage du temps, faux `document.referrer`, blocage conditionnel des popups (gating via `popupBlockingEnabled`).
- `popup.html`, `popup.js` - Interface avec toggles pour activer/désactiver chaque module individuellement.
- `test_page.html` - Page de test interactive pour valider les comportements (canvas, webgl, audio, localStorage).
- `test_runner.html` - Auto-test automatisé qui exécute les vérifications et affiche un rapport PASS/FAIL.
- `package.json` - Scripts NPM (inclut `npm run serve` pour servir les pages de test).

## Configuration — Toggles par module

Depuis le **popup** de l'extension, vous pouvez activer ou désactiver chaque module indépendamment :

- **Bloqueur de Pop-up** : Blocage conditionnel de `window.open()` (défaut : activé).
- **Masquage Canvas** : Altère les empreintes Canvas via `toDataURL()` et `toBlob()` (défaut : activé).
- **Masquage WebGL / WebGL2** : Masque VENDOR/RENDERER et bloque l'extension `WEBGL_debug_renderer_info` (défaut : activé).
- **Masquage WebAudio** : Ajoute du bruit aux buffers audio `getChannelData()` (défaut : activé).
- **Masquage localStorage** : Retourne des IDs volatiles pour les clés de tracking (défaut : activé).
- **Pollution Fetch/XHR** : Pollue les requêtes de suivi avec des métriques fakées (défaut : activé).

Les préférences sont sauvegardées dans `chrome.storage.local` et persistées. **Rechargez la page** après un changement pour appliquer.

## Tests — Deux pages disponibles

### 1. `test_page.html` — Tests interactifs

- Cliquez sur les boutons pour tester chaque fonctionnalité
- Ouvrez DevTools (Console) pour voir les logs détaillés
- Tests manuels avec contrôle complet

### 2. `test_runner.html` — Auto-test automatisé

- S'exécute automatiquement au chargement
- Affiche un rapport PASS/FAIL pour chaque module
- Plus rapide pour validation rapide

## Instructions rapides — Mise en place

### 1. Charger l'extension dans Chrome/Edge (mode développeur)

- Ouvrir `chrome://extensions/` (ou `edge://extensions/`), activer le `Developer mode`.
- Cliquer sur `Load unpacked` / `Charger l'extension non empaquetée` et sélectionner le dossier `Deception_Shield_V2`.

### 2. Servir les pages de test depuis un serveur local

```bash
# Avec npm (rapide, recommandé)
npm run serve

# Avec Python 3
python -m http.server 8000
```

Puis ouvrir :

- http://localhost:8000/test_page.html (tests interactifs)
- http://localhost:8000/test_runner.html (auto-test automatisé)

### 3. Tester les modules

**Depuis `test_page.html` (interactif)** :

- **LocalStorage** : Bouton "Set localStorage user_id" / "Get localStorage user_id" — attendez un `fake-tracking-id-...`
- **Canvas** : Boutons "toDataURL()" et "toBlob()" — vérifiez les logs `[DECEPTION ACTIF]`
- **WebGL / WebGL2** : Boutons "Test WebGL" / "Test WebGL2" — vérifiez que l'extension debug info est `null`
- **Web Audio** : Bouton "Test AudioBuffer.getChannelData()" — vérifiez que le premier sample est altéré

**Depuis `test_runner.html` (auto)** :

- Rapport automatique au chargement avec PASS/FAIL pour chaque test

**Depuis le popup** :

- Togglisez chaque module et rechargez la page
- Ouvrez `test_page.html` ou `test_runner.html` pour vérifier que seuls les modules activés fonctionnent

## Notes importantes

- Ces scripts modifient des APIs natives du navigateur ; certains sites peuvent détecter ou être affectés.
- Les canvas « tainted » (cross-origin) empêcheront `getImageData()` — le code ignore silencieusement ces cas.
- Si vous observez des problèmes, désactivez l'extension et rechargez la page.
- Les toggles du popup nécessitent un rechargement de la page pour prendre effet.

## Branches Git

- `main` - Version courante **avec toggles** (modules gérés individuellement)
- `backup-state-before-toggles` - État du projet **avant l'ajout des toggles** (tous les modules toujours actifs)

Pour revenir à l'état sans toggles :

```bash
git reset --hard origin/backup-state-before-toggles
git push --force origin main  # ⚠️ Attention : écrase main
```

## Repository GitHub

Le dépôt complet : `https://github.com/Jeannot262/Deception_Shield_V2`

## Prochaines améliorations possibles

- Protection supplémentaire pour les énumérations de polices (fonts enumeration plus robuste).
- UI améliorée du popup (affichage du statut par module, icônes).
- Page interne de diagnostic (afficher quels modules sont actifs et logs en temps réel).
- Support pour WebWorkers et Service Workers.
- Tests automatisés plus complets (Jest / Mocha).

---

**Auteur** : Jeannot262  
**Date** : Novembre 2025  
**Licence** : À définir
