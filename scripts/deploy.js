const { execSync } = require("child_process");
const storeConfig = require("../config/stores.json");

const input = process.argv[2];

if (!input) {
    console.error("❌ No store input provided.");
    process.exit(1);
}

let storesToDeploy = [];

if (input.startsWith("ALL_SYNC")) {
    const source = input.split(":")[1];
    console.log(`🔁 ALL_SYNC deployment. Source: ${source}`);
    storesToDeploy = Object.keys(storeConfig);
} else if (input === "ALL") {
    storesToDeploy = Object.keys(storeConfig);
} else if (input === "SKIP") {
    console.log("⏭️ Skipping deployment.");
    process.exit(0);
} else {
    storesToDeploy = input.split(",").map(s => s.trim()).filter(Boolean);
}

console.log(`📋 Stores to deploy: ${storesToDeploy.join(", ")}`);

function deployStore(store) {
    const config = storeConfig[store];

    if (!config) {
        console.error(`❌ No config for store: ${store}`);
        return;
    }

    const storeUrl = process.env[config.envStore];
    const token = process.env[config.envToken];
    const themeId = process.env[config.envTheme];

    if (!storeUrl || !token || !themeId) {
        console.error(`❌ Missing env for: ${store}`);
        process.exit(1);
    }

    console.log(`🚀 Deploying: ${store}`);

    execSync(
        `shopify theme push --path ./stores/${store} --store ${storeUrl} --password ${token} --theme ${themeId} --allow-live`,
        { stdio: "inherit" }
    );

    console.log(`✅ Deployed: ${store}`);
}

storesToDeploy.forEach(deployStore);

console.log("🎉 Deployment complete!");