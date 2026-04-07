const { execSync } = require("child_process");
const getChangedFiles = require("./getChangedFiles.js");

function getCommitMessage() {
    const msg = execSync("git log -1 --pretty=%B").toString().trim();
    console.error("🧾 Commit Message:", msg); // ✅ log
    return msg;
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

    // ✅ If no store folder changes → SKIP
    const hasStoreChanges = files.some(f => f.startsWith("stores/"));

    if (!hasStoreChanges) {
        console.error("⏭️ No store changes detected.");
        console.log("SKIP"); // ✅ ONLY OUTPUT
        return;
    }

    // ✅ ALL_SYNC
    if (msg.includes("[ALL_SYNC]")) {
        const source = getSourceStore(files);
        console.error("🔁 ALL_SYNC triggered. Source:", source);

        console.log(source ? `ALL_SYNC:${source}` : "ALL"); // ✅ ONLY OUTPUT
        return;
    }

    // ✅ Manual store selection
    const match = msg.match(/\[([^\]]+)\]/);
    if (match) {
        console.error("🎯 Manual stores:", match[1]);
        console.log(match[1]); // ✅ ONLY OUTPUT
        return;
    }

    // ✅ Auto detect
    const stores = extractStoresFromFiles(files);

    console.error("📦 Auto detected stores:", stores);

    console.log(stores.length > 0 ? stores.join(",") : "ALL"); // ✅ ONLY OUTPUT
}

main();