// =========================================================
// habitos-datos.js — datos y cálculos de hábitos (sin nada de pantalla)
// =========================================================
//
// Colección "habits" (lista):
//   { id, nombre, emoji, nota, momento: "manana"|"tarde"|"noche",
//     frecuencia: { tipo: "diario" }
//               | { tipo: "dias", dias: [1,3,5] }   (0 = dom … 6 = sáb)
//               | { tipo: "intervalo", cada: 2 },   (cada N días desde la última vez)
//     archivado, creado: "AAAA-MM-DD", orden, minutosAntesDeDormir? }
//
// Colección "habitLogs" (qué hiciste cada día):
//   { "2026-11-07": ["idHabito1", "idHabito2"], ... }
//
// Colección "salida" (checklist "Antes de salir"):
//   { items: [{ id, texto }], fecha: "AAAA-MM-DD", marcados: ["idItem"] }

import { leer, guardar, nuevoId } from "../../storage.js";
import { hoyISO, sumarDias, diaSemana, diasEntre, deMinutos } from "../../utils/fechas.js";
import { leerMetas as leerMetasSueno, minutosNoche } from "./sueno-datos.js";

export const MOMENTOS = [
  { id: "manana", nombre: "Mañana", emoji: "🌅" },
  { id: "tarde", nombre: "Tarde", emoji: "☀️" },
  { id: "noche", nombre: "Noche", emoji: "🌙" },
];

export const DIAS_SEMANA = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

// ---------- Datos iniciales (solo la primera vez) ----------

const HABITOS_INICIALES = [
  ["manana", "🤸", "Estirar al despertar"],
  ["manana", "🛏️", "Tender la cama"],
  ["manana", "🍳", "Desayunar bien"],
  ["manana", "🎯", "Planificar el día", "Elegir las 3 tareas clave de hoy"],
  ["tarde", "💻", "Cursos online", "Mínimo 1 hora"],
  ["tarde", "📱", "Repasar apps de estudio", "Revisar qué tengo pendiente"],
  ["noche", "🍽️", "Dejar la cocina limpia", "Todo lavado"],
  ["noche", "👕", "Ropa en su sitio"],
  ["noche", "🗑️", "Sacar la basura", "", { tipo: "intervalo", cada: 2 }],
  ["noche", "🎒", "Dejar listas mochila y ropa"],
  ["noche", "📝", "Revisar el día", "2 min: qué salió bien y qué ajustar mañana"],
  ["noche", "📵", "Sin celular antes de dormir", "", { tipo: "diario" }, 30],
];

const SALIDA_INICIAL = ["🔑 Llaves", "🔌 Cargador", "🎧 Audífonos"];

function crearIniciales() {
  const hoy = hoyISO();
  return HABITOS_INICIALES.map(([momento, emoji, nombre, nota = "", frecuencia, minutos], i) => ({
    id: nuevoId(),
    nombre,
    emoji,
    nota,
    momento,
    frecuencia: frecuencia ?? { tipo: "diario" },
    archivado: false,
    creado: hoy,
    orden: i,
    ...(minutos ? { minutosAntesDeDormir: minutos } : {}),
  }));
}

// ---------- Hábitos ----------

/** Lee los hábitos. La primera vez (colección vacía) carga los iniciales. */
export function leerHabitos() {
  let habitos = leer("habits", null);
  if (habitos === null) {
    habitos = crearIniciales();
    guardar("habits", habitos);
  }
  return habitos;
}

export function buscarHabito(id) {
  return leerHabitos().find((h) => h.id === id) ?? null;
}

/** Crea (si no tiene id) o actualiza un hábito. */
export function guardarHabito(datos) {
  const habitos = leerHabitos();
  if (datos.id) {
    const i = habitos.findIndex((h) => h.id === datos.id);
    if (i >= 0) habitos[i] = { ...habitos[i], ...datos };
  } else {
    const orden = habitos.reduce((max, h) => Math.max(max, h.orden ?? 0), -1) + 1;
    habitos.push({ ...datos, id: nuevoId(), archivado: false, creado: hoyISO(), orden });
  }
  return guardar("habits", habitos);
}

export function archivarHabito(id, archivado = true) {
  return guardarHabito({ id, archivado });
}

/** Borra el hábito y todo su historial. */
export function eliminarHabito(id) {
  guardar("habits", leerHabitos().filter((h) => h.id !== id));
  const logs = leerLogs();
  for (const fecha of Object.keys(logs)) {
    logs[fecha] = logs[fecha].filter((x) => x !== id);
    if (!logs[fecha].length) delete logs[fecha];
  }
  return guardar("habitLogs", logs);
}

/** Hábitos activos ordenados por momento del día y luego por orden. */
export function habitosActivos(habitos = leerHabitos()) {
  const pos = Object.fromEntries(MOMENTOS.map((m, i) => [m.id, i]));
  return habitos
    .filter((h) => !h.archivado)
    .sort((a, b) => pos[a.momento] - pos[b.momento] || (a.orden ?? 0) - (b.orden ?? 0));
}

// ---------- Registros (qué hiciste) ----------

export function leerLogs() {
  return leer("habitLogs", {});
}

export function estaHecho(logs, id, fecha) {
  return logs[fecha]?.includes(id) ?? false;
}

/** Marca o desmarca un hábito en una fecha. Devuelve true si quedó marcado. */
export function alternarHecho(id, fecha) {
  const logs = leerLogs();
  const lista = logs[fecha] ?? [];
  const marcado = !lista.includes(id);
  logs[fecha] = marcado ? [...lista, id] : lista.filter((x) => x !== id);
  if (!logs[fecha].length) delete logs[fecha];
  guardar("habitLogs", logs);

  // Si marcas un día anterior a la creación del hábito, movemos "creado" hacia atrás
  const habito = buscarHabito(id);
  if (marcado && habito && fecha < habito.creado) guardarHabito({ id, creado: fecha });
  return marcado;
}

/** Fechas en que se hizo un hábito, de la más reciente a la más antigua. */
function fechasHechas(logs, id) {
  return Object.keys(logs)
    .filter((f) => logs[f].includes(id))
    .sort()
    .reverse();
}

// ---------- ¿Toca hoy? ----------

/**
 * ¿Le toca a este hábito en esta fecha?
 *  - diario: siempre.
 *  - dias: si la fecha cae en uno de los días elegidos.
 *  - intervalo (cada N días): si ya pasaron N días desde la última vez que lo hiciste
 *    (o nunca lo hiciste). El día que lo haces también cuenta como "tocaba".
 */
export function tocaEnFecha(habito, fecha, logs) {
  const f = habito.frecuencia;
  if (f.tipo === "dias") return f.dias.includes(diaSemana(fecha));
  if (f.tipo === "intervalo") {
    if (estaHecho(logs, habito.id, fecha)) return true;
    const anterior = fechasHechas(logs, habito.id).find((d) => d < fecha);
    return !anterior || diasEntre(anterior, fecha) >= f.cada;
  }
  return true; // diario
}

/** Texto corto de la frecuencia: "Diario", "lun, mié, vie", "Cada 2 días". */
export function textoFrecuencia(f) {
  if (f.tipo === "dias") return f.dias.length === 7 ? "Diario" : f.dias.map((d) => DIAS_SEMANA[d]).join(", ");
  if (f.tipo === "intervalo") return `Cada ${f.cada} días`;
  return "Diario";
}

/** Para "Sin celular antes de dormir": "desde las 22:30" según tu meta de sueño. */
export function textoAntesDeDormir(habito) {
  if (!habito.minutosAntesDeDormir) return "";
  const { horaMeta } = leerMetasSueno();
  return `desde las ${deMinutos(minutosNoche(horaMeta) - habito.minutosAntesDeDormir)}`;
}

// ---------- Rachas y estadísticas ----------

/**
 * Racha actual: veces seguidas que cumpliste cuando te tocaba.
 * Los días que no tocan no la rompen, y HOY tampoco la rompe mientras el día no termine.
 */
export function racha(habito, logs, hoy = hoyISO()) {
  if (habito.frecuencia.tipo === "intervalo") return rachaIntervalo(habito, logs, hoy);
  let cuenta = 0;
  let fecha = hoy;
  for (let i = 0; i < 1000 && fecha >= habito.creado; i++) {
    if (tocaEnFecha(habito, fecha, logs)) {
      if (estaHecho(logs, habito.id, fecha)) cuenta++;
      else if (fecha !== hoy) break;
    }
    fecha = sumarDias(fecha, -1);
  }
  return cuenta;
}

/** Para "cada N días": cuenta las veces seguidas sin dejar pasar más de N días. */
function rachaIntervalo(habito, logs, hoy) {
  const cada = habito.frecuencia.cada;
  const fechas = fechasHechas(logs, habito.id);
  if (!fechas.length || diasEntre(fechas[0], hoy) > cada) return 0;
  let cuenta = 1;
  for (let i = 1; i < fechas.length && diasEntre(fechas[i], fechas[i - 1]) <= cada; i++) cuenta++;
  return cuenta;
}

/** Mejor racha de la historia. */
export function mejorRacha(habito, logs, hoy = hoyISO()) {
  let mejor = 0;
  let actual = 0;
  if (habito.frecuencia.tipo === "intervalo") {
    const fechas = fechasHechas(logs, habito.id).reverse(); // de la más antigua a la más nueva
    fechas.forEach((f, i) => {
      actual = i > 0 && diasEntre(fechas[i - 1], f) <= habito.frecuencia.cada ? actual + 1 : 1;
      mejor = Math.max(mejor, actual);
    });
    return mejor;
  }
  for (let fecha = habito.creado; fecha <= hoy; fecha = sumarDias(fecha, 1)) {
    if (!tocaEnFecha(habito, fecha, logs)) continue;
    if (estaHecho(logs, habito.id, fecha)) actual++;
    else if (fecha !== hoy) actual = 0;
    mejor = Math.max(mejor, actual);
  }
  return mejor;
}

/** % de cumplimiento en los últimos `dias` días (solo cuenta los días que tocaba). */
export function porcentajeCumplimiento(habito, logs, dias = 30, hoy = hoyISO()) {
  let tocaban = 0;
  let hechos = 0;
  for (let i = 0; i < dias; i++) {
    const fecha = sumarDias(hoy, -i);
    if (fecha < habito.creado) break;
    if (!tocaEnFecha(habito, fecha, logs)) continue;
    const hecho = estaHecho(logs, habito.id, fecha);
    if (fecha === hoy && !hecho) continue; // hoy aún no cuenta como fallado
    tocaban++;
    if (hecho) hechos++;
  }
  return tocaban ? Math.round((hechos / tocaban) * 100) : null;
}

/** Estado de cada día para el mapa de calor. */
export function estadoDia(habito, fecha, logs, hoy = hoyISO()) {
  if (fecha > hoy) return "futuro";
  if (estaHecho(logs, habito.id, fecha)) return "hecho";
  if (fecha < habito.creado) return "antes";
  if (!tocaEnFecha(habito, fecha, logs)) return "libre";
  return fecha === hoy ? "pendiente-hoy" : "fallado";
}

// ---------- Checklist "Antes de salir" ----------

/** Lee la checklist. Los marcados se reinician solos cada día. */
export function leerSalida() {
  let salida = leer("salida", null);
  if (salida === null) {
    salida = { items: SALIDA_INICIAL.map((texto) => ({ id: nuevoId(), texto })), fecha: hoyISO(), marcados: [] };
    guardar("salida", salida);
  }
  if (salida.fecha !== hoyISO()) {
    salida = { ...salida, fecha: hoyISO(), marcados: [] };
    guardar("salida", salida);
  }
  return salida;
}

export function alternarSalida(idItem) {
  const salida = leerSalida();
  salida.marcados = salida.marcados.includes(idItem)
    ? salida.marcados.filter((x) => x !== idItem)
    : [...salida.marcados, idItem];
  return guardar("salida", salida);
}

export function agregarItemSalida(texto) {
  const salida = leerSalida();
  salida.items.push({ id: nuevoId(), texto });
  return guardar("salida", salida);
}

export function quitarItemSalida(idItem) {
  const salida = leerSalida();
  salida.items = salida.items.filter((i) => i.id !== idItem);
  salida.marcados = salida.marcados.filter((x) => x !== idItem);
  return guardar("salida", salida);
}
