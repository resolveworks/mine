# mine

A [pi](https://github.com/earendil-works/pi) extension that adds a `web_fetch` tool for fetching web pages as clean markdown. It launches Chrome via [Playwright](https://playwright.dev) on a virtual X display ([Xvfb](https://www.x.org/releases/X11R7.7/doc/man/man1/Xvfb.1.xhtml)).

## How it works

1. Opens the target URL in a headed Chrome instance
2. Waits for the page's `load` event (JS-heavy SPAs work fine)
3. Cookie consent banners are dismissed by [I Still Don't Care About Cookies](https://github.com/OhMyGuus/I-Still-Dont-Care-About-Cookies), force-installed via Chrome enterprise policy (see below)
4. Extracts the page content and converts it to clean markdown using [Defuddle](https://github.com/kepano/defuddle)

## Requirements

mine renders Chrome to a virtual X display so its window never appears on screen. **Linux only.** You need on your system:

- **Google Chrome** — Playwright launches the system Chrome (`channel: "chrome"`). Install from [google.com/chrome](https://www.google.com/chrome/) or via your package manager.
- **Xvfb** — virtual framebuffer X server.

| Distro | Xvfb install |
|---|---|
| Arch | `sudo pacman -S xorg-server-xvfb` |
| Debian/Ubuntu | `sudo apt install xvfb` |
| Fedora/RHEL | `sudo dnf install xorg-x11-server-Xvfb` |

The extension manages the Xvfb process itself — start, display assignment, and shutdown are all automatic.

### One-time: force-install the cookie-banner extension

Drop this JSON into `/etc/opt/chrome/policies/managed/idcac.json` (requires sudo):

```json
{
  "ExtensionInstallForcelist": [
    "edibdbjcniadpccecjdfdjjppcpchdlm"
  ]
}
```

Chrome reads the policy on launch and pulls [I Still Don't Care About Cookies](https://chromewebstore.google.com/detail/i-still-dont-care-about-c/edibdbjcniadpccecjdfdjjppcpchdlm) from the Chrome Web Store. The policy is system-wide, so every Chrome instance on the machine will have the extension active.

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
