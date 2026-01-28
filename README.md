# 🚀 LearnAI

**LearnAI** es una plataforma de estudio inteligente que integra **Inteligencia Artificial** y un sistema **RAG (Retrieval-Augmented Generation)** para ayudar a estudiantes a aprender cualquier tema a partir de sus propios materiales.

La aplicación permite crear **espacios de trabajo** donde los usuarios pueden subir archivos fuente y luego interactuar con ese contenido mediante chat con IA, roadmaps de preguntas y generación automática de contenido educativo.

---

## 🧠 Problema que resuelve

Muchos estudiantes:
- Estudian desde múltiples archivos y fuentes desorganizadas
- No saben qué preguntar ni cómo estructurar su aprendizaje
- Consumen contenido de forma pasiva sin reforzar conocimientos

**LearnAI** centraliza las fuentes, las transforma en conocimiento interactivo y guía al estudiante con inteligencia artificial contextualizada.

---

## ✨ Funcionalidades

### 🔐 Autenticación
- Registro e inicio de sesión
- Login con Google
- Gestión segura de sesiones

### 📂 Gestión de fuentes
- Subida de archivos:
  - PDF
  - DOCX
  - TXT
- Carga de URLs como fuente de estudio
- Almacenamiento en la nube

### 💬 Chat con IA (RAG)
- Consultas inteligentes basadas **exclusivamente** en las fuentes cargadas
- Respuestas contextualizadas
- Reducción de alucinaciones del modelo

### 🧭 Roadmap de aprendizaje
- Generación automática de preguntas con IA
- Organización progresiva por niveles
- Aprendizaje guiado tipo *learning path*

### 🎨 Generación de contenido educativo
- Infografías explicativas
- Presentaciones (slides)
- Podcasts / audios explicativos
- Contenido generado a partir de las fuentes del usuario

---

## 🏗️ Arquitectura general

LearnAI utiliza una arquitectura moderna orientada a servicios y procesamiento asíncrono:

- Frontend desacoplado
- Backend API con FastAPI
- Pipeline RAG con embeddings y búsqueda semántica
- Workers para tareas pesadas (procesamiento de archivos y generación de contenido)

---

## 🛠️ Stack tecnológico

### Frontend
- React
- TypeScript

### Backend
- FastAPI
- LangChain
- Gemini (LLM)

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

