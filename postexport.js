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

// FIX SCROLL : on garde overflow-y auto comme FILET DE SECURITE (ne jamais le bloquer)
// + on ajoute dvh en progressive enhancement pour corriger l'adresse bar Android
html = html.replace(
  /body\s*\{\s*overflow:\s*hidden;\s*\}/,
  `html, body {
        height: 100%;
        margin: 0;
        padding: 0;
      }
      body {
        overflow-x: hidden;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }
      #root {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 100%;
      }
      @supports (height: 100dvh) {
        html, body, #root {
          height: 100dvh;
        }
      }`
);

// Filet de sécurité si le bloc n'a pas matché
if (!html.includes('#root') || !html.includes('overflow-y: auto')) {
  html = html.replace('</head>', `  <style id="scroll-fix">
    html, body { height: 100%; margin: 0; padding: 0; }
    body { overflow-x: hidden; overflow-y: auto; -webkit-overflow-scrolling: touch; }
    #root { display: flex; flex-direction: column; height: 100%; min-height: 100%; }
    @supports (height: 100dvh) {
      html, body, #root { height: 100dvh; }
    }
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
console.log('✅ index.html patché (scroll restauré + dvh Android en bonus) !');
