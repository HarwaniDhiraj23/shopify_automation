const { execSync } = require("child_process");
const storeConfig = require("../config/stores.json");
const getChangedFiles = require("./getChangedFiles.js");

// ─────────────────────────────────────────────
// 📌 Get Commit Message
// ─────────────────────────────────────────────
function getCommitMessage() {
    const msg = execSync("git log -1 --pretty=%B").toString().trim();
    console.error("🧾 Commit Message:", msg);
    return msg;
}

// ─────────────────────────────────────────────
// 📌 Extract Stores From Changed Files
// ─────────────────────────────────────────────
function extractStoresFromFiles(files) {
    const stores = new Set();

    files.forEach(file => {
        const match = file.match(/^stores\/([^/]+)/);
        if (match) stores.add(match[1]);
    });

    return Array.from(stores);
}

// ─────────────────────────────────────────────
// 📌 Get Source Store (for ALL_SYNC)
// ─────────────────────────────────────────────
function getSourceStore(files) {
    for (const file of files) {
        const match = file.match(/^stores\/([^/]+)/);
        if (match) return match[1];
    }
    return null;
}

// ─────────────────────────────────────────────
// 🚀 MAIN
// ─────────────────────────────────────────────
function main() {
    const msg = getCommitMessage();
    const files = getChangedFiles();

    console.error("📂 Changed Files:", files);

    // ✅ Only run if stores folder changed
    const hasStoreChanges = files.some(f => f.startsWith("stores/"));

    if (!hasStoreChanges) {
        console.error("⏭️ No changes in /stores folder. Skipping...");
        console.log("SKIP");
        return;
    }

    // ─────────────────────────────────────────
    // ✅ ALL_SYNC
    // ─────────────────────────────────────────
    if (msg.includes("[ALL_SYNC]")) {
        const source = getSourceStore(files);

        console.error("🔁 ALL_SYNC Triggered");
        console.error("📦 Source Store:", source);

        console.log(source ? `ALL_SYNC:${source}` : "ALL");
        return;
    }

    // ─────────────────────────────────────────
    // ✅ Manual Store Selection (EXACT MATCH)
    // ─────────────────────────────────────────
    const match = msg.match(/\[([^\]]+)\]/);

    if (match) {
        const inputStores = match[1]
            .split(",")
            .map(s => s.trim()); // ✅ NO lowercase

        const validStores = Object.keys(storeConfig);

        console.error("🎯 Raw Stores from Commit:", inputStores);
        console.error("📦 Valid Stores:", validStores);

        const filteredStores = inputStores.filter(store => {
            if (!validStores.includes(store)) {
                console.error(`⚠️ Invalid store ignored: ${store}`);
                return false;
            }
            return true;
        });

        if (filteredStores.length === 0) {
            console.error("❌ No valid stores found. Skipping...");
            console.log("SKIP");
            return;
        }

        console.error("✅ Final Stores to Deploy:", filteredStores);

        console.log(filteredStores.join(","));
        return;
    }

    // ─────────────────────────────────────────
    // ✅ Auto Detect
    // ─────────────────────────────────────────
    const stores = extractStoresFromFiles(files);

    console.error("📦 Auto Detected Stores:", stores);

    console.log(stores.length > 0 ? stores.join(",") : "ALL");
}

main();