# CLAUDE.md

Guía operativa para agentes que contribuyen a este proyecto.  
Objetivo: mantener consistencia, calidad y escalabilidad en un codebase **React + TypeScript + Tailwind CSS v4**, con estructura **feature-based** y páginas compuestas por componentes.

Este archivo aplica solo al frontend; para comandos globales y reglas base ver `AGENTS.md` en la raíz.


---

## Stack obligatorio

- React
- TypeScript
- Tailwind CSS **v4**
- Arquitectura por features (feature-first)

Cualquier contribución debe respetar este stack. 

---

## Principios obligatorios

1. **Las páginas se componen por componentes**
   - Una _Page_ no debe contener toda la UI en un único archivo.
   - Una _Page_ orquesta: layout + composición + hooks + wiring de handlers.
   - La UI se divide en componentes ubicados en `components/` dentro de la feature o en `shared/ui`.
   - max 300 lines per any file
    - max 1 react component per file


2. **Feature-first**
   - Todo lo específico de una funcionalidad vive dentro de su feature.
   - UI, hooks, types, api y utils no se mezclan entre features.
   - Evitar carpetas globales innecesarias.

3. **TypeScript estricto**
   - Props, hooks, servicios y DTOs deben estar tipados.
   - `any` está prohibido salvo justificación documentada.

4. **Separación de responsabilidades**
   - UI (componentes) ≠ lógica (hooks) ≠ infraestructura (api).
   - Los componentes no hacen fetch directo.
   - Los servicios no conocen React.

5. **Tailwind como única fuente de estilos**
   - No CSS tradicional, no SCSS, no styled-components.
   - Tailwind CSS v4 es obligatorio.

---

## Estructura de carpetas (feature-based)

src/

- app/
  - providers/
  - router/
  - index.tsx
- shared/
  - ui/
  - hooks/
  - lib/
  - types/
  - config/
- features/
  - <feature-name>/
    - api/
    - components/
    - hooks/
    - pages/
    - types/
    - utils/
    - index.ts
- entities/ (opcional)
- assets/

---

## Convención: páginas compuestas por componentes

### Page (orquestación)

- Vive en `features/<feature>/pages`
- Responsabilidades:
  - Composición de componentes
  - Layout general
  - Hooks de alto nivel
  - Conexión de handlers
- No debe contener UI compleja inline

### Componentes

- Viven en `components/`
- UI enfocada y reutilizable dentro de la feature
- Sin lógica de negocio ni fetch directo
- Totalmente tipados

### Hooks

- Viven en `hooks/`
- Encapsulan estado, side-effects y lógica
- No renderizan JSX
- Retornos tipados explícitamente

---

## Tailwind CSS v4 – reglas obligatorias

### Uso general

- Todo el estilado debe hacerse con **utility classes de Tailwind**
- Está permitido:
  - `className` con utilities

- No está permitido:
  - Archivos `.css` por feature
  - Inline styles (`style={{}}`) salvo casos excepcionales (ej: cálculos dinámicos)

### Componentes UI

- Los componentes de `shared/ui` definen:
  - spacing
  - typography
  - colores
  - estados (hover, focus, disabled)
- Las features **consumen**, no redefinen, estilos base cuando sea posible.

### Consistencia visual

- Evitar combinaciones arbitrarias de clases.
- Preferir patrones repetibles:
  - mismos paddings
  - mismos tamaños de texto
  - mismos radios
- Si un patrón se repite, evaluar extracción a `shared/ui`.

### Accesibilidad con Tailwind

- Estados `focus-visible` obligatorios en inputs y botones
- Estados `disabled` claros (`opacity`, `cursor-not-allowed`)
- Errores visibles y accesibles (`role="alert"`)

---

## Convenciones de código

### Componentes

- Function components con props tipadas:
  - `type Props = {...}`
- Componentes pequeños y enfocados
- Si un componente supera ~200 líneas → evaluar extracción

### Hooks

- Prefijo obligatorio `use`
- Retorno con shape estable
- No mezclar lógica de varias features

### API / Services

- Viven en `api/`
- No importan React
- Devuelven datos tipados
- Normalizar errores (no lanzar errores crudos)

---

## Imports y exports

- Cada feature expone su API pública vía `index.ts`
- Evitar imports profundos con rutas largas
- `shared/` puede usar barrels controlados
- No usar barrels internos innecesarios

---

## Routing

- El router vive en `app/router`
- Las rutas renderizan **Pages**, no componentes de UI directa
- Las Pages componen la UI internamente

Ejemplo:

- `/login` → `<LoginPage />`

---

## Testing (recomendado)

- Unit tests:
  - utils
  - hooks críticos
- Component tests:
  - formularios
  - estados loading/error/empty
- E2E:
  - flujos críticos

---

## Checklist obligatorio

- [ ] La Page es solo composición
- [ ] Estructura por feature respetada
- [ ] Tailwind CSS v4 usado correctamente
- [ ] No CSS externo ni estilos inline innecesarios
- [ ] Props y retornos tipados
- [ ] Hooks separados de UI
- [ ] Accesibilidad básica cubierta
- [ ] No duplicación de UI que deba vivir en `shared/ui`

---

## Nomenclatura

- Feature: `kebab-case`
- Componentes: `PascalCase`
- Hooks: `useCamelCase`
- Types: `PascalCase`

---

## Ejemplo de feature mínima

features/auth/

- api/
  - authApi.ts
- components/
  - LoginForm.tsx
  - LoginHeader.tsx
- hooks/
  - useLogin.ts
- pages/
  - LoginPage.tsx
- types/
  - auth.types.ts
- utils/
  - authErrors.ts
- index.ts

---

Fin.
