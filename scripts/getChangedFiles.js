const { execSync } = require("child_process");

function getChangedFiles() {
    try {
        return execSync("git diff --name-only HEAD~1 HEAD")
            .toString()
            .trim()
            .split("\n")
            .filter(Boolean);
    } catch (err) {
        console.error("❌ Error getting changed files:", err.message);
        return [];
    }
}

module.exports = getChangedFiles;