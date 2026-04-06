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
// SYNC — only files changed in current commit
// ─────────────────────────────────────────────

// These dirs are watched — only changed files inside them get synced
const WATCHED_DIRS = [
    "assets",
    "layout",
    "locales",
    "sections",
    "templates"
];

function copyFile(srcRoot, destRoot, relativePath) {
    const srcPath = path.join(srcRoot, relativePath);
    const destPath = path.join(destRoot, relativePath);

    if (!fs.existsSync(srcPath)) return;

    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
    console.log(`✔  Synced: ${relativePath}`);
}

// ✅ Get ONLY files changed in the current commit, scoped to source store
function getChangedFilesInCommit(storeSource) {
    try {
        const raw = execSync("git diff --name-only HEAD~1 HEAD")
            .toString()
            .trim()
            .split("\n")
            .filter(Boolean);

        // e.g. stores/store-a/assets/base.css → assets/base.css
        const prefix = `stores/${storeSource}/`;
        return raw
            .filter(f => f.startsWith(prefix))
            .map(f => f.replace(prefix, ""));
    } catch {
        console.warn("⚠️  Could not diff commits — no files will be synced.");
        return [];
    }
}

// ✅ Keep only files that live inside WATCHED_DIRS
function filterWatchedChanges(changedFiles) {
    return changedFiles.filter(f =>
        WATCHED_DIRS.some(dir => f.startsWith(dir + "/") || f === dir)
    );
}

function syncBetweenStores(stores) {
    if (stores.length <= 1) {
        console.log("ℹ️  Single store — skipping sync.");
        return;
    }

    const source = stores[0];
    const targets = stores.slice(1);

    // ✅ Build sync list from current commit only
    const changedFiles = getChangedFilesInCommit(source);
    const filesToSync = filterWatchedChanges(changedFiles);

    if (filesToSync.length === 0) {
        console.log("ℹ️  No watched files changed in this commit — skipping sync.");
        return;
    }

    console.log(`\n📝 Files changed in this commit (from ${source}):`);
    filesToSync.forEach(f => console.log(`   - ${f}`));

    console.log(`\n🔁 Syncing to: ${targets.join(", ")}`);

    targets.forEach(target => {
        console.log(`\n   → ${target}`);
        filesToSync.forEach(file =>
            copyFile(`./stores/${source}`, `./stores/${target}`, file)
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