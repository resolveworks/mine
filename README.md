# pi-web-fetch

A [pi](https://github.com/earendil-works/pi-coding-agent) extension that adds a `web_fetch` tool for fetching web pages as clean markdown. It launches a real Chromium browser via [Playwright](https://playwright.dev), so JavaScript-rendered pages are fully supported.

## How it works

1. Opens the target URL in a headless Chromium instance
2. Waits for the network to become idle (JS-heavy SPAs work fine)
3. Extracts the page content and converts it to clean markdown using [Defuddle](https://github.com/kepano/defuddle)

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

## License

MIT
