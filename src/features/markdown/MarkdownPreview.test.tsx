import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { MarkdownPreview } from "./MarkdownPreview";

vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: vi.fn(),
}));

describe("MarkdownPreview", () => {
  test("marks rendered Markdown content as selectable", () => {
    const markup = renderToStaticMarkup(<MarkdownPreview content="# 花笺\n\n正文" />);

    expect(markup).toContain("markdown-selectable");
    expect(markup).toContain("<h1");
    expect(markup).toContain("花笺");
    expect(markup).toContain("正文");
  });

  test("keeps code block controls outside the horizontally scrollable pre", () => {
    const markup = renderToStaticMarkup(
      <MarkdownPreview content={"```text\nvery long code line\n```"} />,
    );

    const preCloseIndex = markup.indexOf("</pre>");
    const buttonIndex = markup.indexOf("<button");

    expect(markup).toContain("markdown-code-block");
    expect(markup).toContain("markdown-code-scroll");
    expect(preCloseIndex).toBeGreaterThan(-1);
    expect(buttonIndex).toBeGreaterThan(preCloseIndex);
  });

  test("renders LaTeX display math and GFM tables used by PDF export", () => {
    const content =
      "# 研究笔记\n\n$$\n\\mathcal G = \\left\\{(\\boldsymbol\\mu_i, \\boldsymbol\\Sigma_i)\\right\\}_{i=1}^{N}\n$$\n\n| 方法 | 数值 |\n| --- | ---: |\n| A | 1 |";
    const markup = renderToStaticMarkup(<MarkdownPreview content={content} eagerImages />);

    expect(markup).toContain("katex-display");
    expect(markup).toContain("<table");
    expect(markup).not.toContain("katex-error");
  });
});
