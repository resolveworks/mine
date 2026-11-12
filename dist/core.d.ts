export interface FetchMarkdownOptions {
    /**
     * WebSocket endpoint of the patchright browser server. Defaults to
     * MINE_BROWSER_ENDPOINT or ws://127.0.0.1:9222, resolved per call.
     */
    endpoint?: string;
    /** Connect timeout in milliseconds. Default 10s. */
    connectTimeoutMs?: number;
    /** Navigation timeout in milliseconds. Default 60s. */
    navigationTimeoutMs?: number;
    /** Aborts the navigation and closes the page. */
    signal?: AbortSignal;
}
/**
 * Fetch a URL through the mine browser server and return its main readable
 * content as clean markdown.
 *
 * This is the whole library: no truncation, no temp files, no presentation.
 * Callers bound the result and decide how to show it.
 */
export declare function fetchMarkdown(url: string, options?: FetchMarkdownOptions): Promise<string>;
