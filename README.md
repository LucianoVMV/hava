# Mini Apps

Suite de mini apps personales hecha como **PWA** (app web instalable), pensada primero para iPhone y que también funciona en PC.
HTML + CSS + JavaScript puro, sin frameworks ni dependencias, y **funciona sin internet** después de la primera carga.

**Módulo actual: Productividad y hábitos**

| Pantalla | Qué hace |
|---|---|
| Hoy | Hábitos pendientes del momento, contador de agua, resumen de sueño, "Antes de salir" |
| Hábitos | Hábitos diarios, por días o "cada N días", rachas 🔥, mapa de calor, checklist "Antes de salir" |
| Sueño | "Me voy a dormir" / "Ya desperté", registro manual, promedio, regularidad, gráfico semanal |
| Ajustes | Exportar/importar respaldo `.json`, borrar todos los datos |

Próximamente: Enfoque (Pomodoro), Redes sociales, Resumen semanal, exportar recordatorios a Calendario (`.ics`).

## Privacidad

- Todos los datos se guardan **solo en tu dispositivo** (`localStorage`). No hay servidor, cuentas, analíticas ni trackers.
- PC y iPhone **no se sincronizan**: para pasar datos usa *Ajustes → Exportar* en uno e *Importar* en el otro.
- iOS puede borrar datos de sitios web poco usados. **Exporta un respaldo seguido** (la app te recuerda si pasaron 7 días).

## Correr en local (PC)

Necesitas Python (ya viene en muchas PCs; si no, instálalo desde python.org).

```bash
python -m http.server 8000
```

Abre <http://localhost:8000>. Para verla como celular: F12 → ícono de dispositivo móvil.

> Si después de un cambio ves una versión vieja, recarga con **Ctrl + Shift + R**.

## Publicar (GitHub Pages)

1. Crea un repositorio **público** en GitHub (GitHub Pages gratis requiere repo público; el código no contiene datos personales).
2. Sube el código:
   ```bash
   git remote add origin https://github.com/USUARIO/REPO.git
   git push -u origin main
   ```
3. En GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `(root)` → Save**.
4. En 1–2 minutos estará en `https://USUARIO.github.io/REPO/`.

Cada `git push` a `main` actualiza la app publicada. Alternativas equivalentes: Netlify o Cloudflare Pages (arrastrar la carpeta o conectar el repo; sin build).

## Instalar en el iPhone

1. Abre la URL publicada en **Safari** (tiene que ser Safari).
2. Toca **Compartir** (cuadrado con flecha) → **Agregar a pantalla de inicio** → **Agregar**.
3. Abre la app desde el ícono: se ve a pantalla completa y funciona sin internet.

**Actualizaciones:** la app se actualiza sola al abrirla con internet. Si no ves un cambio, ciérrala desde el selector de apps y ábrela de nuevo.

## Estructura

```
index.html               página única
manifest.webmanifest     datos para instalar la PWA
sw.js                    service worker (offline)
css/                     estilos (modo claro/oscuro, safe areas)
js/app.js                router entre pantallas
js/storage.js            capa de datos + exportar/importar
js/utils/                fechas (zona Lima), gráficos SVG, ayudas de DOM
js/modules/productividad/  una pantalla por archivo + *-datos.js con la lógica
icons/                   íconos (generados con tools/generar-iconos.ps1)
```

Al agregar un archivo nuevo, súmalo a la lista `ARCHIVOS` de `sw.js` y sube `VERSION`.
