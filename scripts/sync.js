const fs = require("fs");
const path = require("path");

const source = process.argv[2]; // store-a
const targets = process.argv[3].split(",");

// 🔥 Define syncable files ONLY (SAFE)
const FILES_TO_SYNC = [
    "sections/header.liquid",
    "sections/footer.liquid",
    "snippets/*.liquid"
];

function copyFileSafe(srcRoot, destRoot, relativePath) {
    const srcPath = path.join(srcRoot, relativePath);
    const destPath = path.join(destRoot, relativePath);

    if (!fs.existsSync(srcPath)) return;

    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);

    console.log(`✔ Synced ${relativePath}`);
}

targets.forEach(store => {
    if (store === source) return;

    console.log(`🔁 Sync ${source} → ${store}`);

    FILES_TO_SYNC.forEach(file => {
        copyFileSafe(
            `./stores/${source}`,
            `./stores/${store}`,
            file
        );
    });
});