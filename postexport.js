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
// + touch-action:pan-y en filet de sécurité : autorise explicitement le pan
// vertical au doigt dès la racine, pour lever toute ambiguïté de geste côté
// Chrome/Blink (recommandation standard MDN/web.dev). Testé (Playwright,
// moteur Blink, événements tactiles réels via CDP) : n'affecte PAS les
// <ScrollView horizontal> imbriquées plus bas dans l'arbre (PhotosScreen,
// AgendaScreen, MessagesScreen...), qui restent scrollables horizontalement.
html = html.replace(
  /#root\s*\{\s*display:\s*flex;\s*height:\s*100%;\s*flex:\s*1;\s*\}/,
  `#root {
        display: flex;
        flex-direction: column;
        height: 100%;
        flex: 1;
        touch-action: pan-y;
      }
      @supports (height: 100dvh) {
        html, body, #root {
          height: 100dvh;
        }
      }`
);

// FIX SCROLL ANDROID (Chrome + Samsung Internet) : voir le commentaire jumeau
// dans web/index.html. Le overflowY:'auto' posé côté React sur le ScrollView
// (via StyleSheet.create) ne se propage pas de façon fiable au DOM sur tous
// les moteurs Android (confirmé KO sur Samsung Internet 30 / Chromium 143,
// et pas fiable non plus sur Chrome 149 mobile) à cause de l'ordre
// d'insertion du CSS atomique de react-native-web. On force donc la règle en
// CSS brut avec !important, ciblée par id partagé "tab-scroll" (un seul écran
// d'onglet monté à la fois dans StaffTabs/ParentTabs -> pas de collision).
// flex-basis doit être 0 (pas auto) : sinon la boîte grandit à la taille de
// son contenu au lieu d'être bornée, ce qui neutralise overflow-y:auto.
html = html.replace(
  '</head>',
  `  <style id="scroll-fix">
    #tab-scroll {
      overflow-y: auto !important;
      -webkit-overflow-scrolling: touch !important;
      flex: 1 1 0 !important;
      min-height: 0 !important;
    }
  </style>
</head>`
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
