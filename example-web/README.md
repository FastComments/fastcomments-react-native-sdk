# fastcomments-react-native-sdk - web example

Runs the SDK in the browser via `react-native-web`.

```bash
npm install
npm run dev      # http://localhost:5173
npm run test     # vitest (web-lane tests)
```

## Component browser (default)

Opening the dev server with no query params loads a **component browser** - a
responsive, light/dark showcase of every drop-in widget, modeled on the
`fastcomments-react` showcase. It is built entirely with React Native primitives
(so it stays mobile/native-portable) and adapts between a desktop rail+stage
layout and a mobile list+detail flow based on viewport width.

- Widgets: **Live Commenting** (with GIF + image pickers, the notification bell,
  and a live sort control), **Live Chat**, and **Social Feed**.
- Every demo authenticates with **Simple SSO** (a plain user object, no signing)
  so the composer posts as a known user and the bell/online-users appear.
- The global light/dark toggle re-themes both the chrome and the live widget.

Source lives under `src/showcase/`. Deep-link a screen with `?screen=live-commenting`
(or `live-chat` / `feed`) and `?theme=dark`.

## Legacy single-widget view

Passing any of `?widget`, `?urlId`, or `?sort` renders a single widget instead of
the browser (used by `screenshot.mjs` and quick manual checks). For example:
`?urlId=native-test&widget=comments&theme=dark`.
