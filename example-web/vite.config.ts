import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sdkRoot = path.resolve(__dirname, '..');

// React Native uses metro's `require('./image.png')` convention for assets.
// Browsers don't have `require`, so transform those calls into ESM static
// imports that Vite knows how to serve as URL strings.
function transformRequireAssets(): Plugin {
  return {
    name: 'transform-require-png',
    enforce: 'pre',
    transform(code, id) {
      if (!/\.(t|j)sx?$/.test(id)) return null;
      if (!code.includes('require(')) return null;
      let counter = 0;
      const imports: string[] = [];
      const out = code.replace(/require\(\s*(['"])(\.\.?\/[^'"\)]+\.(?:png|jpg|jpeg|gif|webp|svg))\1\s*\)/g, (_m, _q, p) => {
        const name = `__rnwAsset${counter++}`;
        imports.push(`import ${name} from ${JSON.stringify(p)};`);
        // react-native-web's <Image source> accepts `{ uri }` or string.
        return `({uri:${name}})`;
      });
      if (counter === 0) return null;
      return { code: imports.join('\n') + '\n' + out, map: null };
    },
  };
}

// Swap native packages for web equivalents at resolve time. Returning a bare
// specifier (rather than an absolute path) keeps Vite's normal node_module
// resolution + optimizeDeps in play so CJS interop wraps correctly.
function reactNativeWebAlias(): Plugin {
  const map: Record<string, string> = {
    'react-native': 'react-native-web',
  };
  return {
    name: 'react-native-web-alias',
    enforce: 'pre',
    async resolveId(source, importer, opts) {
      if (map[source]) {
        return this.resolve(map[source], importer, { ...opts, skipSelf: true });
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [reactNativeWebAlias(), transformRequireAssets(), react()],
  resolve: {
    alias: [
      { find: /^fastcomments-react-native-sdk$/, replacement: path.join(sdkRoot, 'index.ts') },
      // `react-native-enriched`'s web build (and react-native-render-html) import
      // the bare `react-native` specifier (e.g. `processColor`). The custom
      // `reactNativeWebAlias` plugin handles top-level resolves, but Rollup's
      // commonjs resolver bypasses it for nested dep imports during build, pulling
      // in the real (Flow-typed) react-native and failing to parse. An exact-match
      // alias redirects it to react-native-web everywhere. The `$` anchor avoids
      // catching `react-native-enriched` / `react-native-web` themselves.
      { find: /^react-native$/, replacement: path.dirname(require.resolve('react-native-web/package.json')) },
      // react-native-web's ESM dist imports inline-style-prefixer's CJS `lib/`
      // deep paths (e.g. `inline-style-prefixer/lib/plugins/cursor`). Served raw
      // to the browser, those CJS files expose no ESM `default` export and throw
      // "doesn't provide an export named: 'default'". The package also ships a
      // real ESM build under `es/`; redirect the deep `lib/` paths there.
      { find: /^inline-style-prefixer\/lib\/(.*)$/, replacement: path.join(path.dirname(require.resolve('inline-style-prefixer/package.json')), 'es/$1') },
    ],
    // The demo imports the SDK from source (`../src`), whose files `import 'react'`.
    // Without deduping, that resolves to the SDK root's own React copy while the
    // app uses example-web's React 19 -> two React instances -> "invalid hook
    // call". Force a single copy (example-web's React 19) for the whole graph.
    dedupe: ['react', 'react-dom'],
    extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.json'],
    mainFields: ['module', 'browser', 'main'],
  },
  define: {
    __DEV__: 'true',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    global: 'window',
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' },
      resolveExtensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.json'],
      mainFields: ['module', 'browser', 'main'],
      alias: {
        'react-native': path.dirname(require.resolve('react-native-web/package.json')),
      },
    },
    include: [
      'react-native-web',
      'react-native-web > @react-native/normalize-colors',
      'react-native-web > inline-style-prefixer',
      'react-native-web > fbjs',
      'react-native-web > nullthrows',
      'react-native-web > memoize-one',
      'react-native-web > styleq',
      'react-native-web > postcss-value-parser',
      // react-native-web's ESM dist also imports these CJS *sub-entry* points
      // directly. They aren't reachable from each package's main entry, so the
      // `> pkg` includes above don't cover them, and served raw they expose no
      // ESM named/default export ("doesn't provide an export named ..."). List
      // them so Vite pre-bundles each with CJS->ESM interop.
      'styleq/transform-localize-style',
      'fbjs/lib/invariant',
      'fbjs/lib/warning',
      // react-native-web's renderer imports `{ createRoot }` from this CJS
      // sub-entry; same raw-CJS named-export problem as the deps above.
      'react-dom/client',
      'lodash',
      'fastcomments-typescript',
      'react-native-enriched',
      // The SDK dist is CJS with `export *` re-exports. The published npm dep is
      // auto-pre-bundled, but if you point `fastcomments-sdk` at the local source
      // via a `file:` link (for SDK development) it becomes a symlink that Vite
      // treats as source and serves raw - and served raw, its `export *` names
      // (e.g. `VoteBodyParamsVoteDirEnum` from `/server`) aren't statically
      // detectable ("doesn't provide an export named ..."). Force pre-bundling so
      // esbuild does the CJS->ESM interop and exposes all of them either way.
      'fastcomments-sdk',
      'fastcomments-sdk/server',
    ],
    exclude: ['react-native'],
  },
  server: {
    port: 5173,
    fs: { allow: [sdkRoot] },
    proxy: {
      // SDK uses `apiHost: '/_fc'` in main.tsx; forward to fastcomments.com
      // so the browser doesn't hit CORS in local dev.
      '/_fc': {
        target: 'https://fastcomments.com',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/_fc/, ''),
      },
    },
  },
});
