#!/usr/bin/env node
// ============================================================
// rollback.js
// Restaure tous les fichiers .backup créés par la migration
// ============================================================
// Usage :
//   node migration/rollback.js /chemin/vers/Gladys/front/src
//   node migration/rollback.js  (pour rollback theme-optimized uniquement)
// ============================================================

const fs = require('fs');
const path = require('path');

const TARGET_DIRS = process.argv.slice(2);
if (TARGET_DIRS.length === 0) {
  TARGET_DIRS.push(path.resolve(__dirname, '..'));
}

let restored = 0;

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      walkDir(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.backup')) {
      const originalPath = fullPath.slice(0, -7); // enlève .backup
      fs.copyFileSync(fullPath, originalPath);
      fs.unlinkSync(fullPath);
      restored++;
      console.log(`   ↩️  Restauré : ${path.relative(process.cwd(), originalPath)}`);
    }
  }
}

console.log('\n🔄 Rollback en cours...\n');
TARGET_DIRS.forEach(walkDir);
console.log(`\n✅ ${restored} fichier(s) restauré(s)\n`);
