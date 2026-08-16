# mine

A [pi](https://github.com/earendil-works/pi) extension that adds a `web_fetch` tool for fetching web pages as clean markdown. Pages are rendered by [obscura](https://github.com/h4ckf0r0day/obscura), a CDP-compatible headless browser engine written in Rust, driven over the Chrome DevTools Protocol via [Playwright](https://playwright.dev).

## How it works

1. Connects to the obscura CDP server on `ws://127.0.0.1:9222`
2. Opens the target URL and waits for the page's `load` event (JS-heavy SPAs work fine)
3. Extracts the page content and converts it to clean markdown using [Defuddle](https://github.com/kepano/defuddle), which ships site-specific extractors for many popular sites

## Requirements

You need on your system:

- **podman** with a compose provider (`podman-compose`), for the obscura server
- **Node.js** 22.18 or newer and **pnpm** 11.3.0 (development only)

No Chrome, Xvfb, or display server is needed — obscura runs as a container and binds to loopback only.

## Start the obscura server

From the mine checkout (or wherever `compose.yaml` lives):

```bash
podman compose up -d
```

This starts obscura with stealth mode enabled and persistent cookie/localStorage storage in the `obscura-data` volume. Verify it is up:

```bash
curl -s http://127.0.0.1:9222/json/version
```

The endpoint can be overridden with the `MINE_CDP_ENDPOINT` environment variable.

## Install

```bash
pi install git:github.com/resolveworks/mine
```

For project-local install:

```bash
pi install git:github.com/resolveworks/mine -l
```

## Usage

Once installed, the `web_fetch` tool is available to pi:

```
> Fetch the content of https://example.com
```

## Development

Requires Node.js 22.18 or newer and pnpm 11.3.0.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm format:check
```

Use `pnpm format` to apply formatting.
