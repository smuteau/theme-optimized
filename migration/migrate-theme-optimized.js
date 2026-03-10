#!/usr/bin/env node
// ============================================================
// migrate-theme-optimized.js
// Migration complète Feather -> Lucide pour le repo theme-optimized
//
// Ce script :
//   1. Installe lucide-static via npm
//   2. Copie la webfont Lucide dans fonts/lucide/ (+ licence)
//   3. Crée / met à jour .gitignore
//   4. Met à jour dashboard.css (supprime .fe-*, ajoute Lucide en fin)
//   5. Extrait les listes d'icônes Feather (depuis backup) et Lucide
//   6. Nettoyage : supprime fonts/feather/ et dashboard.css.backup
//   7. Génère migration/rapport-theme-optimized.txt
//      et migration/rapport-icones.txt
//
// Usage (depuis la racine du repo theme-optimized) :
//   node migration/migrate-theme-optimized.js
// ============================================================

'use strict';

var fs       = require('fs');
var path     = require('path');
var execSync = require('child_process').execSync;

// ─── Configuration ────────────────────────────────────────────────────────────

var THEME_DIR     = process.cwd();
var MIGRATION_DIR = path.join(THEME_DIR, 'migration');
var REPORT_PATH   = path.join(MIGRATION_DIR, 'rapport-theme-optimized.txt');
var ICONS_PATH    = path.join(MIGRATION_DIR, 'rapport-icones.txt');

var DASHBOARD_CSS    = path.join(THEME_DIR, 'dashboard.css');
var DASHBOARD_BACKUP = DASHBOARD_CSS + '.backup';
var FONTS_FEATHER    = path.join(THEME_DIR, 'fonts', 'feather');
var FONTS_LUCIDE     = path.join(THEME_DIR, 'fonts', 'lucide');
var LUCIDE_FONT_SRC  = path.join(THEME_DIR, 'node_modules', 'lucide-static', 'font');

var startTime = new Date();

// ─── Table de renommage Feather -> Lucide (28 icônes dont le nom a changé) ───

var RENAMED = {
  'alert-circle':        'circle-alert',
  'alert-octagon':       'octagon-alert',
  'alert-triangle':      'triangle-alert',
  'arrow-down-circle':   'circle-arrow-down',
  'arrow-left-circle':   'circle-arrow-left',
  'arrow-right-circle':  'circle-arrow-right',
  'arrow-up-circle':     'circle-arrow-up',
  'check-circle':        'circle-check',
  'check-square':        'square-check',
  'edit':                'pencil',
  'edit-2':              'pen',
  'edit-3':              'pen-line',
  'git-commit':          'git-commit-horizontal',
  'help-circle':         'circle-help',
  'minus-circle':        'circle-minus',
  'minus-square':        'square-minus',
  'more-horizontal':     'ellipsis',
  'more-vertical':       'ellipsis-vertical',
  'pause-circle':        'circle-pause',
  'play-circle':         'circle-play',
  'plus-circle':         'circle-plus',
  'plus-square':         'square-plus',
  'sliders':             'sliders-horizontal',
  'stop-circle':         'circle-stop',
  'tool':                'wrench',
  'x-circle':            'circle-x',
  'x-octagon':           'octagon-x',
  'x-square':            'square-x',
};

// Icône fallback pour les icônes Feather absentes de Lucide.
// file-question n'existe pas dans Feather : marqueur visuel non ambigu.
var FALLBACK_ICON = 'file-question';

// ─── Utilitaires ──────────────────────────────────────────────────────────────

var report  = [];
var errors  = [];
var stepNum = 0;

function step(label) {
  stepNum++;
  var msg = '\n▶  Étape ' + stepNum + ' — ' + label;
  console.log(msg);
  report.push(msg);
}

function ok(msg) {
  var line = '   ✅  ' + msg;
  console.log(line);
  report.push(line);
}

function info(msg) {
  var line = '       ' + msg;
  console.log(line);
  report.push(line);
}

function warn(msg) {
  var line = '   ⚠️   ' + msg;
  console.log(line);
  report.push(line);
  errors.push(msg);
}

function sep(char, len) {
  console.log((char || '-').repeat(len || 64));
}

function sepR(char, len) {
  report.push((char || '-').repeat(len || 64));
}

// ─── Bannière de démarrage ────────────────────────────────────────────────────

sep('=');
console.log('   Migration Feather -> Lucide  |  theme-optimized');
console.log('   Répertoire : ' + THEME_DIR);
console.log('   Démarré    : ' + startTime.toLocaleString('fr-FR'));
sep('=');

report.push('================================================================');
report.push('   RAPPORT DE MIGRATION -- @gladysassistant/theme-optimized');
report.push('   Feather Icons (webfont) -> Lucide Icons (webfont)');
report.push('================================================================');
report.push('');
report.push('Date       : ' + startTime.toLocaleString('fr-FR'));
report.push('Répertoire : ' + THEME_DIR);
report.push('');

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 1 — Installation de lucide-static
// ─────────────────────────────────────────────────────────────────────────────

step('Installation de lucide-static via npm');

var lucideVersion = 'inconnue';
try {
  execSync('npm install lucide-static --save', { cwd: THEME_DIR, stdio: 'inherit' });
  var pkgPath = path.join(THEME_DIR, 'node_modules', 'lucide-static', 'package.json');
  if (fs.existsSync(pkgPath)) {
    lucideVersion = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version || 'inconnue';
  }
  ok('lucide-static installé -- version ' + lucideVersion);
} catch (e) {
  warn('Échec npm install : ' + e.message);
  warn('Relancez manuellement : npm install lucide-static --save');
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 2 — Copie de la webfont Lucide -> fonts/lucide/
// ─────────────────────────────────────────────────────────────────────────────

step('Copie de la webfont Lucide -> fonts/lucide/');

if (!fs.existsSync(LUCIDE_FONT_SRC)) {
  warn('Dossier source introuvable : ' + LUCIDE_FONT_SRC);
  process.exit(1);
}

fs.mkdirSync(FONTS_LUCIDE, { recursive: true });

var FONT_FILES  = ['lucide.woff2', 'lucide.woff', 'lucide.ttf', 'lucide.css'];
var copiedFonts = [];

for (var _fi = 0; _fi < FONT_FILES.length; _fi++) {
  var _file = FONT_FILES[_fi];
  var _src  = path.join(LUCIDE_FONT_SRC, _file);
  var _dest = path.join(FONTS_LUCIDE, _file);
  if (fs.existsSync(_src)) {
    fs.copyFileSync(_src, _dest);
    copiedFonts.push(_file);
    ok('Copié : fonts/lucide/' + _file);
  } else {
    warn('Fichier source manquant : ' + _file);
  }
}

// Copie de la licence depuis la racine du package lucide-static
var licenceCopied     = false;
var licenceCandidates = ['LICENSE', 'LICENSE.md', 'licence', 'licence.md'];
var lucidePackageRoot = path.join(THEME_DIR, 'node_modules', 'lucide-static');
for (var _li = 0; _li < licenceCandidates.length; _li++) {
  var _licSrc = path.join(lucidePackageRoot, licenceCandidates[_li]);
  if (fs.existsSync(_licSrc)) {
    fs.copyFileSync(_licSrc, path.join(FONTS_LUCIDE, 'LICENSE'));
    copiedFonts.push('LICENSE');
    ok('Copié : fonts/lucide/LICENSE');
    licenceCopied = true;
    break;
  }
}
if (!licenceCopied) {
  warn('Fichier de licence lucide-static introuvable (LICENSE / LICENSE.md)');
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 3 — Création / mise à jour de .gitignore
// ─────────────────────────────────────────────────────────────────────────────

step('Création / mise à jour de .gitignore');

var GITIGNORE_PATH    = path.join(THEME_DIR, '.gitignore');
var GITIGNORE_ENTRIES = ['.DS_Store', 'node_modules', '.env'];

if (fs.existsSync(GITIGNORE_PATH)) {
  var existing = fs.readFileSync(GITIGNORE_PATH, 'utf8');
  var missing  = GITIGNORE_ENTRIES.filter(function(e) {
    return !existing.split('\n').some(function(line) { return line.trim() === e; });
  });
  if (missing.length > 0) {
    var toAppend = (existing.endsWith('\n') ? '' : '\n') + missing.join('\n') + '\n';
    fs.writeFileSync(GITIGNORE_PATH, existing + toAppend, 'utf8');
    ok('.gitignore mis à jour -- entrées ajoutées : ' + missing.join(', '));
  } else {
    ok('.gitignore déjà à jour -- aucune modification');
  }
} else {
  fs.writeFileSync(GITIGNORE_PATH, GITIGNORE_ENTRIES.join('\n') + '\n', 'utf8');
  ok('.gitignore créé avec : ' + GITIGNORE_ENTRIES.join(', '));
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 4 — Mise à jour de dashboard.css
// ─────────────────────────────────────────────────────────────────────────────

step('Mise à jour de dashboard.css');

var feClassesBefore  = 0;
var feClassesAfter   = 0;
var dashboardUpdated = false;

if (!fs.existsSync(DASHBOARD_CSS)) {
  warn('dashboard.css introuvable : ' + DASHBOARD_CSS);
} else {
  fs.copyFileSync(DASHBOARD_CSS, DASHBOARD_BACKUP);
  ok('Sauvegarde créée : dashboard.css.backup');

  var css = fs.readFileSync(DASHBOARD_CSS, 'utf8');

  feClassesBefore = (css.match(/\.fe-[a-z0-9-]+\s*:/g) || []).length;

  // Supprimer le bloc @font-face Feather
  css = css.replace(/@font-face\s*\{[^}]*font-family\s*:\s*['"]?feather['"]?[^}]*\}/gi, '');
  // Supprimer la classe de base .fe { ... }
  css = css.replace(/\.fe\s*\{[^}]+\}/g, '');
  // Supprimer toutes les règles .fe-xxx:before { content: "..." }
  css = css.replace(/\.fe-[a-z0-9-]+\s*:+before\s*\{[^}]+\}\s*/g, '');

  // Lire le CSS Lucide et retirer son @font-face (on le réécrit proprement)
  var lucideCssRaw  = fs.readFileSync(path.join(FONTS_LUCIDE, 'lucide.css'), 'utf8');
  var iconRulesOnly = lucideCssRaw.replace(/@font-face\s*\{[^}]*\}/gi, '').trim();

  // Bloc injecté en fin de fichier (structure originale conservée)
  var injectedBlock = [
    '/* ==============================================================',
    '   LUCIDE ICONS WEBFONT -- version ' + lucideVersion,
    '   Source : lucide-static (https://github.com/lucide-icons/lucide)',
    '   Remplace : Feather Icons (déprécié depuis 2021)',
    '   Généré automatiquement par migrate-theme-optimized.js',
    '   ============================================================== */',
    '',
    '@font-face {',
    '  font-family: "lucide";',
    "  src: url('./fonts/lucide/lucide.woff2') format('woff2'),",
    "       url('./fonts/lucide/lucide.woff') format('woff'),",
    "       url('./fonts/lucide/lucide.ttf') format('truetype');",
    '  font-weight: normal;',
    '  font-style: normal;',
    '}',
    '',
    '[class^="icon-"],',
    '[class*=" icon-"] {',
    '  font-family: "lucide" !important;',
    '  font-style: normal;',
    '  font-weight: normal;',
    '  font-variant: normal;',
    '  text-transform: none;',
    '  line-height: 1;',
    '  font-size: inherit;',
    '  display: inline-block;',
    '  vertical-align: -0.125em;',
    '  -webkit-font-smoothing: antialiased;',
    '  -moz-osx-font-smoothing: grayscale;',
    '}',
    '',
    '/* Icônes signal : taille augmentée pour meilleure lisibilité */',
    '[class^="icon-signal"],',
    '[class*=" icon-signal"] {',
    '  font-size: 1.25rem;',
    '}',
    '',
    iconRulesOnly,
    ''
  ].join('\n');

  css = css.replace(/\n{3,}/g, '\n\n').trimEnd();
  css = css + '\n\n' + injectedBlock;

  fs.writeFileSync(DASHBOARD_CSS, css, 'utf8');

  feClassesAfter = (css.match(/\.icon-[a-z0-9-]+\s*:/g) || []).length;
  dashboardUpdated = true;

  ok('dashboard.css mis à jour');
  info('Classes .fe-*   supprimées : ' + feClassesBefore);
  info('Classes .icon-* injectées  : ' + feClassesAfter);
  info('Règle signal (font-size: 1.25rem) ajoutée');
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 5 — Extraction des listes d'icônes Feather et Lucide
// ─────────────────────────────────────────────────────────────────────────────

step("Extraction des listes d'icônes Feather et Lucide");

// Liste Feather -- lue depuis le backup (encore présent à cette étape)
var featherIcons = [];
if (fs.existsSync(DASHBOARD_BACKUP)) {
  var backupCss = fs.readFileSync(DASHBOARD_BACKUP, 'utf8');
  var feRe = /\.fe-([a-z0-9-]+)\s*:+before/g;
  var feMatch;
  while ((feMatch = feRe.exec(backupCss)) !== null) featherIcons.push(feMatch[1]);
  featherIcons = featherIcons.filter(function(v, i, a) { return a.indexOf(v) === i; }).sort();
  ok(featherIcons.length + ' icônes Feather extraites depuis dashboard.css.backup');
} else {
  warn('dashboard.css.backup introuvable -- liste Feather non disponible');
}

// Liste Lucide -- extraite de fonts/lucide/lucide.css
var lucideIcons   = [];
var lucideCssPath = path.join(FONTS_LUCIDE, 'lucide.css');
if (fs.existsSync(lucideCssPath)) {
  var lucideCssContent = fs.readFileSync(lucideCssPath, 'utf8');
  var liRe = /\.icon-([a-z0-9-]+)\s*:/g;
  var liMatch;
  while ((liMatch = liRe.exec(lucideCssContent)) !== null) lucideIcons.push(liMatch[1]);
  lucideIcons = lucideIcons.filter(function(v, i, a) { return a.indexOf(v) === i; }).sort();
  ok(lucideIcons.length + ' icônes Lucide extraites depuis lucide.css');
} else {
  warn('lucide.css introuvable -- liste Lucide non disponible');
}

ok('Icône fallback : icon-' + FALLBACK_ICON);

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 6 — Nettoyage des fichiers temporaires
// ─────────────────────────────────────────────────────────────────────────────

step('Nettoyage des fichiers temporaires');

// Suppression du backup dashboard.css
if (fs.existsSync(DASHBOARD_BACKUP)) {
  fs.unlinkSync(DASHBOARD_BACKUP);
  ok('dashboard.css.backup supprimé');
} else {
  info('dashboard.css.backup absent -- rien à supprimer');
}

// Suppression du dossier fonts/feather/
var deletedFeatherFiles = [];
if (fs.existsSync(FONTS_FEATHER)) {
  fs.readdirSync(FONTS_FEATHER).forEach(function(f) {
    fs.unlinkSync(path.join(FONTS_FEATHER, f));
    deletedFeatherFiles.push(f);
    info('Supprimé : fonts/feather/' + f);
  });
  fs.rmdirSync(FONTS_FEATHER);
  ok('Dossier fonts/feather/ supprimé (' + deletedFeatherFiles.length + ' fichier(s))');
} else {
  info('Dossier fonts/feather/ absent -- déjà supprimé ou inexistant');
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 7 — Génération des rapports
// ─────────────────────────────────────────────────────────────────────────────

step('Génération des rapports');

fs.mkdirSync(MIGRATION_DIR, { recursive: true });
ok('Répertoire migration/ prêt');

var endTime  = new Date();
var duration = ((endTime - startTime) / 1000).toFixed(1);

// Catégoriser chaque icône Feather
var mappingRows = featherIcons.map(function(name) {
  if (RENAMED[name]) {
    return { status: 'RENOMMEE ', feather: 'fe-' + name, lucide: 'icon-' + RENAMED[name] };
  } else if (lucideIcons.indexOf(name) !== -1) {
    return { status: 'IDENTIQUE', feather: 'fe-' + name, lucide: 'icon-' + name };
  } else {
    return { status: 'SUPPRIMEE', feather: 'fe-' + name, lucide: 'icon-' + FALLBACK_ICON + '  <- fallback' };
  }
});

var identiques        = mappingRows.filter(function(r) { return r.status === 'IDENTIQUE'; });
var renommees         = mappingRows.filter(function(r) { return r.status === 'RENOMMEE '; });
var supprimees        = mappingRows.filter(function(r) { return r.status === 'SUPPRIMEE'; });
var featherAfterNames = featherIcons.map(function(n) { return RENAMED[n] || n; });
var nouvellesLucide   = lucideIcons.filter(function(n) { return featherAfterNames.indexOf(n) === -1; });

// ── Rapport principal ────────────────────────────────────────────────────────

sepR('=');
report.push('RÉSUMÉ');
sepR('=');
report.push('');
report.push('Terminé        : ' + endTime.toLocaleString('fr-FR'));
report.push('Durée totale   : ' + duration + 's');
report.push('Version Lucide : ' + lucideVersion);
report.push('');
report.push('Fichiers modifiés :');
if (dashboardUpdated) {
  report.push('  [OK] dashboard.css');
  report.push('       @font-face Feather supprimé');
  report.push('       Classes .fe-*   supprimées : ' + feClassesBefore);
  report.push('       Classes .icon-* injectées  : ' + feClassesAfter);
  report.push('       Bloc Lucide ajouté en fin de fichier');
  report.push('       Règle signal (font-size: 1.25rem) ajoutée');
}
report.push('  [OK] .gitignore');
if (copiedFonts.length > 0) {
  report.push('  [OK] fonts/lucide/   créé');
  copiedFonts.forEach(function(f) { report.push('       + ' + f); });
}
report.push('Fichiers supprimés :');
report.push('  [OK] dashboard.css.backup');
if (deletedFeatherFiles.length > 0) {
  report.push('  [OK] fonts/feather/');
  deletedFeatherFiles.forEach(function(f) { report.push('       - ' + f); });
}
report.push('');
if (errors.length > 0) {
  sepR();
  report.push('AVERTISSEMENTS');
  sepR();
  errors.forEach(function(e) { report.push('  ! ' + e); });
  report.push('');
}
sepR();
report.push('Généré par migrate-theme-optimized.js -- lucide-static@' + lucideVersion);

fs.writeFileSync(REPORT_PATH, report.join('\n'), 'utf8');
ok('migration/rapport-theme-optimized.txt  créé');

// ── Rapport icônes (table de mapping complète) ───────────────────────────────

var ico = [];

ico.push('================================================================');
ico.push('   TABLE DE MAPPING DES ICÔNES -- Feather -> Lucide');
ico.push('   @gladysassistant/theme-optimized');
ico.push('================================================================');
ico.push('');
ico.push('Date           : ' + endTime.toLocaleString('fr-FR'));
ico.push('Version Lucide : ' + lucideVersion + '   (source : lucide-static)');
ico.push('Icônes Feather : ' + featherIcons.length);
ico.push('Icônes Lucide  : ' + lucideIcons.length);
ico.push('');
ico.push('Légende des statuts :');
ico.push('  [=] IDENTIQUE  -- même nom, seul le préfixe change (.fe- -> .icon-)');
ico.push('  [>] RENOMMEE   -- nom différent dans Lucide');
ico.push('  [?] SUPPRIMEE  -- absente de Lucide, fallback vers icon-' + FALLBACK_ICON);
ico.push('  [+] NOUVELLE   -- ajoutée dans Lucide, sans équivalent Feather');
ico.push('');

// Section A : Table complète icône par icône
ico.push('='.repeat(72));
ico.push('A. TABLE COMPLÈTE -- TOUTES LES ICÔNES FEATHER (avant -> après)');
ico.push('='.repeat(72));
ico.push('');

function padR(s, n) { while (s.length < n) s = s + ' '; return s; }

ico.push(padR('Statut', 14) + padR('Feather (avant)', 32) + 'Lucide (après)');
ico.push('-'.repeat(72));

mappingRows.forEach(function(row) {
  var label = row.status === 'IDENTIQUE' ? '[=] IDENTIQUE'
            : row.status === 'RENOMMEE ' ? '[>] RENOMMEE '
            :                              '[?] SUPPRIMEE';
  ico.push(padR(label, 14) + padR(row.feather, 32) + row.lucide);
});
ico.push('');

// Section B : Récapitulatif
ico.push('='.repeat(72));
ico.push('B. RÉCAPITULATIF (' + mappingRows.length + ' icônes Feather au total)');
ico.push('='.repeat(72));
ico.push('');
ico.push('  [=] Identiques  : ' + identiques.length + '  (préfixe seul change, .fe- -> .icon-)');
ico.push('  [>] Renommées   : ' + renommees.length  + '  (nom différent dans Lucide)');
ico.push('  [?] Supprimées  : ' + supprimees.length + '  (absentes de Lucide -> fallback icon-' + FALLBACK_ICON + ')');
ico.push('  [+] Nouvelles   : ' + nouvellesLucide.length + '  (disponibles dans Lucide, sans équivalent Feather)');
ico.push('');

// Section C : Détail des icônes supprimées
if (supprimees.length > 0) {
  ico.push('='.repeat(72));
  ico.push('C. ICÔNES SUPPRIMÉES EN DÉTAIL (' + supprimees.length + ')');
  ico.push('='.repeat(72));
  ico.push('');
  ico.push("  Ces icônes existaient dans Feather mais sont absentes de Lucide.");
  ico.push("  Elles afficheront icon-" + FALLBACK_ICON + " (point d'interrogation) si utilisées.");
  ico.push('');
  supprimees.forEach(function(row) {
    ico.push('  [?]  .' + row.feather + '  ->  .icon-' + FALLBACK_ICON);
  });
  ico.push('');
}

// Section D : Nouvelles icônes Lucide sans équivalent Feather
ico.push('='.repeat(72));
ico.push('D. NOUVELLES ICÔNES LUCIDE SANS ÉQUIVALENT FEATHER (' + nouvellesLucide.length + ')');
ico.push('='.repeat(72));
ico.push('');
ico.push('  Utilisez-les avec : <i class="icon-NOM"></i>');
ico.push('');

var colW = 0;
nouvellesLucide.forEach(function(n) { var l = ('icon-' + n).length + 3; if (l > colW) colW = l; });

var bufD = '  ';
nouvellesLucide.forEach(function(name, idx) {
  var entry = 'icon-' + name; while (entry.length < colW) entry += ' ';
  bufD += entry;
  if ((idx + 1) % 4 === 0 || idx === nouvellesLucide.length - 1) {
    ico.push(bufD.replace(/\s+$/, '')); bufD = '  ';
  }
});
ico.push('');

// Section E : Catalogue complet Lucide
ico.push('='.repeat(72));
ico.push('E. CATALOGUE COMPLET LUCIDE -- ' + lucideIcons.length + ' icônes disponibles (v' + lucideVersion + ')');
ico.push('='.repeat(72));
ico.push('');
ico.push('  Syntaxe HTML : <i class="icon-NOM"></i>');
ico.push('  Syntaxe JSX  : <i class="icon-NOM" />');
ico.push('  Classe CSS   : .icon-NOM');
ico.push('');

var colW2 = 0;
lucideIcons.forEach(function(n) { var l = ('icon-' + n).length + 3; if (l > colW2) colW2 = l; });

var bufE = '  ';
lucideIcons.forEach(function(name, idx) {
  var entry = 'icon-' + name; while (entry.length < colW2) entry += ' ';
  bufE += entry;
  if ((idx + 1) % 4 === 0 || idx === lucideIcons.length - 1) {
    ico.push(bufE.replace(/\s+$/, '')); bufE = '  ';
  }
});
ico.push('');

ico.push('-'.repeat(72));
ico.push('Généré par migrate-theme-optimized.js -- lucide-static@' + lucideVersion);

fs.writeFileSync(ICONS_PATH, ico.join('\n'), 'utf8');
ok('migration/rapport-icones.txt  créé');

// ─────────────────────────────────────────────────────────────────────────────
// Résumé final affiché à l'écran
// ─────────────────────────────────────────────────────────────────────────────

sep('=');
console.log('   Migration terminée en ' + duration + 's');
console.log('   lucide-static@' + lucideVersion);
console.log('');
console.log('   dashboard.css   : ' + feClassesBefore + ' classes .fe-* -> ' + feClassesAfter + ' classes .icon-*');
console.log('   fonts/lucide/   : ' + copiedFonts.length + ' fichier(s) copiés');
console.log('   .gitignore      : créé/mis à jour');
console.log('');
console.log('   Icônes Feather  : ' + featherIcons.length + ' au total');
console.log('     [=] Identiques  : ' + identiques.length);
console.log('     [>] Renommées   : ' + renommees.length);
console.log('     [?] Supprimées  : ' + supprimees.length + ' -> fallback icon-' + FALLBACK_ICON);
console.log('     [+] Nouvelles Lucide : ' + nouvellesLucide.length);
console.log('');
console.log('   Rapports générés :');
console.log('     -> migration/rapport-theme-optimized.txt');
console.log('     -> migration/rapport-icones.txt');
if (errors.length > 0) {
  console.log('\n   ATTENTION : ' + errors.length + ' avertissement(s) -- voir le rapport');
}
sep('=');
console.log('');
console.log('   Prochaines étapes :');
console.log('   1. Vérifier dashboard.css visuellement');
console.log('   2. Incrémenter la version dans package.json');
console.log('   3. npm publish  (ou tag git)');
console.log('   4. Dans Gladys/front :  npm install ../../theme-optimized');
console.log('');
