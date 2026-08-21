# Prensa Normalista

Sitio web de Prensa Escuela de la Escuela Normal Superior de Manatí, construido para publicar noticias, columnas, entrevistas y voces estudiantiles.

## Funciones incluidas
- Portada con noticia destacada, últimas publicaciones, buscador y filtros.
- Categorías: noticias, opinión, entrevistas, crónicas, literatura, territorio, educación, investigación, deportes y cultura.
- Compartir publicaciones por WhatsApp y copiar enlace.
- Contador de visitas y sección de publicaciones más leídas.
- Archivo por años.
- Formulario público «La voz de los estudiantes» con moderación previa.
- Panel administrativo protegido por `PRESS_PASSWORD`.
- Publicación y eliminación de noticias.
- Marcar una noticia como destacada.
- Bandeja de textos estudiantiles pendientes, con aprobación o rechazo.
- Página institucional «Nuestro equipo».
- Imágenes opcionales por noticia; no se incluye sistema de galerías.

## Variables de entorno en Netlify
- `SITE_ID`
- `BLOBS_TOKEN`
- `PRESS_PASSWORD`

No cambies estas variables si ya están funcionando en el sitio actual.

## Nuevas funciones
- Laboratorio de Prensa para el equipo, con proyectos por etapas y asistente editorial NORA.
- IA mediante Gemini API. Configura `GEMINI_API_KEY` en Netlify. El modelo usado es `gemini-2.5-flash`.
- Clave opcional exclusiva del equipo: `PRESS_TEAM_PASSWORD`. Si no existe, el Laboratorio usa `PRESS_PASSWORD`.
- Identidad territorial con historias y mapa interactivo.
- Encuestas con resultados actualizados automáticamente y control administrativo.
- Reporteros destacados.
- Especial editorial “Una pregunta, muchas voces”.
