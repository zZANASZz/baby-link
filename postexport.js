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
// dans web/index.html. Diagnostic sur device réel a montré que même une fois
// #root correctement borné au viewport, #tab-content (son petit-fils, via
// StaffTabs.js/ParentTabs.js) restait en position:relative -> il continue de
// dépendre de la cascade flex (flex:1 sur un flex column) qui échoue sur cet
// Android/Blink et grandit à la taille de son contenu (911px mesuré au lieu
// des 784px de l'écran) au lieu de rester borné -> #tab-scroll (absolute sur
// ce parent non borné) suit et scrollHeight == clientHeight -> rien ne
// scrolle. Le fix précédent (#tab-scroll en absolute sur #tab-content) était
// donc inutile tant que #tab-content lui-même n'était pas borné.
// Remède : on applique le même ancrage direct qu'à #root, un niveau plus bas.
// #tabs-root (le View racine de StaffTabs/ParentTabs, cf. nativeID ajouté
// dans ces fichiers) est ancré en position:absolute inset:0 sur #root (déjà
// borné) -> #tabs-root est donc borné à coup sûr, indépendamment de la
// cascade flex. La barre de nav (#tabs-navbar) reste dans le flux normal
// (position:static, hauteur naturelle) au-dessus de #tab-content. #tab-content
// est ensuite ancré en position:absolute sous la nav bar : sa hauteur ne peut
// plus être mal calculée puisqu'elle ne dépend plus de flex:1, seulement du
// "top" = hauteur de la nav bar. Cette hauteur varie selon l'appareil/la
// taille de police (accessibilité), donc au lieu de la coder en dur, un petit
// script mesure #tabs-navbar au runtime (ResizeObserver + MutationObserver
// pour attendre le montage React) et l'expose via la variable CSS
// --tabs-navbar-height. #tab-scroll reste ancré en absolute/inset:0 sur
// #tab-content, désormais réellement borné -> le scroll natif (déjà prouvé
// fonctionnel via les <Modal> react-native-web en position:fixed sur ce même
// device) s'active enfin.
// Garde d'idempotence : depuis que public/index.html (repris tel quel par
// `expo export`, cf. commentaire plus haut) contient déjà ce bloc en dur,
// dist/index.html l'a normalement déjà. Sans ce garde, un `</head>` existe
// toujours dans le HTML et le replace insérerait un 2e bloc scroll-fix en
// doublon à chaque exécution.
if (!html.includes('id="scroll-fix"')) {
  html = html.replace(
    '</head>',
    `  <style id="scroll-fix">
    #tabs-root {
      position: absolute !important;
      top: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      left: 0 !important;
      display: flex !important;
      flex-direction: column !important;
    }
    #tab-content {
      position: absolute !important;
      top: var(--tabs-navbar-height, 0px) !important;
      right: 0 !important;
      bottom: 0 !important;
      left: 0 !important;
      overflow: hidden !important;
    }
    #tab-scroll {
      position: absolute !important;
      top: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      left: 0 !important;
      overflow-y: auto !important;
      -webkit-overflow-scrolling: touch !important;
    }
  </style>
  <script id="scroll-fix-navbar-height">
    (function () {
      function applyHeight(navbar) {
        document.documentElement.style.setProperty(
          '--tabs-navbar-height',
          navbar.offsetHeight + 'px'
        );
      }
      var ro = null;
      function tryObserve() {
        var navbar = document.getElementById('tabs-navbar');
        if (!navbar) return false;
        applyHeight(navbar);
        if (window.ResizeObserver) {
          if (ro) ro.disconnect();
          ro = new ResizeObserver(function () { applyHeight(navbar); });
          ro.observe(navbar);
        }
        return true;
      }
      if (!tryObserve()) {
        var mo = new MutationObserver(function () {
          if (tryObserve()) mo.disconnect();
        });
        mo.observe(document.documentElement, { childList: true, subtree: true });
      }
      window.addEventListener('resize', function () {
        var navbar = document.getElementById('tabs-navbar');
        if (navbar) applyHeight(navbar);
      });
      window.addEventListener('orientationchange', function () {
        var navbar = document.getElementById('tabs-navbar');
        if (navbar) applyHeight(navbar);
      });
    })();
  </script>
</head>`
  );
}

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
