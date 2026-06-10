# UI Tests for fastcomments-react-native-sdk

End-to-end UI tests for the React Native SDK. The suite renders SDK components in
a Node.js environment via `@testing-library/react-native`, hits real FastComments
backend endpoints (creating and deleting tenants per test), and exercises live
behavior by rendering two SDK instances inside a single test process.

## Running

```bash
# from fastcomments-react-native-sdk/
FC_HOST="https://fastcomments.com" \
FC_E2E_API_KEY="your-e2e-key" \
npm run test-ui
```

`FC_E2E_API_KEY` must match a value in the server's `E2E_TEST_KEYS` env list.
Tests will refuse to run if it is unset. **Never commit a real key.**

Optional env vars:

- `FC_WS_HOST` - override the WebSocket host. Default `wss://ws.fastcomments.com`.
- `FC_LOG` - set to `1` for verbose REST/WS logging.
- `FC_TEST_TIMEOUT_MS` - per-test timeout. Default 60000.

## Layout

```
tests-ui/
  framework/
    api/        - REST helpers (tenant signup, SSO, comments, admin)
    harness/    - render helpers, polling, in-process sync coordinator
    mocks/      - jest manual mocks for native-only modules
  specs/        - test scenarios mirroring planning/UI_TESTS_RN.txt
  jest.config.js
  jest.setup.ts
```

## How dual-instance ("live") tests work

For tests that need two clients observing each other (e.g. live new comment,
live vote, presence), we render two `<FastCommentsLiveCommenting>` trees inside
the same Jest process - each with its own SSO token, store, and WebSocket. They
share no in-process state, so the assertion path mirrors what two real devices
would experience: WebSocket events flow A -> server -> B (and vice versa).

## What this suite does NOT cover (and where that coverage lives)

This lane runs react-native in a node process with the platform resolved to
native. Concretely, that means:

- **`.web.tsx` files, react-native-web rendering, and any DOM code never
  execute here.** That class of regression (portal positioning, contenteditable
  sizing, web-only style injection, collapsed-height layout bugs) is covered by
  the web lane: `npm run test-web` (vitest + jsdom in `example-web/tests/`),
  which mounts the SDK through react-native-web with the REAL
  react-native-enriched (tiptap) web editor.
- **`react-native-enriched` is replaced by `framework/mocks/react-native-enriched.tsx`.**
  The mock mirrors the real editor's HTML contract (each typed line arrives as a
  `<p>` block, like the native and web editors emit), so the SDK's
  editor-HTML-to-server normalization is exercised. It does NOT exercise the
  real editor's native views, selection handling, toolbar formatting output, or
  image insertion markup; the web lane mounts the real editor, and native
  editor behavior needs a device/emulator check.
- **jsdom/web layout does not exist in either lane.** Anything that depends on
  real measurement (auto-scroll thresholds, on-screen positioning) is asserted
  structurally, not visually. Verify visually in `example/` (native) or
  `example-web/` (`npm run dev`) when touching those areas.

When you fix a bug this suite should have caught, re-introduce the bug locally
and confirm a spec goes red before calling the fix done (mutation check); add
the missing spec if nothing fails.
