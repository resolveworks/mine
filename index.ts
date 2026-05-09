import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

let browser: import("playwright").Browser | null = null;

async function getBrowser() {
  if (!browser) {
    const { chromium } = await import("playwright");
    browser = await chromium.launch();
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
    name: "fetch_page",
    label: "Fetch Page",
    description:
      "Fetch a webpage and return its main readable content as clean markdown. Uses a real browser to handle JavaScript-rendered pages.",
    promptSnippet:
      "Fetch and read the content of a web page as clean markdown",
    promptGuidelines: [
      "Use fetch_page when the user asks you to read, fetch, or look up the content of a specific URL.",
    ],
    parameters: Type.Object({
      url: Type.String({ description: "URL of the webpage to fetch" }),
    }),
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
          waitUntil: "networkidle",
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
          `Failed to fetch ${url}: ${error.message || String(error)}`
        );
      } finally {
        signal?.removeEventListener("abort", onAbort);
        await context.close();
      }
    },
  });
}
