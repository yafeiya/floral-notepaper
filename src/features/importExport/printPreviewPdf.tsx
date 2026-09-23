import { invoke } from "@tauri-apps/api/core";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

interface PrintPreviewOptions {
  content: string;
  pageSize: string;
  fontFamily: string;
  fontSize: number;
  renderHtml: boolean;
  imageBaseDir?: string;
}

async function waitForImages(host: HTMLElement): Promise<void> {
  await Promise.all(
    Array.from(host.querySelectorAll("img")).map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }
          const done = () => {
            image.removeEventListener("load", done);
            image.removeEventListener("error", done);
            resolve();
          };
          image.addEventListener("load", done, { once: true });
          image.addEventListener("error", done, { once: true });
          window.setTimeout(done, 15000);
        }),
    ),
  );
}

function fitDisplayMathToPage(host: HTMLElement): void {
  const availableWidth = host.clientWidth;
  if (availableWidth <= 0) return;

  for (const formula of host.querySelectorAll<HTMLElement>(".katex-display > .katex")) {
    const renderedWidth = formula.scrollWidth;
    if (renderedWidth <= availableWidth) continue;
    const fontSize = Number.parseFloat(window.getComputedStyle(formula).fontSize);
    if (Number.isFinite(fontSize)) {
      formula.style.fontSize = `${fontSize * (availableWidth / renderedWidth) * 0.98}px`;
    }
  }
}

export async function printPreviewPdf(path: string, options: PrintPreviewOptions): Promise<void> {
  const { MarkdownPreview } = await import("../markdown/MarkdownPreview");
  const host = document.createElement("div");
  host.id = "pdf-print-root";
  host.style.fontFamily = options.fontFamily;
  document.body.append(host);
  const root = createRoot(host);

  try {
    flushSync(() => {
      root.render(
        <MarkdownPreview
          content={options.content}
          fontSize={options.fontSize}
          renderHtml={options.renderHtml}
          imageBaseDir={options.imageBaseDir}
          eagerImages
        />,
      );
    });
    await document.fonts.ready;
    await waitForImages(host);
    fitDisplayMathToPage(host);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await invoke("webview_export_pdf", { path, pageSize: options.pageSize });
  } finally {
    root.unmount();
    host.remove();
  }
}
