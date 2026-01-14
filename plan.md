# Plan de implementación RAG (LangChain + RQ + Redis + Qdrant + Supabase + Gemini)

> Este plan está pensado para avanzar paso a paso e ir marcando progreso.
> Cada fase produce un resultado verificable antes de continuar.

## 0) Preparación y decisiones
- [ ] Confirmar credenciales y variables de entorno necesarias:
  - `GEMINI_API_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Definir tamaño de chunk y overlap (recomendado: 800–1200 tokens / 100–200 overlap).
- [ ] Definir `top_k` inicial (recomendado: 8–12).

## 1) Infra local (Docker)
- [x] Crear `docker-compose.yml` con servicios:
  - `qdrant` (puerto 6333)
  - `redis` (puerto 6379)
- [ ] Levantar servicios locales con Docker.
- [ ] Verificar conectividad a Qdrant y Redis.

## 2) MongoDB (MVP)
- [ ] Crear colección `notebooks`:
  - `owner_id`, `title`, `description`, `created_at`, `updated_at`
- [ ] Crear colección `documents`:
  - `owner_id`, `notebook_id`, `file_path`, `file_name`, `content_type`
  - `status` (`pending|processing|done|failed`)
  - `created_at`, `updated_at`, `error`
- [ ] Crear colección `ingestion_jobs`:
  - `job_id`, `document_id`, `notebook_id`, `owner_id`, `status`, `started_at`, `finished_at`, `error`
- [ ] Crear colección `rag_queries`:
  - `owner_id`, `notebook_id`, `query_text`, `top_k`, `latency_ms`, `document_ids`, `created_at`
- [ ] Definir índices recomendados:
  - `notebooks`: `owner_id`, `created_at`
  - `documents`: `owner_id`, `notebook_id`, `status`, `created_at`
  - `ingestion_jobs`: `document_id`, `status`, `created_at`
  - `rag_queries`: `notebook_id`, `created_at`

## 3) Diseño de datos y contratos
- [x] Definir esquema de metadatos por chunk:
  - `document_id`, `notebook_id`, `owner_id`, `file_path`, `file_name`
  - `chunk_id`, `page`, `source_type`, `created_at`
  - `text` (contenido del chunk para contexto RAG)
- [x] Definir colección en Qdrant:
  - nombre: `rag_chunks`
  - dimensión embeddings Gemini: `768`
  - distance metric: `cosine`
- [x] Definir payload index en Qdrant:
  - `notebook_id`, `owner_id`, `document_id`
- [x] Acordar formato de payload para upsert.

## 4) Ingesta asíncrona (RQ)
- [x] Crear endpoint para registrar documento y encolar job RQ.
- [x] Guardar referencia del archivo (path en Supabase Storage).
- [x] Worker RQ:
  - descargar archivo de Supabase Storage
  - extraer texto según tipo (PDF/DOCX/TXT)
  - limpiar/normalizar
  - chunking (LangChain TextSplitter)

## 5) LangChain + Embeddings (Gemini)
- [x] Integrar loaders para PDF/DOCX/TXT.
- [x] Implementar embeddings Gemini con LangChain (modelo `text-embedding-004`).
- [x] Generar embeddings por chunk.
- [x] Upsert en Qdrant con metadatos.

## 6) Endpoint RAG (consulta)
- [x] Endpoint de consulta:
  - embedding de query
  - búsqueda `top_k` en Qdrant
  - (opcional) rerank
  - construcción de prompt con contexto
- [x] Responder con Gemini y forzar “responder solo con evidencia”.
- [x] Registrar consultas en `rag_queries`.

## 7) Observabilidad mínima
- [x] Logs básicos por job:
  - `doc_id`, `chunks_indexados`, `latency`, `errores`.
- [x] Logs básicos por consulta:
  - `query`, `top_k`, `latency`, `errores`.

## 8) End-to-end y ajustes
- [ ] Probar flujo completo:
  - subir archivo → job en cola → embeddings → consulta → respuesta.
- [ ] Ajustar chunking y top_k si es necesario.
- [ ] Documentar pasos de ejecución local.
