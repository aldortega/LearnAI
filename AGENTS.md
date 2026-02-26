# AGENTS.md

Guía para agentes que trabajan en este repositorio (backend + frontend).
Prioridad: cambios mínimos, tipado estricto, y coherencia con el stack actual.

## Contexto del producto

Plataforma de aprendizaje impulsada por IA sobre un sistema RAG (Retrieval-Augmented Generation). Permite estudiar cualquier tema a partir de fuentes personalizadas proporcionadas por el usuario.

- El usuario sube contenido propio (PDFs, DOCX, TXT).
- El contenido se procesa, indexa y se usa como base de conocimiento.
- Se generan respuestas, evaluaciones y contenido educativo contextual y confiable.
- Combina IA generativa, recuperación semántica y gamificación para una experiencia interactiva y personalizada.

## Novedades actuales del proyecto

Estas capacidades ya están implementadas y deben considerarse parte del comportamiento vigente:

- `quickstart` por notebook:
  - Generación asíncrona de resumen y temas iniciales.
  - Estado `missing | ready | stale` según huella (`sources_fingerprint`) de fuentes listas.
  - Expansión por tema con cache y referencias de fuentes.
- Quiz por roadmap (asíncrono):
  - Generación de roadmap por job (`queued/running/done/failed`) con `length` (`short|medium|long`) y `difficulty` (`basic|intermediate|advanced`).
  - Generación de preguntas por nivel bajo demanda.
  - Seguimiento de progreso por nivel, intentos, envío de respuestas y reset de intentos.
- Chat RAG con conversación persistente:
  - Historial por notebook.
  - Endpoint de respuesta en streaming.
  - Respuestas con fuentes y fallback controlado cuando no hay contexto suficiente.
- Ingesta de documentos en background:
  - Cola RQ para procesamiento (`ingestion`).
  - Streaming SSE de estados de documentos.
- Autenticación ampliada:
  - Login con Google.
  - Flujo de `complete-profile` para usuarios OAuth incompletos.
  - Sesiones con cookie y soporte `remember_me`.
- Frontend con modo studio por notebook:
  - Rutas protegidas para `chat`, `quiz`, `quickstart`.
  - Redirección por defecto de `/notebook/:id` hacia `quickstart`.

---

## Reglas globales

- Respeta la estructura existente; evita mover archivos sin necesidad.
- Si existe alguna dependencia que solucione algo, implementala, en lugar de tratar de hacerlo manual.
- No inventes comandos: usa los scripts y herramientas ya presentes.
- No existen reglas de Cursor/Copilot en este repo (no `.cursor/rules/`, `.cursorrules`, ni `.github/copilot-instructions.md`).
- Hay reglas adicionales específicas de frontend en `frontend/AGENTS.md`.

---

## Comandos (build/lint/test)

> Ejecuta desde el directorio correspondiente.

### Frontend (Vite + React + TS)

- Instalar deps: `npm install`
- Dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Preview build: `npm run preview`
- Tests: **no hay suite configurada actualmente**
- Single test: **no aplica** (no hay framework de tests instalado)

### Backend (FastAPI + Motor + RQ)

- Instalar deps: `pip install -r requirements.txt`
- Run API (dev): `uvicorn backend.main:app --reload`
- Run worker RQ: `python -m backend.worker`
- Tests: **no hay suite configurada actualmente**
- Lint/format: **no hay herramientas configuradas**
- Single test: **no aplica** (no hay framework de tests instalado)

---

## Estructura del repo

- `backend/`: API FastAPI + MongoDB (Motor)
- `backend/routes/`: rutas de auth, notebooks, documents, rag, quiz y quickstart
- `backend/worker.py`: worker RQ para colas `ingestion`, `quiz`, `quickstart`
- `frontend/`: React + TypeScript + Tailwind v4
- `frontend/src/features/`: módulos feature-first (`auth`, `notebooks`, `notebook-chat`, `quiz`, `quickstart`, `home`)
- `frontend/AGENTS.md`: reglas detalladas de UI/feature-first

---

## Estilo general

- Mantén cambios pequeños y enfocados; evita refactors amplios.
- Prefiere funciones puras cuando sea posible.
- Evita comentarios inline nuevos salvo petición explícita.
- Si debes introducir nuevos helpers, colócalos cerca del dominio que los usa.

---

## Backend (Python/FastAPI)

### Importaciones

- Sigue el orden actual: stdlib → terceros → locales.
- Usa imports relativos dentro del paquete `backend`.
- Evita importaciones circulares; extrae utilidades si aparece acoplamiento.

### Tipado y modelos

- Usa `pydantic` para DTOs de entrada/salida.
- Tipos explícitos en funciones públicas y helpers clave.
- Evita `Any` salvo casos inevitables.

### Convenciones de nombres

- `snake_case` para variables, funciones y módulos.
- `PascalCase` para clases y modelos Pydantic.
- Usa nombres semánticos (ej: `user_doc`, `session_token`).

### Errores y validación

- Devuelve errores via `HTTPException` con `status` de FastAPI.
- Mensajes de error claros y consistentes (español como en el código actual).
- Normaliza entradas sensibles (ej: email en minúsculas).

### Acceso a datos

- Mantén acceso a MongoDB en `db` y funciones cercanas.
- No hagas llamadas de DB dentro de modelos Pydantic.
- Maneja `DuplicateKeyError` y otros errores de DB explícitamente.

### Jobs y procesamiento asíncrono

- Para tareas pesadas (ingesta, quiz, quickstart), conserva el patrón API + cola RQ + polling/estado.
- Si agregas nuevos estados de jobs, mantén consistencia entre backend y frontend (`queued/running/done/failed` o equivalentes del dominio).
- Evita bloquear requests esperando generación larga; prioriza respuestas `202` con seguimiento de estado.

---

## Frontend (React/TypeScript/Tailwind)

> Reglas detalladas en `frontend/AGENTS.md` (feature-first, pages vs components, Tailwind v4).

### Importaciones

- Agrupa: externos → internos → relativos.
- Evita imports profundos; usa `index.ts` por feature cuando exista.
- No uses barrels globales innecesarios.

### Tipado

- Props y retornos tipados; evita `any`.
- Prefiere tipos/literals explícitos a `as` casting.
- Usa `zod` para validar inputs cuando exista patrón.

### Naming

- Componentes: `PascalCase`.
- Hooks: `useCamelCase`.
- Features: `kebab-case`.
- Tipos: `PascalCase`.

### Formato y estilo

- Sigue el estilo de ESLint y TypeScript.
- No hay Prettier configurado: respeta el formato existente.
- Mantén componentes pequeños; extrae UI repetida a `shared/ui`.

### Manejo de errores

- Estados de error visibles y accesibles (`role="alert"`).
- No silenciar errores; propaga o muestra UI de error.

### Flujos de notebook

- Mantén coherencia entre los tres modos del studio: `chat`, `quiz`, `quickstart`.
- Si cambias contratos de jobs/estado en backend, actualiza hooks y store del feature correspondiente.

---

## Tailwind CSS v4

- Tailwind es la única fuente de estilos.
- Evita estilos inline excepto casos estrictamente necesarios.
- Usa `focus-visible`, `disabled`, y estados de accesibilidad.
- Si un patrón se repite, extrae a `shared/ui`.

---

## Seguridad y datos sensibles

- No hardcodear secretos en código o configs.
- Respeta `session_cookie_name` y configuración existente.
- Nunca loguear credenciales ni tokens.

---

## Checklist antes de entregar cambios

- `npm run lint` (frontend) si modificaste UI.
- Build `npm run build` si tocaste configuración o bundling.
- Verificar que rutas/DTOs del backend no rompen contratos.
- Si tocaste jobs/colas, validar impacto en worker (`ingestion`, `quiz`, `quickstart`).
- Confirmar que los cambios siguen `frontend/AGENTS.md`.

---

Fin.
