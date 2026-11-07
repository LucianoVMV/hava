// =========================================================
// enfoque-datos.js — temporizador Pomodoro y sesiones de estudio (sin pantalla)
// =========================================================
//
// ¿Por qué el temporizador guarda la HORA DE FIN y no "segundos restantes"?
// Porque en iPhone, si bloqueas la pantalla o cambias de app, el navegador
// congela el código. Si guardáramos "quedan 600 s" y lo fuéramos restando, el
// reloj se detendría. Guardando "termina a las 10:25:00", al volver calculamos
// cuánto falta (o si ya terminó) sin importar cuánto tiempo estuvo congelado.
//
// Colección "temporizador" (estado actual):
//   { fase: "enfoque"|"corto"|"largo", estado: "listo"|"corriendo"|"pausado",
//     fin?: ms, restanteMs?: ms, duracionMin, inicio?: ISO, curso, ciclo: 0..n }
// Colección "focusSessions" (historial):
//   [{ id, inicio: ISO, minutos, curso }]
// Ajustes "enfoque": duraciones, meta diaria y lista de cursos.

import { leer, guardar, leerAjustes, guardarAjustes, nuevoId } from "../../storage.js";
import { hoyISO, ultimosDias } from "../../utils/fechas.js";
import { leerHabitos, leerLogs, estaHecho, alternarHecho } from "./habitos-datos.js";

export const AJUSTES_POR_DEFECTO = {
  enfoque: 25, // minutos de estudio
  corto: 5, // descanso corto
  largo: 15, // descanso largo
  cadaLargo: 4, // cada cuántos pomodoros toca el descanso largo
  metaDiaria: 120, // minutos de estudio al día
  cursos: ["Cursos online", "Universidad", "Repaso"],
  pantallaEncendida: true,
};

/**
 * Si un curso se llama igual que un hábito (p. ej. "Cursos online"),
 * al llegar a estos minutos en el día el hábito se marca solo.
 */
export const MINUTOS_PARA_HABITO = 60;

export const FASES = {
  enfoque: { nombre: "Enfoque", emoji: "📚" },
  corto: { nombre: "Descanso corto", emoji: "☕" },
  largo: { nombre: "Descanso largo", emoji: "🌿" },
};

// ---------- Ajustes ----------

export function leerConfig() {
  return leerAjustes("enfoque", AJUSTES_POR_DEFECTO);
}

export function guardarConfig(cambios) {
  return guardarAjustes("enfoque", cambios);
}

// ---------- Estado del temporizador ----------

function estadoInicial(config = leerConfig()) {
  return { fase: "enfoque", estado: "listo", duracionMin: config.enfoque, curso: config.cursos[0] ?? "", ciclo: 0 };
}

export function leerTemporizador() {
  return leer("temporizador", null) ?? estadoInicial();
}

function guardarTemporizador(t) {
  return guardar("temporizador", t);
}

/** Milisegundos que faltan (según la hora de fin, o lo guardado al pausar). */
export function restanteMs(t, ahora = Date.now()) {
  if (t.estado === "corriendo") return Math.max(0, t.fin - ahora);
  if (t.estado === "pausado") return t.restanteMs;
  return t.duracionMin * 60000;
}

export function iniciar(curso) {
  const t = leerTemporizador();
  const ahora = Date.now();
  guardarTemporizador({
    ...t,
    curso: curso ?? t.curso,
    estado: "corriendo",
    fin: ahora + t.duracionMin * 60000,
    inicio: new Date(ahora).toISOString(),
  });
}

export function pausar() {
  const t = leerTemporizador();
  if (t.estado !== "corriendo") return;
  guardarTemporizador({ ...t, estado: "pausado", restanteMs: restanteMs(t), fin: undefined });
}

export function reanudar() {
  const t = leerTemporizador();
  if (t.estado !== "pausado") return;
  guardarTemporizador({ ...t, estado: "corriendo", fin: Date.now() + t.restanteMs, restanteMs: undefined });
}

/** Si el temporizador está esperando, adopta la duración actual de los ajustes. */
export function aplicarDuracionSiListo() {
  const t = leerTemporizador();
  if (t.estado === "listo") guardarTemporizador({ ...t, duracionMin: leerConfig()[t.fase] });
}

export function cambiarCurso(curso) {
  guardarTemporizador({ ...leerTemporizador(), curso });
}

/** Minutos de estudio ya hechos en la fase de enfoque actual. */
export function minutosTranscurridos(t) {
  if (t.fase !== "enfoque" || t.estado === "listo") return 0;
  return Math.floor((t.duracionMin * 60000 - restanteMs(t)) / 60000);
}

/**
 * Detener: si estabas en enfoque y `guardarParcial` es true, guarda lo estudiado.
 * Vuelve al inicio de una fase de enfoque (sin perder el conteo del ciclo).
 */
export function detener(guardarParcial = false) {
  const t = leerTemporizador();
  let habitoMarcado = null;
  if (guardarParcial && t.fase === "enfoque") {
    const minutos = minutosTranscurridos(t);
    if (minutos >= 1) habitoMarcado = agregarSesion({ inicio: t.inicio, minutos, curso: t.curso });
  }
  const config = leerConfig();
  guardarTemporizador({ ...estadoInicial(config), curso: t.curso, ciclo: t.ciclo });
  return habitoMarcado;
}

/** Pasa a la siguiente fase sin terminar la actual (p. ej. "Saltar descanso"). */
export function saltar() {
  const t = leerTemporizador();
  guardarTemporizador(siguienteFase(t, leerConfig()));
}

function siguienteFase(t, config) {
  if (t.fase === "enfoque") {
    const ciclo = t.ciclo + 1;
    const fase = ciclo % config.cadaLargo === 0 ? "largo" : "corto";
    return { ...t, fase, estado: "listo", duracionMin: config[fase], ciclo, fin: undefined, restanteMs: undefined };
  }
  return { ...t, fase: "enfoque", estado: "listo", duracionMin: config.enfoque, fin: undefined, restanteMs: undefined };
}

/**
 * Revisa si la fase en curso ya terminó. Si sí: guarda la sesión (si era enfoque),
 * prepara la siguiente fase y devuelve qué pasó. Si no, devuelve null.
 * Se llama cada segundo y al volver a la app.
 */
export function revisarFin(ahora = Date.now()) {
  const t = leerTemporizador();
  if (t.estado !== "corriendo" || ahora < t.fin) return null;

  let habitoMarcado = null;
  if (t.fase === "enfoque") {
    habitoMarcado = agregarSesion({ inicio: t.inicio, minutos: t.duracionMin, curso: t.curso });
  }
  guardarTemporizador(siguienteFase(t, leerConfig()));
  return { fase: t.fase, curso: t.curso, minutos: t.duracionMin, tarde: ahora - t.fin > 5000, habitoMarcado };
}

// ---------- Sesiones ----------

export function leerSesiones() {
  return leer("focusSessions", []);
}

/**
 * Guarda una sesión de estudio. Devuelve el nombre del hábito que se marcó solo
 * (si el curso coincide con un hábito y se llegó a 60 min hoy), o null.
 */
export function agregarSesion({ inicio, minutos, curso }) {
  const sesiones = leerSesiones();
  const nombreCurso = curso || "Sin curso";
  sesiones.push({ id: nuevoId(), inicio: inicio ?? new Date().toISOString(), minutos, curso: nombreCurso });
  guardar("focusSessions", sesiones);
  return marcarHabitoDelCurso(nombreCurso);
}

export function borrarSesion(id) {
  return guardar("focusSessions", leerSesiones().filter((s) => s.id !== id));
}

/** Fecha (Lima) en que empezó una sesión. */
export function fechaSesion(s) {
  return hoyISO(new Date(s.inicio));
}

export function minutosDelDia(fecha, sesiones = leerSesiones(), curso = null) {
  return sesiones
    .filter((s) => fechaSesion(s) === fecha && (!curso || s.curso === curso))
    .reduce((total, s) => total + s.minutos, 0);
}

/** Minutos por día de los últimos 7 días. */
export function semana(hasta = hoyISO(), sesiones = leerSesiones()) {
  return ultimosDias(7, hasta).map((fecha) => ({ fecha, minutos: minutosDelDia(fecha, sesiones) }));
}

/** Minutos por curso en los últimos 7 días, de mayor a menor. */
export function porCurso(hasta = hoyISO(), sesiones = leerSesiones()) {
  const dias = new Set(ultimosDias(7, hasta));
  const totales = {};
  for (const s of sesiones) {
    if (dias.has(fechaSesion(s))) totales[s.curso] = (totales[s.curso] ?? 0) + s.minutos;
  }
  return Object.entries(totales).sort((a, b) => b[1] - a[1]);
}

/** Si existe un hábito con el mismo nombre que el curso y llegaste a 60 min hoy, lo marca. */
function marcarHabitoDelCurso(curso) {
  const hoy = hoyISO();
  if (minutosDelDia(hoy, leerSesiones(), curso) < MINUTOS_PARA_HABITO) return null;
  const habito = leerHabitos().find((h) => !h.archivado && h.nombre.trim().toLowerCase() === curso.trim().toLowerCase());
  if (!habito || estaHecho(leerLogs(), habito.id, hoy)) return null;
  alternarHecho(habito.id, hoy);
  return habito.nombre;
}

// ---------- Cursos ----------

export function agregarCurso(nombre) {
  const config = leerConfig();
  if (config.cursos.some((c) => c.toLowerCase() === nombre.toLowerCase())) return false;
  return guardarConfig({ cursos: [...config.cursos, nombre] });
}

export function quitarCurso(nombre) {
  return guardarConfig({ cursos: leerConfig().cursos.filter((c) => c !== nombre) });
}
