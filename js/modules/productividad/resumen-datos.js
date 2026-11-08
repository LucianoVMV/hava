// =========================================================
// resumen-datos.js — resumen semanal: junta los datos de todos los módulos
// =========================================================
//
// Una "semana" aquí son 7 días seguidos que terminan en `hasta` (por defecto, hoy).
// Así el resumen siempre tiene una semana completa para comparar, sin importar
// qué día lo abras. La semana anterior son los 7 días justo antes.
//
// No guarda nada: solo lee lo que ya guardaron los otros módulos.

import { hoyISO, sumarDias, ultimosDias, formatoDuracion, deMinutos, aMinutos } from "../../utils/fechas.js";
import { habitosActivos, leerLogs, estaHecho, tocaEnFecha } from "./habitos-datos.js";
import * as sueno from "./sueno-datos.js";
import * as enfoque from "./enfoque-datos.js";
import * as agua from "./agua-datos.js";
import * as redes from "./redes-datos.js";

const promedio = (lista) => (lista.length ? lista.reduce((a, b) => a + b, 0) / lista.length : null);

// ---------- Hábitos ----------

/**
 * % de cumplimiento: de todas las veces que te tocaba algún hábito, cuántas lo hiciste.
 * Hoy solo cuenta si ya lo marcaste (el día no terminó).
 */
function habitos(dias, hoy) {
  const logs = leerLogs();
  const porHabito = habitosActivos()
    .map((h) => {
      let tocaban = 0;
      let hechos = 0;
      for (const fecha of dias) {
        if (fecha < h.creado || !tocaEnFecha(h, fecha, logs)) continue;
        const hecho = estaHecho(logs, h.id, fecha);
        if (fecha === hoy && !hecho) continue;
        tocaban++;
        if (hecho) hechos++;
      }
      return { habito: h, tocaban, hechos, pct: tocaban ? hechos / tocaban : null };
    })
    .filter((x) => x.tocaban > 0);

  const tocaban = porHabito.reduce((s, x) => s + x.tocaban, 0);
  const hechos = porHabito.reduce((s, x) => s + x.hechos, 0);
  // Mejor y más difícil (solo si tocó al menos 3 veces, para que sea justo)
  const justos = porHabito.filter((x) => x.tocaban >= 3).sort((a, b) => b.pct - a.pct);
  return {
    pct: tocaban ? hechos / tocaban : null,
    hechos,
    tocaban,
    mejor: justos[0] ?? null,
    masDificil: justos.length > 1 ? justos[justos.length - 1] : null,
  };
}

// ---------- Estudio ----------

function estudio(dias, hasta) {
  const { metaDiaria } = enfoque.leerConfig();
  const sesiones = enfoque.leerSesiones();
  const porDia = dias.map((fecha) => enfoque.minutosDelDia(fecha, sesiones));
  const total = porDia.reduce((a, b) => a + b, 0);
  return {
    total,
    diasConMeta: porDia.filter((m) => m >= metaDiaria).length,
    diasEstudiados: porDia.filter((m) => m > 0).length,
    metaDiaria,
    cursoTop: enfoque.porCurso(hasta, sesiones)[0] ?? null,
  };
}

// ---------- Sueño ----------

function suenoSemana(hasta) {
  const metas = sueno.leerMetas();
  const r = sueno.resumenSemana(sueno.leerRegistros(), metas, hasta);
  return {
    promedioMin: r.promedioMinutos,
    regularidadMin: r.regularidadMinutos,
    enMeta: r.enMeta,
    registradas: r.registradas,
    metaHoras: metas.horasMeta,
    horaMeta: metas.horaMeta,
  };
}

// ---------- Agua ----------

function aguaSemana(hasta) {
  const { meta } = agua.leerMetas();
  const dias = agua.semana(hasta).filter((d) => d.vasos > 0);
  return {
    promedio: promedio(dias.map((d) => d.vasos)),
    diasConMeta: dias.filter((d) => d.vasos >= meta).length,
    diasRegistrados: dias.length,
    meta,
  };
}

// ---------- Redes ----------

function redesSemana(hasta) {
  const { limiteDiario } = redes.leerConfig();
  const r = redes.resumenSemana(hasta);
  return {
    promedio: r.promedio,
    total: r.total,
    diasPasados: r.dias.filter((d) => d.registrado && d.minutos > limiteDiario).length,
    registrados: r.registrados,
    appTop: r.porApp[0] ?? null,
    limiteDiario,
  };
}

// ---------- Resumen completo ----------

/** Todo el resumen de una semana (terminando en `hasta`). */
export function resumenDeSemana(hasta = hoyISO()) {
  const hoy = hoyISO();
  const dias = ultimosDias(7, hasta);
  return {
    desde: dias[0],
    hasta,
    habitos: habitos(dias, hoy),
    estudio: estudio(dias, hasta),
    sueno: suenoSemana(hasta),
    agua: aguaSemana(hasta),
    redes: redesSemana(hasta),
  };
}

/** Esta semana y la anterior, listas para comparar. */
export function compararSemanas(hasta = hoyISO()) {
  return { actual: resumenDeSemana(hasta), anterior: resumenDeSemana(sumarDias(hasta, -7)) };
}

/**
 * Diferencia entre dos valores para mostrar "▲ 12 %".
 * `masEsMejor` dice si subir es bueno (estudio) o malo (redes).
 * `puntos`: para valores que YA son porcentajes (como el cumplimiento de hábitos)
 * mostramos la resta en puntos (de 40 % a 60 % = "▲ 20 pts"), porque un
 * "▲ 50 %" de un porcentaje confunde.
 * Devuelve null si falta alguno de los dos valores.
 */
export function diferencia(actual, anterior, masEsMejor = true, { puntos = false } = {}) {
  if (actual === null || actual === undefined || anterior === null || anterior === undefined) return null;
  if (!puntos && !anterior) return null; // no se puede dividir entre 0
  const valor = puntos ? Math.round((actual - anterior) * 100) : Math.round(((actual - anterior) / anterior) * 100);
  const unidad = puntos ? "pts" : "%";
  if (valor === 0) return { pct: 0, sube: false, bueno: true, unidad };
  const sube = valor > 0;
  return { pct: Math.abs(valor), sube, bueno: sube === masEsMejor, unidad };
}

// =========================================================
// CONCLUSIONES (reglas simples, sin IA)
// =========================================================
//
// Cada regla mira un dato y, si se cumple una condición, propone un mensaje.
// Las reglas "a mejorar" están ordenadas por impacto (sueño y redes primero):
// mostramos como máximo 1 logro y 2 cosas a mejorar, para que sea accionable
// y no una lista larga que nadie lee.


const pctTexto = (x) => `${Math.round(x * 100)} %`;

function reglasAMejorar(a) {
  const tips = [];
  const { sueno: s, redes: r, habitos: h, estudio: e, agua: w } = a;
  const metaSuenoMin = s.metaHoras * 60;

  if (s.registradas >= 3 && s.promedioMin < metaSuenoMin - 30) {
    const soltar = deMinutos(aMinutos(s.horaMeta) - 30);
    tips.push({
      icono: "🌙",
      texto: `Dormiste ${formatoDuracion(s.promedioMin)} en promedio, ${formatoDuracion(metaSuenoMin - s.promedioMin)} menos que tu meta. Esta semana suelta el celular a las ${soltar}.`,
    });
  }
  if (r.registrados >= 3 && (r.diasPasados >= 3 || r.promedio > r.limiteDiario)) {
    const app = r.appTop ? ` (${r.appTop[0]} fue la que más usaste)` : "";
    tips.push({
      icono: "📱",
      texto: `Pasaste tu límite de redes ${r.diasPasados} de ${r.registrados} días${app}. Activa Límites de apps en el iPhone: la guía está en Redes → ❓.`,
    });
  }
  if (h.pct !== null && h.pct < 0.4) {
    tips.push({
      icono: "✅",
      texto: `Cumpliste ${pctTexto(h.pct)} de tus hábitos. Quizás son muchos a la vez: archiva 1 o 2 y enfócate en los que más te importan.`,
    });
  } else if (h.masDificil && h.masDificil.pct < 0.5) {
    const x = h.masDificil;
    tips.push({
      icono: "✅",
      texto: `«${x.habito.nombre}» fue el más difícil (${x.hechos} de ${x.tocaban}). ¿Y si lo cambias de momento del día o lo haces más pequeño?`,
    });
  }
  if (s.regularidadMin !== null && s.regularidadMin > 60) {
    tips.push({
      icono: "⏰",
      texto: `Tu hora de dormir varió ±${Math.round(s.regularidadMin)} min. Acostarte siempre a la misma hora mejora tu descanso tanto como dormir más.`,
    });
  }
  if (e.total === 0) {
    tips.push({ icono: "📚", texto: "No registraste estudio esta semana. Empieza con un solo pomodoro de 25 min al día: lo difícil es empezar." });
  } else if (e.diasConMeta < 3) {
    tips.push({
      icono: "📚",
      texto: `Llegaste a tu meta de estudio ${e.diasConMeta} de 7 días. Haz el primer pomodoro apenas termines clases, antes de abrir el celular.`,
    });
  }
  if (w.diasRegistrados >= 3 && w.promedio < w.meta * 0.75) {
    tips.push({
      icono: "💧",
      texto: `Tomaste ${w.promedio.toFixed(1).replace(".0", "")} vasos al día en promedio (meta ${w.meta}). Truco: un vaso al despertar y uno con cada comida.`,
    });
  }
  return tips;
}

function reglasLogros(a, b) {
  const logros = [];
  const { sueno: s, redes: r, habitos: h, estudio: e, agua: w } = a;

  const cambioRedes = diferencia(r.promedio, b.redes.promedio, false);
  if (cambioRedes && cambioRedes.bueno && cambioRedes.pct >= 10) {
    logros.push({ icono: "📱", texto: `Usaste ${cambioRedes.pct} % menos redes que la semana pasada. ¡Eso es tiempo que recuperaste!` });
  }
  if (h.pct !== null && h.pct >= 0.8) {
    logros.push({ icono: "🔥", texto: `Cumpliste ${pctTexto(h.pct)} de tus hábitos. ¡Excelente constancia!` });
  } else if (h.pct !== null && b.habitos.pct !== null && h.pct - b.habitos.pct >= 0.1) {
    logros.push({ icono: "📈", texto: `Subiste de ${pctTexto(b.habitos.pct)} a ${pctTexto(h.pct)} en tus hábitos.` });
  }
  if (h.mejor && h.mejor.pct === 1 && h.mejor.tocaban >= 5) {
    logros.push({ icono: "⭐", texto: `«${h.mejor.habito.nombre}»: ${h.mejor.hechos} de ${h.mejor.tocaban}. Ya es parte de tu rutina.` });
  }
  const cambioEstudio = diferencia(e.total, b.estudio.total, true);
  if (cambioEstudio && cambioEstudio.bueno && cambioEstudio.pct >= 15) {
    logros.push({ icono: "📚", texto: `Estudiaste ${formatoDuracion(e.total)}, ${cambioEstudio.pct} % más que la semana pasada.` });
  }
  if (s.registradas >= 3 && s.promedioMin >= s.metaHoras * 60) {
    logros.push({ icono: "🌙", texto: `Dormiste ${formatoDuracion(s.promedioMin)} en promedio: ¡cumpliste tu meta de sueño!` });
  }
  if (w.diasConMeta >= 5) {
    logros.push({ icono: "💧", texto: `Cumpliste tu meta de agua ${w.diasConMeta} de 7 días.` });
  }
  return logros;
}

/** ¿Hay suficientes datos para opinar? (al menos algo anotado en la semana) */
function hayDatos(a) {
  return (
    (a.habitos.tocaban > 0 && a.habitos.hechos > 0) ||
    a.estudio.total > 0 ||
    a.sueno.registradas > 0 ||
    a.agua.diasRegistrados > 0 ||
    a.redes.registrados > 0
  );
}

/**
 * Conclusión de la semana: un título, la pose de Milo, 1 logro y hasta 2 cosas a mejorar.
 */
export function conclusion(actual, anterior) {
  if (!hayDatos(actual)) {
    return {
      titulo: "Aún no hay datos de esta semana",
      pose: "ideas",
      logro: null,
      mejorar: [],
      texto: "Marca tus hábitos, anota tu sueño y tus redes unos días, y aquí verás cómo te fue.",
    };
  }
  const logros = reglasLogros(actual, anterior);
  const mejorar = reglasAMejorar(actual).slice(0, 2);

  let titulo;
  let pose;
  if (!mejorar.length) [titulo, pose] = ["¡Gran semana! 🎉", "logro"];
  else if (logros.length) [titulo, pose] = ["Buena semana, con cosas por ajustar", "objetivos"];
  else [titulo, pose] = ["Semana difícil: la próxima puede ser mejor", "ideas"];

  return { titulo, pose, logro: logros[0] ?? null, mejorar, texto: "" };
}
