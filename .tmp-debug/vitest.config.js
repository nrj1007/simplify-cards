"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_url_1 = require("node:url");
const config_1 = require("vitest/config");
exports.default = (0, config_1.defineConfig)({
    resolve: {
        alias: {
            "@": (0, node_url_1.fileURLToPath)(new URL(".", import.meta.url))
        }
    },
    test: {
        environment: "node",
        globals: false
    }
});
