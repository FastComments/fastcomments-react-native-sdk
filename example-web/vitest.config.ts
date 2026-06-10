import { defineConfig, mergeConfig } from 'vitest/config';
import path from 'node:path';
import { createRequire } from 'node:module';
import viteConfig from './vite.config';

const require = createRequire(import.meta.url);

// The web test lane mounts the SDK through react-native-web + the real
// react-native-enriched web build in jsdom. The node-based tests-ui suite
// cannot execute any .web.tsx or react-native-web code path; this lane exists
// to catch that class of regression.
export default mergeConfig(viteConfig, defineConfig({
    resolve: {
        alias: [
            // The package's commonjs build native-requires the Flow-typed
            // react-native, which escapes vite's react-native-web alias under
            // vitest (no optimizeDeps there). Its TS source stays in-pipeline.
            {
                find: /^react-native-render-html$/,
                replacement: path.join(path.dirname(require.resolve('react-native-render-html/package.json')), 'src/index.ts'),
            },
            // vite's dedupe does not cover vitest-inlined deps resolved from the
            // SDK root's node_modules (e.g. @tiptap/react); two React copies
            // break every hook. Pin everything to example-web's React 19.
            { find: /^use-sync-external-store\/shim.*$/, replacement: path.resolve(__dirname, 'tests/shims/use-sync-external-store.ts') },
            { find: /^react(\/.*)?$/, replacement: path.dirname(require.resolve('react/package.json')) + '$1' },
            { find: /^react-dom(\/.*)?$/, replacement: path.dirname(require.resolve('react-dom/package.json')) + '$1' },
        ],
    },
    test: {
        environment: 'jsdom',
        include: ['tests/**/*.test.tsx', 'tests/**/*.test.ts'],
        testTimeout: 30000,
        hookTimeout: 30000,
        globals: false,
        // Mirror vite optimizeDeps: these CJS/JSX deps need esbuild interop in
        // vitest's module pipeline too (vitest does not apply optimizeDeps).
        // Inline every non-vitest dep so imports flow through the vite resolve
        // pipeline (react-native -> react-native-web alias). Externalized deps
        // would require() the real Flow-typed react-native and fail to parse.
        server: {
            deps: {
                inline: [/^(?!.*vitest).*$/],
            },
        },
    },
}));
