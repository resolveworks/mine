# mine

mine is a [pi](https://github.com/earendil-works/pi) extension that adds a `web_fetch` tool. It renders pages with patchright driving headed Google Chrome under Xvfb in a rootless Podman container, then returns clean markdown via Defuddle. GitHub releases publish the browser image to GHCR, and `mine-browser.container` runs it under user systemd. See the README for setup and usage.

Everything lives in `index.ts` — start at the default export.

## Development

Requires Node.js 22.18 or newer and pnpm 11.3.0.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm format:check
```

Use `pnpm format` to apply formatting. Run the typecheck and formatting check before finishing a change; the pre-commit hook enforces both.

## Version pinning

The patchright run-server rejects clients on Playwright minor-version mismatch. Keep the `Containerfile` base image tag, the `patchright` npm version in the image, and mine's `playwright-core` dependency on the same `major.minor`.

## Rendering

Tool results render as markdown with a collapsed 10-line preview; `ctrl+o` expands. Long output is truncated for the model (`truncateHead` limits) with the full content saved to a temp file, shown as a warning line. Keep this presentation consistent with scry, fork, and trace.
