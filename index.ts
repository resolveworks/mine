import {
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
  truncateHead,
  type ExtensionAPI,
  withFileMutationQueue,
} from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

let browser: import("playwright").Browser | null = null;
let xvfb: ChildProcess | null = null;
let display: string | null = null;

interface WebFetchDetails {
  truncated: boolean;
  length: number;
  fullOutputPath?: string;
}

function getTruncationNotice(fullOutputPath: string): string {
  return `[Content truncated. Full content saved to: ${fullOutputPath}]`;
}

async function startXvfb(): Promise<string> {
  if (process.platform !== "linux") {
    throw new Error(
      "mine requires Linux (uses Xvfb to render Chrome on a virtual display).",
    );
  }
  return new Promise((resolve, reject) => {
    const child = spawn(
      "Xvfb",
      ["-displayfd", "1", "-screen", "0", "1920x1080x24", "-nolisten", "tcp"],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let buf = "";
    const onExit = (code: number | null) =>
      reject(
        new Error(
          `Xvfb exited (${code}) before reporting a display. Install xorg-server-xvfb (Arch) or xvfb (Debian/Ubuntu/Fedora).`,
        ),
      );
    child.once("error", (err) =>
      reject(
        new Error(
          `Failed to spawn Xvfb: ${err.message}. Install xorg-server-xvfb (Arch) or xvfb (Debian/Ubuntu/Fedora).`,
        ),
      ),
    );
    child.once("exit", onExit);
    child.stdout!.on("data", (chunk: Buffer) => {
      buf += chunk.toString();
      const m = buf.match(/(\d+)\s/);
      if (m) {
        child.off("exit", onExit);
        xvfb = child;
        resolve(`:${m[1]}`);
      }
    });
  });
}

async function getBrowser() {
  if (!browser) {
    if (!display) display = await startXvfb();
    const { chromium } = await import("playwright");
    browser = await chromium.launch({
      channel: "chrome",
      headless: false,
      args: [
        "--ozone-platform=x11",
        "--disable-blink-features=AutomationControlled",
      ],
      env: { ...process.env, DISPLAY: display } as NodeJS.ProcessEnv,
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
    if (xvfb) {
      xvfb.kill("SIGTERM");
      xvfb = null;
      display = null;
    }
  });

  pi.registerTool({
    name: "web_fetch",
    label: "Web Fetch",
    description:
      `Fetch a webpage and return its main readable content as clean markdown. Uses a real browser to handle JavaScript-rendered pages. Output is limited to ${DEFAULT_MAX_BYTES / 1024}KB or ${DEFAULT_MAX_LINES} lines (whichever is hit first); full content is saved to a temporary file when truncated.`,
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
        const markdown = result.content;
        const truncation = truncateHead(markdown, {
          maxBytes: DEFAULT_MAX_BYTES,
          maxLines: DEFAULT_MAX_LINES,
        });
        const details: WebFetchDetails = {
          truncated: truncation.truncated,
          length: markdown.length,
        };
        let output = markdown;

        if (truncation.truncated) {
          const tempDir = await mkdtemp(join(tmpdir(), "mine-"));
          const fullOutputPath = join(tempDir, "page.md");
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
      } catch (error: any) {
        throw new Error(
          `Failed to fetch ${url}: ${error.message || String(error)}`,
        );
      } finally {
        signal?.removeEventListener("abort", onAbort);
        await context.close();
      }
    },
    renderResult(result, _options, theme, _context) {
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

      const styledOutput = output
        .split("\n")
        .map((line) => theme.fg("toolOutput", line))
        .join("\n");
      const text = warning
        ? `${styledOutput}${styledOutput ? "\n\n" : ""}${warning}`
        : styledOutput;

      return new Text(text, 0, 0);
    },
  });
}
