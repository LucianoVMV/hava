// =========================================================
// fechas.js — fechas y horas en la zona de Lima
// =========================================================
//
// ¿Por qué no usar simplemente new Date().toISOString()?
// Porque esa fecha está en UTC: en Lima, a partir de las 7 p.m. ya sería "mañana".
// Aquí siempre calculamos en America/Lima.
//
// Formatos que usamos en toda la app:
//   fecha → "2026-11-07"  (texto AAAA-MM-DD, fácil de ordenar y comparar)
//   hora  → "23:30"       (texto HH:MM, 24 horas)

export const ZONA = "America/Lima";

const formatoFecha = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const formatoHora = new Intl.DateTimeFormat("en-GB", {
  timeZone: ZONA,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Fecha de hoy en Lima: "2026-11-07" */
export function hoyISO(ahora = new Date()) {
  return formatoFecha.format(ahora); // en-CA ya da AAAA-MM-DD
}

/** Hora actual en Lima: "23:30" */
export function horaActual(ahora = new Date()) {
  return formatoHora.format(ahora);
}

/** Convierte "AAAA-MM-DD" en un Date a mediodía UTC (evita líos de zona horaria). */
function aFechaUTC(fechaISO) {
  const [a, m, d] = fechaISO.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d, 12));
}

/** Suma (o resta) días a una fecha: sumarDias("2026-11-07", -1) → "2026-11-06" */
export function sumarDias(fechaISO, dias) {
  const f = aFechaUTC(fechaISO);
  f.setUTCDate(f.getUTCDate() + dias);
  return f.toISOString().slice(0, 10);
}

/** Día de la semana: 0 = domingo, 1 = lunes … 6 = sábado */
export function diaSemana(fechaISO) {
  return aFechaUTC(fechaISO).getUTCDay();
}

/** Días que hay de `desde` a `hasta`: diasEntre("2026-11-05", "2026-11-07") → 2 */
export function diasEntre(desde, hasta) {
  return Math.round((aFechaUTC(hasta) - aFechaUTC(desde)) / 86400000);
}

/** Lista de los últimos `n` días terminando en `hasta` (incluido), del más antiguo al más nuevo. */
export function ultimosDias(n, hasta = hoyISO()) {
  return Array.from({ length: n }, (_, i) => sumarDias(hasta, i - (n - 1)));
}

/** Día de la semana corto: "lun", "mar"… */
export function diaCorto(fechaISO) {
  return aFechaUTC(fechaISO)
    .toLocaleDateString("es-PE", { weekday: "short", timeZone: "UTC" })
    .replace(".", "");
}

/** Fecha legible: "vie 7 nov" */
export function fechaCorta(fechaISO) {
  return aFechaUTC(fechaISO)
    .toLocaleDateString("es-PE", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    .replaceAll(".", "")
    .replace(",", "");
}

/** "23:30" → 1410 (minutos desde la medianoche) */
export function aMinutos(hora) {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

/** 1410 → "23:30" (acepta valores fuera de 0–1439, p. ej. 1470 → "00:30") */
export function deMinutos(minutos) {
  const total = ((Math.round(minutos) % 1440) + 1440) % 1440;
  const h = String(Math.floor(total / 60)).padStart(2, "0");
  const m = String(total % 60).padStart(2, "0");
  return `${h}:${m}`;
}

/** 445 → "7 h 25 min" */
export function formatoDuracion(minutos) {
  const total = Math.round(minutos);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
