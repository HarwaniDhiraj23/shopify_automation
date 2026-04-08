const fs = require("fs");
const { execSync } = require("child_process");

const source = process.argv[2];
const targetsRaw = process.argv[3];

if (!source || !targetsRaw) {
    console.error("❌ Usage: node sync.js <source-store> <target1,target2>");
    process.exit(1);
}

const targets = targetsRaw.split(",").filter(t => t !== source);

if (targets.length === 0) {
    console.log("⚠️ No targets to sync.");
    process.exit(0);
}

// ─────────────────────────────────────────────
// STEP 1: Generate PATCH from last commit
// ─────────────────────────────────────────────

function generatePatch(sourceStore) {
    try {
        console.log(`\n🧠 Generating patch from ${sourceStore}...`);

        const diff = execSync("git diff HEAD~1 HEAD")
            .toString()
            .split("\n")
            .filter(line =>
                line.includes(`stores/${sourceStore}/`)
            )
            .join("\n");

        if (!diff.trim()) {
            console.log("ℹ️ No changes found for source store.");
            return null;
        }

        fs.writeFileSync("changes.patch", diff);
        console.log("✅ Patch created: changes.patch");

        return "changes.patch";
    } catch (err) {
        console.error("❌ Failed to generate patch:", err.message);
        return null;
    }
}

// ─────────────────────────────────────────────
// STEP 2: Apply PATCH to target stores
// ─────────────────────────────────────────────

function applyPatchToTarget(patchFile, sourceStore, targetStore) {
    try {
        console.log(`\n🔁 Applying patch: ${sourceStore} → ${targetStore}`);

        // Replace source path with target path inside patch
        let patchContent = fs.readFileSync(patchFile, "utf-8");

        patchContent = patchContent.replaceAll(
            `stores/${sourceStore}/`,
            `stores/${targetStore}/`
        );

        const tempPatch = `temp-${targetStore}.patch`;
        fs.writeFileSync(tempPatch, patchContent);

        execSync(`git apply ${tempPatch}`, { stdio: "inherit" });

        fs.unlinkSync(tempPatch);

        console.log(`✅ Patch applied successfully → ${targetStore}`);
        return true;
    } catch (err) {
        console.log(`⚠️ Patch failed for ${targetStore}`);
        return false;
    }
}

// ─────────────────────────────────────────────
// STEP 3: Fallback (file copy if patch fails)
// ─────────────────────────────────────────────

function fallbackCopy(sourceStore, targetStore) {
    console.log(`⚠️ Fallback copy: ${sourceStore} → ${targetStore}`);

    try {
        execSync(
            `cp -r ./stores/${sourceStore}/* ./stores/${targetStore}/`,
            { stdio: "inherit" }
        );
        console.log(`✅ Fallback copy done → ${targetStore}`);
    } catch (err) {
        console.error(`❌ Fallback failed → ${targetStore}`);
    }
}

// ─────────────────────────────────────────────
// RUN
// ─────────────────────────────────────────────

const patchFile = generatePatch(source);

if (!patchFile) {
    console.log("ℹ️ Nothing to sync.");
    process.exit(0);
}

targets.forEach(target => {
    const success = applyPatchToTarget(patchFile, source, target);

    if (!success) {
        fallbackCopy(source, target); // optional (you can disable if you want strict safety)
    }
});

console.log("\n🎉 Patch-based sync complete!");