# 🚀 Shopify Multi-Store Git Automation

Manage 15+ Shopify stores from one Git repository with automated deployment, selective store targeting, and cross-store file sync.

---

## 📁 Folder Structure

```
repo/
├── stores/
│   ├── store-a/
│   ├── store-b/
│   ├── store-c/
│
├── config/
│   └── stores.json
│
├── scripts/
│   ├── detect-stores.js
│   ├── deploy.js
│   └── sync.js
│
└── .github/workflows/
    └── deploy.yml
```

---

## ⚙️ 1. Store Config — `config/stores.json`

Add every store here. No script changes needed when adding new stores.

```json
{
    "new-dev-store": {
        "envStore": "SHOPIFY_STORE_NEW_DEV_STORE",
        "envToken": "SHOPIFY_TOKEN_NEW_DEV_STORE",
        "envTheme": "SHOPIFY_THEME_NEW_DEV_STORE"
    },
    "shopify-dev-store": {
        "envStore": "SHOPIFY_STORE_SHOPIFY_DEV_STORE",
        "envToken": "SHOPIFY_TOKEN_SHOPIFY_DEV_STORE",
        "envTheme": "SHOPIFY_THEME_SHOPIFY_DEV_STORE"
    },
    "pixelCart": {
        "envStore": "SHOPIFY_STORE_PIXELCART",
        "envToken": "SHOPIFY_TOKEN_PIXELCART",
        "envTheme": "SHOPIFY_THEME_PIXELCART"
    },
    "devNest": {
        "envStore": "SHOPIFY_STORE_DEVNEST",
        "envToken": "SHOPIFY_TOKEN_DEVNEST",
        "envTheme": "SHOPIFY_THEME_DEVNEST"
    },
    "codeCart-lab": {
        "envStore": "SHOPIFY_STORE_CODECART_LAB",
        "envToken": "SHOPIFY_TOKEN_CODECART_LAB",
        "envTheme": "SHOPIFY_THEME_CODECART_LAB"
    }
}
```

> **Finding your Theme ID:** Shopify Admin → Online Store → Themes → click ⋯ → Edit code → check the URL for the numeric ID.

---

## 🔐 2. GitHub Secrets

Go to **GitHub → Settings → Secrets and variables → Actions** and add 3 secrets per store:

| Secret | Value |
|--------|-------|
| `SHOPIFY_STORE_A` | `store-a.myshopify.com` |
| `SHOPIFY_TOKEN_A` | `shpat_xxxxxxxxxxxx` |
| `SHOPIFY_THEME_A` | `123456789` |

Repeat for every store.

---

## 🧠 3. `scripts/detect-stores.js`

```js
const { execSync } = require("child_process");
const storeConfig = require("../config/stores.json");

function getCommitMessage() {
    return execSync("git log -1 --pretty=%B").toString().trim();
}

function getChangedFiles() {
    try {
        return execSync("git diff --name-only HEAD~1 HEAD")
            .toString()
            .trim()
            .split("\n")
            .filter(Boolean);
    } catch {
        return [];
    }
}

function extractStoresFromFiles(files) {
    const stores = new Set();
    files.forEach(file => {
        const match = file.match(/^stores\/([^/]+)/);
        if (match) stores.add(match[1]);
    });
    return Array.from(stores);
}

const SHARED_PATHS = [
    "assets/",
    "snippets/",
    "sections/header.liquid",
    "sections/footer.liquid"
];

function main() {
    const msg = getCommitMessage();

    // ✅ ALL_SYNC keyword → sync + deploy all
    if (msg.includes("[ALL_SYNC]")) {
        console.log("ALL_SYNC");
        return;
    }

    // ✅ Manual store selection → [store-a,store-b]
    const match = msg.match(/\[([^\]]+)\]/);
    if (match) {
        console.log(match[1]);
        return;
    }

    // ✅ Auto detect from changed files
    const files = getChangedFiles();

    // If shared files changed → sync all stores
    const hasSharedChange = files.some(f =>
        SHARED_PATHS.some(shared => f.includes(shared))
    );

    if (hasSharedChange) {
        console.log("ALL_SYNC");
        return;
    }

    const stores = extractStoresFromFiles(files);

    // No store detected → deploy all
    console.log(stores.length > 0 ? stores.join(",") : "ALL");
}

main();
```

---

## 🔁 4. `scripts/sync.js`

```js
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const source = process.argv[2];
const targetsRaw = process.argv[3];
const specificFilesArg = process.argv[4]; // optional: "assets/base.css,assets/collage.css"

if (!source || !targetsRaw) {
    console.error("❌ Usage: node sync.js <source-store> <target1,target2> [file1,file2]");
    process.exit(1);
}

const targets = targetsRaw.split(",").filter(t => t !== source);

if (targets.length === 0) {
    console.log("⚠️  No targets to sync.");
    process.exit(0);
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function copyFile(srcRoot, destRoot, relativePath) {
    const srcPath = path.join(srcRoot, relativePath);
    const destPath = path.join(destRoot, relativePath);

    if (!fs.existsSync(srcPath)) {
        console.warn(`⚠️  Skipping (not found): ${relativePath}`);
        return;
    }

    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
    console.log(`✔  Synced: ${relativePath}`);
}

function syncDir(srcRoot, destRoot, dir) {
    const srcDir = path.join(srcRoot, dir);
    if (!fs.existsSync(srcDir)) return;

    fs.readdirSync(srcDir).forEach(file => {
        if (file.startsWith(".")) return;

        const relativePath = path.join(dir, file);
        const fullSrcPath = path.join(srcRoot, relativePath);

        if (fs.statSync(fullSrcPath).isDirectory()) {
            syncDir(srcRoot, destRoot, relativePath);
        } else {
            copyFile(srcRoot, destRoot, relativePath);
        }
    });
}

// ─────────────────────────────────────────────
// GIT DIFF — Changed files from source store
// ─────────────────────────────────────────────

function getChangedFilesFromGit(sourceStore) {
    try {
        const allChanged = execSync("git diff --name-only HEAD~1 HEAD")
            .toString()
            .trim()
            .split("\n")
            .filter(Boolean);

        return allChanged
            .filter(f => f.startsWith(`stores/${sourceStore}/`))
            .map(f => f.replace(`stores/${sourceStore}/`, ""));
    } catch {
        return [];
    }
}

// ─────────────────────────────────────────────
// FULL SYNC CONFIG (used only for ALL_SYNC)
// ─────────────────────────────────────────────

const FILES_TO_SYNC = [
    "sections/header.liquid",
    "sections/footer.liquid",
    "config/settings_schema.json",
    "config/settings_data.json",
    "layout/theme.liquid"
];

const DIRS_TO_SYNC = [
    "assets",
    "layout",
    "locales",
    "sections",
    "templates"
];

// ─────────────────────────────────────────────
// RUN SYNC
// ─────────────────────────────────────────────

// Priority: explicit file list → git diff → full sync
let filesToSync = [];
let isFullSync = false;

if (specificFilesArg) {
    // Explicit file list passed (e.g. from workflow)
    filesToSync = specificFilesArg.split(",").map(f => f.trim()).filter(Boolean);
    console.log(`\n📋 Using explicit file list: ${filesToSync.join(", ")}`);
} else {
    // Auto-detect from git diff
    filesToSync = getChangedFilesFromGit(source);

    if (filesToSync.length > 0) {
        console.log(`\n📋 Git-detected changed files: ${filesToSync.join(", ")}`);
    } else {
        // Fallback: full sync (ALL_SYNC scenario)
        isFullSync = true;
        console.log(`\n📋 No git-diff files found — running full sync.`);
    }
}

targets.forEach(target => {
    console.log(`\n🔁 Syncing: ${source} → ${target}`);

    if (isFullSync) {
        FILES_TO_SYNC.forEach(file =>
            copyFile(`./stores/${source}`, `./stores/${target}`, file)
        );
        DIRS_TO_SYNC.forEach(dir =>
            syncDir(`./stores/${source}`, `./stores/${target}`, dir)
        );
    } else {
        filesToSync.forEach(file =>
            copyFile(`./stores/${source}`, `./stores/${target}`, file)
        );
    }

    console.log(`✅ Done: ${source} → ${target}`);
});
```

---

## 🚀 5. `scripts/deploy.js`

```js
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const storeConfig = require("../config/stores.json");

const input = process.argv[2];

if (!input) {
    console.error("❌ No store input provided.");
    process.exit(1);
}

let storesToDeploy = [];

if (input === "ALL" || input === "ALL_SYNC") {
    storesToDeploy = Object.keys(storeConfig);
} else {
    storesToDeploy = input.split(",").map(s => s.trim()).filter(Boolean);
}

console.log(`\n📋 Stores to deploy: ${storesToDeploy.join(", ")}`);

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function copyFile(srcRoot, destRoot, relativePath) {
    const srcPath = path.join(srcRoot, relativePath);
    const destPath = path.join(destRoot, relativePath);

    if (!fs.existsSync(srcPath)) return;

    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
    console.log(`✔  Synced: ${relativePath}`);
}

function syncDir(srcRoot, destRoot, dir) {
    const srcDir = path.join(srcRoot, dir);
    if (!fs.existsSync(srcDir)) return;

    fs.readdirSync(srcDir).forEach(file => {
        if (file.startsWith(".")) return;

        const relativePath = path.join(dir, file);
        const fullSrcPath = path.join(srcRoot, relativePath);

        if (fs.statSync(fullSrcPath).isDirectory()) {
            syncDir(srcRoot, destRoot, relativePath);
        } else {
            copyFile(srcRoot, destRoot, relativePath);
        }
    });
}

// ─────────────────────────────────────────────
// GIT DIFF — Only changed files
// ─────────────────────────────────────────────

function getChangedFiles() {
    try {
        return execSync("git diff --name-only HEAD~1 HEAD")
            .toString()
            .trim()
            .split("\n")
            .filter(Boolean);
    } catch {
        return [];
    }
}

function extractRelativePaths(files, sourceStore) {
    // stores/store-a/assets/base.css  →  assets/base.css
    return files
        .filter(f => f.startsWith(`stores/${sourceStore}/`))
        .map(f => f.replace(`stores/${sourceStore}/`, ""));
}

// ─────────────────────────────────────────────
// SYNC
// ─────────────────────────────────────────────

const FILES_TO_SYNC = [
    "sections/header.liquid",
    "sections/footer.liquid",
    "config/settings_schema.json",
    "config/settings_data.json",
    "layout/theme.liquid"
];

const DIRS_TO_SYNC = [
    "assets",
    "layout",
    "locales",
    "sections",
    "templates"
];

function syncBetweenStores(stores, isAllSync) {
    if (stores.length <= 1) {
        console.log("ℹ️  Single store — skipping sync.");
        return;
    }

    const source = stores[0];
    const targets = stores.slice(1);

    // ALL_SYNC → full directory sync (intentional global update)
    if (isAllSync) {
        console.log(`\n🔁 ALL_SYNC: Full sync from ${source} → ${targets.join(", ")}`);

        targets.forEach(target => {
            console.log(`\n   → ${target}`);

            FILES_TO_SYNC.forEach(file =>
                copyFile(`./stores/${source}`, `./stores/${target}`, file)
            );

            DIRS_TO_SYNC.forEach(dir =>
                syncDir(`./stores/${source}`, `./stores/${target}`, dir)
            );
        });

        console.log("\n✅ Full sync complete.");
        return;
    }

    // Selective sync → only git-changed files from source store
    const changedFiles = getChangedFiles();
    const filesToSync = extractRelativePaths(changedFiles, source);

    if (filesToSync.length === 0) {
        console.log("ℹ️  No changed files detected in source store — skipping sync.");
        return;
    }

    console.log(`\n🔁 Syncing changed files only: ${source} → ${targets.join(", ")}`);
    console.log(`   Files: ${filesToSync.join(", ")}`);

    targets.forEach(target => {
        console.log(`\n   → ${target}`);
        filesToSync.forEach(file =>
            copyFile(`./stores/${source}`, `./stores/${target}`, file)
        );
    });

    console.log("\n✅ Selective sync complete.");
}

// ─────────────────────────────────────────────
// DEPLOY
// ─────────────────────────────────────────────

function deployStore(store) {
    const config = storeConfig[store];

    if (!config) {
        console.error(`❌ No config found for store: "${store}" in stores.json`);
        return;
    }

    const storeUrl = process.env[config.envStore];
    const token = process.env[config.envToken];
    const themeId = process.env[config.envTheme];

    if (!storeUrl || !token || !themeId) {
        console.error(`❌ Missing env vars for: ${store}`);
        console.error(`   ${config.envStore} = ${storeUrl || "MISSING"}`);
        console.error(`   ${config.envToken} = ${token ? "SET" : "MISSING"}`);
        console.error(`   ${config.envTheme} = ${themeId || "MISSING"}`);
        process.exit(1);
    }

    console.log(`\n🚀 Deploying: ${store} → theme ${themeId}`);

    execSync(
        `shopify theme push --path ./stores/${store} --store ${storeUrl} --password ${token} --theme ${themeId} --allow-live`,
        { stdio: "inherit" }
    );

    console.log(`✅ Deployed: ${store}`);
}

// ─────────────────────────────────────────────
// RUN
// ─────────────────────────────────────────────

const isAllSync = input === "ALL_SYNC";
syncBetweenStores(storesToDeploy, isAllSync);
storesToDeploy.forEach(store => deployStore(store));
console.log("\n🎉 All deployments complete!");

// ─────────────────────────────────────────────
// DEPLOY
// ─────────────────────────────────────────────

function deployStore(store) {
    const config = storeConfig[store];

    if (!config) {
        console.error(`❌ No config found for store: "${store}" in stores.json`);
        return;
    }

    const storeUrl = process.env[config.envStore];
    const token = process.env[config.envToken];
    const themeId = process.env[config.envTheme];

    if (!storeUrl || !token || !themeId) {
        console.error(`❌ Missing env vars for: ${store}`);
        console.error(`   ${config.envStore} = ${storeUrl || "MISSING"}`);
        console.error(`   ${config.envToken} = ${token ? "SET" : "MISSING"}`);
        console.error(`   ${config.envTheme} = ${themeId || "MISSING"}`);
        process.exit(1);
    }

    console.log(`\n🚀 Deploying: ${store} → theme ${themeId}`);

    execSync(
        `shopify theme push --path ./stores/${store} --store ${storeUrl} --password ${token} --theme ${themeId} --allow-live`,
        { stdio: "inherit" }
    );

    console.log(`✅ Deployed: ${store}`);
}

// ─────────────────────────────────────────────
// RUN
// ─────────────────────────────────────────────

syncBetweenStores(storesToDeploy);
storesToDeploy.forEach(store => deployStore(store));
console.log("\n🎉 All deployments complete!");
```

---

## ⚙️ 6. `.github/workflows/main.yml`

```yaml
name: Deploy Shopify Stores

on:
  push:
    branches:
      - master
    paths:
      - 'stores/**'   # ✅ only trigger when stores change

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 2  # needed for git diff HEAD~1 HEAD

      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install Shopify CLI
        run: npm install -g @shopify/cli @shopify/theme

      - name: Detect Stores
        id: detect
        run: |
          STORES=$(node scripts/detect-stores.js)
          echo "Detected: $STORES"
          echo "stores=$STORES" >> $GITHUB_OUTPUT

      - name: Sync (ALL_SYNC only)
        if: steps.detect.outputs.stores == 'ALL_SYNC'
        run: |
          ALL=$(node -e "console.log(Object.keys(require('./config/stores.json')).join(','))")
          FIRST=$(node -e "console.log(Object.keys(require('./config/stores.json'))[0])")
          node scripts/sync.js "$FIRST" "$ALL"

      - name: Deploy
        run: node scripts/deploy.js "${{ steps.detect.outputs.stores }}"
        env:
          SHOPIFY_STORE_NEW_DEV_STORE: ${{ secrets.SHOPIFY_STORE_NEW_DEV_STORE }}
          SHOPIFY_TOKEN_NEW_DEV_STORE: ${{ secrets.SHOPIFY_TOKEN_NEW_DEV_STORE }}
          SHOPIFY_THEME_NEW_DEV_STORE: ${{ secrets.SHOPIFY_THEME_NEW_DEV_STORE }}

          SHOPIFY_STORE_SHOPIFY_DEV_STORE: ${{ secrets.SHOPIFY_STORE_SHOPIFY_DEV_STORE }}
          SHOPIFY_TOKEN_SHOPIFY_DEV_STORE: ${{ secrets.SHOPIFY_TOKEN_SHOPIFY_DEV_STORE }}
          SHOPIFY_THEME_SHOPIFY_DEV_STORE: ${{ secrets.SHOPIFY_THEME_SHOPIFY_DEV_STORE }}

          SHOPIFY_STORE_PIXELCART: ${{ secrets.SHOPIFY_STORE_PIXELCART }}
          SHOPIFY_TOKEN_PIXELCART: ${{ secrets.SHOPIFY_TOKEN_PIXELCART }}
          SHOPIFY_THEME_PIXELCART: ${{ secrets.SHOPIFY_THEME_PIXELCART }}

          SHOPIFY_STORE_DEVNEST: ${{ secrets.SHOPIFY_STORE_DEVNEST }}
          SHOPIFY_TOKEN_DEVNEST: ${{ secrets.SHOPIFY_TOKEN_DEVNEST }}
          SHOPIFY_THEME_DEVNEST: ${{ secrets.SHOPIFY_THEME_DEVNEST }}

          SHOPIFY_STORE_CODECART_LAB: ${{ secrets.SHOPIFY_STORE_CODECART_LAB }}
          SHOPIFY_TOKEN_CODECART_LAB: ${{ secrets.SHOPIFY_TOKEN_CODECART_LAB }}
          SHOPIFY_THEME_CODECART_LAB: ${{ secrets.SHOPIFY_THEME_CODECART_LAB }}

          # Add more stores following the same pattern...
```

---

## 💬 7. Commit Message Usage

### Deploy specific stores (with sync between them)
```bash
git commit -m "update base.css [store-a,store-b]"
```
- Syncs `assets/`, `snippets/`, `templates/`, shared sections from `store-a` → `store-b`
- Deploys `store-a` and `store-b`
- Other stores are **not touched**

### Deploy specific stores — 3 or more
```bash
git commit -m "update header [store-a,store-b,store-c]"
```
- Syncs `store-a` → `store-b` and `store-c`
- Deploys all 3

### Deploy one store only (no sync)
```bash
git commit -m "fix checkout [store-b]"
```
- Deploys `store-b` only
- No sync runs (single store)

### Sync shared files + deploy all stores
```bash
git commit -m "global header update [ALL_SYNC]"
```
- Syncs all shared files from first store → all others
- Deploys all stores

### Auto-detect (no tag needed)
```bash
git commit -m "fix bug in store-a product page"
```
- Git diff detects which store folder changed
- Deploys only that store
- If a shared file (`assets/`, `snippets/`) changed → triggers `ALL_SYNC` automatically

---

## 🔧 8. Adding a New Store

1. Pull the theme locally:
```bash
shopify auth login
mkdir -p stores/new-store
cd stores/new-store
shopify theme pull --store new-store.myshopify.com
```

2. Add to `config/stores.json`:
```json
"new-store": {
  "envStore": "SHOPIFY_STORE_NEW",
  "envToken": "SHOPIFY_TOKEN_NEW",
  "envTheme": "SHOPIFY_THEME_NEW"
}
```

3. Add 3 secrets to GitHub:
```
SHOPIFY_STORE_NEW = new-store.myshopify.com
SHOPIFY_TOKEN_NEW = shpat_xxx
SHOPIFY_THEME_NEW = 123456789
```

4. Add env vars to `deploy.yml`:
```yaml
SHOPIFY_STORE_NEW: ${{ secrets.SHOPIFY_STORE_NEW }}
SHOPIFY_TOKEN_NEW: ${{ secrets.SHOPIFY_TOKEN_NEW }}
SHOPIFY_THEME_NEW: ${{ secrets.SHOPIFY_THEME_NEW }}
```

5. Shopify Access Token:
Ensure that the following scopes are enabled for your Shopify access token:
- `write_themes`
- `read_themes`
- `write_theme_code`

6. Shopify Theme ID
To get your Shopify theme ID, run the following command:
```bash
shopify theme list --store your-store.myshopify.com
```

That's it — no script changes needed.

---