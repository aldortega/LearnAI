from html import escape
import re
import unicodedata

from .service import coerce_text

PDF_DEFAULT_FILENAME = "informe.pdf"
PDF_BODY_FONT_SIZE_PX = 12
PDF_REPORT_TITLE_SIZE_PX = 15
PDF_H1_SIZE_PX = 15
PDF_H2_SIZE_PX = 14
PDF_H3_SIZE_PX = 13


class PdfExportError(RuntimeError):
    pass


def build_report_pdf_filename(_title: str) -> str:
    normalized = unicodedata.normalize("NFKD", coerce_text(_title).strip().casefold())
    ascii_text = normalized.encode("ascii", errors="ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_text).strip("-")
    return f"{slug or PDF_DEFAULT_FILENAME.removesuffix('.pdf')}.pdf"


async def build_report_pdf_bytes(title: str, content: str) -> bytes:
    safe_title = coerce_text(title).strip() or "Informe"
    markdown_content = coerce_text(content).strip() or "Informe sin contenido."
    markdown_content = _strip_duplicate_leading_heading(markdown_content, safe_title)
    document_html = _build_report_html(safe_title, markdown_content)

    try:
        from playwright.async_api import Error as PlaywrightError
        from playwright.async_api import async_playwright
    except Exception as exc:
        raise PdfExportError(
            "La exportacion PDF requiere 'playwright'. Instala dependencias del backend."
        ) from exc

    try:
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(
                args=["--no-sandbox", "--disable-setuid-sandbox"]
            )
            context = await browser.new_context(locale="es-ES")
            page = await context.new_page()
            await page.set_content(document_html, wait_until="networkidle")
            pdf_bytes = await page.pdf(
                format="A4",
                print_background=True,
                margin={
                    "top": "20mm",
                    "right": "14mm",
                    "bottom": "22mm",
                    "left": "14mm",
                },
                display_header_footer=True,
                header_template="<div></div>",
                footer_template=(
                    '<div style="width:100%;font-size:9px;color:#6b7280;'
                    'padding:0 18mm;text-align:right;">'
                    '<span class="pageNumber"></span> / '
                    '<span class="totalPages"></span>'
                    "</div>"
                ),
            )
            await context.close()
            await browser.close()
            return pdf_bytes
    except PlaywrightError as exc:
        raise PdfExportError(
            "No se pudo generar el PDF. Verifica Chromium con: playwright install chromium."
        ) from exc


def _build_report_html(title: str, markdown_content: str) -> str:
    try:
        from markdown_it import MarkdownIt
    except Exception as exc:
        raise PdfExportError(
            "La exportacion PDF requiere 'markdown-it-py'. Instala dependencias del backend."
        ) from exc

    md = (
        MarkdownIt(
            "commonmark",
            {"html": False, "linkify": True, "typographer": True},
        )
        .enable("table")
        .enable("strikethrough")
    )
    content_html = md.render(markdown_content)
    safe_title = escape(title)

    return f"""
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{safe_title}</title>
    <style>
      :root {{
        color-scheme: light;
      }}

      * {{
        box-sizing: border-box;
      }}

      body {{
        margin: 0;
        font-family: "Inter", "Segoe UI", Arial, sans-serif;
        color: #111827;
        background: #ffffff;
        font-size: {PDF_BODY_FONT_SIZE_PX}px;
        line-height: 1.6;
      }}

      .report {{
        max-width: 760px;
        margin: 0 auto;
      }}

      .report-title {{
        margin: 0 0 18px 0;
        font-size: {PDF_REPORT_TITLE_SIZE_PX}px;
        line-height: 1.2;
        font-weight: 700;
        color: #0f172a;
      }}

      .content h1, .content h2, .content h3 {{
        font-weight: 700;
        line-height: 1.25;
        color: #0f172a;
      }}

      .content h1 {{
        font-size: {PDF_H1_SIZE_PX}px;
        margin: 20px 0 10px;
      }}

      .content h2 {{
        font-size: {PDF_H2_SIZE_PX}px;
        margin: 18px 0 10px;
      }}

      .content h3 {{
        font-size: {PDF_H3_SIZE_PX}px;
        margin: 16px 0 8px;
      }}

      .content p {{
        margin: 10px 0;
      }}

      .content ul, .content ol {{
        margin: 10px 0;
        padding-left: 22px;
      }}

      .content li {{
        margin: 5px 0;
      }}

      .content blockquote {{
        margin: 14px 0;
        padding: 8px 12px;
        border-left: 4px solid #d1d5db;
        color: #374151;
        background: #f9fafb;
      }}

      .content pre {{
        margin: 14px 0;
        padding: 12px;
        background: #111827;
        color: #f9fafb;
        border-radius: 8px;
        white-space: pre-wrap;
        word-break: break-word;
        font-family: "Fira Code", "Consolas", "Courier New", monospace;
        font-size: 12px;
        line-height: 1.45;
      }}

      .content code {{
        font-family: "Fira Code", "Consolas", "Courier New", monospace;
        font-size: 0.92em;
        background: #f3f4f6;
        padding: 1px 4px;
        border-radius: 4px;
      }}

      .content pre code {{
        background: transparent;
        padding: 0;
      }}

      .content table {{
        width: 100%;
        border-collapse: collapse;
        margin: 14px 0;
        font-size: 12px;
      }}

      .content th,
      .content td {{
        border: 1px solid #d1d5db;
        text-align: left;
        padding: 8px;
        vertical-align: top;
      }}

      .content th {{
        background: #f3f4f6;
        font-weight: 600;
      }}

      .content a {{
        color: #0f766e;
        text-decoration: underline;
      }}

      .content img {{
        max-width: 100%;
        height: auto;
      }}
    </style>
  </head>
  <body>
    <main class="report">
      <h1 class="report-title">{safe_title}</h1>
      <article class="content">{content_html}</article>
    </main>
  </body>
</html>
"""


def _strip_duplicate_leading_heading(markdown_content: str, report_title: str) -> str:
    lines = markdown_content.splitlines()
    first_non_empty_index = None
    for index, line in enumerate(lines):
        if line.strip():
            first_non_empty_index = index
            break

    if first_non_empty_index is None:
        return markdown_content

    first_line = lines[first_non_empty_index].strip()
    heading_match = re.match(r"^#{1,6}\s+(.+)$", first_line)
    if not heading_match:
        return markdown_content

    first_heading = heading_match.group(1).strip()
    if _normalize_compare_text(first_heading) != _normalize_compare_text(report_title):
        return markdown_content

    del lines[first_non_empty_index]
    if first_non_empty_index < len(lines) and not lines[first_non_empty_index].strip():
        del lines[first_non_empty_index]
    return "\n".join(lines).strip()


def _normalize_compare_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", coerce_text(value).strip().casefold())
    ascii_text = normalized.encode("ascii", errors="ignore").decode("ascii")
    return re.sub(r"\s+", " ", ascii_text).strip()
