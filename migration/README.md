# Migration Feather Icons → Lucide Icons

## Contexte

Le projet GladysAssistant utilise Feather Icons via une webfont (dépôt `theme-optimized`).
Feather n'est plus maintenu. Lucide est son successeur actif (fork communautaire).

---

## Structure des scripts

```
migration/
├── migrate.sh              ← Script principal (lance tout)
├── patch-dashboard-css.js  ← Met à jour dashboard.css
├── migrate-icons.js        ← Remplace les classes dans Gladys/front/src
├── icon-mapping.js         ← Table des noms qui ont changé
├── rollback.js             ← Annule la migration si besoin
└── rapport-migration.txt   ← Généré après la migration
```

---

## Utilisation

### Prérequis
- Node.js installé
- Les deux repos côte à côte :
  ```
  github/
  ├── theme-optimized/   ← votre fork
  └── Gladys/            ← votre fork (si migration complète)
  ```

### Lancer la migration complète

```bash
cd /Users/stef/CloudStation/github
bash theme-optimized/migration/migrate.sh
```

### Ou étape par étape

```bash
# Dans theme-optimized/
npm install lucide-static

# Copier la webfont
mkdir -p fonts/lucide
cp node_modules/lucide-static/font/lucide.{ttf,woff,woff2,css} fonts/lucide/

# Mettre à jour dashboard.css
node migration/patch-dashboard-css.js

# Migrer les icônes dans Gladys (adapter le chemin si besoin)
node migration/migrate-icons.js ../Gladys/front/src
```

---

## Rollback (annuler)

```bash
# Annuler les changements dans theme-optimized
node migration/rollback.js

# Annuler les changements dans Gladys/front/src
node migration/rollback.js ../Gladys/front/src
```

---

## Ce qui change

### Syntaxe HTML/JSX

| Avant (Feather)               | Après (Lucide)              |
|-------------------------------|-----------------------------|
| `<i class="fe fe-home">`      | `<i class="icon-home">`     |
| `<i class="fe fe-settings">`  | `<i class="icon-settings">` |
| `<i class="fe fe-user">`      | `<i class="icon-user">`     |

### Noms d'icônes qui ont changé

La grande majorité est identique. Voici les principaux changements :

| Feather             | Lucide              |
|---------------------|---------------------|
| `fe-alert-circle`   | `icon-circle-alert` |
| `fe-alert-triangle` | `icon-triangle-alert`|
| `fe-check-circle`   | `icon-circle-check` |
| `fe-edit`           | `icon-pencil`       |
| `fe-help-circle`    | `icon-circle-help`  |
| `fe-more-horizontal`| `icon-ellipsis`     |
| `fe-more-vertical`  | `icon-ellipsis-vertical`|
| `fe-plus-circle`    | `icon-circle-plus`  |
| `fe-x-circle`       | `icon-circle-x`     |
| `fe-sliders`        | `icon-sliders-horizontal`|
| `fe-tool`           | `icon-wrench`       |

### CSS

Dans `dashboard.css` :
- Suppression du `@font-face` Feather
- Suppression de toutes les classes `.fe` et `.fe-*`
- Injection du CSS Lucide avec les bons chemins

---

## Vérification après migration

1. Lire `migration/rapport-migration.txt` pour voir tous les fichiers modifiés
2. Chercher les cas dynamiques signalés (expressions `fe-${variable}`)
3. Lancer le front Gladys et vérifier visuellement les icônes
4. Rechercher manuellement s'il reste des occurrences :
   ```bash
   grep -r "fe fe-" ../Gladys/front/src --include="*.jsx" --include="*.js"
   ```

---

## Nettoyage final (après validation)

```bash
# Supprimer les fichiers .backup
find . -name "*.backup" -delete
find ../Gladys/front/src -name "*.backup" -delete

# Supprimer l'ancien dossier Feather
rm -rf fonts/feather
```
