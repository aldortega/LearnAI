import argparse
import asyncio
import re
import shutil
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

import httpx
from playwright.async_api import Page, async_playwright
from pydantic import BaseModel, ValidationError

from .render import (
    EXCLUDED_SECTIONS,
    PreparedArticle,
    prepare_article,
    write_docx,
    write_pdf,
    write_txt,
)
from .sources import (
    CORPUS_NOTEBOOKS,
    WIKIPEDIA_BASE_URL,
    WIKIPEDIA_LICENSE,
    DocumentFormat,
)

CORPUS_DIR = Path(__file__).resolve().parent
FILES_DIR = CORPUS_DIR / "files"
MANIFEST_PATH = CORPUS_DIR / "manifest.json"
CORPUS_DOC_PATH = CORPUS_DIR / "CORPUS.md"
USER_AGENT = "LearnAI-thesis-eval/0.1 (https://github.com/aldortega/LearnAI)"
MAX_ATTEMPTS = 4


class PinnedRevision(BaseModel):
    revid: int
    timestamp: str


class ManifestEntry(BaseModel):
    notebook: str
    title: str
    format: DocumentFormat
    revid: int
    revision_timestamp: str
    url: str
    file: str
    characters: int


class CorpusManifest(BaseModel):
    fetched_at: str
    source: str
    license: str
    entries: list[ManifestEntry]


def slugify(title: str) -> str:
    ascii_title = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", ascii_title.lower()).strip("-")


def revision_url(title: str, revid: int) -> str:
    return f"{WIKIPEDIA_BASE_URL}/w/index.php?title={quote(title.replace(' ', '_'))}&oldid={revid}"


async def request_with_retry(
    client: httpx.AsyncClient, url: str, params: dict[str, str] | None = None
) -> httpx.Response:
    for attempt in range(1, MAX_ATTEMPTS + 1):
        response = await client.get(url, params=params)
        if response.status_code != 429 and response.status_code < 500:
            response.raise_for_status()
            return response
        retry_after = response.headers.get("retry-after", "")
        wait_seconds = int(retry_after) if retry_after.isdigit() else 5 * 2**attempt
        print(f"Wikipedia respondio {response.status_code}; reintento en {wait_seconds}s")
        await asyncio.sleep(wait_seconds)
    raise RuntimeError(f"Wikipedia no respondio tras {MAX_ATTEMPTS} intentos: {url}")


async def resolve_revisions(
    client: httpx.AsyncClient, titles: list[str]
) -> dict[str, PinnedRevision]:
    response = await request_with_retry(
        client,
        f"{WIKIPEDIA_BASE_URL}/w/api.php",
        {
            "action": "query",
            "prop": "revisions",
            "rvprop": "ids|timestamp",
            "titles": "|".join(unicodedata.normalize("NFC", title) for title in titles),
            "format": "json",
            "formatversion": "2",
        },
    )
    query = response.json()["query"]
    aliases = {item["from"]: item["to"] for item in query.get("normalized", [])}
    pages = {page["title"]: page for page in query["pages"]}
    revisions: dict[str, PinnedRevision] = {}
    for title in titles:
        normalized_title = unicodedata.normalize("NFC", title)
        page = pages.get(aliases.get(normalized_title, normalized_title))
        if page is None or page.get("missing") or not page.get("revisions"):
            raise RuntimeError(f"El articulo no existe en Wikipedia: {title}")
        revision = page["revisions"][0]
        revisions[title] = PinnedRevision(revid=revision["revid"], timestamp=revision["timestamp"])
    return revisions


async def fetch_revision_html(client: httpx.AsyncClient, revid: int) -> str:
    response = await request_with_retry(
        client, f"{WIKIPEDIA_BASE_URL}/w/rest.php/v1/revision/{revid}/html"
    )
    return response.text


def load_pinned_revisions() -> dict[str, PinnedRevision]:
    if not MANIFEST_PATH.exists():
        return {}
    try:
        manifest = CorpusManifest.model_validate_json(MANIFEST_PATH.read_text(encoding="utf-8"))
    except ValidationError as exc:
        raise RuntimeError(f"Manifest invalido en {MANIFEST_PATH}: {exc}") from exc
    return {
        entry.title: PinnedRevision(revid=entry.revid, timestamp=entry.revision_timestamp)
        for entry in manifest.entries
    }


async def write_document(
    page: Page, article: PreparedArticle, document_format: DocumentFormat, path: Path
) -> None:
    if document_format == "pdf":
        await write_pdf(page, path)
    elif document_format == "docx":
        write_docx(article, path)
    else:
        write_txt(article, path)


async def build_corpus(refresh: bool, delay: float) -> CorpusManifest:
    pinned = {} if refresh else load_pinned_revisions()
    titles = [source.title for notebook in CORPUS_NOTEBOOKS for source in notebook.sources]
    shutil.rmtree(FILES_DIR, ignore_errors=True)
    entries: list[ManifestEntry] = []

    async with httpx.AsyncClient(
        headers={"User-Agent": USER_AGENT}, timeout=60, follow_redirects=True
    ) as client:
        missing_titles = [title for title in titles if title not in pinned]
        if missing_titles:
            pinned |= await resolve_revisions(client, missing_titles)

        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(
                args=["--no-sandbox", "--disable-setuid-sandbox"]
            )
            context = await browser.new_context(locale="es-ES")
            await context.route("**/*", lambda route: route.abort())
            page = await context.new_page()

            for notebook in CORPUS_NOTEBOOKS:
                notebook_dir = FILES_DIR / notebook.slug
                notebook_dir.mkdir(parents=True, exist_ok=True)
                for source in notebook.sources:
                    revision = pinned[source.title]
                    html = await fetch_revision_html(client, revision.revid)
                    article = await prepare_article(
                        page, html, source.title, notebook.include_tables
                    )
                    path = notebook_dir / f"{slugify(source.title)}.{source.format}"
                    await write_document(page, article, source.format, path)
                    entries.append(
                        ManifestEntry(
                            notebook=notebook.slug,
                            title=source.title,
                            format=source.format,
                            revid=revision.revid,
                            revision_timestamp=revision.timestamp,
                            url=revision_url(source.title, revision.revid),
                            file=path.relative_to(CORPUS_DIR).as_posix(),
                            characters=len(article.text),
                        )
                    )
                    print(f"[{notebook.slug}] {source.title} -> {path.name} (rev {revision.revid})")
                    await asyncio.sleep(delay)

            await context.close()
            await browser.close()

    return CorpusManifest(
        fetched_at=datetime.now(timezone.utc).isoformat(),
        source=WIKIPEDIA_BASE_URL,
        license=WIKIPEDIA_LICENSE,
        entries=entries,
    )


def render_corpus_markdown(manifest: CorpusManifest) -> str:
    lines = [
        "# Corpus de evaluación",
        "",
        "Generado con `python -m backend.eval.corpus.fetch_wikipedia` "
        f"({manifest.fetched_at[:10]}).",
        "",
        f"- **Fuente**: Wikipedia en español ({manifest.source}).",
        f"- **Licencia**: {manifest.license}. Autoría: colaboradores de Wikipedia; "
        "el historial de cada artículo está en el enlace de su revisión.",
        "- **Transformación**: se fijó una revisión por artículo y se eliminaron referencias, "
        "imágenes, cajas de navegación y las secciones "
        + ", ".join(f"«{section}»" for section in EXCLUDED_SECTIONS)
        + ". Los formatos PDF, DOCX y TXT se generaron a partir del mismo contenido depurado.",
        "",
    ]
    for notebook in CORPUS_NOTEBOOKS:
        notebook_entries = [entry for entry in manifest.entries if entry.notebook == notebook.slug]
        total_characters = f"{sum(entry.characters for entry in notebook_entries):,}".replace(
            ",", "."
        )
        lines += [
            f"## {notebook.name}",
            "",
            f"{notebook.description}. {len(notebook_entries)} documentos, "
            f"{total_characters} caracteres.",
            "",
            "| Artículo | Formato | Revisión | Fecha de revisión | Caracteres | Archivo |",
            "|---|---|---|---|---|---|",
        ]
        lines += [
            f"| [{entry.title}]({entry.url}) | {entry.format.upper()} | {entry.revid} | "
            f"{entry.revision_timestamp[:10]} | {entry.characters} | `{entry.file}` |"
            for entry in notebook_entries
        ]
        lines.append("")
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Descarga el corpus de evaluacion desde Wikipedia con revisiones fijas"
    )
    parser.add_argument(
        "--refresh",
        action="store_true",
        help="Ignora las revisiones fijadas en manifest.json y toma las mas recientes",
    )
    parser.add_argument(
        "--delay", type=float, default=2.0, help="Segundos de espera entre articulos"
    )
    return parser.parse_args()


async def main() -> None:
    args = parse_args()
    manifest = await build_corpus(args.refresh, args.delay)
    MANIFEST_PATH.write_text(manifest.model_dump_json(indent=2), encoding="utf-8")
    CORPUS_DOC_PATH.write_text(render_corpus_markdown(manifest), encoding="utf-8")
    print(f"Corpus listo: {len(manifest.entries)} documentos en {FILES_DIR}")


if __name__ == "__main__":
    asyncio.run(main())
