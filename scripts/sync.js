const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const source = process.argv[2];
const targetsRaw = process.argv[3];
const specificFilesArg = process.argv[4]; // optional: "assets/base.css,assets/collage.css"

if (!source || !targetsRaw) {
    console.error("❌ Usage: node sync.js <source-store> <target1,target2> [file1,file2]");
    process.exit(1);
}

const targets = targetsRaw.split(",").filter(t => t !== source);

if (targets.length === 0) {
    console.log("⚠️  No targets to sync.");
    process.exit(0);
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

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

        if (fs.statSync(fullSrcPath).isDirectory()) {
            syncDir(srcRoot, destRoot, relativePath);
        } else {
            copyFile(srcRoot, destRoot, relativePath);
        }
    });
}

// ─────────────────────────────────────────────
// GIT DIFF — Changed files from source store
// ─────────────────────────────────────────────

function getChangedFilesFromGit(sourceStore) {
    try {
        const allChanged = execSync("git diff --name-only HEAD~1 HEAD")
            .toString()
            .trim()
            .split("\n")
            .filter(Boolean);

        return allChanged
            .filter(f => f.startsWith(`stores/${sourceStore}/`))
            .map(f => f.replace(`stores/${sourceStore}/`, ""));
    } catch {
        return [];
    }
}

// ─────────────────────────────────────────────
// FULL SYNC CONFIG (used only for ALL_SYNC)
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
    "templates"
];

// ─────────────────────────────────────────────
// RUN SYNC
// ─────────────────────────────────────────────

// Priority: explicit file list → git diff → full sync
let filesToSync = [];
let isFullSync = false;

if (specificFilesArg) {
    // Explicit file list passed (e.g. from workflow)
    filesToSync = specificFilesArg.split(",").map(f => f.trim()).filter(Boolean);
    console.log(`\n📋 Using explicit file list: ${filesToSync.join(", ")}`);
} else {
    // Auto-detect from git diff
    filesToSync = getChangedFilesFromGit(source);

    if (filesToSync.length > 0) {
        console.log(`\n📋 Git-detected changed files: ${filesToSync.join(", ")}`);
    } else {
        // Fallback: full sync (ALL_SYNC scenario)
        isFullSync = true;
        console.log(`\n📋 No git-diff files found — running full sync.`);
    }
}

targets.forEach(target => {
    console.log(`\n🔁 Syncing: ${source} → ${target}`);

    if (isFullSync) {
        FILES_TO_SYNC.forEach(file =>
            copyFile(`./stores/${source}`, `./stores/${target}`, file)
        );
        DIRS_TO_SYNC.forEach(dir =>
            syncDir(`./stores/${source}`, `./stores/${target}`, dir)
        );
    } else {
        filesToSync.forEach(file =>
            copyFile(`./stores/${source}`, `./stores/${target}`, file)
        );
    }

    console.log(`✅ Done: ${source} → ${target}`);
});