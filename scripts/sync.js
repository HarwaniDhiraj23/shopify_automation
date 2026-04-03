const fs = require("fs");
const path = require("path");

const source = process.argv[2];
const targets = process.argv[3].split(",");

// Individual files to sync
const FILES_TO_SYNC = [
    "sections/header.liquid",
    "sections/footer.liquid"
];

// Entire directories to sync (all files inside)
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

    if (!fs.existsSync(srcPath)) {
        console.warn(`⚠️  Skipping (not found): ${relativePath}`);
        return;
    }

    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
    console.log(`✔ Synced: ${relativePath}`);
}

function syncDir(srcRoot, destRoot, dir) {
    const srcDir = path.join(srcRoot, dir);
    if (!fs.existsSync(srcDir)) return;

    fs.readdirSync(srcDir).forEach(file => {
        copyFile(srcRoot, destRoot, path.join(dir, file)); // ✅ all file types
    });
}

targets.forEach(store => {
    if (store === source) return;

    console.log(`\n🔁 Syncing ${source} → ${store}`);

    FILES_TO_SYNC.forEach(file => copyFile(
        `./stores/${source}`,
        `./stores/${store}`,
        file
    ));

    DIRS_TO_SYNC.forEach(dir => syncDir(
        `./stores/${source}`,
        `./stores/${store}`,
        dir
    ));
});