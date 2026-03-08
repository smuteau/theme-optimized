#!/bin/bash
# ============================================================
# MIGRATION FEATHER → LUCIDE pour GladysAssistant
# ============================================================
# Usage :
#   cd /Users/stef/CloudStation/github
#   bash theme-optimized/migration/migrate.sh
# ============================================================

set -e

THEME_DIR="$(cd "$(dirname "$0")/.." && pwd)"
GLADYS_DIR="$(cd "$THEME_DIR/../Gladys" 2>/dev/null && pwd || echo "")"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   Migration Feather → Lucide (GladysAssistant)  ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "📁 theme-optimized : $THEME_DIR"
echo "📁 Gladys           : ${GLADYS_DIR:-'⚠️  non trouvé (ce n est pas grave)'}"
echo ""

# ─────────────────────────────────────────────
# ÉTAPE 1 — Installer lucide-static
# ─────────────────────────────────────────────
echo "▶ Étape 1/4 — Installation de lucide-static..."
cd "$THEME_DIR"
npm install lucide-static --save
echo "   ✅ lucide-static installé"

# ─────────────────────────────────────────────
# ÉTAPE 2 — Copier les fichiers de la webfont
# ─────────────────────────────────────────────
echo ""
echo "▶ Étape 2/4 — Copie des fichiers de la webfont Lucide..."
mkdir -p "$THEME_DIR/fonts/lucide"
cp "$THEME_DIR/node_modules/lucide-static/font/lucide.ttf"   "$THEME_DIR/fonts/lucide/"
cp "$THEME_DIR/node_modules/lucide-static/font/lucide.woff"  "$THEME_DIR/fonts/lucide/"
cp "$THEME_DIR/node_modules/lucide-static/font/lucide.woff2" "$THEME_DIR/fonts/lucide/"
cp "$THEME_DIR/node_modules/lucide-static/font/lucide.css"   "$THEME_DIR/fonts/lucide/"
echo "   ✅ Fichiers copiés dans fonts/lucide/"

# ─────────────────────────────────────────────
# ÉTAPE 3 — Mettre à jour dashboard.css
# ─────────────────────────────────────────────
echo ""
echo "▶ Étape 3/4 — Mise à jour de dashboard.css..."
node "$THEME_DIR/migration/patch-dashboard-css.js"
echo "   ✅ dashboard.css mis à jour"

# ─────────────────────────────────────────────
# ÉTAPE 4 — Migrer les icônes dans Gladys
# ─────────────────────────────────────────────
echo ""
echo "▶ Étape 4/4 — Migration des icônes dans le repo Gladys..."
if [ -z "$GLADYS_DIR" ] || [ ! -d "$GLADYS_DIR" ]; then
  echo "   ⚠️  Le repo Gladys n'est pas à côté de theme-optimized."
  echo "   Lancez manuellement :"
  echo "   node $THEME_DIR/migration/migrate-icons.js /chemin/vers/Gladys/front/src"
else
  node "$THEME_DIR/migration/migrate-icons.js" "$GLADYS_DIR/front/src"
  echo "   ✅ Icônes migrées dans $GLADYS_DIR/front/src"
fi

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   ✅ Migration terminée !                        ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "📋 Prochaines étapes :"
echo "   1. Vérifier le rapport : migration/rapport-migration.txt"
echo "   2. Tester visuellement le front Gladys"
echo "   3. Committer les changements"
echo ""
