# AGENTS.md

Guía para agentes que trabajan en este repositorio (backend + frontend).
Prioridad: cambios mínimos, tipado estricto, y coherencia con el stack actual.

## Contexto del producto

Plataforma de aprendizaje impulsada por IA sobre un sistema RAG (Retrieval-Augmented Generation). Permite estudiar cualquier tema a partir de fuentes personalizadas proporcionadas por el usuario.

- El usuario sube contenido propio (PDFs, enlaces web, documentos).
- El contenido se procesa, indexa y se usa como base de conocimiento.
- Se generan respuestas, evaluaciones y contenido educativo contextual y confiable.
- Combina IA generativa, recuperación semántica y gamificación para una experiencia interactiva y personalizada.

---

## Reglas globales

- Respeta la estructura existente; evita mover archivos sin necesidad.
- No agregues nuevas dependencias sin justificarlo en el PR/commit.
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

### Backend (FastAPI + Motor)

- Instalar deps: `pip install -r requirements.txt`
- Run API (dev): `uvicorn backend.main:app --reload`
- Tests: **no hay suite configurada actualmente**
- Lint/format: **no hay herramientas configuradas**
- Single test: **no aplica** (no hay framework de tests instalado)

---

## Estructura del repo

- `backend/`: API FastAPI + MongoDB (Motor)
- `frontend/`: React + TypeScript + Tailwind v4
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
- Confirmar que los cambios siguen `frontend/AGENTS.md`.

---

Fin.
