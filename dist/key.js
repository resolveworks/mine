import { defineExtension, defineTool } from "@earendil-works/pi-durable";
import { obj, str } from "@earendil-works/pi-schema";
import { fetchMarkdown } from "./core.js";
export const Fetch = defineExtension({
    name: "fetch",
    tools: [
        defineTool({
            name: "web_fetch",
            description: "Fetch a webpage and return its main readable content as clean markdown. Renders pages " +
                "with a stealth-patched Playwright server (patchright driving branded Google Chrome under " +
                "xvfb) to handle JavaScript-rendered pages.",
            parameters: obj({
                url: str({ description: "URL of the webpage to fetch" }),
            }),
            // A read-only render: a rerun after a crash only fetches again.
            replay: "safe",
            execute: async ({ url }, _call, context) => {
                const markdown = await fetchMarkdown(url, { signal: context.abortSignal });
                return { output: [{ type: "text", text: markdown }] };
            },
        }),
    ],
});
