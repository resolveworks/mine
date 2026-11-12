import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES, getMarkdownTheme, keyHint, truncateHead, withFileMutationQueue, } from "@earendil-works/pi-coding-agent";
import { Container, Markdown, Spacer, Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";
import { fetchMarkdown } from "./core.js";
function getTruncationNotice(fullOutputPath) {
    return `[Content truncated. Full content saved to: ${fullOutputPath}]`;
}
/** Number of markdown lines shown when the result row is collapsed (ctrl+o to expand). */
const PREVIEW_LINES = 10;
function moreLinesHint(remaining, theme) {
    return (theme.fg("muted", `... (${remaining} more lines,`) +
        " " +
        keyHint("app.tools.expand", "to expand") +
        theme.fg("muted", ")"));
}
export default function (pi) {
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
            const markdown = await fetchMarkdown(url, { signal });
            const truncation = truncateHead(markdown, {
                maxBytes: DEFAULT_MAX_BYTES,
                maxLines: DEFAULT_MAX_LINES,
            });
            const details = {
                truncated: truncation.truncated,
            };
            let output = markdown;
            if (truncation.truncated) {
                const id = randomBytes(8).toString("hex");
                const fullOutputPath = join(tmpdir(), `pi-mine-${id}.md`);
                await withFileMutationQueue(fullOutputPath, () => writeFile(fullOutputPath, markdown, "utf8"));
                details.fullOutputPath = fullOutputPath;
                output = `${truncation.content}\n\n${getTruncationNotice(fullOutputPath)}`;
            }
            return {
                content: [{ type: "text", text: output }],
                details,
            };
        },
        renderResult(result, options, theme, context) {
            const details = result.details;
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
                if (output)
                    container.addChild(new Spacer(1));
                container.addChild(new Text(hint, 0, 0));
            }
            if (warning) {
                if (output || hint)
                    container.addChild(new Spacer(1));
                container.addChild(new Text(warning, 0, 0));
            }
            return container;
        },
    });
}
