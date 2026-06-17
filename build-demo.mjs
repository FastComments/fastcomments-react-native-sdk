#!/usr/bin/env node
// Builds the canonical static demo for fastcomments-react-native-sdk: the
// example-web component browser (react-native-web via Vite). Output lands at
// <repo-root>/demo-dist/, which the fastcomments-demos aggregator stages as
// dist/react-native/ and the worker serves at /commenting-system-for-react-native.
//
// Vite builds with `--base ./` so the bundle's asset URLs are relative and work
// under that path prefix.
//
// The SDK's `fastcomments-sdk` dep is `file:../fastcomments-sdk-js`, so we make
// that sibling available (clone+compile, or copy from DEMOS_LOCAL_SOURCE_DIR)
// before installing - mirroring how the idcollab tmp demo sources it.
import { execSync } from 'node:child_process';
import { existsSync, rmSync, renameSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const EXAMPLE = resolve(ROOT, 'example-web');
const OUT = resolve(ROOT, 'demo-dist');
const SDK_JS = resolve(ROOT, '..', 'fastcomments-sdk-js');

const sh = (cmd, cwd = ROOT) => {
    console.log('$', cmd, `(${cwd})`);
    execSync(cmd, { stdio: 'inherit', cwd });
};

// 1. Ensure the file: dependency target (fastcomments-sdk-js) is present + built.
if (!existsSync(SDK_JS)) {
    const localSrc = process.env.DEMOS_LOCAL_SOURCE_DIR;
    if (localSrc) {
        sh(`cp -r ${resolve(localSrc, 'fastcomments-sdk-js')} ${SDK_JS}`);
    } else {
        sh(`git clone --depth 1 git@github.com:FastComments/fastcomments-sdk-js.git ${SDK_JS}`);
    }
    sh('npm ci --ignore-scripts', SDK_JS);
    sh('npm run compile', SDK_JS);
}

// 2. Install the SDK (file: sdk packed in via --install-links) + example-web.
//    --legacy-peer-deps mirrors the SDK's own install (react-native peer graph).
sh('npm install --install-links --legacy-peer-deps');
sh('npm install', EXAMPLE);

// 3. Build the component browser with relative asset URLs.
sh('npm run build -- --base=./', EXAMPLE);

// 4. Stage the output where the aggregator expects it.
rmSync(OUT, { recursive: true, force: true });
renameSync(resolve(EXAMPLE, 'dist'), OUT);
console.log('Built fastcomments-react-native-sdk demo at', OUT);
