# Proveedor de LLM seleccionable (Gemini / OpenAI)

Estado: aceptado. Origen: #7.

## Contexto

Toda la generación de texto dependía de Gemini. Se necesita poder elegir otro **proveedor de LLM** (OpenAI) para no quedar atado a uno solo y para comparar el sistema RAG con distintos generadores en la evaluación de la tesis, donde el retrieval debe ser idéntico y la única variable es el modelo que genera la respuesta.

## Decisiones

### 1. El proveedor de LLM es seleccionable, con Gemini por defecto

OpenAI convive con Gemini como proveedor de LLM, solo para chat y salida estructurada. En esta fase se elige por variable de entorno (`llm_provider`, por defecto `"gemini"`), con una única `openai_api_key` y un `openai_chat_model` configurable. La creación del modelo de chat pasa por una fábrica que recibe el proveedor.

Motivo: permite cambiar de proveedor sin tocar código y sin alterar el comportamiento actual cuando no se configura nada. Una sola key alcanza porque la rotación de keys de Gemini existe solo por el uso de keys gratuitas; con keys pagas no tiene sentido replicarla.

### 2. Embeddings, TTS, imágenes y voz en vivo permanecen en Gemini

Estas capacidades no se abstraen por proveedor. Por eso la key de Gemini se exige siempre ("Gemini no configurado"), y la de OpenAI solo si el proveedor es `"openai"` ("OpenAI no configurado").

Motivo: cambiar los embeddings obligaría a reindexar Qdrant y rompería la comparabilidad del retrieval en el eval. TTS, imágenes y voz en vivo no tienen equivalente directo en el alcance de esta fase.

### 3. Sin fallback entre proveedores

Si el proveedor elegido falla (cuota, credenciales, servicio), el error se devuelve explícitamente como `HTTPException` en español. Nunca se reintenta con el otro proveedor.

Motivo: integridad del eval. Un fallback silencioso mezclaría respuestas de distintos modelos bajo la misma etiqueta y contaminaría la comparación. Cada resultado debe quedar atribuido sin ambigüedad al proveedor y modelo que lo produjo.

### 4. El proveedor se propaga de forma explícita y obligatoria

`provider` es un parámetro obligatorio, sin valor por defecto, en toda la cadena router -> servicio -> agentes y salida estructurada -> fábrica. Solo los puntos de entrada (routers HTTP, quienes encolan jobs y el CLI de eval) leen el valor por defecto de la configuración. En los jobs RQ el proveedor viaja como argumento y se guarda en el documento del job con `provider` y `chat_model`; el worker usa el del payload, nunca la configuración vigente al ejecutar.

Motivo: un estado global o implícito permitiría que un job use un proveedor distinto del que se pidió, y obligaría al eval a modificar la configuración global. Con parámetro explícito el CLI de eval pasa el proveedor directo a los servicios, y la trazabilidad por job es verificable.

## Consecuencias

- Los schemas de salida estructurada deben cumplir el modo `strict` de OpenAI (`json_schema` con `strict=True`) sin cambiar el comportamiento con Gemini.
- Algunos modelos de razonamiento de OpenAI no aceptan `temperature`; se omite y se registra en los metadatos del eval.
- El eval trata proveedor y modelo como un eje independiente de las configuraciones de RAG.

## Fuera de alcance

- Fase 2: selección del proveedor por usuario (campo en el perfil y endpoint de configuración). El diseño lo permite conectando el valor del perfil con los puntos de entrada.
- Embeddings, TTS, imágenes y voz con OpenAI.
- Rotación o failover entre varias keys de OpenAI.
- Cambios de frontend.
