const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const storeConfig = require("../config/stores.json");

const input = process.argv[2];

if (!input) {
    console.error("❌ No store input provided.");
    process.exit(1);
}

// ✅ Resolve which stores to deploy
let storesToDeploy = [];

if (input === "ALL" || input === "ALL_SYNC") {
    storesToDeploy = Object.keys(storeConfig);
} else {
    storesToDeploy = input.split(",").map(s => s.trim()).filter(Boolean);
}

console.log(`\n📋 Stores to deploy: ${storesToDeploy.join(", ")}`);

// ─────────────────────────────────────────────
// SYNC SHARED FILES (source → all other targets)
// ─────────────────────────────────────────────

const FILES_TO_SYNC = [
    "sections/header.liquid",
    "sections/footer.liquid",
    "config/settings_schema.json",
    "config/settings_data.json",
    "layout/theme.liquid"
];

const DIRS_TO_SYNC = [
    "snippets",  // all .liquid files
    "assets",
    "layout",
    "locales",
    "sections",
    "templates"     // ✅ base.css, theme.css, app.js, etc.
];

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
        copyFile(srcRoot, destRoot, path.join(dir, file));
    });
}

function syncBetweenStores(stores) {
    if (stores.length <= 1) {
        console.log("ℹ️  Single store — skipping sync.");
        return;
    }

    const source = stores[0];
    const targets = stores.slice(1);

    console.log(`\n🔁 Syncing shared files: ${source} → ${targets.join(", ")}`);

    targets.forEach(target => {
        console.log(`\n   → ${target}`);

        FILES_TO_SYNC.forEach(file =>
            copyFile(`./stores/${source}`, `./stores/${target}`, file)
        );

        DIRS_TO_SYNC.forEach(dir =>
            syncDir(`./stores/${source}`, `./stores/${target}`, dir)
        );
    });

    console.log("\n✅ Sync complete.");
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

syncBetweenStores(storesToDeploy);

storesToDeploy.forEach(store => deployStore(store));

console.log("\n🎉 All deployments complete!");