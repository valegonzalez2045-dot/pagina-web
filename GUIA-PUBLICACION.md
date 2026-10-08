# Guía para publicar y usar el panel de edición

Esta web está lista para que **tú** edites precios y fotos desde el computador o el
celular, sin tocar código. El plan es:

1. Subir el proyecto a **GitHub** (una vez).
2. Conectarlo a **Netlify** para que se publique solo (una vez).
3. Entrar al panel en `tu-sitio/#admin` con un token (una vez por dispositivo).

---

## Paso 1 — Crear el repositorio en GitHub

1. Entra a <https://github.com> e inicia sesión.
2. Botón verde **New** (New repository).
3. Ponle un nombre, por ejemplo `petite-princesse-web`.
4. Déjalo **Private** (recomendado) o **Public**, como prefieras.
5. **No** marques "Add a README" ni "Add .gitignore" (ya vienen en el proyecto).
6. Crea el repositorio. GitHub te mostrará una página con comandos.

Desde la carpeta del proyecto en tu computador ejecuta (si usas PowerShell):

```
git add -A
git commit -m "Primera versión"
git remote add origin https://github.com/TU-USUARIO/petite-princesse-web.git
git push -u origin main
```

«TU-USUARIO» es tu nombre de usuario de GitHub.

---

## Paso 2 — Publicar con Netlify (gratis)

1. Entra a <https://app.netlify.com> e inicia sesión con tu cuenta de GitHub
   (botón *Sign up/Sign in with GitHub*).
2. **Add new site → Import an existing project → GitHub**.
3. Elige el repositorio `petite-princesse-web`.
4. No cambies nada: el proyecto ya trae la configuración (`netlify.toml`).
   Netlify detecta el build (`npm run build`) y la carpeta `dist`.
5. **Deploy site**. En un par de minutos tendrás una dirección como
   `https://tu-proyecto.netlify.app`.

> Si prefieres Vercel, el proyecto ya trae `vercel.json`; el proceso es el mismo
> (Import Project → tu repositorio).

---

## Paso 3 — Crear el token del panel (una vez)

El panel guarda los cambios en GitHub con un «token» que creas tú:

1. En <https://github.com> → tu foto (arriba a la derecha) → **Settings**.
2. Abajo a la izquierda: **Developer settings** → **Personal access tokens** →
   **Fine-grained tokens** → **Generate new token**.
3. **Token name**: `panel` · **Expiration**: `90 days` o más.
4. **Repository access**: *Only select repositories* → marca tu repositorio de la web.
5. **Permissions** → **Contents** → `Read and write`.
6. **Generate token**. Copia el texto que empieza con `github_pat_…`
   (solo se muestra una vez).

---

## Paso 4 — Usar el panel

Entra a **tu-sitio.netlify.app/#admin** desde el computador o el celular.

La primera vez te pedirá:

- **Usuario de GitHub**, **Repositorio** (el nombre que le pusiste) y la **rama**
  (normalmente `main`).
- **Token**: pegas el `github_pat_…`.

Botón **Conectar y guardar**. Eso queda guardado en ese dispositivo.

Tres pestañas:

- **Precios** — cambia precios por página, por sección, por producto o por foto.
  Botón **Guardar cambios**.
- **Productos y sabores** — edita notas, si se muestra precio por foto, y las listas
  de sabores/rellenos.
- **Fotos** — mira las fotos de cada sección, **Reemplazar**, **Subir** o **Eliminar**.

Cada guardado se deposita en GitHub y Netlify publica la web actualizada en 1–2 minutos.

---

## Notas

- El panel vive dentro de la misma web: los visitantes nunca lo ven y sin el token no
  se puede cambiar nada.
- Se supone que la carpeta `public/catalogo/` con las fotos optimizadas y la carpeta
  `contenido/` (precios, sabores, secciones) se suben a GitHub. Los archivos originales
  grandes (páginas `1.png`…`48.png` y `imagenes-extraidas/`) están excluidos a propósito.
- Para volver a generar todo después de editar a mano: `npm run generar` y `npm run build`.