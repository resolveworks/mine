# mine

mine is a [pi](https://github.com/earendil-works/pi) extension that adds a `web_fetch` tool: it renders pages in a real (headless-X11) Chrome via Playwright and returns clean markdown via Defuddle. See the README for setup and usage.

Everything lives in `index.ts` — start at the default export.

## Development

Requires Node.js 22.18 or newer and pnpm 11.3.0.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm format:check
```

Use `pnpm format` to apply formatting. Run the typecheck and formatting check before finishing a change; the pre-commit hook enforces both.

## Rendering

Tool results render as markdown with a collapsed 10-line preview; `ctrl+o` expands. Long output is truncated for the model (`truncateHead` limits) with the full content saved to a temp file, shown as a warning line. Keep this presentation consistent with scry, fork, and trace.
