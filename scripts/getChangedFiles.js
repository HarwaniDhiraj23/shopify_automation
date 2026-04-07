const { execSync } = require("child_process");

function getChangedFiles() {
    try {
        const output = execSync("git diff --name-only HEAD~1 HEAD")
            .toString()
            .trim();

        const files = output ? output.split("\n").filter(Boolean) : [];

        console.error("📂 Changed Files:", files); // ✅ logs (stderr)

        return files;
    } catch (err) {
        console.error("❌ Error getting changed files:", err.message);
        return [];
    }
}

module.exports = getChangedFiles;