#!/usr/bin/env node
// ============================================================
// patch-dashboard-css.js
// Remplace le bloc @font-face Feather + classes .fe dans
// dashboard.css par la webfont Lucide
// ============================================================

const fs = require('fs');
const path = require('path');

const THEME_DIR = path.resolve(__dirname, '..');
const DASHBOARD_CSS = path.join(THEME_DIR, 'dashboard.css');
const LUCIDE_CSS_SRC = path.join(THEME_DIR, 'fonts/lucide/lucide.css');

if (!fs.existsSync(DASHBOARD_CSS)) {
  console.error('❌ dashboard.css introuvable à :', DASHBOARD_CSS);
  process.exit(1);
}

if (!fs.existsSync(LUCIDE_CSS_SRC)) {
  console.error('❌ fonts/lucide/lucide.css introuvable. Lancez d abord npm install lucide-static.');
  process.exit(1);
}

// Lire le dashboard.css existant
let dashboardContent = fs.readFileSync(DASHBOARD_CSS, 'utf8');

// Faire une sauvegarde
fs.writeFileSync(DASHBOARD_CSS + '.backup', dashboardContent, 'utf8');
console.log('   💾 Sauvegarde créée : dashboard.css.backup');

// Lire le lucide.css source et adapter les chemins
let lucideCss = fs.readFileSync(LUCIDE_CSS_SRC, 'utf8');

// Adapter les chemins de la font pour pointer vers fonts/lucide/
// Le lucide.css original pointe vers des chemins relatifs depuis lui-même
// On les réécrit pour pointer depuis la racine du projet
lucideCss = lucideCss.replace(
  /url\(['"]?([^'")]+\.woff2)['"]?\)/g,
  "url('./fonts/lucide/lucide.woff2')"
);
lucideCss = lucideCss.replace(
  /url\(['"]?([^'")]+\.woff)['"]?\)/g,
  "url('./fonts/lucide/lucide.woff')"
);
lucideCss = lucideCss.replace(
  /url\(['"]?([^'")]+\.ttf)['"]?\)/g,
  "url('./fonts/lucide/lucide.ttf')"
);

// ── Supprimer le bloc @font-face Feather ──────────────────────
// Pattern : @font-face { ... font-family: "feather" ... }
dashboardContent = dashboardContent.replace(
  /@font-face\s*\{[^}]*font-family\s*:\s*['"]?feather['"]?[^}]*\}/gi,
  '/* ⬇ Feather @font-face supprimé — remplacé par Lucide ci-dessous */'
);

// ── Supprimer les classes .fe (base) ─────────────────────────
// Pattern : .fe { font-family: "feather"... }
dashboardContent = dashboardContent.replace(
  /\.fe\s*\{[^}]+\}/g,
  '/* .fe supprimé — voir classes .icon-* Lucide */'
);

// ── Supprimer toutes les classes .fe-xxx ─────────────────────
// Pattern : .fe-icon-name:before { content: "\eXXX"; }
dashboardContent = dashboardContent.replace(
  /\.fe-[a-z0-9-]+\s*:\s*before\s*\{[^}]+\}\s*/g,
  ''
);

// ── Injecter le CSS Lucide au début (après éventuels commentaires/imports) ──
const lucideBlock = `
/* ============================================================
   LUCIDE ICONS WEBFONT
   Remplace Feather Icons (déprécié)
   Généré automatiquement par migration/patch-dashboard-css.js
   ============================================================ */
${lucideCss}
/* ============================================================ */

`;

// Insérer après le premier commentaire de copyright s'il existe, sinon au début
if (dashboardContent.match(/^\/\*/)) {
  // Il y a un commentaire en début de fichier, insérer après
  dashboardContent = dashboardContent.replace(
    /(\*\/\s*\n)/,
    '$1\n' + lucideBlock
  );
} else {
  dashboardContent = lucideBlock + dashboardContent;
}

fs.writeFileSync(DASHBOARD_CSS, dashboardContent, 'utf8');
console.log('   ✅ dashboard.css patché avec la webfont Lucide');
console.log('   📝 Chemin des fonts : ./fonts/lucide/lucide.{woff2,woff,ttf}');
