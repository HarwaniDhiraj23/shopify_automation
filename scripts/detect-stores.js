const { execSync } = require("child_process");

function getCommitMessage() {
    return execSync("git log -1 --pretty=%B").toString();
}

function getChangedFiles() {
    try {
        return execSync("git diff --name-only HEAD~1 HEAD")
            .toString()
            .split("\n");
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

function main() {
    const msg = getCommitMessage();

    // 🔥 Sync Mode
    if (msg.includes("[ALL_SYNC]")) {
        console.log("ALL_SYNC");
        return;
    }

    // 🔥 Manual selection
    const match = msg.match(/\[(.*?)\]/);
    if (match) {
        console.log(match[1]);
        return;
    }

    // 🔥 Auto detect
    const files = getChangedFiles();
    const stores = extractStoresFromFiles(files);

    if (stores.length === 0) {
        console.log("ALL");
    } else {
        console.log(stores.join(","));
    }
}

main();