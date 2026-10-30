# AGENTS.md

Guía para agentes que trabajan en este repositorio (backend + frontend).
Prioridad: cambios mínimos, tipado estricto, y coherencia con el stack actual.

## Contexto del producto

Plataforma de aprendizaje impulsada por IA sobre un sistema RAG (Retrieval-Augmented Generation). Permite estudiar cualquier tema a partir de fuentes personalizadas proporcionadas por el usuario.

- El usuario sube contenido propio (PDFs, DOCX, TXT).
- El contenido se procesa, indexa y se usa como base de conocimiento.
- Se generan respuestas, evaluaciones y contenido educativo contextual y confiable.
- Combina IA generativa con recuperación semántica para una experiencia interactiva y personalizada.

## Reglas globales

- Respeta la estructura existente; evita mover archivos sin necesidad.
- Si existe alguna dependencia que solucione algo, implementala, en lugar de tratar de hacerlo manual.
- No inventes comandos: usa los scripts y herramientas ya presentes.
- El proyecto corre en contenedores de Docker (`docker-compose.yml`: `mongo`, `qdrant`, `redis`, `api`, `worker`, `frontend`). Ejecuta, reinicia y revisa logs de los servicios vía `docker compose` en lugar de procesos locales.

---

## Comandos (build/lint/test)

> Ejecuta desde el directorio correspondiente.

### Frontend (Vite + React + TS)

- Instalar deps: `pnpm install`
- Dev server: `pnpm run dev`
- Build: `pnpm run build`
- Lint: `pnpm run lint`
- Preview build: `pnpm run preview`


---

## Estructura del repo

- `backend/`: API FastAPI + MongoDB (Motor)
- `backend/routes/`: rutas de auth, notebooks, documents, rag, quiz, quickstart, etc
- `backend/worker.py`: worker RQ para colas 
- `frontend/`: React + TypeScript + Tailwind v4
- `frontend/src/features/`: módulos feature-first

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

- Para tareas pesadas, conserva el patrón API + cola RQ + polling/estado.
- Si agregas nuevos estados de jobs, mantén consistencia entre backend y frontend (`queued/running/done/failed` o equivalentes del dominio).
- Evita bloquear requests esperando generación larga; prioriza respuestas `202` con seguimiento de estado.

---

## Frontend (React/TypeScript/Tailwind)

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

- Si cambias contratos de jobs/estado en backend, actualiza hooks y store del feature correspondiente.

---

### Principios obligatorios

Stack obligatorio: React, TypeScript, Tailwind CSS **v4**, arquitectura feature-first.

1. **Las páginas se componen por componentes**
   - Una _Page_ no debe contener toda la UI en un único archivo.
   - Una _Page_ orquesta: layout + composición + hooks + wiring de handlers.
   - La UI se divide en componentes en `components/` de la feature o en `shared/ui`.
   - Máximo 300 líneas por archivo.
   - Máximo 1 componente React por archivo.
2. **Feature-first**
   - Todo lo específico de una funcionalidad vive dentro de su feature.
   - UI, hooks, types, api y utils no se mezclan entre features.
   - Evitar carpetas globales innecesarias.
3. **TypeScript estricto**
   - Props, hooks, servicios y DTOs tipados.
   - `any` prohibido salvo justificación documentada.
4. **Separación de responsabilidades**
   - UI (componentes) ≠ lógica (hooks) ≠ infraestructura (api).
   - Los componentes no hacen fetch directo.
   - Los servicios no conocen React.
5. **Tailwind como única fuente de estilos**
   - No CSS tradicional, SCSS ni styled-components.

### Estructura de carpetas (`frontend/src`)

- `app/`: `providers/`, `router/`, `index.tsx`
- `shared/`: `ui/`, `hooks/`, `lib/`, `types/`, `config/`
- `features/<feature-name>/`: `api/`, `components/`, `hooks/`, `pages/`, `types/`, `utils/`, `index.ts`
- `entities/` (opcional)
- `assets/`

### Pages, componentes y hooks

- **Page** (`features/<feature>/pages`): composición de componentes, layout general, hooks de alto nivel y conexión de handlers. Sin UI compleja inline.
- **Componentes** (`components/`): UI enfocada y reutilizable dentro de la feature; sin lógica de negocio ni fetch directo; totalmente tipados; function components con `type Props = {...}`; si superan ~200 líneas, evaluar extracción.
- **Hooks** (`hooks/`): encapsulan estado, side-effects y lógica; no renderizan JSX; prefijo `use`; retorno con shape estable y tipado; no mezclan lógica de varias features.
- **API / Services** (`api/`): no importan React; devuelven datos tipados; normalizan errores (no lanzar errores crudos).

### Exports y routing

- Cada feature expone su API pública vía `index.ts`; `shared/` puede usar barrels controlados.
- El router vive en `app/router` y las rutas renderizan **Pages** (ej: `/login` → `<LoginPage />`), no componentes de UI directos.



## Tailwind CSS v4

- Tailwind es la única fuente de estilos: todo con utility classes en `className`.
- No permitido: archivos `.css` por feature; inline styles (`style={{}}`) salvo cálculos dinámicos.
- `shared/ui` define spacing, typography, colores y estados (hover, focus, disabled); las features consumen, no redefinen.
- Evita combinaciones arbitrarias de clases; prefiere patrones repetibles (paddings, tamaños de texto, radios). Si un patrón se repite, extrae a `shared/ui`.
- Accesibilidad: `focus-visible` obligatorio en inputs y botones; `disabled` claro (`opacity`, `cursor-not-allowed`); errores con `role="alert"`.

---

## Seguridad y datos sensibles

- No hardcodear secretos en código o configs.
- Respeta `session_cookie_name` y configuración existente.
- Nunca loguear credenciales ni tokens.

## Agent skills

### Issue tracker

Issues en GitHub Issues (`aldortega/LearnAI`, vía `gh`). Ver `docs/agents/issue-tracker.md`.

### Triage labels

Vocabulario por defecto: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. Ver `docs/agents/triage-labels.md`.

### Domain docs

Single-context (`GLOSSARY.md` + `docs/adr/` en la raíz). Ver `docs/agents/domain.md`.


Fin.
