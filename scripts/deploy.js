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
// SYNC — diff source vs target on disk
// ─────────────────────────────────────────────

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

// ✅ Recursively get all files in a directory
function getAllFiles(dirPath, baseDir = dirPath, fileList = []) {
    if (!fs.existsSync(dirPath)) return fileList;

    fs.readdirSync(dirPath).forEach(file => {
        if (file.startsWith(".")) return;

        const fullPath = path.join(dirPath, file);
        const relativePath = path.relative(baseDir, fullPath);

        if (fs.statSync(fullPath).isDirectory()) {
            getAllFiles(fullPath, baseDir, fileList);
        } else {
            fileList.push(relativePath);
        }
    });

    return fileList;
}

// ✅ Get files that are different between source and target
// Compares file contents using git hash-object — fast and accurate
function getDiffFiles(srcRoot, destRoot) {
    const diffFiles = [];

    WATCHED_DIRS.forEach(dir => {
        const srcDir = path.join(srcRoot, dir);
        if (!fs.existsSync(srcDir)) return;

        const allFiles = getAllFiles(srcDir, srcRoot);

        allFiles.forEach(relativePath => {
            const srcPath = path.join(srcRoot, relativePath);
            const destPath = path.join(destRoot, relativePath);

            // If file doesn't exist in target → needs sync
            if (!fs.existsSync(destPath)) {
                diffFiles.push(relativePath);
                return;
            }

            // If file content differs → needs sync
            const srcHash = execSync(`git hash-object "${srcPath}"`).toString().trim();
            const destHash = execSync(`git hash-object "${destPath}"`).toString().trim();

            if (srcHash !== destHash) {
                diffFiles.push(relativePath);
            }
        });
    });

    return diffFiles;
}

function syncBetweenStores(stores) {
    if (stores.length <= 1) {
        console.log("ℹ️  Single store — skipping sync.");
        return;
    }

    const source = stores[0];
    const targets = stores.slice(1);
    const srcRoot = `./stores/${source}`;

    console.log(`\n🔁 Syncing: ${source} → ${targets.join(", ")}`);

    targets.forEach(target => {
        const destRoot = `./stores/${target}`;
        const filesToSync = getDiffFiles(srcRoot, destRoot);

        if (filesToSync.length === 0) {
            console.log(`\n   → ${target}: already up to date ✅`);
            return;
        }

        console.log(`\n   → ${target} (${filesToSync.length} file(s) to sync):`);
        filesToSync.forEach(f => console.log(`      - ${f}`));

        filesToSync.forEach(file =>
            copyFile(srcRoot, destRoot, file)
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