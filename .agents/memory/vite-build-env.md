---
name: Imported workspace builds
description: Build-time environment behavior for Vite artifacts in imported pnpm workspaces
---

Vite artifact configs in imported pnpm workspaces may be invoked by the root build without the environment variables that managed workflows inject at runtime. Keep runtime workflow values explicit, but allow production builds to use safe artifact-local defaults.

**Why:** The workspace build is also the publication validation path, so requiring runtime-only variables at config load time can block an otherwise valid public build.

**How to apply:** When adding or importing a Vite artifact, verify both its managed workflow startup and the root `pnpm run build`; do not rely only on workflow-injected `PORT` and `BASE_PATH`.