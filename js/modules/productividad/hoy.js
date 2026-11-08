// =========================================================
// hoy.js — pantalla "Hoy": lo importante del día en un solo lugar
// =========================================================
//
// Junta datos de los otros módulos (hábitos, agua, sueño, salida).
// No guarda nada propio: usa las funciones de cada *-datos.js,
// así la lógica vive en un solo sitio y no se duplica.

import { escaparHTML as esc, mostrarAviso, milo } from "../../utils/dom.js";
import { ZONA, hoyISO, horaActual, aMinutos, diaCorto, formatoDuracion } from "../../utils/fechas.js";
import { graficoBarras } from "../../utils/graficos.js";
import {
  MOMENTOS,
  habitosActivos,
  leerLogs,
  estaHecho,
  alternarHecho,
  tocaEnFecha,
  textoAntesDeDormir,
  racha,
  leerSalida,
} from "./habitos-datos.js";
import * as agua from "./agua-datos.js";
import * as enfoque from "./enfoque-datos.js";
import {
  leerRegistros,
  leerMetas as leerMetasSueno,
  leerSuenoEnCurso,
  iniciarSueno,
  terminarSueno,
  duracionMinutos,
  cumpleHoraMeta,
} from "./sueno-datos.js";

export const titulo = "Hoy";

// ---------- Entrada ----------

export function render(contenedor) {
  const raiz = document.createElement("div");
  contenedor.replaceChildren(raiz);
  raiz.addEventListener("click", (e) => alHacerClic(e, raiz));
  raiz.addEventListener("change", (e) => alCambiar(e, raiz));
  raiz.addEventListener("submit", (e) => e.preventDefault());
  dibujar(raiz);
}

function dibujar(raiz) {
  // Recordamos si el desplegable del agua estaba abierto para no cerrarlo al redibujar
  const aguaAbierta = raiz.querySelector("#detalle-agua")?.open ?? false;
  const hoy = hoyISO();
  const hora = horaActual();
  raiz.innerHTML =
    saludoHTML(hoy, hora) +
    habitosHTML(hoy, hora) +
    enfoqueHTML(hoy) +
    aguaHTML(hoy, hora, aguaAbierta) +
    suenoHTML(hoy, hora) +
    salidaHTML();
}

// ---------- Enfoque (acceso rápido) ----------

function enfoqueHTML(hoy) {
  const t = enfoque.leerTemporizador();
  const { metaDiaria } = enfoque.leerConfig();
  const minutos = enfoque.minutosDelDia(hoy);
  const fase = enfoque.FASES[t.fase];

  // Texto estático (no hace falta un reloj aquí): cuándo termina o si está en pausa
  let estado = `${formatoDuracion(minutos)} de ${formatoDuracion(metaDiaria)} hoy`;
  if (t.estado === "corriendo") estado = `${fase.emoji} ${fase.nombre} · termina ${horaActual(new Date(t.fin))}`;
  else if (t.estado === "pausado") estado = `${fase.emoji} ${fase.nombre} en pausa`;

  return `
    <a class="tarjeta tarjeta-enlace ${t.estado !== "listo" ? "tarjeta-activa" : ""}" href="#/enfoque">
      <span>⏱️ Enfoque</span>
      <span class="texto-suave">${esc(estado)} ›</span>
    </a>`;
}

// ---------- Saludo ----------

/**
 * Saludo con Milo. Milo cambia según lo que está pasando (en orden de prioridad):
 * durmiendo → estudiando → completaste todo → según la hora del día.
 */
function saludoHTML(hoy, hora) {
  const h = aMinutos(hora) / 60;
  const fecha = new Date().toLocaleDateString("es-PE", { timeZone: ZONA, weekday: "long", day: "numeric", month: "long" });
  const logs = leerLogs();
  const deHoy = habitosActivos().filter((x) => tocaEnFecha(x, hoy, logs));
  const todoHecho = deHoy.length > 0 && deHoy.every((x) => estaHecho(logs, x.id, hoy));

  let saludo = h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
  let pose = h < 12 ? "saludo" : h < 19 ? "cafe" : "meditacion";
  let subtexto = "";
  if (leerSuenoEnCurso()) {
    pose = "descanso";
    subtexto = "Milo sigue dormido… ¿y tú?";
  } else if (enfoque.leerTemporizador().estado === "corriendo") {
    pose = "laptop";
    subtexto = "Modo enfoque activado 💪";
  } else if (todoHecho) {
    pose = "celebracion";
    subtexto = "¡Completaste todos tus hábitos!";
  }

  return `
    <div class="saludo">
      <div>
        <p class="saludo-texto">${saludo} 👋</p>
        <p class="texto-suave">${esc(fecha.charAt(0).toUpperCase() + fecha.slice(1))}</p>
        ${subtexto ? `<p class="saludo-subtexto">${esc(subtexto)}</p>` : ""}
      </div>
      ${milo(pose, { tamano: "medio" })}
    </div>`;
}

// ---------- Hábitos ----------

/** Momento del día según la hora: antes de 12 mañana, antes de 18 tarde, luego noche. */
function momentoActual(hora) {
  const h = aMinutos(hora) / 60;
  return h < 12 ? "manana" : h < 18 ? "tarde" : "noche";
}

function habitosHTML(hoy, hora) {
  const logs = leerLogs();
  const deHoy = habitosActivos().filter((h) => tocaEnFecha(h, hoy, logs));
  const hechos = deHoy.filter((h) => estaHecho(logs, h.id, hoy)).length;
  const pct = deHoy.length ? Math.round((hechos / deHoy.length) * 100) : 0;

  // Mostramos los pendientes del momento actual y de los momentos anteriores
  const orden = MOMENTOS.map((m) => m.id);
  const hastaAhora = orden.slice(0, orden.indexOf(momentoActual(hora)) + 1);
  const pendientes = deHoy.filter((h) => !estaHecho(logs, h.id, hoy) && hastaAhora.includes(h.momento));
  const despues = deHoy.filter((h) => !estaHecho(logs, h.id, hoy) && !hastaAhora.includes(h.momento)).length;

  let cuerpo;
  if (!deHoy.length) cuerpo = `<p class="texto-suave">Hoy no te toca ningún hábito.</p>`;
  else if (hechos === deHoy.length) cuerpo = `<p class="mensaje-exito">¡Completaste todos tus hábitos de hoy! 🎉</p>`;
  else if (!pendientes.length) cuerpo = `<p class="texto-suave">Vas al día ✨ Te quedan ${despues} para más tarde.</p>`;
  else {
    cuerpo = `
      <ul class="lista-checks">${pendientes.map((h) => filaHabitoHTML(h, logs, hoy)).join("")}</ul>
      ${despues ? `<p class="texto-suave nota">Y ${despues} más para más tarde.</p>` : ""}`;
  }

  return `
    <section class="tarjeta">
      <div class="encabezado-progreso">
        <h2>✅ Hábitos</h2>
        <span class="contador">${hechos}/${deHoy.length}</span>
      </div>
      <div class="barra-progreso"><div style="width:${pct}%"></div></div>
      ${cuerpo}
      <a class="enlace-tarjeta" href="#/habitos">Ver todos los hábitos ›</a>
    </section>`;
}

function filaHabitoHTML(h, logs, hoy) {
  const r = racha(h, logs, hoy);
  const detalle = [textoAntesDeDormir(h), h.nota].filter(Boolean).join(" · ");
  return `
    <li class="fila-check">
      <button class="check-principal" data-accion="habito" data-id="${esc(h.id)}" aria-pressed="false">
        <span class="circulo" aria-hidden="true"></span>
        <span class="emoji" aria-hidden="true">${esc(h.emoji)}</span>
        <span class="textos">
          <span class="nombre">${esc(h.nombre)}</span>
          ${detalle ? `<span class="detalle">${esc(detalle)}</span>` : ""}
        </span>
        ${r > 1 ? `<span class="racha">🔥${r}</span>` : ""}
      </button>
    </li>`;
}

// ---------- Agua ----------

function aguaHTML(hoy, hora, abierta) {
  const { meta, mlPorVaso } = agua.leerMetas();
  const vasos = agua.vasosDe(hoy);
  const faltan = Math.max(0, meta - vasos);
  const esperados = agua.vasosEsperados(meta, hora);

  // Un vaso por cada uno de la meta; tocar uno fija el total hasta ese vaso
  const iconos = Array.from({ length: meta }, (_, i) => {
    const lleno = i < vasos;
    return `<button class="vaso ${lleno ? "lleno" : ""}" data-accion="vaso" data-n="${i + 1}"
      aria-label="${i + 1} ${i ? "vasos" : "vaso"}"></button>`;
  }).join("");
  const extra = vasos > meta ? `<span class="vasos-extra">+${vasos - meta}</span>` : "";

  let estado;
  if (faltan === 0) estado = `<div class="fila-milo">${milo("agua", { tamano: "chico" })}<p class="mensaje-exito">¡Meta cumplida! Milo también brinda 🎉</p></div>`;
  else if (vasos < esperados) estado = `<p class="texto-suave">⏰ A esta hora lo ideal es llevar ~${esperados}. Te faltan ${faltan}.</p>`;
  else estado = `<p class="texto-suave">👍 Vas a buen ritmo. Te faltan ${faltan}.</p>`;

  return `
    <section class="tarjeta">
      <div class="encabezado-progreso">
        <h2>💧 Agua</h2>
        <span class="contador">${vasos}/${meta}</span>
      </div>
      <p class="texto-suave">${agua.textoLitros(vasos * mlPorVaso)} de ${agua.textoLitros(meta * mlPorVaso)}</p>
      <div class="vasos">${iconos}${extra}</div>
      ${estado}
      <div class="acciones">
        <button class="btn btn-secundario btn-menos" data-accion="agua-menos" aria-label="Quitar un vaso"${vasos ? "" : " disabled"}>−1</button>
        <button class="btn" data-accion="agua-mas">＋1 vaso</button>
      </div>
      <details class="detalle-desplegable" id="detalle-agua"${abierta ? " open" : ""}>
        <summary>Semana y metas</summary>
        ${semanaAguaHTML(hoy, meta)}
        <form class="fila-2">
          <label class="campo">
            <span>Meta (vasos al día)</span>
            <input type="number" name="metaAgua" value="${meta}" min="1" max="20" inputmode="numeric">
          </label>
          <label class="campo">
            <span>Tamaño del vaso (ml)</span>
            <input type="number" name="mlPorVaso" value="${mlPorVaso}" min="100" max="1000" step="50" inputmode="numeric">
          </label>
        </form>
      </details>
    </section>`;
}

function semanaAguaHTML(hoy, meta) {
  const dias = agua.semana(hoy);
  const cumplidos = dias.filter((d) => d.vasos >= meta).length;
  const grafico = graficoBarras({
    valores: dias.map((d) => d.vasos || null),
    etiquetas: dias.map((d) => diaCorto(d.fecha)),
    meta,
    maximo: Math.max(meta + 2, ...dias.map((d) => d.vasos)),
    cumple: (v) => v >= meta,
    descripcion: "Vasos de agua en los últimos 7 días",
  });
  return `${grafico}<p class="texto-suave nota">Meta cumplida ${cumplidos} de 7 días.</p>`;
}

// ---------- Sueño ----------

function suenoHTML(hoy, hora) {
  const enCurso = leerSuenoEnCurso();
  if (enCurso) {
    return `
      <section class="tarjeta tarjeta-destacada">
        <p class="texto-suave">🌙 Durmiendo desde las <strong>${esc(enCurso.horaDormir)}</strong></p>
        <button class="btn btn-bloque" data-accion="desperte">☀️ Ya desperté</button>
      </section>`;
  }

  const metas = leerMetasSueno();
  const registro = leerRegistros()[hoy];
  const esNoche = aMinutos(hora) >= 18 * 60;

  let resumen;
  if (registro) {
    const minutos = duracionMinutos(registro.horaDormir, registro.horaDespertar);
    const aTiempo = cumpleHoraMeta(registro.horaDormir, metas.horaMeta);
    resumen = `
      <p><strong>${formatoDuracion(minutos)}</strong> <span class="texto-suave">(${esc(registro.horaDormir)} → ${esc(registro.horaDespertar)})</span></p>
      <p class="texto-suave nota">${aTiempo ? "✅ Te dormiste dentro de tu meta" : `⚠️ Te dormiste después de las ${esc(metas.horaMeta)}`}</p>`;
  } else {
    resumen = `<p class="texto-suave">No registraste la noche de hoy. <a href="#/sueno">Registrar ›</a></p>`;
  }

  return `
    <section class="tarjeta">
      <h2>🌙 Sueño ${registro ? "<span class='texto-suave'>· anoche</span>" : ""}</h2>
      ${resumen}
      ${esNoche ? `
        <button class="btn btn-bloque" data-accion="dormir">🌙 Me voy a dormir</button>
        <p class="texto-suave texto-centro nota">Meta: dormir antes de las ${esc(metas.horaMeta)}</p>` : ""}
      <a class="enlace-tarjeta" href="#/sueno">Ver sueño ›</a>
    </section>`;
}

// ---------- Antes de salir (acceso rápido) ----------

function salidaHTML() {
  const { items, marcados } = leerSalida();
  if (!items.length) return "";
  const listos = items.filter((i) => marcados.includes(i.id)).length;
  return `
    <a class="tarjeta tarjeta-enlace" href="#/habitos">
      <span>🚪 Antes de salir</span>
      <span class="texto-suave">${listos === items.length ? "¡Todo listo! ✓" : `${listos}/${items.length} listos`} ›</span>
    </a>`;
}

// ---------- Eventos ----------

function alHacerClic(e, raiz) {
  const boton = e.target.closest("[data-accion]");
  if (!boton) return;
  const hoy = hoyISO();

  switch (boton.dataset.accion) {
    case "habito":
      alternarHecho(boton.dataset.id, hoy);
      mostrarAviso("Hecho ✓");
      break;
    case "agua-mas": {
      const total = agua.sumarVasos(hoy, 1);
      if (total === agua.leerMetas().meta) mostrarAviso("¡Meta de agua cumplida! 💧🎉");
      break;
    }
    case "agua-menos":
      agua.sumarVasos(hoy, -1);
      break;
    case "vaso": {
      // Tocar el último vaso lleno lo vacía; tocar otro llena hasta ahí
      const n = Number(boton.dataset.n);
      agua.fijarVasos(hoy, n === agua.vasosDe(hoy) ? n - 1 : n);
      break;
    }
    case "dormir":
      iniciarSueno(horaActual());
      mostrarAviso("Buenas noches 🌙");
      break;
    case "desperte":
      despertar(hoy);
      break;
    default:
      return;
  }
  dibujar(raiz);
}

function despertar(hoy) {
  const enCurso = leerSuenoEnCurso();
  if (!enCurso) return;
  const hora = horaActual();
  const minutos = duracionMinutos(enCurso.horaDormir, hora);
  if (minutos < 30 && !confirm(`Solo pasaron ${formatoDuracion(minutos)}. ¿Guardar igual?`)) return;
  if (leerRegistros()[hoy] && !confirm("Ya hay un registro para hoy. ¿Reemplazarlo?")) return;
  terminarSueno(hoy, hora);
  mostrarAviso(`Buenos días ☀️ Dormiste ${formatoDuracion(minutos)}`);
}

function alCambiar(e, raiz) {
  const { name, value } = e.target;
  const n = Math.round(Number(value));
  if (name === "metaAgua" && n >= 1 && n <= 20) agua.guardarMetas({ meta: n });
  else if (name === "mlPorVaso" && n >= 100 && n <= 1000) agua.guardarMetas({ mlPorVaso: n });
  else return;
  dibujar(raiz);
}
