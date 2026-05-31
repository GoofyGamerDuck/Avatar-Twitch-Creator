---
name: Object storage URL pattern
description: How to convert objectPath from presigned URL response to a serving URL
---

When the frontend requests a presigned upload URL from `/api/storage/uploads/request-url`, the response includes `objectPath` like `/objects/uuid-here`.

To get the serving URL: strip the `/objects/` prefix and prepend `/api/storage/objects/`:

```js
const serveUrl = `/api/storage/objects/${objectPath.replace(/^\/objects\//, '')}`;
```

**Why:** The storage route handler at `/storage/objects/*path` internally prepends `/objects/` back to the wildcard, so the URL must not include it.
