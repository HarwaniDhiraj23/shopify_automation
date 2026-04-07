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

        const relativePath = path.join(dir, file);
        const fullSrcPath = path.join(srcRoot, relativePath);

        // ✅ Recurse into subdirectories instead of trying to copy them
        if (fs.statSync(fullSrcPath).isDirectory()) {
            syncDir(srcRoot, destRoot, relativePath);
        } else {
            copyFile(srcRoot, destRoot, relativePath);
        }
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