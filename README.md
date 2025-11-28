# Deception Shield V2

Petit projet d'extension (Content Scripts) visant à rendre le fingerprinting et le tracking moins fiables en polluant ou en masquant certaines API (Canvas, WebGL, WebAudio, localStorage, fetch, etc.).

## Fichiers clés
- `manifest.json` - manifeste de l'extension (MV3).
- `canvas_masking.js` - interception de `canvas.toDataURL()` et `toBlob()`.
- `advanced_fingerprinting_masking.js` - masquage WebGL / WebGL2 / WebAudio.
- `deception_script.js` - interception `localStorage`, `fetch` (pollution) et autres.
- `cloaking_script.js` - décalage du temps, faux `document.referrer`, blocage conditionnel des popups.
- `popup.html`, `popup.js` - UI minimale pour activer/désactiver le blocage des pop-ups.
- `test_page.html` - page de test locale pour valider les comportements (canvas, webgl, audio, localStorage).

## Instructions rapides — Tester localement

1. Charger l'extension dans Chrome/Edge (mode développeur) :

   - Ouvrir `chrome://extensions/` (ou `edge://extensions/`), activer le `Developer mode`.
   - Cliquer sur `Load unpacked` / `Charger l’extension non empaquetée` et sélectionner le dossier `Deception_Shield_V2`.

2. Ouvrir la page de test :

   - Ouvrir `test_page.html` directement (Fichier → Ouvrir un fichier) ou lancer un serveur local (recommandé) et visiter `http://localhost:8000/test_page.html`.

   - Pour servir rapidement depuis le dossier du projet :

```bash
# Avec Python 3 (recommande)
python -m http.server 8000

# ou avec Node (si vous avez http-server installé)
npx http-server -p 8000
```

3. Ouvrir DevTools (Console) sur la page de test et utiliser les boutons pour exécuter les vérifications :

   - **LocalStorage** : `Set localStorage user_id` / `Get localStorage user_id` — vous devriez voir un `fake-tracking-id-...` renvoyé pour la clé `user_id`.
   - **Canvas** : `toDataURL()` et `toBlob()` — la console indique le bruit appliqué et les images sont légèrement modifiées.
   - **WebGL / WebGL2** : `Test WebGL` / `Test WebGL2` — `getParameter(VENDOR/RENDERER)` doit renvoyer des valeurs masquées et l'extension `WEBGL_debug_renderer_info` doit être bloquée (null).
   - **Web Audio** : `Test AudioBuffer.getChannelData()` — le premier élément du buffer est légèrement altéré (log).

## Notes importantes

- Ces scripts modifient des APIs natives du navigateur ; certains sites peuvent détecter ou être affectés.
- Les canvas « tainted » (cross-origin) empêcheront `getImageData()` — le code ignore silencieusement ces cas.
- Si vous observez des problèmes, désactivez l'extension et rechargez la page.

## Repository GitHub

Le dépôt a été poussé sur : `https://github.com/Jeannot262/Deception_Shield_V2`

## Prochaines améliorations possibles

- Ajouter protection pour d'autres surfaces d'empreintes (fonts enumeration plus robuste).
- Ajouter option dans le popup pour activer/désactiver chaque module individuellement.
- Ajouter une page interne d'auto-test automatisé.

---
Auteur : Jeannot262
# Deception_Shield_V2