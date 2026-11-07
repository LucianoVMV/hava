// =========================================================
// app.js — punto de entrada: router entre pantallas y registro del service worker
// =========================================================
//
// ¿Cómo funciona el router?
// Usamos el "hash" de la URL (lo que va después de #). Ej.: index.html#/habitos
// Cambiar el hash NO recarga la página: solo dispara el evento "hashchange",
// y nosotros dibujamos la pantalla que corresponde. Es simple y funciona
// en cualquier servidor estático (incluido GitHub Pages).

import { iniciarAlmacenamiento } from "./storage.js";
import * as hoy from "./modules/productividad/hoy.js";
import * as habitos from "./modules/productividad/habitos.js";
import * as enfoque from "./modules/productividad/enfoque.js";
import * as mas from "./modules/productividad/mas.js";
import * as redes from "./modules/productividad/redes.js";
import * as sueno from "./modules/productividad/sueno.js";
import * as resumen from "./modules/productividad/resumen.js";
import * as ajustes from "./modules/productividad/ajustes.js";

// Cada ruta dice qué módulo dibuja la pantalla y qué pestaña se marca.
// Las secciones de "Más" marcan la pestaña "mas" y muestran botón atrás.
const RUTAS = {
  hoy: { modulo: hoy, pestana: "hoy" },
  habitos: { modulo: habitos, pestana: "habitos" },
  enfoque: { modulo: enfoque, pestana: "enfoque" },
  mas: { modulo: mas, pestana: "mas" },
  redes: { modulo: redes, pestana: "mas", atras: true },
  sueno: { modulo: sueno, pestana: "mas", atras: true },
  resumen: { modulo: resumen, pestana: "mas", atras: true },
  ajustes: { modulo: ajustes, pestana: "mas", atras: true },
};

const RUTA_INICIAL = "hoy";

const vista = document.getElementById("vista");
const tituloVista = document.getElementById("titulo-vista");
const btnAtras = document.getElementById("btn-atras");

/** Lee el hash ("#/habitos") y devuelve el nombre de la ruta ("habitos"). */
function rutaActual() {
  const nombre = location.hash.replace(/^#\/?/, "");
  return RUTAS[nombre] ? nombre : RUTA_INICIAL;
}

/** Marca como activa la pestaña de la barra inferior que corresponde. */
function marcarPestana(pestana) {
  document.querySelectorAll(".barra-pestanas a").forEach((enlace) => {
    const activa = enlace.dataset.pestana === pestana;
    enlace.classList.toggle("activa", activa);
    if (activa) enlace.setAttribute("aria-current", "page");
    else enlace.removeAttribute("aria-current");
  });
}

/** Dibuja la pantalla de la ruta actual. */
function navegar() {
  const nombre = rutaActual();
  const { modulo, pestana, atras } = RUTAS[nombre];

  tituloVista.textContent = modulo.titulo;
  document.title = `${modulo.titulo} · Mini Apps`;
  btnAtras.hidden = !atras;
  marcarPestana(pestana);

  modulo.render(vista);
  window.scrollTo(0, 0);
}

/** Registra el service worker (permite que la app funcione sin internet). */
function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("./sw.js").catch((error) => {
    console.warn("No se pudo registrar el service worker:", error);
  });
}

iniciarAlmacenamiento();
window.addEventListener("hashchange", navegar);
navegar();
registrarServiceWorker();
