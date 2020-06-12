const fs = require("fs");
const karma = require("karma");
const yargs = require("yargs");
const gpuZ = require("gpu-z");
const systemInformation = require("systeminformation");

const config = require("./config.js");
const validBrowsers = new Set(["Chrome", "ChromeCanary", "Firefox", "Safari", "Edge", "IE"]);

const Server = karma.Server;
const argv = yargs.argv;
const browser = argv["browser"];
const runtimeCaches = {
    collectorTimer: null,
    currentVideoAssetIndex: 0,
    deviceCurrentLoad: {
        cpu: [],
        gpu: [],
        gve: [], // GPU Video Engine
    },
};

const reports = {
    name: `report_${browser.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.json`,
    browser: browser,
    systemDetails: { cpu: null, gpu: null, os: null },
    deviceLoadDetails: [],
};

if (!validBrowsers.has(browser)) {
    process.exit(1);
}

function generateCollector(interval = 3000) {
    const dcl = runtimeCaches.deviceCurrentLoad;

    dcl.cpu = [];
    dcl.gpu = [];
    dcl.gve = [];

    return {
        start() {
            runtimeCaches.collectorTimer = setInterval(() => {
                const gpuData = gpuZ["getData"]();
                const gpuSensors = gpuData["sensors"];

                if (gpuSensors && gpuSensors["GPU Load"]) dcl.gpu.push(gpuSensors["GPU Load"].value);
                if (gpuSensors && gpuSensors["Video Engine Load"]) dcl.gve.push(gpuSensors["Video Engine Load"].value);

                systemInformation.currentLoad().then((details) => dcl.cpu.push(details.currentload));
            }, interval);
        },
        stop() {
            clearInterval(runtimeCaches.collectorTimer);

            if (dcl.cpu.length >= 3) {
                dcl.cpu.shift();
                dcl.cpu.pop();
            }
            if (dcl.gpu.length >= 3) {
                dcl.gpu.shift();
                dcl.gpu.pop();
            }
            if (dcl.gve.length >= 3) {
                dcl.gve.shift();
                dcl.gve.pop();
            }

            const cpuAvgLoad =
                dcl.cpu.reduce((accumulator, currentValue) => accumulator + currentValue, 0) / dcl.cpu.length;
            const gpuAvgLoad =
                dcl.gpu.reduce((accumulator, currentValue) => accumulator + currentValue, 0) / dcl.gpu.length;
            const gveAvgLoad =
                dcl.gve.reduce((accumulator, currentValue) => accumulator + currentValue, 0) / dcl.gve.length;

            return {
                cpu: { avg: cpuAvgLoad, min: Math.min(...dcl.cpu), max: Math.max(...dcl.cpu) },
                gpu: { avg: gpuAvgLoad, min: Math.min(...dcl.gpu), max: Math.max(...dcl.gpu) },
                gve: { avg: gveAvgLoad, min: Math.min(...dcl.gve), max: Math.max(...dcl.gve) },
            };
        },
    };
}

function startKarmaServer() {
    const videoAsset = config.assets[runtimeCaches.currentVideoAssetIndex++];
    const karmaConfig = {
        customContextFile: "debug.html",
        /**
         * @desc How long will Karma wait for a message from a browser before disconnecting from it (in ms).
         * @desc Set it to long enough because Karma does not receive any message from a browser in this case.
         */
        browserNoActivityTimeout: 24 * 3600 * 1000,
        port: 9876,
        colors: true,
        autoWatch: false,
        browsers: [browser],
        singleRun: true,
        concurrency: 1,
        client: {
            clearContext: false,
            /**
             * @desc Custom data which can be retrieved in debug page.
             */
            attachments: {
                videoAsset: videoAsset,
                /**
                 * @desc Complete testing if video.currentTime > debugEndedTime.
                 */
                debugEndedTime: Infinity,
                debugProgressContent: `${runtimeCaches.currentVideoAssetIndex}/${config.assets.length}`,
            },
        },
    };

    const collector = generateCollector();
    const server = new Server(karmaConfig, function (exitCode) {
        console.log("Karma has exited with " + exitCode);

        if (runtimeCaches.currentVideoAssetIndex < config.assets.length) {
            startKarmaServer();
        }

        // process.exit(exitCode);
    });

    server.on("browser_complete", (browser, result) => {
        const details = collector.stop();

        reports.deviceLoadDetails.push(Object.assign(details, result));
    });

    server.start();
    collector.start();
}

async function getSystemDetails() {
    const gpuData = gpuZ["getData"]();
    const osInfo = await systemInformation.osInfo();
    const cpuInfo = await systemInformation.cpu();

    reports.systemDetails.cpu = `${cpuInfo.manufacturer} ${cpuInfo.brand}`;
    reports.systemDetails.gpu = gpuData["data"]["CardName"];
    reports.systemDetails.os = `${osInfo.distro}(${osInfo.release},${osInfo.arch})`;
}

process.on("exit", () => {
    fs.writeFileSync(reports.name, JSON.stringify(reports, null, 2));
});

getSystemDetails().then(() => {
    startKarmaServer();
});
