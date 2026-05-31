---
name: AvatarPreview component exports and sizing
description: How AvatarPreview is exported and how to control its size
---

`AvatarPreview` has both a named export `{ AvatarPreview }` (used in Studio.tsx) and a default export (used in Chat.tsx, Overlay.tsx).

**Size is controlled by the container div**, not by the component itself. The component always fills `w-full h-full aspect-square`. Wrap it in a sized div: `<div className="w-8 h-8">`.

**Custom parts:** Pass `customPartImages?: Record<string, string>` where key = part `name` value, value = serving URL. The component renders `<image>` SVG elements for custom parts, falls back to built-in SVG paths otherwise.
