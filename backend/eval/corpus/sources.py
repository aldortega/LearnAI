from typing import Literal

from pydantic import BaseModel

DocumentFormat = Literal["pdf", "docx", "txt"]

WIKIPEDIA_BASE_URL = "https://es.wikipedia.org"
WIKIPEDIA_LICENSE = "CC BY-SA 4.0"


class CorpusSource(BaseModel):
    title: str
    format: DocumentFormat


class CorpusNotebook(BaseModel):
    slug: str
    name: str
    description: str
    include_tables: bool = True
    sources: list[CorpusSource]


CORPUS_NOTEBOOKS: list[CorpusNotebook] = [
    CorpusNotebook(
        slug="futbol",
        name="Fútbol argentino 2025-2026",
        description="Final del Mundial 2026, despedida de Messi, dirigencia y escándalos",
        sources=[
            CorpusSource(title="Final de la Copa Mundial de Fútbol de 2026", format="docx"),
            CorpusSource(title="El último tango", format="pdf"),
            CorpusSource(title="Pasillo-gate", format="pdf"),
            CorpusSource(
                title="Independiente vs. Universidad de Chile (Copa Sudamericana 2025)",
                format="txt",
            ),
            CorpusSource(title="Claudio Tapia", format="docx"),
        ],
    ),
    CorpusNotebook(
        slug="politica",
        name="Política argentina 2025-2026",
        description="Reformas, conflictos, causas judiciales con impacto político y cronología",
        sources=[
            CorpusSource(title="Reforma laboral en Argentina", format="pdf"),
            CorpusSource(title="Conflicto universitario en Argentina de 2024-2026", format="docx"),
            CorpusSource(title="Conflicto diplomático entre Argentina e Irán de 2026", format="txt"),
            CorpusSource(title="Causa por presuntas coimas en la ANDIS", format="pdf"),
            CorpusSource(title="$LIBRA", format="docx"),
            CorpusSource(title="Anexo:Argentina en 2026", format="txt"),
        ],
    ),
    CorpusNotebook(
        slug="formula1",
        name="Fórmula 1 2025-2026",
        description="Pilotos protagonistas y cambios de dirección en los equipos",
        include_tables=False,
        sources=[
            CorpusSource(title="Lando Norris", format="docx"),
            CorpusSource(title="Oscar Piastri", format="pdf"),
            CorpusSource(title="Andrea Kimi Antonelli", format="txt"),
            CorpusSource(title="Franco Colapinto", format="txt"),
            CorpusSource(title="Flavio Briatore", format="pdf"),
            CorpusSource(title="Christian Horner", format="docx"),
            CorpusSource(title="Laurent Mekies", format="pdf"),
        ],
    ),
]
