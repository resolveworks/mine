# patchright, branded Chrome, and a virtual display for headed browser sessions.
# Keep the Playwright base, patchright, and playwright-core on the same minor.
FROM mcr.microsoft.com/playwright:v1.62.1-noble

# tini is required for xvfb-run's SIGUSR1 readiness handshake with Xvfb.
RUN apt-get update && apt-get install -y --no-install-recommends tini \
    && rm -rf /var/lib/apt/lists/*
ENTRYPOINT ["/usr/bin/tini", "--"]

RUN npm install -g patchright@1.62.1 \
    && patchright install --with-deps chrome

# Make PDFs download instead of opening in Chrome's built-in viewer.
RUN mkdir -p /etc/opt/chrome/policies/managed && \
    printf '{ "AlwaysOpenPdfExternally": true }\n' \
    > /etc/opt/chrome/policies/managed/pdf.json

# Do not run the browser as root when visiting untrusted pages.
USER pwuser

EXPOSE 9222
CMD ["xvfb-run", "--auto-servernum", "--server-args=-screen 0 1920x1080x24", \
     "patchright", "run-server", "--port", "9222", "--host", "0.0.0.0"]
