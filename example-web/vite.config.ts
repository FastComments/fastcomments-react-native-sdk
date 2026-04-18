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
    ],
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
      'lodash',
      'fastcomments-typescript',
      'react-quill-new',
      'quill',
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
