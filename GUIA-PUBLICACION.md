# Guía para publicar y usar el panel de edición

Esta web está lista para que **tú** edites precios y fotos desde el computador o el
celular, sin tocar código. El plan es:

1. El proyecto vive en **GitHub** (ya está).
2. **Cloudflare Pages** lo publica solo cada vez que guardas en el panel (una vez).
3. Entras al panel en `tu-sitio/#admin` con un token (una vez por dispositivo).

> **¿Por qué Cloudflare y no Netlify?** Netlify gratis da 300 compilaciones al mes y se
> agotaron. Cloudflare Pages es gratis, no cobra por visitas (ancho de banda ilimitado),
> permite webs comerciales y da 500 compilaciones al mes. No pide tarjeta.

---

## Paso 1 — Publicar con Cloudflare Pages (una sola vez, ~5 minutos)

1. Entra a <https://dash.cloudflare.com/sign-up> y crea una cuenta gratis
   (con tu correo). **No** pide tarjeta.
2. En el menú de la izquierda: **Workers & Pages** → **Create** →
   pestaña **Pages** → **Connect to Git**.
3. Autoriza a Cloudflare en GitHub y elige el repositorio de la web
   (`pagina-web`). Dale acceso **solo a ese repositorio**.
4. **Install & Authorize** y luego elige:
   - **Project name**: `petite-princesse` (de ahí sale la dirección).
   - **Production branch**: `main`.
   - **Framework preset**: `Vite` (si no aparece, elígelo en la lista).
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Abre **Environment variables (advanced)** y agrega una:
   - Nombre: `NODE_VERSION`
   - Valor: `22.12.0`
6. **Save and Deploy**. En 2–3 minutos la web queda publicada en una dirección como
   `https://petite-princesse.pages.dev`.

> Cada vez que guardes en el panel, Cloudflare vuelve a publicar sola. No hay que
> hacer nada más.

### Después de publicar

- Prueba la web en la dirección nueva (`https://petite-princesse.pages.dev`).
- Entra a **`https://petite-princesse.pages.dev/#admin`** y pega tu token de GitHub
  (el mismo de siempre). El token queda guardado en ese dispositivo.
- Actualiza el enlace en **Instagram** y en los mensajes de **WhatsApp** con la
  dirección nueva.
- Netlify puede quedarse como respaldo unos días; cuando todo funcione bien, se puede
  borrar el sitio allá.

### Si quieres una dirección propia (opcional)

Puedes comprar un dominio (por ejemplo `petiteprincesse.com`) y agregarlo en
Cloudflare: **tu proyecto → Custom domains → Set up a domain**. El certificado de
seguridad (candado) es gratis.

---

## Paso 2 — Crear el token del panel (una vez)

El panel guarda los cambios en GitHub con un **token** que creas tú:

1. En <https://github.com> → tu foto (arriba a la derecha) → **Settings**.
2. Abajo a la izquierda: **Developer settings** → **Personal access tokens** →
   **Fine-grained tokens** → **Generate new token**.
3. **Token name**: `panel` · **Expiration**: `90 days` o más.
4. **Repository access**: *Only select repositories* → marca tu repositorio de la web.
5. **Permissions** → **Contents** → `Read and write`.
6. **Generate token**. Copia el texto que empieza con `github_pat_…`
   (solo se muestra una vez).

---

## Paso 3 — Usar el panel

Entra a **tu-sitio/#admin** desde el computador o el celular.

La primera vez te pedirá:

- **Usuario de GitHub**, **Repositorio** (el nombre que le pusiste) y la **rama**
  (normalmente `main`).
- **Token**: pegas el `github_pat_…`.

Botón **Conectar y guardar**. Eso queda guardado en ese dispositivo.

Las pestañas:

- **Fotos** — aquí ves las fotos de cada producto, en el mismo orden en que salen en la
  web. Cada foto tiene **su propio precio** (el cuadro debajo de la foto).
  - **Reemplazar** cambia la foto (el precio se mantiene).
  - **Eliminar** la quita de la lista.
  - Las flechas ↑ ↓ o arrastrar cambian el orden.
  - Nada se publica hasta que aprietes **«Guardar cambios»**: así todo sale junto y la
    web se compila una sola vez.
- **Galería (Lo más vendido)** — fotos, textos, cantidades y orden.
- **Combos** — título, texto, precio y foto de cada combo.
- **Productos y sabores** — notas y listas de sabores/rellenos.
- **Portadas / Logo / Textos** — imágenes y títulos de las secciones.

Cada guardado se deposita en GitHub y la web se publica sola en 1–2 minutos.

---

## Notas

- El panel vive dentro de la misma web: los visitantes nunca lo ven y sin el token no
  se puede cambiar nada.
- La carpeta `public/catalogo/` tiene las fotos optimizadas y `contenido/` (fotos,
  precios, textos, secciones) es lo que edita el panel.
- Las fotos se suben ya reducidas (WebP, máximo 1000 px de ancho), así la web se
  mantiene liviana.
- Para volver a generar los datos después de editar a mano: `npm run generar` y luego
  `npm run build`.
- El archivo `netlify.toml` quedó en el proyecto por si algún día quieres volver a
  Netlify; Cloudflare lo ignora.
