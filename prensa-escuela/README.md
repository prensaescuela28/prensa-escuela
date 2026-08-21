# Prensa Escuela

Sitio del periódico escolar. El equipo de prensa publica noticias y columnas
de opinión (texto + foto) usando una clave compartida; cualquier visitante
puede leerlas sin necesidad de cuenta, y cada noticia tiene su propio enlace
para compartir (con vista previa correcta en Facebook).

## Cómo publicarlo en Netlify

**Opción A — arrastrando la carpeta (la más simple):**

1. Entra a [app.netlify.com](https://app.netlify.com) y crea una cuenta gratuita.
2. Ve a **Sites → Add new site → Deploy manually**.
3. Arrastra esta carpeta completa (`prensa-escuela`) a la zona de subida.
4. Cuando termine el despliegue, entra a **Site configuration → Environment variables**
   y crea dos variables:
   - **Key:** `PRESS_PASSWORD` · **Value:** la clave que usará el equipo de prensa para publicar (la que tú decidas).
   - **Key:** `BLOBS_TOKEN` · **Value:** un token de acceso personal de Netlify (ver instrucciones abajo, sección "Crear el token BLOBS_TOKEN"). Es obligatorio: sin él, la publicación falla con el error *MissingBlobsEnvironmentError*.
5. Ve a **Deploys → Trigger deploy → Deploy site** para que las variables queden activas.
6. Netlify te dará una URL como `https://tu-sitio.netlify.app`. Puedes cambiarla
   en **Site configuration → Domain management** por un nombre más amigable
   (gratis, tipo `prensa-turealcolegio.netlify.app`) o conectar un dominio propio.

## Crear el token BLOBS_TOKEN

Este sitio guarda las noticias y fotos en "Netlify Blobs". Netlify normalmente
lo configura solo, pero en algunos sitios esa configuración automática falla
(error `MissingBlobsEnvironmentError` en los logs de la función). La solución
es crear un token manualmente:

1. En Netlify, haz clic en tu foto/ícono de usuario (arriba a la derecha) → **User settings**.
2. En el menú izquierdo, entra a **Applications**.
3. En la sección **Personal access tokens**, haz clic en **New access token**.
4. Ponle un nombre (por ejemplo `prensa-escuela-blobs`) y genera el token.
5. Copia el token que te muestra (solo se ve una vez).
6. Ve a tu sitio → **Site configuration → Environment variables** → **Add a variable**.
   - **Key:** `BLOBS_TOKEN`
   - **Value:** pega el token que copiaste.
7. Ve a **Deploys → Trigger deploy → Deploy site**.

**Opción B — desde GitHub (recomendada si vas a seguir editando el sitio):**

1. Sube esta carpeta a un repositorio de GitHub.
2. En Netlify: **Add new site → Import an existing project → GitHub** y selecciona el repositorio.
3. Deja el comando de build vacío y la carpeta de publicación como `public` (ya viene configurado en `netlify.toml`).
4. Agrega la variable de entorno `PRESS_PASSWORD` como en el paso 4 de arriba.
5. Cada vez que subas cambios al repositorio, Netlify vuelve a publicar el sitio solo.

## Cómo se usa

- **Estudiantes de prensa:** entran a `/admin.html`, escriben la clave del
  equipo, completan título, autor, tipo (Noticia o Columna de opinión), el
  texto y opcionalmente suben una foto desde su computador o celular, y
  presionan **Publicar**.
- **Cualquier visitante:** entra a la portada (`/`) y ve todas las noticias
  publicadas, sin necesidad de clave ni cuenta.
- **Para compartir en Facebook:** cada noticia tiene su propia dirección
  (`tusitio.netlify.app/noticia/titulo-de-la-noticia`). Al pegar ese enlace en
  Facebook, la publicación se abre con título, resumen y foto de portada,
  igual que un artículo de un periódico real.

## Cambiar la clave del equipo de prensa

Ve a **Site configuration → Environment variables** en Netlify, edita
`PRESS_PASSWORD` y vuelve a desplegar el sitio (**Trigger deploy**).

## Notas técnicas

- Construido para **Netlify** con *Netlify Functions* (backend) y
  *Netlify Blobs* (donde se guardan las noticias y las fotos) — no necesitas
  contratar una base de datos aparte.
- No requiere comando de build; Netlify instala automáticamente la
  dependencia `@netlify/blobs` listada en `package.json` antes de publicar.
- Si algún día quieres cuentas individuales por estudiante en lugar de una
  clave compartida, se puede agregar Netlify Identity más adelante.
