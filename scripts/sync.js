const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const source = process.argv[2];
const targets = process.argv[3] ? process.argv[3].split(",").filter(t => t !== source) : [];

// Watched dirs — only changed files inside these get synced
const WATCHED_DIRS = [
    "assets",
    "layout",
    "locales",
    "sections",
    "templates"
];

if (!source || !process.argv[3]) {
    console.error("❌ Usage: node sync.js <source-store> <target1,target2>");
    process.exit(1);
}

if (targets.length === 0) {
    console.log("⚠️  No targets to sync.");
    process.exit(0);
}

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

// ✅ Get only files changed in the current commit, scoped to source store
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

// ✅ Keep only files inside WATCHED_DIRS
function filterWatchedChanges(changedFiles) {
    return changedFiles.filter(f =>
        WATCHED_DIRS.some(dir => f.startsWith(dir + "/") || f === dir)
    );
}

// ─────────────────────────────────────────────
// RUN
// ─────────────────────────────────────────────

const changedFiles = getChangedFilesInCommit(source);
const filesToSync = filterWatchedChanges(changedFiles);

if (filesToSync.length === 0) {
    console.log("ℹ️  No watched files changed in this commit — nothing to sync.");
    process.exit(0);
}

console.log(`\n📝 Files changed in this commit (from ${source}):`);
filesToSync.forEach(f => console.log(`   - ${f}`));

targets.forEach(target => {
    console.log(`\n🔁 Syncing: ${source} → ${target}`);

    filesToSync.forEach(file =>
        copyFile(`./stores/${source}`, `./stores/${target}`, file)
    );

    console.log(`✅ Done: ${source} → ${target}`);
});