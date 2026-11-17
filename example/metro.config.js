const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const pak = require('../package.json');

const root = path.resolve(__dirname, '..');

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// The SDK is imported from source in the parent folder. Its peer dependencies (react, react-native,
// react-native-enriched) must load from this app's node_modules only, so block the parent's copies.
const peers = Object.keys(pak.peerDependencies);

const config = {
    watchFolders: [root],
    resolver: {
        // TypeScript first: the compiled .js files next to the .tsx sources are stale build output.
        sourceExts: ['tsx', 'ts', 'jsx', 'js', 'json', 'cjs', 'mjs'],
        nodeModulesPaths: [path.join(__dirname, 'node_modules'), path.join(root, 'node_modules')],
        blockList: [
            ...peers.map((name) => new RegExp(`^${escapeRegExp(path.join(root, 'node_modules', name))}\\/.*$`)),
            new RegExp(`^${escapeRegExp(path.join(root, 'example-web'))}\\/.*$`),
            new RegExp(`^${escapeRegExp(path.join(__dirname, 'android'))}\\/.*$`),
            new RegExp(`^${escapeRegExp(path.join(__dirname, 'ios'))}\\/.*$`),
        ],
        extraNodeModules: peers.reduce((acc, name) => {
            acc[name] = path.join(__dirname, 'node_modules', name);
            return acc;
        }, {}),
        // fastcomments-sdk/server also exports the Node-only Secure SSO builder, which requires `crypto`.
        // The SDK never builds SSO payloads on the device, so resolve it to an empty module.
        resolveRequest: (context, moduleName, platform) => {
            if (moduleName === 'crypto') {
                return { type: 'empty' };
            }
            return context.resolveRequest(context, moduleName, platform);
        },
    },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
