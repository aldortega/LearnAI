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
  - `doc_id`, `owner_id`, `notebook_id`, `file_path`, `file_name`, `content_type`
  - `status` (`pending|processing|done|failed`)
  - `created_at`, `updated_at`, `error`
- [ ] Crear colección `ingestion_jobs`:
  - `job_id`, `doc_id`, `notebook_id`, `owner_id`, `status`, `started_at`, `finished_at`, `error`
- [ ] Crear colección `rag_queries`:
  - `owner_id`, `notebook_id`, `query_text`, `top_k`, `latency_ms`, `doc_ids`, `created_at`
- [ ] Definir índices recomendados:
  - `notebooks`: `owner_id`, `created_at`
  - `documents`: `owner_id`, `notebook_id`, `status`, `created_at`
  - `ingestion_jobs`: `doc_id`, `status`, `created_at`
  - `rag_queries`: `notebook_id`, `created_at`

## 3) Diseño de datos y contratos
- [ ] Definir esquema de metadatos por chunk:
  - `doc_id`, `file_path`, `chunk_id`, `page`, `created_at`, `source_type`.
- [ ] Definir colección en Qdrant:
  - nombre (ej. `rag_chunks`)
  - dimensión de embeddings (según modelo Gemini)
  - distance metric (cosine).
- [ ] Acordar formato de payload para upsert.

## 4) Ingesta asíncrona (RQ)
- [ ] Crear endpoint para registrar documento y encolar job RQ.
- [ ] Guardar referencia del archivo (path en Supabase Storage).
- [ ] Worker RQ:
  - descargar archivo de Supabase Storage
  - extraer texto según tipo (PDF/DOCX/TXT)
  - limpiar/normalizar
  - chunking (LangChain TextSplitter)

## 5) LangChain + Embeddings (Gemini)
- [ ] Integrar loaders para PDF/DOCX/TXT.
- [ ] Implementar embeddings Gemini con LangChain (modelo `text-embedding-004`).
- [ ] Generar embeddings por chunk.
- [ ] Upsert en Qdrant con metadatos.

## 6) Endpoint RAG (consulta)
- [ ] Endpoint de consulta:
  - embedding de query
  - búsqueda `top_k` en Qdrant
  - (opcional) rerank
  - construcción de prompt con contexto
- [ ] Responder con Gemini y forzar “responder solo con evidencia”.
- [ ] Registrar consultas en `rag_queries`.

## 7) Observabilidad mínima
- [ ] Logs básicos por job:
  - `doc_id`, `chunks_indexados`, `latency`, `errores`.
- [ ] Logs básicos por consulta:
  - `query`, `top_k`, `latency`, `errores`.

## 8) End-to-end y ajustes
- [ ] Probar flujo completo:
  - subir archivo → job en cola → embeddings → consulta → respuesta.
- [ ] Ajustar chunking y top_k si es necesario.
- [ ] Documentar pasos de ejecución local.
