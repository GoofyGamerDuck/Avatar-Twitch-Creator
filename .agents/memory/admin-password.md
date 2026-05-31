---
name: Admin password setup
description: How admin auth is configured for the avatar parts admin page
---

`ADMIN_PASSWORD` is set as a shared env var (via `setEnvVars`) with default value `avatarstudio`.

The admin page at `/admin` uses a password gate that stores the password in `sessionStorage` under key `adminPw`. All admin API calls pass it as `x-admin-password` header.

**Why:** Admin is a developer tool for uploading custom avatar parts, not an end-user feature. A simple shared password is appropriate.

**How to apply:** If the admin page says "wrong password," check that ADMIN_PASSWORD env var is set and the API server has been restarted to pick it up.
