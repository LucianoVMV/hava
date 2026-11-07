// =========================================================
// sueno-datos.js — datos y cálculos de sueño (sin nada de pantalla)
// =========================================================
//
// Formato guardado en la colección "sleep" (un registro por noche):
//   { "2026-11-07": { horaDormir: "23:10", horaDespertar: "07:00" }, ... }
// La clave es la fecha del día en que DESPIERTAS
// (dormir el lunes 23:30 y despertar el martes = registro del martes).

import { leer, guardar, leerAjustes, guardarAjustes } from "../../storage.js";
import { aMinutos, ultimosDias } from "../../utils/fechas.js";

export const METAS_POR_DEFECTO = {
  horaMeta: "23:00", // hora objetivo para irte a dormir
  horasMeta: 7.5, // horas de sueño objetivo
};

// ---------- Lectura y escritura ----------

export function leerRegistros() {
  return leer("sleep", {});
}

export function guardarRegistro(fecha, horaDormir, horaDespertar) {
  const registros = leerRegistros();
  registros[fecha] = { horaDormir, horaDespertar };
  return guardar("sleep", registros);
}

export function borrarRegistro(fecha) {
  const registros = leerRegistros();
  delete registros[fecha];
  return guardar("sleep", registros);
}

export function leerMetas() {
  return leerAjustes("sueno", METAS_POR_DEFECTO);
}

export function guardarMetas(cambios) {
  return guardarAjustes("sueno", cambios);
}

// "Me voy a dormir": guarda la hora en que te acostaste hasta que toques "Ya desperté"
export function leerSuenoEnCurso() {
  return leer("suenoEnCurso", null); // { horaDormir: "23:12" } o null
}

export function iniciarSueno(horaDormir) {
  return guardar("suenoEnCurso", { horaDormir });
}

export function cancelarSueno() {
  return guardar("suenoEnCurso", null);
}

// ---------- Cálculos ----------

/**
 * Minutos dormidos. Si despertar es "antes" que dormir, cruzaste la medianoche.
 * Si ambas horas son iguales devuelve 0 (no 24 h): casi seguro es un error de registro.
 */
export function duracionMinutos(horaDormir, horaDespertar) {
  let minutos = aMinutos(horaDespertar) - aMinutos(horaDormir);
  if (minutos < 0) minutos += 24 * 60;
  return minutos;
}

/**
 * Convierte la hora de dormir en un número que se pueda promediar.
 * Problema: 23:30 (1410) y 00:30 (30) están a 1 hora, pero numéricamente lejos.
 * Solución: las horas antes del mediodía cuentan como "después de medianoche" (+24 h),
 * así 00:30 → 1470, y 23:30 y 00:30 quedan a 60 minutos.
 */
export function minutosNoche(hora) {
  const m = aMinutos(hora);
  return m < 12 * 60 ? m + 24 * 60 : m;
}

/** ¿Te dormiste a la hora meta o antes? */
export function cumpleHoraMeta(horaDormir, horaMeta) {
  return minutosNoche(horaDormir) <= minutosNoche(horaMeta);
}

/** Promedio de una lista de números (null si está vacía). */
function promedio(numeros) {
  return numeros.length ? numeros.reduce((a, b) => a + b, 0) / numeros.length : null;
}

/**
 * Regularidad = desviación estándar de la hora de dormir, en minutos.
 * Dice "cuánto se aleja, en promedio, tu hora de dormir de lo habitual".
 * Necesita al menos 2 noches.
 */
function desviacionMinutos(horas) {
  if (horas.length < 2) return null;
  const valores = horas.map(minutosNoche);
  const media = promedio(valores);
  const varianza = promedio(valores.map((v) => (v - media) ** 2));
  return Math.sqrt(varianza);
}

/** Resumen de los últimos 7 días (terminando en `hasta`). */
export function resumenSemana(registros, metas, hasta) {
  const dias = ultimosDias(7, hasta);
  const noches = dias.map((fecha) => ({ fecha, registro: registros[fecha] || null }));
  const conDatos = noches.filter((n) => n.registro);

  const duraciones = conDatos.map((n) =>
    duracionMinutos(n.registro.horaDormir, n.registro.horaDespertar)
  );
  const horasDormir = conDatos.map((n) => n.registro.horaDormir);

  return {
    noches, // los 7 días, con o sin registro (para el gráfico)
    registradas: conDatos.length,
    promedioMinutos: promedio(duraciones),
    promedioHoraDormir: horasDormir.length ? promedio(horasDormir.map(minutosNoche)) : null,
    regularidadMinutos: desviacionMinutos(horasDormir),
    enMeta: horasDormir.filter((h) => cumpleHoraMeta(h, metas.horaMeta)).length,
  };
}

/** Registros ordenados del más reciente al más antiguo. */
export function historial(registros, limite = 14) {
  return Object.entries(registros)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, limite)
    .map(([fecha, r]) => ({ fecha, ...r, minutos: duracionMinutos(r.horaDormir, r.horaDespertar) }));
}
