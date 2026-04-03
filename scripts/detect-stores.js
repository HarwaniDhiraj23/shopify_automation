const { execSync } = require("child_process");

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
        // ✅ Fallback: shallow clone only has 1 commit (fetch-depth: 1)
        console.error("⚠️  Could not diff — defaulting to ALL");
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

function main() {
    const msg = getCommitMessage();

    if (msg.includes("[ALL_SYNC]")) {
        console.log("ALL_SYNC");
        return;
    }

    const match = msg.match(/\[([^\]]+)\]/);
    if (match) {
        console.log(match[1]);
        return;
    }

    const files = getChangedFiles();
    const stores = extractStoresFromFiles(files);

    console.log(stores.length > 0 ? stores.join(",") : "ALL");
}

main();