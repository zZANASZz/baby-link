import 'react-native-url-polyfill/auto';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import Navigation from './navigation/index';

// ==== SCROLL_DEBUG — diagnostic temporaire, à retirer après investigation ====
// Passe à false (ou supprime le bloc runScrollDiagnostic + son appel dans
// useEffect ci-dessous) pour désactiver.
const SCROLL_DEBUG = true;

function runScrollDiagnostic() {
  try {
    const all = Array.from(document.querySelectorAll('*'));

    function depthOf(el) {
      let d = 0;
      let n = el;
      while (n.parentElement) { d++; n = n.parentElement; }
      return d;
    }

    const overflowing = all
      .filter((el) => el.id !== 'scroll-debug-overlay' && !el.closest('#scroll-debug-overlay'))
      .map((el) => {
        const cs = window.getComputedStyle(el);
        return {
          el,
          tag: el.tagName,
          className: (el.className && el.className.toString) ? el.className.toString() : '',
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          overflowAmount: el.scrollHeight - el.clientHeight,
          depth: depthOf(el),
          height: cs.height,
          overflow: cs.overflow,
          overflowY: cs.overflowY,
          touchAction: cs.touchAction,
          position: cs.position,
          transform: cs.transform,
          overscrollBehavior: cs.overscrollBehavior,
          display: cs.display,
        };
      })
      .filter((e) => e.overflowAmount > 5 && e.clientHeight > 0)
      .sort((a, b) => b.overflowAmount - a.overflowAmount);

    const top = overflowing.slice(0, 20);

    // Élément le plus profond qui déborde = candidat le plus probable pour être
    // la vraie ScrollView (la plus proche du contenu réel dans l'arbre DOM).
    let deepest = null;
    for (const e of overflowing) {
      if (!deepest || e.depth > deepest.depth) deepest = e;
    }

    let scrollTest = null;
    if (deepest) {
      const before = deepest.el.scrollTop;
      deepest.el.scrollTop = 300;
      // lecture synchrone après écriture : suffisant pour scrollTop (pas animé)
      const after = deepest.el.scrollTop;
      scrollTest = { before, after, moved: after !== before };
    }

    function esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function truncClass(c) {
      const s = String(c || '');
      return s.length > 70 ? s.slice(0, 70) + '…' : s;
    }

    const lines = [];
    lines.push('=== SCROLL DEBUG (t+3s) ===');
    lines.push('user-agent: ' + esc(navigator.userAgent));
    lines.push('window: ' + window.innerWidth + 'x' + window.innerHeight);
    lines.push('');
    lines.push('--- TEST SCROLL PROGRAMMATIQUE (élément le plus profond qui déborde) ---');
    if (deepest) {
      lines.push('tag: ' + deepest.tag + '  depth: ' + deepest.depth);
      lines.push('class: ' + esc(truncClass(deepest.className)));
      lines.push('scrollTop avant: ' + scrollTest.before + '  après (scrollTop=300): ' + scrollTest.after);
      lines.push(scrollTest.moved
        ? '=> PEUT scroller par programme (le blocage est donc le GESTE tactile)'
        : '=> NE PEUT PAS scroller du tout (même par programme)');
    } else {
      lines.push('AUCUN élément débordant trouvé (scrollHeight <= clientHeight partout)');
    }
    lines.push('');
    lines.push('--- TOUS LES ELEMENTS DEBORDANTS (top 20, triés par ampleur) ---');
    top.forEach((e, i) => {
      lines.push('');
      lines.push('[' + i + '] <' + e.tag + '> depth=' + e.depth
        + ' scrollH=' + e.scrollHeight + ' clientH=' + e.clientHeight
        + ' (+' + e.overflowAmount + 'px)');
      lines.push('  class: ' + esc(truncClass(e.className)));
      lines.push('  height=' + e.height
        + ' overflow=' + e.overflow + ' overflowY=' + e.overflowY);
      lines.push('  touchAction=' + e.touchAction
        + ' position=' + e.position);
      lines.push('  transform=' + e.transform
        + ' overscrollBehavior=' + e.overscrollBehavior
        + ' display=' + e.display);
    });

    const text = lines.join('\n');

    const overlay = document.createElement('div');
    overlay.id = 'scroll-debug-overlay';
    overlay.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'right:0',
      'height:70vh',
      'background:#000', 'color:#0f0',
      'z-index:2147483647',
      'font-family:monospace', 'font-size:10px', 'line-height:1.4',
      'padding:8px', 'boxSizing:border-box',
      'overflow-y:auto', 'overflow-x:hidden',
      '-webkit-overflow-scrolling:touch',
      'white-space:pre-wrap', 'word-break:break-all',
    ].join(';');

    const closeBtn = document.createElement('div');
    closeBtn.textContent = '[ FERMER ]';
    closeBtn.style.cssText = 'color:#f55;font-weight:bold;margin-bottom:8px;padding:6px;border:1px solid #f55;display:inline-block;';
    closeBtn.onclick = () => overlay.remove();
    overlay.appendChild(closeBtn);

    const pre = document.createElement('div');
    pre.textContent = text;
    overlay.appendChild(pre);

    document.body.appendChild(overlay);
    // eslint-disable-next-line no-console
    console.log(text);
  } catch (err) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#000;color:#f55;z-index:2147483647;font-family:monospace;font-size:12px;padding:8px;white-space:pre-wrap;';
    overlay.textContent = 'SCROLL_DEBUG ERROR: ' + (err && err.stack || err);
    document.body.appendChild(overlay);
  }
}
// ==== FIN SCROLL_DEBUG ====

function ScrollDebugButton() {
  return (
    <div
      id="scroll-debug-trigger"
      onClick={runScrollDiagnostic}
      style={{
        position: 'fixed',
        bottom: 12,
        right: 12,
        zIndex: 2147483646,
        background: '#000',
        color: '#0f0',
        fontFamily: 'monospace',
        fontSize: 11,
        padding: '8px 10px',
        borderRadius: 6,
        border: '1px solid #0f0',
      }}
    >
      🔍 Diagnostic scroll
    </div>
  );
}

export default function App() {
  useEffect(() => {
    if (SCROLL_DEBUG && Platform.OS === 'web') {
      const timer = setTimeout(runScrollDiagnostic, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <>
      <Navigation />
      {SCROLL_DEBUG && Platform.OS === 'web' && <ScrollDebugButton />}
    </>
  );
}
