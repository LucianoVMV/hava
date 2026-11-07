// =========================================================
// agua-datos.js — contador de vasos de agua (sin nada de pantalla)
// =========================================================
//
// Colección "water": { "2026-11-07": 5, "2026-11-06": 8, ... }  (vasos por día)
// Ajustes "agua":    { meta: 8, mlPorVaso: 250 }

import { leer, guardar, leerAjustes, guardarAjustes } from "../../storage.js";
import { aMinutos, ultimosDias } from "../../utils/fechas.js";

export const METAS_POR_DEFECTO = { meta: 8, mlPorVaso: 250 };

// Horario "despierto" para calcular el ritmo ideal de hidratación
const INICIO_DIA = 7 * 60; // 07:00
const FIN_DIA = 22 * 60; // 22:00

export function leerMetas() {
  return leerAjustes("agua", METAS_POR_DEFECTO);
}

export function guardarMetas(cambios) {
  return guardarAjustes("agua", cambios);
}

export function vasosDe(fecha) {
  return leer("water", {})[fecha] ?? 0;
}

/** Fija los vasos de un día (nunca negativo ni absurdo). */
export function fijarVasos(fecha, vasos) {
  const agua = leer("water", {});
  const valor = Math.max(0, Math.min(40, Math.round(vasos)));
  if (valor === 0) delete agua[fecha];
  else agua[fecha] = valor;
  guardar("water", agua);
  return valor;
}

/** Suma (o resta, con -1) vasos al día. Devuelve el nuevo total. */
export function sumarVasos(fecha, cantidad = 1) {
  return fijarVasos(fecha, vasosDe(fecha) + cantidad);
}

/** 1250 → "1,25 L"; 500 → "500 ml" */
export function textoLitros(ml) {
  if (ml < 1000) return `${ml} ml`;
  return `${(ml / 1000).toLocaleString("es-PE", { maximumFractionDigits: 2 })} L`;
}

/**
 * Cuántos vasos "deberías" llevar a esta hora si repartes la meta
 * de forma pareja entre las 07:00 y las 22:00.
 */
export function vasosEsperados(meta, horaActual) {
  const ahora = aMinutos(horaActual);
  const avance = (ahora - INICIO_DIA) / (FIN_DIA - INICIO_DIA);
  return Math.floor(meta * Math.min(1, Math.max(0, avance)));
}

/** Vasos de los últimos 7 días (para el gráfico). */
export function semana(hasta) {
  const agua = leer("water", {});
  return ultimosDias(7, hasta).map((fecha) => ({ fecha, vasos: agua[fecha] ?? 0 }));
}
