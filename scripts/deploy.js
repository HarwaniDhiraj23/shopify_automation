const { execSync } = require("child_process");
const storeConfig = require("../config/stores.json");

const input = process.argv[2];

let storesToDeploy = [];

if (input === "ALL") {
    storesToDeploy = Object.keys(storeConfig);
} else if (input === "ALL_SYNC") {
    storesToDeploy = Object.keys(storeConfig);
} else {
    storesToDeploy = input.split(",");
}

storesToDeploy.forEach(store => {
    const config = storeConfig[store];

    if (!config) {
        console.log(`❌ Missing config for ${store}`);
        return;
    }

    const storeUrl = process.env[config.envStore];
    const token = process.env[config.envToken];

    console.log(`🚀 Deploying ${store}`);

    execSync(
        `shopify theme push --path ./stores/${store} --store ${storeUrl} --password ${token} --allow-live`,
        { stdio: "inherit" }
    );
});