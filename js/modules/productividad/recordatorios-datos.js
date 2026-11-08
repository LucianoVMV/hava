// =========================================================
// recordatorios-datos.js — recordatorios para exportar al Calendario (.ics)
// =========================================================
//
// ¿Por qué el Calendario? Una PWA no puede mandar notificaciones programadas con
// la app cerrada (iOS la congela). El Calendario del iPhone sí: importas el .ics
// una vez y te avisa cada día, aunque Hava esté cerrada.
//
// Cada recordatorio guarda: { id, tipo, titulo, hora, dias: [0..6], activo }
// La DESCRIPCIÓN se arma al exportar con tus datos actuales (tus hábitos de la
// mañana, tu checklist "Antes de salir"…), así siempre está al día.

import { leerAjustes, guardarAjustes } from "../../storage.js";
import { deMinutos } from "../../utils/fechas.js";
import { generarICS } from "../../utils/ics.js";
import { habitosActivos, leerSalida } from "./habitos-datos.js";
import { leerMetas as leerMetasSueno, minutosNoche } from "./sueno-datos.js";
import { leerConfig as leerConfigRedes } from "./redes-datos.js";

const TODOS = [0, 1, 2, 3, 4, 5, 6];
const LUN_VIE = [1, 2, 3, 4, 5];

/** Lista inicial. Las horas de sueño salen de tu meta (23:00 → soltar el celular 22:30). */
function iniciales() {
  const { horaMeta } = leerMetasSueno();
  const soltar = deMinutos(minutosNoche(horaMeta) - 30);
  return [
    { id: "manana", tipo: "manana", titulo: "🌅 Rutina de la mañana", hora: "07:00", dias: TODOS, activo: true },
    { id: "salida", tipo: "salida", titulo: "🚪 Antes de salir", hora: "07:15", dias: LUN_VIE, activo: true },
    { id: "redes", tipo: "redes", titulo: "📱 Anotar tiempo de redes", hora: "09:00", dias: TODOS, activo: false },
    { id: "tarde", tipo: "tarde", titulo: "☀️ Hábitos de la tarde", hora: "15:00", dias: TODOS, activo: false },
    { id: "estudio", tipo: "estudio", titulo: "📚 Hora de estudiar (pomodoro)", hora: "16:00", dias: LUN_VIE, activo: false },
    { id: "noche", tipo: "noche", titulo: "🌙 Rutina de la noche", hora: "21:00", dias: TODOS, activo: true },
    { id: "celular", tipo: "celular", titulo: "📵 Soltar el celular", hora: soltar, dias: TODOS, activo: true },
    { id: "respaldo", tipo: "respaldo", titulo: "💾 Respaldo de Hava", hora: "20:00", dias: [0], activo: true },
  ];
}

export function leerRecordatorios() {
  const { lista } = leerAjustes("recordatorios", { lista: null });
  return lista ?? iniciales();
}

export function guardarRecordatorios(lista) {
  return guardarAjustes("recordatorios", { lista });
}

export function actualizarRecordatorio(id, cambios) {
  const lista = leerRecordatorios().map((r) => (r.id === id ? { ...r, ...cambios } : r));
  return guardarRecordatorios(lista);
}

// ---------- Descripciones con tus datos actuales ----------

function listaHabitos(momento) {
  const nombres = habitosActivos()
    .filter((h) => h.momento === momento)
    .map((h) => `${h.emoji} ${h.nombre}`);
  return nombres.length ? nombres.join("\n") : "";
}

function descripcion(r) {
  switch (r.tipo) {
    case "manana":
    case "tarde":
    case "noche":
      return listaHabitos(r.tipo) + "\n\nMárcalos en Hava ✓";
    case "salida":
      return leerSalida().items.map((i) => i.texto).join("\n");
    case "celular": {
      const { horaMeta } = leerMetasSueno();
      return `Tu meta: dormir antes de las ${horaMeta}. Toca «Me voy a dormir» en Hava.`;
    }
    case "redes":
      return `Copia en Hava tu tiempo de ayer (Ajustes → Tiempo de uso). Límite: ${leerConfigRedes().limiteDiario} min al día.`;
    case "estudio":
      return "Abre Enfoque en Hava y empieza un pomodoro de 25 min. Lo difícil es empezar.";
    case "respaldo":
      return "Hava → Más → Ajustes → Exportar respaldo → Guardar en Archivos.";
    default:
      return "";
  }
}

/** Arma el .ics con los recordatorios activos. Devuelve null si no hay ninguno. */
export function generarArchivoICS() {
  const activos = leerRecordatorios().filter((r) => r.activo && r.dias.length);
  if (!activos.length) return null;
  return generarICS({
    nombre: "Hava",
    eventos: activos.map((r) => ({
      uid: `hava-${r.id}`,
      titulo: r.titulo,
      descripcion: descripcion(r),
      hora: r.hora,
      dias: r.dias,
    })),
  });
}
