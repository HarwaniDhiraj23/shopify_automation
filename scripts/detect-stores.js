const { execSync } = require("child_process");
const storeConfig = require("../config/stores.json");

function getCommitMessage() {
    return execSync("git log -1 --pretty=%B").toString().trim();
}

function getChangedFiles() {
    try {
        return execSync("git diff --name-only HEAD~1 HEAD")
            .toString()
            .trim()
            .split("\n")
            .filter(Boolean);
    } catch {
        return [];
    }
}

function extractStoresFromFiles(files) {
    const stores = new Set();
    files.forEach(file => {
        const match = file.match(/^stores\/([^/]+)/);
        if (match) stores.add(match[1]);
    });
    return Array.from(stores);
}

const SHARED_PATHS = [
    "assets/",
    "snippets/",
    "sections/header.liquid",
    "sections/footer.liquid"
];

function main() {
    const msg = getCommitMessage();

    // ✅ ALL_SYNC keyword → sync + deploy all
    if (msg.includes("[ALL_SYNC]")) {
        console.log("ALL_SYNC");
        return;
    }

    // ✅ Manual store selection → [store-a,store-b]
    const match = msg.match(/\[([^\]]+)\]/);
    if (match) {
        console.log(match[1]);
        return;
    }

    // ✅ Auto detect from changed files
    const files = getChangedFiles();

    // If shared files changed → sync all stores
    const hasSharedChange = files.some(f =>
        SHARED_PATHS.some(shared => f.includes(shared))
    );

    if (hasSharedChange) {
        console.log("ALL_SYNC");
        return;
    }

    const stores = extractStoresFromFiles(files);

    // No store detected → deploy all
    console.log(stores.length > 0 ? stores.join(",") : "ALL");
}

main();