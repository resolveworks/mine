import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";

let browser: import("playwright").Browser | null = null;

async function getBrowser() {
  if (!browser) {
    const { chromium } = await import("playwright");
    // Match Playwright MCP stealth config:
    // - channel: 'chrome' uses system Chrome (harder to fingerprint than bundled Chromium)
    // - --disable-blink-features=AutomationControlled prevents navigator.webdriver detection
    browser = await chromium.launch({
      channel: 'chrome',
      headless: false,
      args: ['--disable-blink-features=AutomationControlled'],
    });
  }
  return browser;
}

export default function (pi: ExtensionAPI) {
  pi.on("session_shutdown", async () => {
    if (browser) {
      await browser.close();
      browser = null;
    }
  });

  pi.registerTool({
    name: "web_fetch",
    label: "Web Fetch",
    description:
      "Fetch a webpage and return its main readable content as clean markdown. Uses a real browser to handle JavaScript-rendered pages.",
    promptSnippet: "Fetch and read the content of a web page as clean markdown",
    promptGuidelines: [
      "Use web_fetch when the user asks you to read, fetch, or look up the content of a specific URL.",
    ],
    parameters: Type.Object({
      url: Type.String({ description: "URL of the webpage to fetch" }),
    }),
    renderCall(args, theme, _context) {
      let text = theme.fg("toolTitle", theme.bold("web_fetch "));
      text += theme.fg("accent", args.url);
      return new Text(text, 0, 0);
    },
    async execute(_toolCallId, params, signal, _onUpdate, _ctx) {
      const { url } = params as { url: string };

      const pw = await getBrowser();
      const context = await pw.newContext();
      const page = await context.newPage();

      // Close page on abort
      const onAbort = () => page.close().catch(() => {});
      signal?.addEventListener("abort", onAbort);

      try {
        await page.goto(url, {
          waitUntil: "load",
          timeout: 30000,
        });

        const html = await page.content();
        const { parseHTML } = await import("linkedom");
        const { Defuddle } = await import("defuddle/node");

        const { document } = parseHTML(html);
        const result = await Defuddle(document, url, { markdown: true });

        return {
          content: [{ type: "text", text: result.content }],
          details: {},
        };
      } catch (error: any) {
        throw new Error(
          `Failed to fetch ${url}: ${error.message || String(error)}`,
        );
      } finally {
        signal?.removeEventListener("abort", onAbort);
        await context.close();
      }
    },
  });
}
