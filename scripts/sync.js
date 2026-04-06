const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const source = process.argv[2];
const targets = process.argv[3] ? process.argv[3].split(",").filter(t => t !== source) : [];

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

// ✅ Only sync files that are missing or different in target
function getDiffFiles(srcRoot, destRoot) {
    const diffFiles = [];

    WATCHED_DIRS.forEach(dir => {
        const srcDir = path.join(srcRoot, dir);
        if (!fs.existsSync(srcDir)) return;

        const allFiles = getAllFiles(srcDir, srcRoot);

        allFiles.forEach(relativePath => {
            const srcPath = path.join(srcRoot, relativePath);
            const destPath = path.join(destRoot, relativePath);

            if (!fs.existsSync(destPath)) {
                diffFiles.push(relativePath);
                return;
            }

            const srcHash = execSync(`git hash-object "${srcPath}"`).toString().trim();
            const destHash = execSync(`git hash-object "${destPath}"`).toString().trim();

            if (srcHash !== destHash) {
                diffFiles.push(relativePath);
            }
        });
    });

    return diffFiles;
}

targets.forEach(target => {
    const srcRoot = `./stores/${source}`;
    const destRoot = `./stores/${target}`;

    const filesToSync = getDiffFiles(srcRoot, destRoot);

    if (filesToSync.length === 0) {
        console.log(`\n   → ${target}: already up to date ✅`);
        return;
    }

    console.log(`\n🔁 Syncing: ${source} → ${target} (${filesToSync.length} file(s)):`);
    filesToSync.forEach(f => console.log(`   - ${f}`));

    filesToSync.forEach(file =>
        copyFile(srcRoot, destRoot, file)
    );

    console.log(`✅ Done: ${source} → ${target}`);
});