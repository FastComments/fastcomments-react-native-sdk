#!/usr/bin/env node
// Builds the canonical static demo for fastcomments-react-native-sdk: the
// example-web component browser (react-native-web via Vite). Output lands at
// <repo-root>/demo-dist/, which the fastcomments-demos aggregator stages as
// dist/react-native/ and the worker serves at /commenting-system-for-react-native.
//
// Vite builds with `--base ./` so the bundle's asset URLs are relative and work
// under that path prefix.
//
// `fastcomments-sdk` is a published dependency, so a plain install pulls it from
// the npm registry - no sibling source checkout needed.
import { execSync } from 'node:child_process';
import { rmSync, renameSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const EXAMPLE = resolve(ROOT, 'example-web');
const OUT = resolve(ROOT, 'demo-dist');

const sh = (cmd, cwd = ROOT) => {
    console.log('$', cmd, `(${cwd})`);
    execSync(cmd, { stdio: 'inherit', cwd });
};

// 1. Install the SDK (from the registry) + example-web. --legacy-peer-deps
//    mirrors the SDK's own install (the react-native peer graph).
sh('npm install --legacy-peer-deps');
sh('npm install', EXAMPLE);

// 2. Build the component browser with relative asset URLs.
sh('npm run build -- --base=./', EXAMPLE);

// 3. Stage the output where the aggregator expects it.
rmSync(OUT, { recursive: true, force: true });
renameSync(resolve(EXAMPLE, 'dist'), OUT);
console.log('Built fastcomments-react-native-sdk demo at', OUT);
