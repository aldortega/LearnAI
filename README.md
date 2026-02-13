# 🚀 LearnAI

**LearnAI** es una plataforma de estudio inteligente que integra **Inteligencia Artificial** y un sistema **RAG (Retrieval-Augmented Generation)** para ayudar a estudiantes a aprender cualquier tema a partir de sus propios materiales.

La aplicación permite crear **espacios de trabajo** donde los usuarios pueden subir archivos fuente y luego interactuar con ese contenido mediante chat con IA, roadmaps de preguntas y generación automática de contenido educativo.

---

## 🧠 Problema que resuelve

Muchos estudiantes:
- Estudian desde múltiples archivos y fuentes
- No saben qué preguntar ni cómo estructurar su aprendizaje
- Consumen contenido de forma pasiva sin reforzar conocimientos

**LearnAI** centraliza las fuentes, las transforma en conocimiento interactivo y guía al estudiante con inteligencia artificial contextualizada.

---

## ✨ Funcionalidades

### 🔐 Autenticación
- Registro e inicio de sesión
- Login con Google (OAuth 2.0)
- Flujo de completar perfil para usuarios OAuth
- Gestión segura de sesiones con cookies
- Soporte "recordarme"

### 📂 Gestión de fuentes
- Subida de archivos:
  - PDF
  - DOCX
  - TXT
  - PPTX
- Carga de URLs como fuente de estudio
- Almacenamiento en la nube (Supabase Storage)

### 💬 Chat con IA (RAG)
- Consultas inteligentes basadas **exclusivamente** en las fuentes cargadas
- Respuestas contextualizadas con referencias a las fuentes
- Reducción de alucinaciones del modelo
- Conversación persistente por notebook
- Streaming de respuestas en tiempo real 
- Fallback controlado cuando no hay contexto suficiente

### 📝 Quickstart (Resumen y temas)
- Generación asíncrona de resumen y temas iniciales del material
- Estados de sincronización: `missing | ready | stale` según huella de fuentes
- Expansión de temas con cache y referencias a las fuentes originales

### 🧭 Roadmap de aprendizaje
- Generación automática de preguntas con IA
- Organización progresiva por niveles (básico, intermedio, avanzado)
- Aprendizaje guiado tipo *learning path*
- Quiz por nivel con seguimiento de progreso
- Múltiples intentos y reset de respuestas

### 📥 Ingesta de documentos
- Procesamiento en background mediante cola RQ
- Estados de procesamiento en tiempo real (SSE)
- Soporte para PDFs, DOCX, PPTX y TXT

### 📄 Informes
- Generación asíncrona de informes personalizados con IA
- Selección de tipo de informe (guías, resúmenes extendidos, etc.)
- Plantillas de generación configurables
- Historial de informes generados por notebook
- Sugerencias de formatos con IA

### 🗺️ Mapa mental
- Generación automática de árboles conceptuales con IA
- Visualización interactiva de nodos y conexiones
- Detalle de cada nodo con contexto de las fuentes
- Expansión adaptativa de ramas

### 👥 Colaboración en notebooks
- Invitar colaboradores por nombre de usuario
- Roles: propietario y colaborador 
- Sistema de notificaciones para invitaciones
- Revocar acceso de colaboradores
- Notebooks compartidos visibles en home

### 🎨 Generación de contenido educativo
- Infografías explicativas
- Presentaciones (slides)
- Podcasts / audios explicativos
- Contenido generado a partir de las fuentes del usuario

### 🖥️ Modos de estudio por Notebook
- Entorno integrado de estudio con cinco modos:
  - **Quickstart**: Resumen y temas iniciales
  - **Chat**: Consulta interactiva con IA
  - **Quiz**: Evaluación por niveles
  - **Mindmap**: Mapa mental visual
  - **Reports**: Informes y guías personalizadas
---

## 🏗️ Arquitectura general

LearnAI utiliza una arquitectura moderna orientada a servicios y procesamiento asíncrono:

- Frontend (React + TypeScript)
- Backend API con FastAPI
- Pipeline RAG con embeddings y búsqueda semántica
- Procesamiento con Docling 
- Workers (RQ) para tareas pesadas:
  - `ingestion`: procesamiento de documentos
  - `quiz`: generación de roadmaps y preguntas
  - `quickstart`: generación de resúmenes
  - `mindmap`: generación de mapas mentales
  - `reports`: generación de informes

---

## 🛠️ Stack tecnológico

### Frontend
- React
- TypeScript
- Tailwind CSS 

### Backend
- FastAPI
- LangChain
- Gemini (LLM)
- RQ (cola de tareas)
- Pydantic
- Docling

### Bases de datos y almacenamiento
- MongoDB – datos de usuarios y espacios de trabajo
- Qdrant – base de datos vectorial para embeddings
- Supabase Storage – almacenamiento de archivos
- Redis – cola de tareas y workers

### Infraestructura
- Docker
- Docker Compose

---

## 🔄 Flujo RAG (alto nivel)

1. El usuario sube archivos o URLs
2. El backend:
   - Extrae el texto
   - Fragmenta el contenido
   - Genera embeddings
3. Los embeddings se almacenan en Qdrant
4. Al realizar una consulta:
   - Se recuperan los fragmentos más relevantes
   - Se construye el contexto
   - El LLM genera la respuesta basada en ese contexto

---

