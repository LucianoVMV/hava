// =========================================================
// ajustes.js — pantalla de Ajustes: respaldo y borrado de datos
// =========================================================
//
// Respaldo = un archivo .json con TODOS tus datos.
//  - Exportar: lo crea y lo descarga (PC) o abre el menú Compartir (iPhone),
//    desde donde eliges "Guardar en Archivos" (iCloud Drive o el iPhone).
//  - Importar: lees ese archivo y reemplaza los datos actuales.
// Sirve para no perder nada si iOS borra los datos o cambias de dispositivo,
// y para pasar datos entre la PC y el iPhone.
//
// (Metas generales y exportar a Calendario .ics se agregarán aquí más adelante.)

import { escaparHTML as esc, mostrarAviso, milo } from "../../utils/dom.js";
import { hoyISO, fechaCorta } from "../../utils/fechas.js";
import {
  exportarDatos,
  importarDatos,
  validarRespaldo,
  borrarTodo,
  iniciarAlmacenamiento,
  estadoPersistencia,
  leerAjustes,
  guardarAjustes,
} from "../../storage.js";

export const titulo = "Ajustes";

const TAMANO_MAXIMO = 5 * 1024 * 1024; // 5 MB: un respaldo real pesa muchísimo menos
const DIAS_AVISO = 7; // a partir de cuántos días sin respaldo te lo recordamos

// Nombres legibles para el resumen de un respaldo
const NOMBRES = {
  sleep: "noches de sueño",
  habits: "hábitos",
  habitLogs: "registros de hábitos",
  water: "días de agua",
  focusSessions: "sesiones de estudio",
  socialUsage: "registros de redes",
};

// ---------- Entrada ----------

export function render(contenedor) {
  const raiz = document.createElement("div");
  contenedor.replaceChildren(raiz);
  raiz.addEventListener("click", (e) => alHacerClic(e, raiz));
  raiz.addEventListener("change", (e) => alElegirArchivo(e, raiz));
  dibujar(raiz);
}

function dibujar(raiz) {
  raiz.innerHTML = respaldoHTML() + almacenamientoHTML() + peligroHTML();
  mostrarPersistencia(raiz);
}

// ---------- Tarjetas ----------

function respaldoHTML() {
  const { ultimo } = leerAjustes("respaldo", { ultimo: null });
  // Milo se preocupa si nunca hiciste respaldo o si pasó una semana o más
  const atrasado = !ultimo || Date.parse(hoyISO()) - Date.parse(ultimo) >= DIAS_AVISO * 86400000;
  const texto = `<p class="texto-suave">${textoUltimoRespaldo(ultimo)}</p>`;
  return `
    <section class="tarjeta">
      <h2>Respaldo</h2>
      ${atrasado ? `<div class="fila-milo">${milo("preocupado", { tamano: "chico" })}${texto}</div>` : texto}
      <div class="pila-botones">
        <button class="btn btn-bloque" data-accion="exportar">⬇️ Exportar respaldo</button>
        <button class="btn btn-bloque btn-secundario" data-accion="importar">⬆️ Importar respaldo</button>
        <input type="file" id="archivo-respaldo" accept=".json,application/json" hidden>
      </div>
      <p class="texto-suave nota">
        En iPhone: al exportar se abre el menú Compartir → elige <strong>Guardar en Archivos</strong>
        (mejor en iCloud Drive). Para importar, elige ese mismo archivo.
      </p>
    </section>`;
}

function almacenamientoHTML() {
  return `
    <section class="tarjeta">
      <h2>Almacenamiento</h2>
      <p class="texto-suave">Tus datos se guardan solo en este dispositivo. No se envían a ningún servidor.</p>
      <p class="texto-suave nota" id="estado-persistencia">Revisando protección…</p>
    </section>`;
}

function peligroHTML() {
  return `
    <section class="tarjeta">
      <h2>Zona de peligro</h2>
      <p class="texto-suave">Borra todos los datos de la app en este dispositivo. No se puede deshacer.</p>
      <div class="pila-botones">
        <button class="btn btn-bloque btn-peligro" data-accion="borrar-todo">🗑️ Borrar todos los datos</button>
      </div>
    </section>`;
}

/** Texto según cuándo fue el último respaldo (con aviso si pasó mucho tiempo). */
function textoUltimoRespaldo(ultimo) {
  if (!ultimo) return "⚠️ Aún no has hecho ningún respaldo.";
  const dias = Math.round((Date.parse(hoyISO()) - Date.parse(ultimo)) / 86400000);
  const cuando = dias === 0 ? "hoy" : dias === 1 ? "ayer" : `hace ${dias} días (${fechaCorta(ultimo)})`;
  const alerta = dias >= DIAS_AVISO ? "⚠️ " : "✅ ";
  return `${alerta}Último respaldo: ${esc(cuando)}.`;
}

/** Pregunta al navegador si protege los datos y lo muestra (es asíncrono). */
async function mostrarPersistencia(raiz) {
  const estado = await estadoPersistencia();
  const elemento = raiz.querySelector("#estado-persistencia");
  if (!elemento) return;
  elemento.textContent =
    estado === true
      ? "🔒 El navegador protege estos datos: no los borrará por falta de espacio."
      : "⚠️ El navegador no garantiza conservar los datos (es normal en iPhone). Exporta un respaldo seguido.";
}

// ---------- Eventos ----------

function alHacerClic(e, raiz) {
  const accion = e.target.closest("[data-accion]")?.dataset.accion;
  if (accion === "exportar") exportar(raiz);
  if (accion === "importar") raiz.querySelector("#archivo-respaldo").click();
  if (accion === "borrar-todo") borrarConConfirmacion(raiz);
}

// ---------- Exportar ----------

async function exportar(raiz) {
  // Guardamos la fecha ANTES de exportar, así el propio respaldo la incluye
  guardarAjustes("respaldo", { ultimo: hoyISO() });
  const texto = JSON.stringify(exportarDatos(), null, 2);
  const nombre = `hava-respaldo-${hoyISO()}.json`;
  const archivo = new File([texto], nombre, { type: "application/json" });

  try {
    const compartido = await compartirArchivo(archivo);
    if (!compartido) descargarArchivo(archivo);
    mostrarAviso("Respaldo listo ✓");
  } catch (error) {
    // Cerrar el menú Compartir sin elegir nada también llega aquí: no es un error real
    if (error.name !== "AbortError") {
      console.error(error);
      descargarArchivo(archivo);
    }
  }
  dibujar(raiz);
}

/**
 * En celulares usamos el menú Compartir (en iPhone es la forma fiable de guardar
 * un archivo desde una app instalada). Devuelve false si no aplica.
 */
async function compartirArchivo(archivo) {
  const esTactil = window.matchMedia("(pointer: coarse)").matches;
  if (!esTactil || !navigator.canShare?.({ files: [archivo] })) return false;
  await navigator.share({ files: [archivo], title: archivo.name });
  return true;
}

/** En PC: descarga normal del archivo. */
function descargarArchivo(archivo) {
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = archivo.name;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- Importar ----------

async function alElegirArchivo(e, raiz) {
  if (e.target.id !== "archivo-respaldo") return;
  const archivo = e.target.files[0];
  e.target.value = ""; // permite volver a elegir el mismo archivo después
  if (!archivo) return;

  try {
    if (archivo.size > TAMANO_MAXIMO) throw new Error("El archivo es demasiado grande para ser un respaldo.");
    let respaldo;
    try {
      respaldo = JSON.parse(await archivo.text());
    } catch {
      throw new Error("El archivo no es un JSON válido.");
    }
    validarRespaldo(respaldo); // valida ANTES de borrar nada

    const mensaje =
      `Respaldo del ${fechaLegible(respaldo.exportado)}\n` +
      `Contiene: ${resumenContenido(respaldo.datos)}\n\n` +
      "Esto REEMPLAZARÁ todos los datos actuales de este dispositivo. ¿Continuar?";
    if (!confirm(mensaje)) return;

    importarDatos(respaldo);
    mostrarAviso("Respaldo restaurado ✓");
    dibujar(raiz);
  } catch (error) {
    alert(`No se pudo importar: ${error.message}`);
  }
}

/** "12 noches de sueño, 3 hábitos" o "sin registros". */
function resumenContenido(datos) {
  const partes = Object.entries(NOMBRES)
    .map(([clave, nombre]) => {
      const valor = datos[clave];
      const cantidad = Array.isArray(valor) ? valor.length : valor ? Object.keys(valor).length : 0;
      return cantidad ? `${cantidad} ${nombre}` : null;
    })
    .filter(Boolean);
  return partes.length ? partes.join(", ") : "sin registros (solo ajustes)";
}

function fechaLegible(iso) {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "fecha desconocida";
  return fecha.toLocaleString("es-PE", { timeZone: "America/Lima", dateStyle: "medium", timeStyle: "short" });
}

// ---------- Borrar todo ----------

function borrarConConfirmacion(raiz) {
  // Confirmación doble, como pide el diseño: un "sí" y luego escribir BORRAR
  if (!confirm("¿Seguro? Se borrarán TODOS tus datos de este dispositivo. Te recomendamos exportar un respaldo antes.")) return;
  const texto = prompt('Para confirmar, escribe BORRAR (en mayúsculas):');
  if (texto?.trim() !== "BORRAR") {
    mostrarAviso("No se borró nada");
    return;
  }
  borrarTodo();
  iniciarAlmacenamiento();
  mostrarAviso("Datos borrados");
  dibujar(raiz);
}
