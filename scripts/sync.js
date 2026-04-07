const fs = require("fs");
const path = require("path");
const getChangedFiles = require("./getChangedFiles.js");

const source = process.argv[2];
const targets = process.argv[3]?.split(",").filter(t => t !== source);

if (!source || !process.argv[3]) {
    console.error("❌ Usage: node sync.js <source-store> <targets>");
    process.exit(1);
}

if (targets.length === 0) {
    console.error("⚠️ No targets to sync.");
    process.exit(0);
}

function copyFile(srcRoot, destRoot, relativePath) {
    const srcPath = path.join(srcRoot, relativePath);
    const destPath = path.join(destRoot, relativePath);

    if (!fs.existsSync(srcPath)) {
        console.error(`⚠️ Skipping (not found): ${relativePath}`);
        return;
    }

    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
    console.log(`✔ Synced: ${relativePath}`);
}

// ✅ Only changed files
const changedFiles = getChangedFiles();

const storeFiles = changedFiles.filter(file =>
    file.startsWith(`stores/${source}/`)
);

const relativeFiles = storeFiles.map(file =>
    file.replace(`stores/${source}/`, "")
);

console.error("📂 Files to sync:", relativeFiles);

if (relativeFiles.length === 0) {
    console.error("⚠️ No changed files to sync.");
    process.exit(0);
}

targets.forEach(target => {
    console.log(`\n🔁 Syncing: ${source} → ${target}`);

    relativeFiles.forEach(file => {
        copyFile(`./stores/${source}`, `./stores/${target}`, file);
    });

    console.log(`✅ Done: ${source} → ${target}`);
});