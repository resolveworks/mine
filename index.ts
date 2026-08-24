import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
  type ExtensionAPI,
  getMarkdownTheme,
  keyHint,
  type Theme,
  truncateHead,
  withFileMutationQueue,
} from "@earendil-works/pi-coding-agent";
import { Container, Markdown, Spacer, Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";

/**
 * WebSocket endpoint of the patchright browser server (mine-browser.container).
 * Override with MINE_BROWSER_ENDPOINT.
 */
const BROWSER_ENDPOINT = process.env.MINE_BROWSER_ENDPOINT ?? "ws://127.0.0.1:9222";

/** Connect timeout; playwright's connect() defaults to 0 (no timeout). */
const CONNECT_TIMEOUT_MS = 10_000;

/**
 * Launch options sent to the server via the `x-playwright-launch-options`
 * header. Branded Chrome headed under Xvfb is patchright's recommended stealth
 * setup. These are server-safe options, so the run-server needs no --unsafe
 * flag.
 */
const LAUNCH_OPTIONS = {
  channel: "chrome",
  chromiumSandbox: true,
  headless: false,
} as const;

/** Navigation timeout per fetch. */
const NAVIGATION_TIMEOUT_MS = 60_000;

interface WebFetchDetails {
  truncated: boolean;
  fullOutputPath?: string;
}

function getTruncationNotice(fullOutputPath: string): string {
  return `[Content truncated. Full content saved to: ${fullOutputPath}]`;
}

/** Number of markdown lines shown when the result row is collapsed (ctrl+o to expand). */
const PREVIEW_LINES = 10;

function moreLinesHint(remaining: number, theme: Theme): string {
  return (
    theme.fg("muted", `... (${remaining} more lines,`) +
    " " +
    keyHint("app.tools.expand", "to expand") +
    theme.fg("muted", ")")
  );
}

/**
 * Connect to the patchright run-server (mine-browser.container). One connection
 * per fetch: the server launches a fresh headed Chrome under Xvfb (patchright's
 * stealth patches apply, since its patched driver launches the browser), and the
 * handshake self-heals if the server was restarted.
 */
async function connectBrowser(): Promise<import("playwright-core").Browser> {
  const { chromium } = await import("playwright-core");
  try {
    return await chromium.connect(BROWSER_ENDPOINT, {
      timeout: CONNECT_TIMEOUT_MS,
      headers: {
        "x-playwright-launch-options": JSON.stringify(LAUNCH_OPTIONS),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Cannot reach the mine browser server at ${BROWSER_ENDPOINT} (${message}). ` +
        "Start it with `systemctl --user start mine-browser.service`.",
    );
  }
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "web_fetch",
    label: "Web Fetch",
    description: `Fetch a webpage and return its main readable content as clean markdown. Renders pages with a stealth-patched Playwright server (patchright driving branded Google Chrome under xvfb) to handle JavaScript-rendered pages. Output is limited to ${DEFAULT_MAX_BYTES / 1024}KB or ${DEFAULT_MAX_LINES} lines (whichever is hit first); full content is saved to a temporary file when truncated.`,
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
      const { url } = params;

      const browser = await connectBrowser();
      // Patchright recommends the host display's native viewport for stealth.
      const page = await browser.newPage({ viewport: null });

      // Close page on abort
      const onAbort = () => page.close().catch(() => {});
      signal?.addEventListener("abort", onAbort);

      try {
        await page.goto(url, {
          waitUntil: "load",
          timeout: NAVIGATION_TIMEOUT_MS,
          // Pass pi's abort signal so Escape cancels the navigation itself;
          // closing the page alone does not interrupt a pending goto (see
          // abort listener above, which covers the post-navigation phases).
          signal,
        });

        const html = await page.content();
        const { parseHTML } = await import("linkedom");
        const { Defuddle } = await import("defuddle/node");

        const { document } = parseHTML(html);
        const result = await Defuddle(document, url, { markdown: true });
        const markdown = result.content;
        const truncation = truncateHead(markdown, {
          maxBytes: DEFAULT_MAX_BYTES,
          maxLines: DEFAULT_MAX_LINES,
        });
        const details: WebFetchDetails = {
          truncated: truncation.truncated,
        };
        let output = markdown;

        if (truncation.truncated) {
          const id = randomBytes(8).toString("hex");
          const fullOutputPath = join(tmpdir(), `pi-mine-${id}.md`);
          await withFileMutationQueue(fullOutputPath, () =>
            writeFile(fullOutputPath, markdown, "utf8"),
          );

          details.fullOutputPath = fullOutputPath;
          output = `${truncation.content}\n\n${getTruncationNotice(fullOutputPath)}`;
        }

        return {
          content: [{ type: "text", text: output }],
          details,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to fetch ${url}: ${message}`);
      } finally {
        signal?.removeEventListener("abort", onAbort);
        await page.close().catch(() => {});
        // Disconnect from the browser server; the server itself keeps running.
        await browser.close().catch(() => {});
      }
    },
    renderResult(result, options, theme, context) {
      const details = result.details as WebFetchDetails | undefined;
      const textContent = result.content.find((item) => item.type === "text");
      let output = textContent?.type === "text" ? textContent.text : "";
      let warning = "";

      if (details?.truncated && details.fullOutputPath) {
        const notice = getTruncationNotice(details.fullOutputPath);
        if (output.endsWith(notice)) {
          output = output.slice(0, -notice.length).trimEnd();
        }
        warning = theme.fg("warning", notice);
      }

      let hint = "";
      if (output && !options.expanded && !options.isPartial && !context.isError) {
        const lines = output.split("\n");
        if (lines.length > PREVIEW_LINES) {
          hint = moreLinesHint(lines.length - PREVIEW_LINES, theme);
          output = lines.slice(0, PREVIEW_LINES).join("\n");
        }
      }

      const container = new Container();
      container.addChild(new Spacer(1));
      if (output) {
        container.addChild(new Markdown(output, 0, 0, getMarkdownTheme()));
      }
      if (hint) {
        if (output) container.addChild(new Spacer(1));
        container.addChild(new Text(hint, 0, 0));
      }
      if (warning) {
        if (output || hint) container.addChild(new Spacer(1));
        container.addChild(new Text(warning, 0, 0));
      }
      return container;
    },
  });
}
