// =========================================================
// redes.js — pantalla de Redes sociales (registro manual + límites + tendencia)
// =========================================================

import { escaparHTML as esc, mostrarAviso, milo } from "../../utils/dom.js";
import { hoyISO, horaActual, aMinutos, sumarDias, diaCorto, fechaCorta, formatoDuracion } from "../../utils/fechas.js";
import { graficoBarras } from "../../utils/graficos.js";
import * as r from "./redes-datos.js";

export const titulo = "Redes";

const GUIA_ATAJOS = "https://github.com/LucianoVMV/hava/blob/main/docs/atajos-ios.md";

// Día que estás registrando. En la mañana lo normal es anotar lo de AYER
// (el día ya terminó y Tiempo de uso tiene el total completo).
let fechaSeleccionada = null;

function fechaPorDefecto() {
  return aMinutos(horaActual()) < 12 * 60 ? sumarDias(hoyISO(), -1) : hoyISO();
}

// ---------- Entrada ----------

export function render(contenedor) {
  fechaSeleccionada = fechaPorDefecto();
  const raiz = document.createElement("div");
  contenedor.replaceChildren(raiz);
  raiz.addEventListener("click", (ev) => alHacerClic(ev, raiz));
  raiz.addEventListener("change", (ev) => alCambiar(ev, raiz));
  raiz.addEventListener("submit", (ev) => alEnviar(ev, raiz));
  dibujar(raiz);
}

function dibujar(raiz) {
  const abiertos = new Set([...raiz.querySelectorAll("details[open]")].map((d) => d.id));
  const config = r.leerConfig();
  const uso = r.leerUso();
  raiz.innerHTML =
    registroHTML(config, uso) +
    semanaHTML(config, uso) +
    ayudaHTML(abiertos.has("detalle-ayuda")) +
    ajustesHTML(config, abiertos.has("detalle-limites"));
}

// ---------- Registro del día ----------

function registroHTML(config, uso) {
  const hoy = hoyISO();
  const ayer = sumarDias(hoy, -1);
  const delDia = r.usoDelDia(fechaSeleccionada, uso);
  const total = r.totalDelDia(fechaSeleccionada, uso);
  const hayRegistro = r.registrado(fechaSeleccionada, uso);
  const estado = r.estadoLimite(total, config.limiteDiario);
  const pct = Math.min(100, Math.round((total / config.limiteDiario) * 100));

  // Apps de la lista + las que tengan datos ese día aunque ya no estén en la lista
  const apps = [...config.apps, ...Object.keys(delDia).filter((a) => !config.apps.includes(a))];
  const filas = apps
    .map(
      (app, i) => `
      <label class="fila-app">
        <span>${esc(app)}</span>
        <input name="app-${i}" data-app="${esc(app)}" value="${delDia[app] ? esc(formatoDuracion(delDia[app])) : ""}"
          placeholder="0 min" inputmode="text" autocomplete="off" aria-label="Minutos en ${esc(app)}">
      </label>`
    )
    .join("");

  const chip = (fecha, texto) =>
    `<button type="button" class="chip-boton ${fecha === fechaSeleccionada ? "activo" : ""}" data-accion="fecha" data-fecha="${fecha}">${texto}</button>`;

  let mensaje = "";
  if (hayRegistro) {
    const pose = { ok: "meditacion", cerca: "notificaciones", pasado: "preocupado" }[estado];
    const texto = {
      ok: total === 0 ? "¡Un día sin redes! Milo está impresionado." : "Dentro de tu límite. ¡Bien!",
      cerca: `Cerca del límite: te quedaban ${formatoDuracion(config.limiteDiario - total)}.`,
      pasado: `Te pasaste por ${formatoDuracion(total - config.limiteDiario)}. Mañana es otra oportunidad.`,
    }[estado];
    mensaje = `<div class="fila-milo">${milo(pose, { tamano: "chico" })}<p class="texto-suave">${esc(texto)}</p></div>`;
  }

  return `
    <section class="tarjeta">
      <div class="chips-fecha">
        ${chip(ayer, "Ayer")}
        ${chip(hoy, "Hoy")}
        <input type="date" class="input-fecha" name="fecha" value="${fechaSeleccionada}" max="${hoy}" aria-label="Otro día">
      </div>
      <div class="encabezado-progreso">
        <h2>${esc(fechaCorta(fechaSeleccionada))}</h2>
        <span class="contador estado-${hayRegistro ? estado : "ok"}">${hayRegistro ? formatoDuracion(total) : "—"}</span>
      </div>
      <div class="barra-progreso barra-${estado}"><div style="width:${hayRegistro ? pct : 0}%"></div></div>
      <p class="texto-suave nota">Límite diario: ${formatoDuracion(config.limiteDiario)}</p>
      ${mensaje}
      <form id="form-redes" class="formulario">
        ${filas}
        <p class="texto-suave nota">Escribe como lo ves en Tiempo de uso: «45», «1 h 23 min» o «1:23».</p>
        <div class="acciones">
          <button class="btn" type="submit">${hayRegistro ? "Actualizar" : "Guardar"}</button>
          ${hayRegistro ? `<button class="btn btn-secundario" type="button" data-accion="borrar">Borrar día</button>` : ""}
        </div>
      </form>
    </section>`;
}

// ---------- Semana ----------

function semanaHTML(config, uso) {
  const hoy = hoyISO();
  const semana = r.resumenSemana(hoy, uso);
  const cambio = r.cambioVsSemanaAnterior(hoy, uso);
  const estado = r.estadoLimite(semana.total, config.limiteSemanal);
  const pct = Math.min(100, Math.round((semana.total / config.limiteSemanal) * 100));
  const limiteHoras = config.limiteDiario / 60;

  if (!semana.registrados) {
    return `
      <section class="tarjeta">
        <h2>Últimos 7 días</h2>
        <div class="fila-milo">${milo("ideas", { tamano: "chico" })}
          <p class="texto-suave">Anota tu tiempo unos días y aquí verás tu tendencia.</p></div>
      </section>`;
  }

  const grafico = graficoBarras({
    valores: semana.dias.map((d) => (d.registrado ? d.minutos / 60 : null)),
    etiquetas: semana.dias.map((d) => diaCorto(d.fecha)),
    meta: limiteHoras,
    maximo: Math.max(limiteHoras * 1.5, ...semana.dias.map((d) => d.minutos / 60)),
    cumple: (horas) => horas <= limiteHoras,
    descripcion: "Horas en redes en los últimos 7 días",
  });

  let comparacion = "";
  if (cambio !== null) {
    comparacion =
      cambio <= 0
        ? `<p class="cambio cambio-bueno">▼ ${Math.abs(cambio)} % menos que la semana pasada 👏</p>`
        : `<p class="cambio cambio-malo">▲ ${cambio} % más que la semana pasada</p>`;
  }

  const maximo = semana.porApp[0]?.[1] ?? 1;
  const apps = semana.porApp
    .map(
      ([app, min]) => `
      <li>
        <span class="nombre-curso">${esc(app)}</span>
        <span class="barra-curso"><span style="width:${Math.round((min / maximo) * 100)}%"></span></span>
        <span class="total-curso">${formatoDuracion(min)}</span>
      </li>`
    )
    .join("");

  return `
    <section class="tarjeta">
      <div class="encabezado-progreso">
        <h2>Últimos 7 días</h2>
        <span class="contador estado-${estado}">${formatoDuracion(semana.total)}</span>
      </div>
      <div class="barra-progreso barra-${estado}"><div style="width:${pct}%"></div></div>
      <p class="texto-suave nota">Límite semanal: ${formatoDuracion(config.limiteSemanal)} · promedio ${formatoDuracion(semana.promedio)} al día (${semana.registrados} ${semana.registrados === 1 ? "día anotado" : "días anotados"})</p>
      ${comparacion}
      ${grafico}
      <p class="leyenda"><span class="linea-meta"></span> límite diario</p>
      ${apps ? `<ul class="lista-cursos">${apps}</ul>` : ""}
    </section>`;
}

// ---------- Ayuda ----------

function ayudaHTML(abierto) {
  return `
    <details class="tarjeta detalle-tarjeta" id="detalle-ayuda"${abierto ? " open" : ""}>
      <summary>❓ ¿Dónde veo mi tiempo? ¿Cómo lo limito?</summary>
      <div class="ayuda">
        <h3 class="subtitulo">Ver el dato en el iPhone</h3>
        <ol>
          <li>Abre <strong>Ajustes → Tiempo de uso</strong>.</li>
          <li>Toca <strong>Ver toda la actividad</strong> y elige <strong>Día</strong>.</li>
          <li>Desliza para ver el día que quieres (ayer, por ejemplo).</li>
          <li>Baja a <strong>Más usadas</strong>: ahí está el tiempo de cada app. Cópialo aquí.</li>
        </ol>
        <h3 class="subtitulo">Limitar de verdad (lo hace el iPhone, no esta app)</h3>
        <ul>
          <li><strong>Límites de apps</strong>: Ajustes → Tiempo de uso → Límites de apps → Añadir límite →
            elige «Redes sociales» y pon tu tiempo. Al llegar, el iPhone tapa la app.</li>
          <li><strong>Aviso al abrir Instagram/TikTok</strong>: con una automatización de Atajos te sale un
            mensaje cada vez que la abres, para pensarlo dos veces.</li>
        </ul>
        <a class="enlace-tarjeta" href="${GUIA_ATAJOS}" target="_blank" rel="noopener">Ver la guía paso a paso ›</a>
        <p class="texto-suave nota">Una app web no puede leer tu Tiempo de uso ni bloquear apps: por eso el registro es manual.</p>
      </div>
    </details>`;
}

// ---------- Límites y apps ----------

function ajustesHTML(config, abierto) {
  const apps = config.apps
    .map(
      (a) => `
      <li class="fila-check">
        <span class="texto-item">${esc(a)}</span>
        <button class="btn-icono peligro" data-accion="quitar-app" data-app="${esc(a)}" aria-label="Quitar ${esc(a)}">✕</button>
      </li>`
    )
    .join("");

  return `
    <details class="tarjeta detalle-tarjeta" id="detalle-limites"${abierto ? " open" : ""}>
      <summary>⚙️ Límites y apps</summary>
      <div class="formulario ajustes-enfoque">
        <div class="fila-2">
          <label class="campo">
            <span>Límite diario</span>
            <input name="limiteDiario" value="${esc(formatoDuracion(config.limiteDiario))}" inputmode="text">
          </label>
          <label class="campo">
            <span>Límite semanal</span>
            <input name="limiteSemanal" value="${esc(formatoDuracion(config.limiteSemanal))}" inputmode="text">
          </label>
        </div>
        <h3 class="subtitulo">Apps que registras</h3>
        <ul class="lista-checks">${apps}</ul>
        <form id="form-app" class="fila-agregar">
          <input name="app" placeholder="Ej.: Facebook" maxlength="30" required aria-label="Nueva app">
          <button class="btn" type="submit">Agregar</button>
        </form>
      </div>
    </details>`;
}

// =========================================================
// EVENTOS
// =========================================================

function alHacerClic(ev, raiz) {
  const boton = ev.target.closest("[data-accion]");
  if (!boton) return;
  switch (boton.dataset.accion) {
    case "fecha":
      fechaSeleccionada = boton.dataset.fecha;
      break;
    case "borrar":
      if (!confirm(`¿Borrar el registro del ${fechaCorta(fechaSeleccionada)}?`)) return;
      r.borrarDia(fechaSeleccionada);
      mostrarAviso("Registro borrado");
      break;
    case "quitar-app":
      if (r.leerConfig().apps.length <= 1) return mostrarAviso("Deja al menos una app");
      r.quitarApp(boton.dataset.app);
      break;
    default:
      return;
  }
  dibujar(raiz);
}

function alCambiar(ev, raiz) {
  const { name, value } = ev.target;
  if (name === "fecha" && value && value <= hoyISO()) {
    fechaSeleccionada = value;
    dibujar(raiz);
  } else if (name === "limiteDiario" || name === "limiteSemanal") {
    const minutos = r.parsearMinutos(value);
    const [min, max] = name === "limiteDiario" ? [5, 1440] : [5, 10080];
    if (!(minutos >= min && minutos <= max)) {
      mostrarAviso("Escribe un tiempo válido, p. ej. «1 h 30 min»");
      dibujar(raiz);
      return;
    }
    const cambios = { [name]: minutos };
    // Si cambias el diario y el semanal era exactamente 7 veces el anterior, lo ajustamos también
    const config = r.leerConfig();
    if (name === "limiteDiario" && config.limiteSemanal === config.limiteDiario * 7) cambios.limiteSemanal = minutos * 7;
    r.guardarConfig(cambios);
    mostrarAviso("Límite guardado ✓");
    dibujar(raiz);
  }
}

function alEnviar(ev, raiz) {
  ev.preventDefault();
  const form = ev.target;

  if (form.id === "form-app") {
    const nombre = form.app.value.trim().slice(0, 30);
    if (nombre && !r.agregarApp(nombre)) mostrarAviso("Esa app ya está en la lista");
    dibujar(raiz);
    return;
  }

  if (form.id === "form-redes") {
    const minutos = {};
    for (const input of form.querySelectorAll("input[data-app]")) {
      const valor = r.parsearMinutos(input.value);
      if (Number.isNaN(valor)) {
        input.focus();
        return mostrarAviso(`No entendí el tiempo de ${input.dataset.app}. Usa «45» o «1 h 23 min».`);
      }
      minutos[input.dataset.app] = valor;
    }
    r.guardarDia(fechaSeleccionada, minutos);
    const config = r.leerConfig();
    const total = r.totalDelDia(fechaSeleccionada);
    mostrarAviso(total > config.limiteDiario ? "Guardado. Te pasaste del límite 😅" : "Guardado ✓");
    dibujar(raiz);
  }
}
