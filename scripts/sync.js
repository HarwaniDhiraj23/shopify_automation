const fs = require("fs");
const path = require("path");

const source = process.argv[2];
const targets = process.argv[3].split(",");

// ✅ Only safe, shared files — no wildcards
const FILES_TO_SYNC = [
    "sections/header.liquid",
    "sections/footer.liquid"
];

// ✅ Handles wildcard-style dirs by scanning the folder
const DIRS_TO_SYNC = [
    "snippets" // All .liquid files inside will be synced
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
        if (file.endsWith(".liquid")) {
            copyFile(srcRoot, destRoot, path.join(dir, file));
        }
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