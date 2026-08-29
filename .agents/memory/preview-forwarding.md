---
name: Vite preview diagnosis
description: Distinguishing a healthy Vite server from a blank Replit preview
---

When a Vite app appears blank in the Replit preview, first separate server health, module delivery, browser runtime errors, and artifact/proxy forwarding. A local HTTP 200 and successful module responses only establish the first two.

**Why:** Imported workspaces can have legacy port workflows alongside artifact metadata, and a stale or unregistered preview can look like a frontend crash even when Vite is ready.

**How to apply:** Check the exact workflow port and bind address, fetch the HTML and referenced modules, inspect browser logs or artifact registration, then restart the correct workflow once before changing application code.