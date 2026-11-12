/** Default browser server endpoint (mine-browser.container). */
const DEFAULT_ENDPOINT = "ws://127.0.0.1:9222";
/** Connect timeout; playwright's connect() defaults to 0 (no timeout). */
const CONNECT_TIMEOUT_MS = 10_000;
/** Navigation timeout per fetch. */
const NAVIGATION_TIMEOUT_MS = 60_000;
async function connectBrowser(endpoint, timeoutMs) {
    const { chromium } = await import("playwright-core");
    try {
        return await chromium.connect(endpoint, { timeout: timeoutMs });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Cannot reach the mine browser server at ${endpoint} (${message}). ` +
            "Start it with `systemctl --user start mine-browser.service`.");
    }
}
/**
 * Fetch a URL through the mine browser server and return its main readable
 * content as clean markdown.
 *
 * This is the whole library: no truncation, no temp files, no presentation.
 * Callers bound the result and decide how to show it.
 */
export async function fetchMarkdown(url, options = {}) {
    const endpoint = options.endpoint ?? process.env.MINE_BROWSER_ENDPOINT ?? DEFAULT_ENDPOINT;
    const connectTimeoutMs = options.connectTimeoutMs ?? CONNECT_TIMEOUT_MS;
    const navigationTimeoutMs = options.navigationTimeoutMs ?? NAVIGATION_TIMEOUT_MS;
    const browser = await connectBrowser(endpoint, connectTimeoutMs);
    // Patchright recommends the host display's native viewport for stealth.
    const page = await browser.newPage({ viewport: null });
    // Close page on abort
    const onAbort = () => page.close().catch(() => { });
    options.signal?.addEventListener("abort", onAbort);
    try {
        await page.goto(url, {
            waitUntil: "load",
            timeout: navigationTimeoutMs,
            // Pass the abort signal so cancellation interrupts the navigation itself;
            // closing the page alone does not interrupt a pending goto (see the
            // abort listener above, which covers the post-navigation phases).
            signal: options.signal,
        });
        const html = await page.content();
        const { parseHTML } = await import("linkedom");
        const { Defuddle } = await import("defuddle/node");
        const { document } = parseHTML(html);
        const result = await Defuddle(document, url, { markdown: true });
        return result.content;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to fetch ${url}: ${message}`);
    }
    finally {
        options.signal?.removeEventListener("abort", onAbort);
        await page.close().catch(() => { });
        // Disconnect from the browser server; the server itself keeps running.
        await browser.close().catch(() => { });
    }
}
