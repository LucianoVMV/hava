// =========================================================
// sw.js — service worker: permite usar la app sin internet
// =========================================================
//
// Estrategia "red primero, caché de respaldo":
//  - Con internet: pide el archivo al servidor (siempre tienes la versión más nueva)
//    y de paso guarda una copia en la caché.
//  - Sin internet: usa la copia guardada.
// La elegimos porque mientras desarrollamos verás tus cambios al instante,
// y aun así funciona offline después de la primera carga.
//
// Al agregar un archivo nuevo a la app, súmalo a ARCHIVOS y sube la VERSION.

const VERSION = "v6";
const CACHE = `mini-apps-${VERSION}`;

// Archivos que se guardan apenas se instala la app (el "esqueleto")
const ARCHIVOS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/base.css",
  "./css/components.css",
  "./js/app.js",
  "./js/storage.js",
  "./js/utils/dom.js",
  "./js/utils/fechas.js",
  "./js/utils/graficos.js",
  "./js/modules/productividad/sueno-datos.js",
  "./js/modules/productividad/habitos-datos.js",
  "./js/modules/productividad/agua-datos.js",
  "./js/modules/productividad/hoy.js",
  "./js/modules/productividad/habitos.js",
  "./js/modules/productividad/enfoque.js",
  "./js/modules/productividad/mas.js",
  "./js/modules/productividad/redes.js",
  "./js/modules/productividad/sueno.js",
  "./js/modules/productividad/resumen.js",
  "./js/modules/productividad/ajustes.js",
  "./icons/icono.svg",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
];

// 1) Instalación: descarga y guarda todos los archivos
self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ARCHIVOS))
      .then(() => self.skipWaiting()) // activa la nueva versión sin esperar
  );
});

// 2) Activación: borra cachés de versiones anteriores
self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nombres) =>
        Promise.all(nombres.filter((n) => n !== CACHE).map((n) => caches.delete(n)))
      )
      .then(() => self.clients.claim())
  );
});

// 3) Cada petición: red primero; si falla, caché
self.addEventListener("fetch", (evento) => {
  const { request } = evento;
  // Solo manejamos GET de nuestro propio sitio
  if (request.method !== "GET" || new URL(request.url).origin !== location.origin) return;

  evento.respondWith(
    // cache: "no-cache" → el navegador pregunta al servidor si el archivo cambió
    // (si no cambió, la respuesta es mínima). Sin esto podría darte una versión vieja
    // guardada en su caché HTTP aunque haya internet.
    fetch(request, { cache: "no-cache" })
      .then((respuesta) => {
        if (respuesta.ok) {
          const copia = respuesta.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copia));
        }
        return respuesta;
      })
      .catch(async () => {
        const guardada = await caches.match(request, { ignoreSearch: true });
        if (guardada) return guardada;
        // Si piden una página que no está guardada, mostramos la app igual
        if (request.mode === "navigate") return caches.match("./index.html");
        return Response.error();
      })
  );
});
