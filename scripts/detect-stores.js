const { execSync } = require("child_process");
const storeConfig = require("../config/stores.json");
const getChangedFiles = require("./getChangedFiles.js");

function getCommitMessage() {
    return execSync("git log -1 --pretty=%B").toString().trim();
}

function extractStoresFromFiles(files) {
    const stores = new Set();
    files.forEach(file => {
        const match = file.match(/^stores\/([^/]+)/);
        if (match) stores.add(match[1]);
    });
    return Array.from(stores);
}

function getSourceStore(files) {
    for (const file of files) {
        const match = file.match(/^stores\/([^/]+)/);
        if (match) return match[1];
    }
    return null;
}

function main() {
    const msg = getCommitMessage();
    const files = getChangedFiles();

    console.log("🧾 Commit Message:", msg);
    console.log("📂 Changed Files:", files);

    // ✅ ALL_SYNC
    if (msg.includes("[ALL_SYNC]")) {
        const source = getSourceStore(files);
        if (!source) {
            console.log("ALL"); // fallback
            return;
        }
        console.log(`ALL_SYNC:${source}`);
        return;
    }

    // ✅ Manual store selection
    const match = msg.match(/\[([^\]]+)\]/);
    if (match) {
        console.log(match[1]);
        return;
    }

    // ✅ Auto detect
    const stores = extractStoresFromFiles(files);

    console.log(stores.length > 0 ? stores.join(",") : "ALL");
}

main();