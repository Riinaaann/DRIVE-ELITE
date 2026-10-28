---
name: Next.js migration
description: Framework migrations from Vite need a browser-only boundary when legacy client-side routing uses window location during render.
---

The existing Elite Drive UI uses a client-side router and browser storage, so its Next.js App Router entry must disable SSR for the legacy app shell while Next owns the outer route and metadata.

**Why:** Rendering the legacy router on the server caused `location is not defined`; leaving an empty legacy `app/` directory also caused Next to ignore the intended route tree.

**How to apply:** Put App Router files in the directory Next detects for the project, remove competing empty route directories, and use a dynamic `ssr: false` client entry for browser-dependent legacy screens.