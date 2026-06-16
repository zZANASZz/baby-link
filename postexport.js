const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'dist', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Viewport
html = html.replace(
  '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />',
  '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover" />'
);

// Inputs : empêcher le zoom auto iOS
html = html.replace(
  '<style id="expo-reset">',
  `<style id="expo-reset-extra">
      input, textarea, select { font-size: 16px !important; touch-action: manipulation; }
    </style>
    <style id="expo-reset">`
);

// FIX SCROLL iOS + ANDROID : hauteur dynamique sur html/body/#root
// On remplace tout bloc body { overflow... } par notre version dvh
html = html.replace(
  /body\s*\{\s*overflow:\s*hidden;\s*\}/,
  `html, body {
        height: 100vh;
        height: 100dvh;
        margin: 0;
        padding: 0;
        overflow: hidden;
      }
      #root {
        display: flex;
        flex-direction: column;
        height: 100vh;
        height: 100dvh;
        overflow: hidden;
      }`
);

// Filet de sécurité : si le bloc ci-dessus n'a pas matché, on injecte le CSS avant </head>
if (!html.includes('height: 100dvh')) {
  html = html.replace('</head>', `  <style id="scroll-fix">
    html, body { height: 100vh; height: 100dvh; margin: 0; padding: 0; overflow: hidden; }
    #root { display: flex; flex-direction: column; height: 100vh; height: 100dvh; overflow: hidden; }
    input, textarea, select { font-size: 16px !important; }
  </style>
</head>`);
}

// Forcer le titre Baby-link
html = html.replace(/<title>.*?<\/title>/, '<title>Baby-link</title>');

// Meta PWA
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
console.log('✅ index.html patché (scroll dvh iOS + Android) !');
