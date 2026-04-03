const { execSync } = require("child_process");
const storeConfig = require("../config/stores.json");

const input = process.argv[2];

let storesToDeploy = [];

if (!input || input === "ALL" || input === "ALL_SYNC") {
    storesToDeploy = Object.keys(storeConfig);
} else {
    storesToDeploy = input.split(",");
}

storesToDeploy.forEach(store => {
    const config = storeConfig[store];

    if (!config) {
        console.log(`❌ Missing config for store: ${store}`);
        return;
    }

    const storeUrl = process.env[config.envStore];
    const token = process.env[config.envToken];
    const themeId = process.env[config.envTheme]; // ✅ Required for CI

    if (!storeUrl || !token || !themeId) {
        console.error(`❌ Missing env vars for store: ${store}`);
        console.error(`   ${config.envStore}=${storeUrl}`);
        console.error(`   ${config.envToken}=${token ? "SET" : "MISSING"}`);
        console.error(`   ${config.envTheme}=${themeId ? "SET" : "MISSING"}`);
        process.exit(1);
    }

    console.log(`🚀 Deploying ${store} → theme ${themeId}`);

    execSync(
        `shopify theme push --path ./stores/${store} --store ${storeUrl} --password ${token} --theme ${themeId} --allow-live`,
        { stdio: "inherit" }
    );
});