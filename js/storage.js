// =========================================================
// storage.js — capa de datos de toda la app
// =========================================================
//
// TODOS los módulos guardan y leen datos SOLO a través de este archivo.
// Así, si mañana cambiamos localStorage por IndexedDB, solo se toca aquí.
//
// Cómo se guarda: cada "colección" (sleep, habits, settings…) es un valor JSON
// en localStorage con la clave "miniapps.<coleccion>".
// Todo vive en tu dispositivo: no se envía a ningún servidor.

const PREFIJO = "miniapps.";

/** Versión del formato de datos. Si algún día cambia, sirve para migrar respaldos viejos. */
export const VERSION_ESQUEMA = 1;

/** Colecciones que existen en la app (se usan para exportar/importar/borrar). */
export const COLECCIONES = [
  "habits",
  "habitLogs",
  "water",
  "focusSessions",
  "socialUsage",
  "sleep",
  "suenoEnCurso",
  "settings",
  "meta",
];

/** Lee una colección. Si no existe o está dañada, devuelve `porDefecto`. */
export function leer(coleccion, porDefecto = null) {
  try {
    const texto = localStorage.getItem(PREFIJO + coleccion);
    return texto === null ? porDefecto : JSON.parse(texto);
  } catch (error) {
    console.warn(`No se pudo leer "${coleccion}":`, error);
    return porDefecto;
  }
}

/** Guarda una colección completa. Devuelve true si se pudo guardar. */
export function guardar(coleccion, valor) {
  try {
    localStorage.setItem(PREFIJO + coleccion, JSON.stringify(valor));
    return true;
  } catch (error) {
    // Puede fallar si el almacenamiento está lleno o bloqueado
    console.error(`No se pudo guardar "${coleccion}":`, error);
    alert("No se pudieron guardar los datos. Revisa el espacio del dispositivo.");
    return false;
  }
}

/** Borra una colección. */
export function borrar(coleccion) {
  localStorage.removeItem(PREFIJO + coleccion);
}

// ---------- Ajustes (metas y listas) ----------
// settings es un objeto por secciones: { sueno: {...}, agua: {...}, ... }

/** Lee los ajustes de una sección, completando con los valores por defecto. */
export function leerAjustes(seccion, porDefecto = {}) {
  const ajustes = leer("settings", {});
  return { ...porDefecto, ...(ajustes[seccion] || {}) };
}

/** Guarda (mezcla) cambios en los ajustes de una sección. */
export function guardarAjustes(seccion, cambios) {
  const ajustes = leer("settings", {});
  ajustes[seccion] = { ...(ajustes[seccion] || {}), ...cambios };
  return guardar("settings", ajustes);
}

// ---------- Inicio y persistencia ----------

/** Prepara el almacenamiento al abrir la app. */
export function iniciarAlmacenamiento() {
  if (leer("meta") === null) {
    guardar("meta", { versionEsquema: VERSION_ESQUEMA, creado: new Date().toISOString() });
  }
  pedirPersistencia();
}

/**
 * Pide al navegador que NO borre los datos automáticamente cuando falte espacio.
 * iOS puede borrar datos de sitios poco usados; esto reduce ese riesgo
 * (no lo elimina: por eso existe el respaldo).
 */
async function pedirPersistencia() {
  if (!navigator.storage?.persist) return;
  try {
    const yaPersistente = await navigator.storage.persisted();
    if (!yaPersistente) await navigator.storage.persist();
  } catch {
    // Si el navegador no lo permite, seguimos igual
  }
}

// ---------- Respaldo (lo usará la pantalla de Ajustes) ----------

/** Junta todos los datos en un objeto listo para descargar como .json */
export function exportarDatos() {
  const datos = {};
  for (const c of COLECCIONES) {
    const valor = leer(c);
    if (valor !== null) datos[c] = valor;
  }
  return {
    app: "mini-apps",
    versionEsquema: VERSION_ESQUEMA,
    exportado: new Date().toISOString(),
    datos,
  };
}

/** Restaura un respaldo (reemplaza los datos actuales). Lanza error si no es válido. */
export function importarDatos(respaldo) {
  if (!respaldo || respaldo.app !== "mini-apps" || typeof respaldo.datos !== "object") {
    throw new Error("El archivo no es un respaldo válido de Mini Apps.");
  }
  if (respaldo.versionEsquema > VERSION_ESQUEMA) {
    throw new Error("Este respaldo es de una versión más nueva de la app.");
  }
  // Aquí irían las migraciones si versionEsquema < VERSION_ESQUEMA
  for (const c of COLECCIONES) borrar(c);
  for (const [c, valor] of Object.entries(respaldo.datos)) {
    if (COLECCIONES.includes(c)) guardar(c, valor);
  }
}
