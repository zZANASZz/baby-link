const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'dist', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

html = html.replace(
  '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />',
  '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover" />'
);

html = html.replace(
  '<style id="expo-reset">',
  `<style id="expo-reset-extra">
      input, textarea, select { font-size: 16px !important; touch-action: manipulation; }
    </style>
    <style id="expo-reset">`
);

// FIX SCROLL ANDROID (Chrome/Blink) : ne pas laisser body scrollable.
// Le body reste overflow:hidden (comportement documenté par défaut d'Expo,
// cf. le commentaire "These styles disable body scrolling if you are using
// <ScrollView>" juste au-dessus dans le HTML généré) : tout le scroll passe
// exclusivement par le <ScrollView> interne de chaque écran. Un body
// scrollable crée un 2e conteneur de scroll concurrent que Chrome/Android
// gère mal (contrairement à Safari/iOS, plus permissif), et qui capte le
// geste tactile sans jamais le relayer à la ScrollView.

// FIX #root : flex-direction n'est pas défini par défaut par Expo (le CSS
// standard retombe alors sur "row", pas "column") + alignement de la hauteur
// sur 100dvh (viewport dynamique) en plus de 100% pour rester cohérent avec
// StaffTabs.js/ParentTabs.js qui utilisent déjà 100dvh, et éviter tout écart
// avec la barre d'adresse Android qui apparaît/disparaît.
html = html.replace(
  /#root\s*\{\s*display:\s*flex;\s*height:\s*100%;\s*flex:\s*1;\s*\}/,
  `#root {
        display: flex;
        flex-direction: column;
        height: 100%;
        flex: 1;
      }
      @supports (height: 100dvh) {
        html, body, #root {
          height: 100dvh;
        }
      }`
);

// Forcer le titre Baby-link
html = html.replace(/<title>.*?<\/title>/, '<title>Baby-link</title>');

if (!html.includes('apple-mobile-web-app-capable')) {
  html = html.replace('</head>', `  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="Baby-link" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/manifest.json" />
</head>`);
}

fs.writeFileSync(indexPath, html);
console.log('✅ index.html patché !');
