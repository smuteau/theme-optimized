#!/usr/bin/env node
// ============================================================
// fix-dashboard-css.js
// Remplace le bloc @font-face Lucide malformé (avec .eot, ?t=...)
// par un bloc propre avec les bons chemins relatifs
//
// Usage (depuis le repo theme-optimized) :
//   node migration/fix-dashboard-css.js
// ============================================================

const fs = require('fs');
const path = require('path');

const DASHBOARD_CSS = path.resolve(__dirname, '../dashboard.css');

if (!fs.existsSync(DASHBOARD_CSS)) {
  console.error('❌ dashboard.css introuvable');
  process.exit(1);
}

let content = fs.readFileSync(DASHBOARD_CSS, 'utf8');

// ── Bloc malformé à remplacer ─────────────────────────────────
const BAD_BLOCK = `@font-face {
  font-family: "lucide";
  src: url('lucide.eot?t=1772629192554'); /* IE9*/
  src: url('lucide.eot?t=1772629192554#iefix') format('embedded-opentype') /* IE6-IE8 */,
  url('lucide.woff2?t=1772629192554') format('woff2'),
  url('lucide.woff?t=1772629192554') format('woff'),
  url('lucide.ttf?t=1772629192554') format('truetype'),
  url('lucide.svg?t=1772629192554') format('svg');
}
[class^="icon-"], [class*=" icon-"] {
  font-family: 'lucide' !important;font-size: inherit;
  font-style:normal;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}`;

// ── Bloc propre de remplacement ───────────────────────────────
const GOOD_BLOCK = `@font-face {
  font-family: "lucide";
  src: url("./fonts/lucide/lucide.woff2") format("woff2"),
    url("./fonts/lucide/lucide.woff") format("woff"),
    url("./fonts/lucide/lucide.ttf") format("truetype");
}
[class^="icon-"],
[class*=" icon-"] {
  font-family: "lucide" !important;
  font-style: normal;
  font-weight: normal;
  font-variant: normal;
  text-transform: none;
  line-height: 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}`;

if (!content.includes(BAD_BLOCK)) {
  console.error('❌ Bloc malformé introuvable dans dashboard.css');
  console.error('   Le fichier a peut-être déjà été corrigé, ou le formatage diffère légèrement.');
  console.error('   Vérifiez avec : grep -A 15 "font-face" dashboard.css');
  process.exit(1);
}

content = content.replace(BAD_BLOCK, GOOD_BLOCK);
fs.writeFileSync(DASHBOARD_CSS, content, 'utf8');

console.log('✅ dashboard.css mis à jour');
console.log('   Supprimé : .eot, .svg, ?t=..., chemins sans préfixe');
console.log('   Ajouté   : chemins corrects vers ./fonts/lucide/');
