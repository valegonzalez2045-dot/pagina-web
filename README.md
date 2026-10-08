# Petite Princesse 🍫

Dulcería artesanal: chocolates, galletas, pasteles y más. Web hecha con React + TypeScript + Vite.

## Comandos

```bash
npm install        # instalar dependencias
npm run dev        # desarrollo (localhost)
npm run build      # compilar la web a dist/
npm run generar    # regenerar el catálogo desde contenido/ y public/catalogo/
npm run lint       # revisar el código
```

## Editar precios y fotos sin tocar código

Mira **`GUIA-PUBLICACION.md`**. En resumen:

1. Sube el proyecto a GitHub y conéctalo a Netlify (gratis).
2. Entra a `tu-sitio/#admin`, conéctalo con tu usuario, repositorio y un token.
3. Desde ahí cambias precios, notas/sabores y fotos; la web se actualiza sola.

## Dónde está cada cosa

| Archivo | Qué contiene |
|---|---|
| `contenido/precios.json` | Precios (por página, sección, producto o foto) |
| `contenido/info.json` | Notas y listas de sabores de cada producto |
| `contenido/secciones.json` | Sección del catálogo → producto |
| `public/catalogo/` | Fotos (`seccion/seccion-pagina-orden.webp`) |
| `src/data/catalogo.ts` | Catálogo *generado* (no editar a mano) |
| `src/data/catalogoInfo.ts` | Información *generada* (no editar a mano) |
| `scripts/generar-catalogo.mjs` | Genera los dos archivos anteriores |