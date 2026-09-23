# 花笺 PDF 分支维护

此仓库的 `main` 以 `Achilng/floral-notepaper` 为上游，保留 PDF 导出功能。Windows 版 PDF 使用与笔记预览相同的 Markdown/KaTeX 渲染，再调用 WebView2 保存；其他平台仍走原有 Typst 路径。不要用上游分支强制覆盖 `main`，也不要再次合入已经包含的 PDF PR。

## 上游更新流程

本地远端应为：`origin` 指向 `yafeiya/floral-notepaper`，`upstream` 指向 `Achilng/floral-notepaper`。

每次更新先建立同步分支，在该分支合并上游并测试，再通过 Pull Request 合入自己的 `main`：

```sh
git fetch upstream main
git switch main
git pull --ff-only origin main
git switch -c sync/upstream-日期
git merge --no-ff upstream/main
npm ci
npm test
npm run lint
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
git push -u origin sync/upstream-日期
```

将 `日期` 换成实际日期。若合并冲突，不要整文件接受上游版本；逐段处理，尤其检查 `MainWindow.tsx`、`MarkdownPreview.tsx`、`src/features/importExport/`、`src/App.css`、`src-tauri/src/lib.rs` 和 `src-tauri/src/services/webview_pdf.rs`。解决冲突后重新运行上述测试。

## 发布前的 PDF 回归

- 在 Windows 上导入一篇包含块级公式、行内公式、表格、图片和长公式的 Markdown；可使用本地的 `测试.md`，但不要将私人笔记提交到仓库。
- 从笔记菜单导出 PDF，确认文件可打开，公式不是 LaTeX 源码，表格和图片存在，首末页完整，页边距和长公式没有裁切。
- 用纯文字笔记再导出一次，确认基础路径不回退。
- 确认非 Windows 平台仍能编译；Typst 后备路径与 Windows 预览导出不是同一实现，不能以 Windows 测试结果代表其他平台。

上游仓库已有 Pull Request 检查工作流，前端测试和 Rust 测试应在合并同步分支前通过；视觉分页仍需人工检查。
