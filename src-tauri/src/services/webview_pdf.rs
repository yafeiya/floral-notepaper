use std::path::Path;
use tauri::WebviewWindow;

#[cfg(windows)]
pub async fn export_rendered_page(
    window: WebviewWindow,
    path: &Path,
    page_size: &str,
) -> Result<(), String> {
    use std::os::windows::ffi::OsStrExt;
    use std::time::Duration;
    use webview2_com::Microsoft::Web::WebView2::Win32::{
        ICoreWebView2Environment6, ICoreWebView2_7,
    };
    use webview2_com::PrintToPdfCompletedHandler;
    use windows_core::{Interface, PCWSTR};

    if !path.is_absolute() {
        return Err("PDF path must be absolute".into());
    }
    let wide_path: Vec<u16> = path.as_os_str().encode_wide().chain(Some(0)).collect();
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<Result<(), String>>();
    let page_size = page_size.to_owned();

    window
        .with_webview(move |webview| {
            let result = (|| -> Result<(), String> {
                let core: ICoreWebView2_7 = unsafe { webview.controller().CoreWebView2() }
                    .map_err(|err| err.to_string())?
                    .cast()
                    .map_err(|err| err.to_string())?;
                let environment: ICoreWebView2Environment6 = webview
                    .environment()
                    .cast()
                    .map_err(|err| err.to_string())?;
                let settings =
                    unsafe { environment.CreatePrintSettings() }.map_err(|err| err.to_string())?;
                let (width, height) = if page_size.eq_ignore_ascii_case("us-letter") {
                    (8.5, 11.0)
                } else {
                    (8.27, 11.69)
                };
                unsafe {
                    settings
                        .SetPageWidth(width)
                        .map_err(|err| err.to_string())?;
                    settings
                        .SetPageHeight(height)
                        .map_err(|err| err.to_string())?;
                    settings.SetMarginTop(0.65).map_err(|err| err.to_string())?;
                    settings
                        .SetMarginBottom(0.65)
                        .map_err(|err| err.to_string())?;
                    settings
                        .SetMarginLeft(0.65)
                        .map_err(|err| err.to_string())?;
                    settings
                        .SetMarginRight(0.65)
                        .map_err(|err| err.to_string())?;
                    settings
                        .SetShouldPrintHeaderAndFooter(false.into())
                        .map_err(|err| err.to_string())?;
                    settings
                        .SetShouldPrintBackgrounds(true.into())
                        .map_err(|err| err.to_string())?;
                }

                let completed_tx = tx.clone();
                let handler =
                    PrintToPdfCompletedHandler::create(Box::new(move |status, success| {
                        let result = status.map_err(|err| err.to_string()).and_then(|_| {
                            if success {
                                Ok(())
                            } else {
                                Err("WebView2 did not write the PDF".into())
                            }
                        });
                        let _ = completed_tx.send(result);
                        Ok(())
                    }));
                unsafe { core.PrintToPdf(PCWSTR(wide_path.as_ptr()), &settings, &handler) }
                    .map_err(|err| err.to_string())
            })();
            if let Err(error) = result {
                let _ = tx.send(Err(error));
            }
        })
        .map_err(|err| err.to_string())?;

    tokio::time::timeout(Duration::from_secs(120), rx.recv())
        .await
        .map_err(|_| "Timed out while exporting the PDF".to_string())?
        .ok_or_else(|| "The PDF export was interrupted".to_string())?
}

#[cfg(not(windows))]
pub async fn export_rendered_page(
    _window: WebviewWindow,
    _path: &Path,
    _page_size: &str,
) -> Result<(), String> {
    Err("Rendered PDF export is currently supported on Windows only".into())
}
