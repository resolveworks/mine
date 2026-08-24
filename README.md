# mine

A [pi](https://github.com/earendil-works/pi) extension that renders web pages in stealth-patched Chrome and returns their main content as clean markdown.

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

## Development

Requires Node.js 22.18 or newer and pnpm 11.3.0.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm format:check
```
