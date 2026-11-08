// =========================================================
// archivos.js — entregar un archivo al usuario (respaldo .json, calendario .ics…)
// =========================================================
//
// En iPhone, desde una app instalada, la descarga normal no es fiable: usamos el
// menú Compartir (desde ahí: "Guardar en Archivos", Calendario, AirDrop…).
// En PC, descarga normal.

/**
 * Comparte (celular) o descarga (PC) un archivo.
 * Devuelve "compartido", "descargado" o "cancelado" (si cerraste el menú Compartir).
 */
export async function entregarArchivo(archivo) {
  try {
    if (await compartir(archivo)) return "compartido";
  } catch (error) {
    if (error.name === "AbortError") return "cancelado";
    console.error(error); // si compartir falla por otra razón, intentamos descargar
  }
  descargar(archivo);
  return "descargado";
}

async function compartir(archivo) {
  const esTactil = window.matchMedia("(pointer: coarse)").matches;
  if (!esTactil || !navigator.canShare?.({ files: [archivo] })) return false;
  await navigator.share({ files: [archivo], title: archivo.name });
  return true;
}

function descargar(archivo) {
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = archivo.name;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
