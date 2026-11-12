# mine

A `web_fetch` package for [pi](https://github.com/earendil-works/pi) and Key that renders web pages in stealth-patched Chrome and returns their main content as clean markdown.

## Browser service

The browser runs as a rootless Podman container managed by user systemd. Install its Quadlet:

```sh
install -d -m 0700 "$HOME/.config/containers/systemd"
ln -sT "$PWD/mine-browser.container" "$HOME/.config/containers/systemd/mine-browser.container"
systemctl --user daemon-reload
systemctl --user start mine-browser.service
```

This requires Podman 5.0 or newer. The service listens on `ws://127.0.0.1:9222`. Set `MINE_BROWSER_ENDPOINT` to use another endpoint.

To remove it:

```sh
systemctl --user stop mine-browser.service
rm -- "$HOME/.config/containers/systemd/mine-browser.container"
systemctl --user daemon-reload
```

## Install

```sh
pi install git:github.com/resolveworks/mine
```

For a project-local install:

```sh
pi install git:github.com/resolveworks/mine -l
```

## Usage

```
> Fetch the content of https://example.com
```

## Library

The fetch pipeline — connect to the browser server, navigate, extract the
readable content with Defuddle — lives in [`core.ts`](core.ts) and is
importable as `mine/core`:

```ts
import { fetchMarkdown } from "mine/core";

const markdown = await fetchMarkdown("https://example.com", { signal });
```

Options: `endpoint` (default `MINE_BROWSER_ENDPOINT` or
`ws://127.0.0.1:9222`), `connectTimeoutMs` (10s), `navigationTimeoutMs`
(60s), and `signal`. It returns the untruncated markdown; bounding, spilling
to a file, and presentation belong to the caller.

The Pi adapter in [`index.ts`](index.ts) bounds and renders that markdown. The
Key adapter in [`key.ts`](key.ts) exports `Fetch` for a durable registry and
lets durable output bounds handle the result:

```ts
import { Fetch } from "mine/key";
```

## Development

Requires Node.js 22.18 or newer and pnpm 11.3.0.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm format:check
```

`pnpm build` compiles `core.ts`, `index.ts`, and `key.ts` into `dist/` with
declarations; the package exports and Pi manifest load those artifacts.
