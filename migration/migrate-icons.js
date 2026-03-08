#!/usr/bin/env node
// ============================================================
// migrate-icons.js
// Remplace toutes les occurrences de la classe Feather
//   class="fe fe-{name}"  →  class="icon-{lucide-name}"
// dans les fichiers .jsx, .js, .html, .htm du repo Gladys
// ============================================================
// Usage :
//   node migrate-icons.js /chemin/vers/Gladys/front/src
// ============================================================

const fs = require('fs');
const path = require('path');
const ICON_MAPPING = require('./icon-mapping.js');

// ── Config ───────────────────────────────────────────────────
const TARGET_DIR = process.argv[2] || path.resolve(__dirname, '../../Gladys/front/src');
const EXTENSIONS = ['.jsx', '.js', '.tsx', '.ts', '.html', '.htm'];

// ── Compteurs ────────────────────────────────────────────────
let filesScanned = 0;
let filesModified = 0;
let replacementsTotal = 0;
let unknownIcons = new Set();
const report = [];

// ── Helpers ──────────────────────────────────────────────────

/**
 * Convertit un nom d'icône Feather en nom Lucide
 * ex: "alert-triangle" → "triangle-alert"
 */
function featherToLucide(featherName) {
  if (ICON_MAPPING[featherName] !== undefined) {
    return ICON_MAPPING[featherName];
  }
  // Si pas dans la table, on suppose que le nom est identique (majorité des cas)
  return featherName;
}

/**
 * Remplace dans une chaîne toutes les occurrences Feather → Lucide
 * Gère plusieurs patterns :
 *   "fe fe-home"
 *   'fe fe-home'
 *   {`fe fe-${variable}`}  ← cas dynamique, signalé mais non modifié
 */
function migrateContent(content, filePath) {
  let modified = false;
  let count = 0;

  // Pattern 1 : className="fe fe-{name}" ou class="fe fe-{name}"
  // Remplace la valeur complète de l'attribut class/className
  content = content.replace(
    /(class(?:Name)?=["'])([^"']*\bfe\b[^"']*)["']/g,
    (match, prefix, classValue, offset) => {
      // On extrait et remplace les classes fe-xxx dans la valeur
      const newClassValue = classValue.replace(
        /\bfe\s+fe-([a-z0-9-]+)\b/g,
        (m, iconName) => {
          const lucideName = featherToLucide(iconName);
          if (lucideName !== iconName) {
            report.push(`  RENAMED: fe-${iconName} → icon-${lucideName} (${path.relative(TARGET_DIR, filePath)})`);
          }
          count++;
          replacementsTotal++;
          modified = true;
          return `icon-${lucideName}`;
        }
      );
      // Aussi remplacer si "fe" seul reste (la classe de base)
      const cleanedValue = newClassValue.replace(/\bfe\b\s*/g, '').trim();
      if (cleanedValue !== newClassValue) {
        modified = true;
      }
      const quote = prefix.slice(-1);
      return `${prefix}${cleanedValue}${quote}`;
    }
  );

  // Pattern 2 : les cas où fe et fe-xxx sont dans des expressions template ou concaténations
  // ex: `fe fe-${icon}` — on signale mais on ne modifie pas (trop risqué)
  const dynamicMatches = content.match(/[`'"]fe\s+fe-\$\{[^}]+\}[`'"]/g);
  if (dynamicMatches) {
    dynamicMatches.forEach(m => {
      unknownIcons.add(`DYNAMIC (à migrer manuellement): ${m} dans ${path.relative(TARGET_DIR, filePath)}`);
    });
  }

  // Pattern 3 : strings isolées 'fe fe-xxx' ou "fe fe-xxx" (pas dans class=)
  content = content.replace(
    /(['"`])(fe\s+fe-([a-z0-9-]+))(['"`])/g,
    (match, q1, full, iconName, q2) => {
      if (q1 !== q2) return match; // guillemets non appariés, on skip
      const lucideName = featherToLucide(iconName);
      count++;
      replacementsTotal++;
      modified = true;
      return `${q1}icon-${lucideName}${q2}`;
    }
  );

  return { content, modified, count };
}

/**
 * Parcourt récursivement un répertoire
 */
function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) {
    console.error(`❌ Répertoire introuvable : ${dir}`);
    process.exit(1);
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Ignorer node_modules et .git
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
      walkDir(fullPath, callback);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (EXTENSIONS.includes(ext)) {
        callback(fullPath);
      }
    }
  }
}

// ── Main ─────────────────────────────────────────────────────
console.log(`\n🔍 Scan de : ${TARGET_DIR}\n`);

walkDir(TARGET_DIR, (filePath) => {
  filesScanned++;
  const original = fs.readFileSync(filePath, 'utf8');

  // Vérification rapide avant traitement
  if (!original.includes('fe fe-') && !original.includes('"fe"')) {
    return;
  }

  const { content, modified, count } = migrateContent(original, filePath);

  if (modified) {
    // Sauvegarde .backup
    fs.writeFileSync(filePath + '.backup', original, 'utf8');
    fs.writeFileSync(filePath, content, 'utf8');
    filesModified++;
    console.log(`   ✅ ${path.relative(TARGET_DIR, filePath)} (${count} remplacement(s))`);
    report.push(`MODIFIÉ: ${path.relative(TARGET_DIR, filePath)} — ${count} remplacement(s)`);
  }
});

// ── Rapport ──────────────────────────────────────────────────
const reportLines = [
  '=== RAPPORT DE MIGRATION FEATHER → LUCIDE ===',
  `Date : ${new Date().toISOString()}`,
  `Répertoire analysé : ${TARGET_DIR}`,
  '',
  `Fichiers scannés  : ${filesScanned}`,
  `Fichiers modifiés : ${filesModified}`,
  `Remplacements     : ${replacementsTotal}`,
  '',
  '--- Fichiers modifiés ---',
  ...report,
  '',
];

if (unknownIcons.size > 0) {
  reportLines.push('--- ⚠️  Cas dynamiques à vérifier manuellement ---');
  unknownIcons.forEach(u => reportLines.push('  ' + u));
  reportLines.push('');
}

reportLines.push('=== FIN DU RAPPORT ===');

const reportPath = path.resolve(__dirname, 'rapport-migration.txt');
fs.writeFileSync(reportPath, reportLines.join('\n'), 'utf8');

console.log('\n' + '─'.repeat(50));
console.log(`📊 Résumé :`);
console.log(`   Fichiers scannés  : ${filesScanned}`);
console.log(`   Fichiers modifiés : ${filesModified}`);
console.log(`   Remplacements     : ${replacementsTotal}`);
if (unknownIcons.size > 0) {
  console.log(`\n⚠️  ${unknownIcons.size} cas dynamique(s) à vérifier manuellement`);
}
console.log(`\n📄 Rapport complet : ${reportPath}`);
console.log('─'.repeat(50) + '\n');
