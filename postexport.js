const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'dist', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Fix viewport
html = html.replace(
  '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />',
  '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover" />'
);

// Fix styles
html = html.replace(
  '<style id="expo-reset">',
  `<style id="expo-reset-extra">
      input, textarea, select { font-size: 16px !important; touch-action: manipulation; }
    </style>
    <style id="expo-reset">`
);

// Fix body overflow
html = html.replace(
  'body {\n        overflow: hidden;\n      }',
  'body {\n        overflow-x: hidden;\n        overflow-y: auto;\n      }'
);

// Ajouter meta PWA
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