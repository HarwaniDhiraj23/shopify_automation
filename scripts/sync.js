const fs = require("fs");
const path = require("path");

const source = process.argv[2];
const targets = process.argv[3].split(",").filter(t => t !== source);

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

        // ✅ Recurse into subdirectories
        if (fs.statSync(fullSrcPath).isDirectory()) {
            syncDir(srcRoot, destRoot, relativePath);
        } else {
            copyFile(srcRoot, destRoot, relativePath);
        }
    });
}

if (!source || !process.argv[3]) {
    console.error("❌ Usage: node sync.js <source-store> <target1,target2>");
    process.exit(1);
}

if (targets.length === 0) {
    console.log("⚠️  No targets to sync.");
    process.exit(0);
}

targets.forEach(target => {
    console.log(`\n🔁 Syncing: ${source} → ${target}`);

    FILES_TO_SYNC.forEach(file =>
        copyFile(`./stores/${source}`, `./stores/${target}`, file)
    );

    DIRS_TO_SYNC.forEach(dir =>
        syncDir(`./stores/${source}`, `./stores/${target}`, dir)
    );

    console.log(`✅ Done: ${source} → ${target}`);
});