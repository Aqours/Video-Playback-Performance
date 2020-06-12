# Video Playback Performance

Windows Platform Only

It might work on other platforms, but we didn't test it.

## Usage

1. Install [Git](https://git-scm.com/)
2. Install [Node.js](https://nodejs.org/en/download/)
3. Install [Node.js native addon build tool](https://github.com/nodejs/node-gyp)
    1. Install python-3.7 on Microsoft Store
    2. Install [Visual Studio 2017+](https://visualstudio.microsoft.com/zh-hans/downloads/) (using the "Desktop development with C++" workload)
    3. Launch cmd, `npm config set msvs_version ${vs_version_placeholder}`
4. Install GPU-Z
5. Run GPU-Z
6. Clone this repository and goto the root directory
7. Add local video details to `config.js`
8. Run `npm install` to install dependencies
9. Run `npm run start` to start local http server
10. Run `npm run test:*` to test video playback performance
11. Check `report_*.json` files
