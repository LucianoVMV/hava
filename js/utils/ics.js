// =========================================================
// ics.js — genera archivos de calendario .ics (estándar iCalendar, RFC 5545)
// =========================================================
//
// Un .ics es texto con un formato fijo que entienden el Calendario del iPhone,
// Google Calendar y Outlook. Cada evento puede repetirse (RRULE) y tener alarma (VALARM).
// Reglas del formato que respetamos aquí:
//   - Saltos de línea CRLF (\r\n).
//   - Líneas de máximo 75 bytes: las más largas se "doblan" (siguiente línea empieza con espacio).
//   - En los textos se escapan \ ; , y los saltos de línea.

import { ZONA, hoyISO, sumarDias, diaSemana } from "./fechas.js";

const CODIGOS_DIA = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"]; // 0 = domingo, como diaSemana()

/** Escapa un texto para usarlo dentro de un campo .ics */
export function escaparTexto(texto) {
  return String(texto)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Dobla una línea larga en trozos de ≤ 75 bytes (sin partir un emoji o una tilde por la mitad). */
export function doblarLinea(linea) {
  const codificador = new TextEncoder();
  const partes = [];
  let actual = "";
  let bytes = 0;
  for (const caracter of linea) {
    const tamano = codificador.encode(caracter).length;
    const limite = partes.length === 0 ? 75 : 74; // las líneas dobladas empiezan con un espacio
    if (bytes + tamano > limite) {
      partes.push(actual);
      actual = "";
      bytes = 0;
    }
    actual += caracter;
    bytes += tamano;
  }
  partes.push(actual);
  return partes.join("\r\n ");
}

/** "2026-11-08" + "07:30" → "20261108T073000" */
function fechaHoraLocal(fecha, hora) {
  return `${fecha.replace(/-/g, "")}T${hora.replace(":", "")}00`;
}

/** Fecha y hora actual en UTC: "20261107T231500Z" */
function marcaUTC(ahora = new Date()) {
  return ahora.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Primera fecha (desde hoy) que cae en uno de los días elegidos. */
export function primeraFecha(dias, desde = hoyISO()) {
  for (let i = 0; i < 7; i++) {
    const fecha = sumarDias(desde, i);
    if (dias.includes(diaSemana(fecha))) return fecha;
  }
  return desde;
}

/**
 * Genera el contenido del .ics.
 * @param {object} op
 * @param {string} op.nombre   nombre del calendario
 * @param {Array<{uid, titulo, descripcion?, hora, dias, duracionMin?, alarmaMin?}>} op.eventos
 *        hora "HH:MM" (hora de Lima), dias [0..6] (0 = domingo)
 */
export function generarICS({ nombre, eventos }) {
  const ahora = marcaUTC();
  const lineas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Hava//Recordatorios//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escaparTexto(nombre)}`,
    `X-WR-TIMEZONE:${ZONA}`,
    // Lima no tiene horario de verano: siempre UTC−5
    "BEGIN:VTIMEZONE",
    `TZID:${ZONA}`,
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:-0500",
    "TZOFFSETTO:-0500",
    "TZNAME:-05",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];

  for (const ev of eventos) {
    const dias = [...ev.dias].sort();
    const regla =
      dias.length === 7 ? "FREQ=DAILY" : `FREQ=WEEKLY;BYDAY=${dias.map((d) => CODIGOS_DIA[d]).join(",")}`;
    lineas.push(
      "BEGIN:VEVENT",
      `UID:${ev.uid}@hava`,
      `DTSTAMP:${ahora}`,
      `DTSTART;TZID=${ZONA}:${fechaHoraLocal(primeraFecha(dias), ev.hora)}`,
      `DURATION:PT${ev.duracionMin ?? 15}M`,
      `RRULE:${regla}`,
      `SUMMARY:${escaparTexto(ev.titulo)}`,
      ...(ev.descripcion ? [`DESCRIPTION:${escaparTexto(ev.descripcion)}`] : []),
      "TRANSP:TRANSPARENT", // no te marca como "ocupado"
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escaparTexto(ev.titulo)}`,
      ev.alarmaMin ? `TRIGGER:-PT${ev.alarmaMin}M` : "TRIGGER:PT0S", // alarma justo a la hora
      "END:VALARM",
      "END:VEVENT"
    );
  }

  lineas.push("END:VCALENDAR");
  return lineas.map(doblarLinea).join("\r\n") + "\r\n";
}
