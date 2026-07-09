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

// FIX #root — CAUSE RACINE du bug de scroll sur Android réel (confirmée par
// diagnostic sur device : Samsung Internet + Chrome). #root ne doit PAS
// dépendre d'une cascade height:100%/100dvh à travers la chaîne de flex
// (html -> body -> #root -> ... -> ScrollView) : sur certains Android réels,
// un maillon de cette cascade échoue à transmettre une hauteur bornée
// concrète (la boîte se met à faire la taille de son contenu au lieu d'être
// bornée à l'écran), et tout ce qui est en dessous grandit avec lui — les
// ScrollView ne débordent alors plus jamais de leur conteneur et ne
// scrollent donc pas (scrollHeight == clientHeight, vérifié par le
// diagnostic).
// Preuve que l'ancrage direct au viewport fonctionne sur ce device : les
// <Modal> de react-native-web scrollent parfaitement, et leur implémentation
// (node_modules/react-native-web/dist/exports/Modal/ModalContent.js) pose
// position:fixed; top:0; right:0; bottom:0; left:0 sur leur conteneur — un
// ancrage direct au vrai viewport du navigateur qui court-circuite
// entièrement la cascade de hauteur des ancêtres. On applique exactement le
// même ancrage à #root (seul point du DOM où c'est nécessaire, puisque tout
// le reste de l'app est monté dessous) : une fois #root réellement borné,
// StaffTabs.js/ParentTabs.js et tab-scroll redeviennent un flex:1 ordinaire
// dans une chaîne enfin bornée. Plus besoin de 100dvh ni de @supports ici.
// flex-direction n'est pas défini par défaut par Expo (le CSS standard
// retombe alors sur "row", pas "column").
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
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        touch-action: pan-y;
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
