// =========================================================
// sueno.js — pantalla de Sueño
// =========================================================
//
// Cómo está organizada:
//  - render(): se llama al entrar a la pantalla. Crea un contenedor y conecta los eventos UNA vez.
//  - dibujar(): vuelve a pintar todo con los datos actuales (después de cada cambio).
//  - Funciones *HTML(): cada una arma el HTML de una tarjeta.
// Los cálculos viven en sueno-datos.js, aquí solo hay pantalla.

import { escaparHTML as esc, mostrarAviso, selectorHora, leerHora } from "../../utils/dom.js";
import {
  hoyISO,
  horaActual,
  diaCorto,
  fechaCorta,
  deMinutos,
  formatoDuracion,
  aMinutos,
  sumarDias,
} from "../../utils/fechas.js";
import { graficoBarras } from "../../utils/graficos.js";
import {
  leerRegistros,
  guardarRegistro,
  borrarRegistro,
  leerMetas,
  guardarMetas,
  leerSuenoEnCurso,
  iniciarSueno,
  cancelarSueno,
  terminarSueno,
  duracionMinutos,
  cumpleHoraMeta,
  resumenSemana,
  historial,
} from "./sueno-datos.js";

export const titulo = "Sueño";

// Fecha que se está editando en el formulario (por defecto, hoy)
let fechaSeleccionada = hoyISO();

const HORA_VALIDA = /^\d{2}:\d{2}$/;

// ---------- Entrada ----------

export function render(contenedor) {
  fechaSeleccionada = hoyISO();
  const raiz = document.createElement("div");
  contenedor.replaceChildren(raiz);

  // Eventos conectados una sola vez al contenedor ("delegación"):
  // aunque redibujemos el HTML de adentro, estos siguen funcionando.
  raiz.addEventListener("click", (e) => alHacerClic(e, raiz));
  raiz.addEventListener("input", (e) => alEscribir(e));
  raiz.addEventListener("change", (e) => alCambiar(e, raiz));
  raiz.addEventListener("submit", (e) => alGuardar(e, raiz));

  dibujar(raiz);
}

function dibujar(raiz) {
  const registros = leerRegistros();
  const metas = leerMetas();
  const enCurso = leerSuenoEnCurso();
  const resumen = resumenSemana(registros, metas, hoyISO());

  raiz.innerHTML =
    rapidoHTML(enCurso) +
    registroHTML(registros, metas) +
    semanaHTML(resumen, metas) +
    metasHTML(metas) +
    historialHTML(registros, metas);
}

// ---------- Tarjetas ----------

/** Botones rápidos "Me voy a dormir" / "Ya desperté". */
function rapidoHTML(enCurso) {
  if (enCurso) {
    return `
      <section class="tarjeta tarjeta-destacada">
        <p class="texto-suave">🌙 Durmiendo desde las <strong>${esc(enCurso.horaDormir)}</strong></p>
        <button class="btn btn-bloque" data-accion="desperte">☀️ Ya desperté</button>
        <button class="btn-texto" data-accion="cancelar-sueno">Cancelar</button>
      </section>`;
  }
  return `
    <section class="tarjeta">
      <button class="btn btn-bloque" data-accion="dormir-ahora">🌙 Me voy a dormir</button>
      <p class="texto-suave texto-centro">Tócalo al acostarte y en la mañana toca «Ya desperté».</p>
    </section>`;
}

/** Formulario para registrar o corregir una noche. */
function registroHTML(registros, metas) {
  const existente = registros[fechaSeleccionada];
  const ultimo = historial(registros, 1)[0];
  const horaDormir = existente?.horaDormir ?? metas.horaMeta;
  const horaDespertar = existente?.horaDespertar ?? ultimo?.horaDespertar ?? "07:00";

  return `
    <section class="tarjeta" id="tarjeta-registro">
      <h2>${existente ? "Editar noche" : "Registrar noche"}</h2>
      <form id="form-sueno" class="formulario">
        <label class="campo">
          <span>Día en que despertaste</span>
          <input type="date" name="fecha" value="${esc(fechaSeleccionada)}" max="${esc(hoyISO())}" required>
        </label>
        <div class="fila-2">
          <div class="campo" role="group" aria-label="Hora en que te dormiste">
            <span>🌙 Me dormí</span>
            ${selectorHora("horaDormir", horaDormir, { inicio: 18 })}
          </div>
          <div class="campo" role="group" aria-label="Hora en que despertaste">
            <span>☀️ Desperté</span>
            ${selectorHora("horaDespertar", horaDespertar)}
          </div>
        </div>
        <p class="duracion" id="duracion-vista">${textoDuracion(fechaSeleccionada, horaDormir, horaDespertar)}</p>
        <div class="acciones">
          <button class="btn" type="submit">${existente ? "Actualizar" : "Guardar"}</button>
          ${existente ? `<button class="btn btn-secundario" type="button" data-accion="borrar">Borrar</button>` : ""}
        </div>
      </form>
    </section>`;
}

/** Estadísticas y gráfico de los últimos 7 días. */
function semanaHTML(resumen, metas) {
  const promedio = resumen.promedioMinutos === null ? "—" : formatoDuracion(resumen.promedioMinutos);
  const regularidad =
    resumen.regularidadMinutos === null ? "—" : `±${Math.round(resumen.regularidadMinutos)} min`;
  const enMeta = resumen.registradas ? `${resumen.enMeta}/${resumen.registradas}` : "—";

  const grafico = graficoBarras({
    valores: resumen.noches.map((n) =>
      n.registro ? duracionMinutos(n.registro.horaDormir, n.registro.horaDespertar) / 60 : null
    ),
    etiquetas: resumen.noches.map((n) => diaCorto(n.fecha)),
    meta: metas.horasMeta,
    maximo: 10,
    cumple: (horas) => horas >= metas.horasMeta,
    descripcion: "Horas dormidas en los últimos 7 días",
  });

  const promedioHora =
    resumen.promedioHoraDormir === null
      ? ""
      : `<p class="texto-suave">En promedio te duermes a las <strong>${deMinutos(resumen.promedioHoraDormir)}</strong>.</p>`;

  return `
    <section class="tarjeta">
      <h2>Últimos 7 días</h2>
      <div class="estadisticas">
        <div class="estadistica">
          <span class="valor">${promedio}</span>
          <span class="nombre">promedio</span>
        </div>
        <div class="estadistica">
          <span class="valor">${regularidad}</span>
          <span class="nombre">${calificarRegularidad(resumen.regularidadMinutos)}</span>
        </div>
        <div class="estadistica">
          <span class="valor">${enMeta}</span>
          <span class="nombre">antes de ${esc(metas.horaMeta)}</span>
        </div>
      </div>
      ${grafico}
      <p class="leyenda"><span class="linea-meta"></span> meta de ${formatoDuracion(metas.horasMeta * 60)}</p>
      ${promedioHora}
    </section>`;
}

/** Metas editables. */
function metasHTML(metas) {
  return `
    <section class="tarjeta">
      <h2>Metas</h2>
      <form id="form-metas" class="fila-2">
        <div class="campo" role="group" aria-label="Hora meta para dormir">
          <span>Dormir antes de</span>
          ${selectorHora("horaMeta", metas.horaMeta, { inicio: 18, paso: 15 })}
        </div>
        <label class="campo">
          <span>Horas de sueño</span>
          <input type="number" name="horasMeta" value="${esc(metas.horasMeta)}" min="4" max="12" step="0.5" inputmode="decimal">
        </label>
      </form>
    </section>`;
}

/** Lista de las últimas noches (tocar una la carga en el formulario). */
function historialHTML(registros, metas) {
  const filas = historial(registros);
  if (!filas.length) {
    return `
      <section class="tarjeta">
        <h2>Historial</h2>
        <p class="texto-suave">Aún no hay noches registradas.</p>
      </section>`;
  }
  const items = filas
    .map((r) => {
      const aTiempo = cumpleHoraMeta(r.horaDormir, metas.horaMeta);
      return `
        <li>
          <button class="fila-historial" data-accion="editar" data-fecha="${esc(r.fecha)}">
            <span class="fecha">${esc(fechaCorta(r.fecha))}</span>
            <span class="horas">${aTiempo ? "" : "⚠️ "}${esc(r.horaDormir)} → ${esc(r.horaDespertar)}</span>
            <span class="total">${formatoDuracion(r.minutos)}</span>
          </button>
        </li>`;
    })
    .join("");
  return `
    <section class="tarjeta">
      <h2>Historial</h2>
      <ul class="lista-historial">${items}</ul>
      <p class="texto-suave">⚠️ = te dormiste después de tu meta. Toca una noche para editarla.</p>
    </section>`;
}

// ---------- Textos de ayuda ----------

/**
 * Explica qué se va a guardar, con fechas reales.
 * Si la hora de dormir es "mayor" que la de despertar (23:30 → 07:00), te dormiste
 * el día anterior; si no (00:30 → 07:00), te dormiste el mismo día en que despertaste.
 */
function textoDuracion(fecha, horaDormir, horaDespertar) {
  if (!fecha || !HORA_VALIDA.test(horaDormir) || !HORA_VALIDA.test(horaDespertar)) return "";
  const minutos = duracionMinutos(horaDormir, horaDespertar);
  if (minutos === 0) return "Las dos horas son iguales: revísalas";

  const cruzaMedianoche = aMinutos(horaDormir) > aMinutos(horaDespertar);
  const fechaDormir = cruzaMedianoche ? sumarDias(fecha, -1) : fecha;
  const aviso = minutos > 14 * 60 ? " · revisa las horas" : "";

  return `
    <span class="rango">🌙 ${esc(fechaCorta(fechaDormir))} ${esc(horaDormir)} → ☀️ ${esc(fechaCorta(fecha))} ${esc(horaDespertar)}</span>
    Dormiste <strong>${formatoDuracion(minutos)}</strong>${aviso}`;
}

function calificarRegularidad(minutos) {
  if (minutos === null) return "regularidad";
  if (minutos <= 30) return "muy regular";
  if (minutos <= 60) return "regular";
  return "irregular";
}

// ---------- Eventos ----------

function alHacerClic(e, raiz) {
  const boton = e.target.closest("[data-accion]");
  if (!boton) return;
  const acciones = {
    "dormir-ahora": accionDormirAhora,
    desperte: accionDesperte,
    "cancelar-sueno": accionCancelarSueno,
    borrar: accionBorrar,
    editar: () => accionEditar(boton.dataset.fecha),
  };
  acciones[boton.dataset.accion]?.();
  dibujar(raiz);
  if (boton.dataset.accion === "editar") {
    raiz.querySelector("#tarjeta-registro")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function accionDormirAhora() {
  iniciarSueno(horaActual());
  mostrarAviso("Buenas noches 🌙");
}

function accionDesperte() {
  const enCurso = leerSuenoEnCurso();
  if (!enCurso) return;
  const hoy = hoyISO();
  const despertar = horaActual();
  const minutos = duracionMinutos(enCurso.horaDormir, despertar);
  // Protección contra toques accidentales
  if (minutos < 30 && !confirm(`Solo pasaron ${formatoDuracion(minutos)}. ¿Guardar igual?`)) return;
  if (leerRegistros()[hoy] && !confirm("Ya hay un registro para hoy. ¿Reemplazarlo?")) return;
  terminarSueno(hoy, despertar);
  fechaSeleccionada = hoy;
  mostrarAviso(`Buenos días ☀️ Dormiste ${formatoDuracion(minutos)}`);
}

function accionCancelarSueno() {
  cancelarSueno();
}

function accionBorrar() {
  if (!confirm(`¿Borrar el registro del ${fechaCorta(fechaSeleccionada)}?`)) return;
  borrarRegistro(fechaSeleccionada);
  mostrarAviso("Registro borrado");
}

function accionEditar(fecha) {
  fechaSeleccionada = fecha;
}

/** Mientras cambias una hora, actualiza la duración sin redibujar todo. */
function alEscribir(e) {
  const form = e.target.closest("#form-sueno");
  if (!form) return;
  // Si cambió la fecha, alCambiar redibuja todo; aquí solo actualizamos el texto
  if (e.target.name === "fecha") return;
  const vista = form.querySelector("#duracion-vista");
  vista.innerHTML = textoDuracion(
    form.fecha.value,
    leerHora(form, "horaDormir"),
    leerHora(form, "horaDespertar")
  );
}

function alCambiar(e, raiz) {
  const { name, value } = e.target;
  if (name === "fecha" && value) {
    // Al cambiar la fecha, cargamos ese día (o valores por defecto)
    fechaSeleccionada = value;
    dibujar(raiz);
  } else if (name.startsWith("horaMeta-")) {
    guardarMetas({ horaMeta: leerHora(e.target.form, "horaMeta") });
    dibujar(raiz);
  } else if (name === "horasMeta") {
    const horas = Number(value);
    if (horas >= 4 && horas <= 12) {
      guardarMetas({ horasMeta: horas });
      dibujar(raiz);
    }
  }
}

function alGuardar(e, raiz) {
  e.preventDefault();
  const form = e.target;
  if (form.id !== "form-sueno") return; // el form de metas se guarda solo, sin botón
  const fecha = form.fecha.value;
  const horaDormir = leerHora(form, "horaDormir");
  const horaDespertar = leerHora(form, "horaDespertar");

  if (!fecha || !HORA_VALIDA.test(horaDormir) || !HORA_VALIDA.test(horaDespertar)) {
    mostrarAviso("Completa la fecha y las dos horas");
    return;
  }
  if (horaDormir === horaDespertar) {
    mostrarAviso("La hora de dormir y de despertar no pueden ser iguales");
    return;
  }
  if (fecha > hoyISO()) {
    mostrarAviso("No puedes registrar una fecha futura");
    return;
  }
  guardarRegistro(fecha, horaDormir, horaDespertar);
  fechaSeleccionada = fecha;
  mostrarAviso("Guardado ✓");
  dibujar(raiz);
}
