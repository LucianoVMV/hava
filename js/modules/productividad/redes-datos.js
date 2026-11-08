// =========================================================
// redes-datos.js — tiempo en redes sociales (registro manual, sin pantalla)
// =========================================================
//
// Una PWA NO puede leer el Tiempo de uso del iPhone ni bloquear apps.
// Por eso: tú anotas los minutos que ves en Ajustes → Tiempo de uso,
// y aquí calculamos límites, tendencias y comparaciones.
//
// Colección "socialUsage": { "2026-11-07": { "Instagram": 30, "TikTok": 45 }, ... }
// Ajustes "redes": { limiteDiario, limiteSemanal, apps: [...] }

import { leer, guardar, leerAjustes, guardarAjustes } from "../../storage.js";
import { hoyISO, sumarDias, ultimosDias } from "../../utils/fechas.js";

export const AJUSTES_POR_DEFECTO = {
  limiteDiario: 90, // minutos
  limiteSemanal: 630, // 90 × 7
  apps: ["Instagram", "TikTok", "YouTube"],
};

export function leerConfig() {
  return leerAjustes("redes", AJUSTES_POR_DEFECTO);
}

export function guardarConfig(cambios) {
  return guardarAjustes("redes", cambios);
}

// ---------- Registros ----------

export function leerUso() {
  return leer("socialUsage", {});
}

/** Minutos por app de un día: { Instagram: 30, ... } (vacío si no registraste). */
export function usoDelDia(fecha, uso = leerUso()) {
  return uso[fecha] ?? {};
}

export function totalDelDia(fecha, uso = leerUso()) {
  return Object.values(usoDelDia(fecha, uso)).reduce((a, b) => a + b, 0);
}

export function registrado(fecha, uso = leerUso()) {
  return fecha in uso;
}

/** Guarda los minutos de un día. Con todo en 0 igual queda "registrado" (día sin redes 🎉). */
export function guardarDia(fecha, minutosPorApp) {
  const uso = leerUso();
  const limpio = {};
  for (const [app, min] of Object.entries(minutosPorApp)) {
    if (min > 0) limpio[app] = Math.min(1440, Math.round(min));
  }
  uso[fecha] = limpio;
  return guardar("socialUsage", uso);
}

export function borrarDia(fecha) {
  const uso = leerUso();
  delete uso[fecha];
  return guardar("socialUsage", uso);
}

// ---------- Texto → minutos ----------

/**
 * Entiende lo que escribas como en Tiempo de uso: "45", "1h 23min", "1 h 23 min", "1:23", "2h".
 * Devuelve minutos, 0 si está vacío, o NaN si no se entiende.
 */
export function parsearMinutos(texto) {
  const t = String(texto).trim().toLowerCase().replace(/\s+/g, "");
  if (!t) return 0;
  let m = t.match(/^(\d+):(\d{1,2})$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  m = t.match(/^(?:(\d+)h)?(?:(\d+)(?:m|min)?)?$/);
  if (m && (m[1] || m[2])) return Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0);
  return NaN;
}

// ---------- Estadísticas ----------

/** "ok" (menos del 75 % del límite), "cerca" (75–100 %) o "pasado" (más del límite). */
export function estadoLimite(minutos, limite) {
  if (minutos > limite) return "pasado";
  if (minutos >= limite * 0.75) return "cerca";
  return "ok";
}

/** Resumen de 7 días terminando en `hasta`. */
export function resumenSemana(hasta = hoyISO(), uso = leerUso()) {
  const dias = ultimosDias(7, hasta).map((fecha) => ({
    fecha,
    minutos: totalDelDia(fecha, uso),
    registrado: registrado(fecha, uso),
  }));
  const conDatos = dias.filter((d) => d.registrado);
  const total = conDatos.reduce((s, d) => s + d.minutos, 0);

  const porApp = {};
  for (const d of conDatos) {
    for (const [app, min] of Object.entries(usoDelDia(d.fecha, uso))) porApp[app] = (porApp[app] ?? 0) + min;
  }

  return {
    dias,
    total,
    registrados: conDatos.length,
    promedio: conDatos.length ? total / conDatos.length : null,
    porApp: Object.entries(porApp).sort((a, b) => b[1] - a[1]),
  };
}

/**
 * Compara el promedio diario de esta semana con el de la anterior.
 * Usamos promedio (no total) para que no cuenten los días que olvidaste anotar.
 * Devuelve el % de cambio (negativo = usaste menos 👍) o null si falta información.
 */
export function cambioVsSemanaAnterior(hasta = hoyISO(), uso = leerUso()) {
  const actual = resumenSemana(hasta, uso);
  const anterior = resumenSemana(sumarDias(hasta, -7), uso);
  if (!actual.promedio && actual.promedio !== 0) return null;
  if (!anterior.promedio) return null;
  return Math.round(((actual.promedio - anterior.promedio) / anterior.promedio) * 100);
}

// ---------- Apps ----------

export function agregarApp(nombre) {
  const config = leerConfig();
  if (config.apps.some((a) => a.toLowerCase() === nombre.toLowerCase())) return false;
  return guardarConfig({ apps: [...config.apps, nombre] });
}

export function quitarApp(nombre) {
  return guardarConfig({ apps: leerConfig().apps.filter((a) => a !== nombre) });
}
