import re
import unicodedata
from html import escape

from ...schemas.presentations import PresentationSlideOut, PresentationStyle
from .normalization import coerce_text

PDF_DEFAULT_FILENAME = "presentacion.pdf"

STYLE_PALETTES: dict[PresentationStyle, dict[str, str]] = {
    "clean": {"bg": "#f8fafc", "surface": "#ffffff", "text": "#0f172a", "accent": "#2563eb"},
    "corporate": {"bg": "#0b1220", "surface": "#111827", "text": "#f8fafc", "accent": "#38bdf8"},
    "creative": {"bg": "#1f1147", "surface": "#2b1f66", "text": "#fdf4ff", "accent": "#f97316"},
    "academic": {"bg": "#fdfcf8", "surface": "#ffffff", "text": "#1f2937", "accent": "#0f766e"},
    "minimal": {"bg": "#ffffff", "surface": "#ffffff", "text": "#111827", "accent": "#111827"},
}


class PdfExportError(RuntimeError):
    pass


def build_presentation_pdf_filename(_title: str) -> str:
    normalized = unicodedata.normalize("NFKD", coerce_text(_title).strip().casefold())
    ascii_text = normalized.encode("ascii", errors="ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_text).strip("-")
    return f"{slug or PDF_DEFAULT_FILENAME.removesuffix('.pdf')}.pdf"


async def build_presentation_pdf_bytes(
    title: str,
    summary: str,
    slides: list[PresentationSlideOut],
    style: PresentationStyle,
) -> bytes:
    safe_title = coerce_text(title).strip() or "Presentacion"
    safe_summary = coerce_text(summary).strip() or "Resumen no disponible."
    html = _build_presentation_html(safe_title, safe_summary, slides, style)

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
            await page.set_content(html, wait_until="networkidle")
            pdf_bytes = await page.pdf(
                width="297mm",
                height="167mm",
                print_background=True,
                margin={"top": "0mm", "right": "0mm", "bottom": "0mm", "left": "0mm"},
                display_header_footer=False,
            )
            await context.close()
            await browser.close()
            return pdf_bytes
    except PlaywrightError as exc:
        raise PdfExportError(
            "No se pudo generar el PDF. Verifica Chromium con: playwright install chromium."
        ) from exc


def _build_presentation_html(
    title: str,
    summary: str,
    slides: list[PresentationSlideOut],
    style: PresentationStyle,
) -> str:
    palette = STYLE_PALETTES.get(style, STYLE_PALETTES["clean"])
    safe_deck_title = escape(title)
    safe_deck_summary = escape(summary)

    slide_sections: list[str] = []
    md = _build_markdown_renderer()
    for slide in slides:
        subtitle_html = (
            f'<p class="slide-subtitle">{escape(coerce_text(slide.subtitle))}</p>'
            if slide.subtitle
            else ""
        )
        content_html = md.render(coerce_text(slide.content_markdown).strip())
        slide_sections.append(
            f"""
            <section class="slide">
              <main class="slide-main">
                <h1 class="slide-title">{escape(coerce_text(slide.title))}</h1>
                {subtitle_html}
                <article class="slide-content">{content_html}</article>
              </main>
            </section>
            """
        )

    return f"""
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{safe_deck_title}</title>
    <style>
      @page {{
        size: 297mm 167mm;
        margin: 0;
      }}

      * {{
        box-sizing: border-box;
      }}

      html, body {{
        margin: 0;
        padding: 0;
      }}

      body {{
        font-family: "Inter", "Segoe UI", Arial, sans-serif;
        background: {palette["bg"]};
        color: {palette["text"]};
      }}

      .slide {{
        width: 297mm;
        height: 167mm;
        padding: 14mm;
        background: {palette["surface"]};
        page-break-after: always;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
      }}

      .slide:last-child {{
        page-break-after: auto;
      }}

      .slide-main {{
        min-height: 0;
      }}

      .slide-title {{
        margin: 0;
        font-size: 30px;
        line-height: 1.18;
        font-weight: 700;
      }}

      .slide-subtitle {{
        margin: 3mm 0 0 0;
        font-size: 16px;
        color: color-mix(in srgb, {palette["text"]} 80%, transparent);
      }}

      .slide-content {{
        margin-top: 6mm;
        font-size: 19px;
        line-height: 1.4;
      }}

      .slide-content p {{
        margin: 0 0 3mm;
      }}

      .slide-content ul,
      .slide-content ol {{
        margin: 0 0 3mm;
        padding-left: 7mm;
      }}

      .slide-content li {{
        margin: 1.8mm 0;
      }}

      .slide-content strong {{
        font-weight: 700;
      }}

      .slide-content h2,
      .slide-content h3 {{
        margin: 0 0 3mm;
        font-size: 20px;
        line-height: 1.2;
      }}

      .cover {{
        width: 297mm;
        height: 167mm;
        page-break-after: always;
        padding: 14mm;
        background: {palette["surface"]};
        display: flex;
        flex-direction: column;
        justify-content: center;
      }}

      .cover-title {{
        margin: 0;
        font-size: 42px;
        line-height: 1.1;
      }}

      .cover-summary {{
        margin: 8mm 0 0;
        max-width: 220mm;
        font-size: 18px;
        line-height: 1.45;
        color: color-mix(in srgb, {palette["text"]} 82%, transparent);
      }}
    </style>
  </head>
  <body>
    <section class="cover">
      <h1 class="cover-title">{safe_deck_title}</h1>
      <p class="cover-summary">{safe_deck_summary}</p>
    </section>
    {"".join(slide_sections)}
  </body>
</html>
"""


def _build_markdown_renderer():
    try:
        from markdown_it import MarkdownIt
    except Exception as exc:
        raise PdfExportError(
            "La exportacion PDF requiere 'markdown-it-py'. Instala dependencias del backend."
        ) from exc

    return (
        MarkdownIt(
            "commonmark",
            {"html": False, "linkify": True, "typographer": True},
        )
        .enable("table")
        .enable("strikethrough")
    )
