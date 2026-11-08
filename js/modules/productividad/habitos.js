// =========================================================
// habitos.js — pantalla de Hábitos
// =========================================================
//
// Tiene tres "sub-pantallas" dentro de la misma ruta #/habitos:
//   - lista:   hábitos de hoy para marcar + checklist "Antes de salir"
//   - detalle: racha, % de cumplimiento y mapa de calor de un hábito
//   - form:    crear o editar un hábito
// La variable `pantalla` dice cuál se muestra. Los cálculos están en habitos-datos.js.

import { escaparHTML as esc, mostrarAviso, milo } from "../../utils/dom.js";
import { hoyISO, fechaCorta } from "../../utils/fechas.js";
import { mapaCalor } from "../../utils/graficos.js";
import {
  MOMENTOS,
  DIAS_SEMANA,
  leerHabitos,
  buscarHabito,
  guardarHabito,
  archivarHabito,
  eliminarHabito,
  habitosActivos,
  leerLogs,
  estaHecho,
  alternarHecho,
  tocaEnFecha,
  textoFrecuencia,
  textoAntesDeDormir,
  racha,
  mejorRacha,
  porcentajeCumplimiento,
  estadoDia,
  leerSalida,
  alternarSalida,
  agregarItemSalida,
  quitarItemSalida,
} from "./habitos-datos.js";

export const titulo = "Hábitos";

const EMOJIS = ["✅", "📚", "💻", "🏃", "🧘", "💧", "🍎", "🛏️", "🧹", "🍽️", "📵", "📝", "🎯", "🎒", "🦷", "💊", "🌱", "🎸"];

let pantalla = { tipo: "lista" }; // o { tipo: "detalle", id } o { tipo: "form", id | null }
let editandoSalida = false;

// ---------- Entrada ----------

export function render(contenedor) {
  pantalla = { tipo: "lista" };
  editandoSalida = false;
  const raiz = document.createElement("div");
  contenedor.replaceChildren(raiz);
  raiz.addEventListener("click", (e) => alHacerClic(e, raiz));
  raiz.addEventListener("submit", (e) => alEnviar(e, raiz));
  dibujar(raiz);
}

function dibujar(raiz) {
  if (pantalla.tipo === "detalle") raiz.innerHTML = detalleHTML(buscarHabito(pantalla.id));
  else if (pantalla.tipo === "form") raiz.innerHTML = formHTML(pantalla.id ? buscarHabito(pantalla.id) : null);
  else raiz.innerHTML = listaHTML();
}

/** Cambia de sub-pantalla y sube al inicio. */
function ir(raiz, nueva) {
  pantalla = nueva;
  dibujar(raiz);
  window.scrollTo(0, 0);
}

// =========================================================
// LISTA (hoy)
// =========================================================

function listaHTML() {
  const hoy = hoyISO();
  const logs = leerLogs();
  const habitos = leerHabitos();
  const deHoy = habitosActivos(habitos).filter((h) => tocaEnFecha(h, hoy, logs));
  const hechos = deHoy.filter((h) => estaHecho(logs, h.id, hoy)).length;
  const archivados = habitos.filter((h) => h.archivado);
  const noTocan = habitosActivos(habitos).filter((h) => !tocaEnFecha(h, hoy, logs));

  const grupos = MOMENTOS.map((m) => {
    const delMomento = deHoy.filter((h) => h.momento === m.id);
    if (!delMomento.length) return "";
    return `
      <h3 class="subtitulo">${m.emoji} ${m.nombre}</h3>
      <ul class="lista-checks">${delMomento.map((h) => filaHabitoHTML(h, logs, hoy)).join("")}</ul>`;
  }).join("");

  return `
    <section class="tarjeta">
      <div class="encabezado-progreso">
        <h2>Hoy</h2>
        <span class="contador">${hechos}/${deHoy.length}</span>
      </div>
      ${barraProgresoHTML(hechos, deHoy.length)}
      ${deHoy.length && hechos === deHoy.length ? `<div class="fila-milo">${milo("tareas", { tamano: "chico" })}<p class="mensaje-exito">¡Todo listo por hoy! Milo está orgulloso.</p></div>` : ""}
      ${deHoy.length ? grupos : `<div class="fila-milo">${milo("ideas", { tamano: "chico" })}<p class="texto-suave">Hoy no te toca ningún hábito.</p></div>`}
      ${noTocan.length ? `<p class="texto-suave nota">Hoy descansan: ${noTocan.map((h) => esc(h.emoji + " " + h.nombre)).join(", ")}.</p>` : ""}
    </section>
    ${salidaHTML()}
    <button class="btn btn-bloque" data-accion="nuevo">＋ Nuevo hábito</button>
    ${archivadosHTML(archivados)}`;
}

function barraProgresoHTML(hechos, total) {
  const pct = total ? Math.round((hechos / total) * 100) : 0;
  return `<div class="barra-progreso" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
    <div style="width:${pct}%"></div></div>`;
}

function filaHabitoHTML(h, logs, hoy) {
  const hecho = estaHecho(logs, h.id, hoy);
  const r = racha(h, logs, hoy);
  const detalle = [textoAntesDeDormir(h), h.nota].filter(Boolean).join(" · ");
  return `
    <li class="fila-check ${hecho ? "hecho" : ""}">
      <button class="check-principal" data-accion="alternar" data-id="${esc(h.id)}" aria-pressed="${hecho}">
        <span class="circulo" aria-hidden="true">${hecho ? "✓" : ""}</span>
        <span class="emoji" aria-hidden="true">${esc(h.emoji)}</span>
        <span class="textos">
          <span class="nombre">${esc(h.nombre)}</span>
          ${detalle ? `<span class="detalle">${esc(detalle)}</span>` : ""}
        </span>
        ${r > 1 ? `<span class="racha" title="Racha">🔥${r}</span>` : ""}
      </button>
      <button class="btn-icono" data-accion="detalle" data-id="${esc(h.id)}" aria-label="Ver detalle de ${esc(h.nombre)}">›</button>
    </li>`;
}

function archivadosHTML(archivados) {
  if (!archivados.length) return "";
  const filas = archivados
    .map(
      (h) => `
      <li class="fila-archivada">
        <span>${esc(h.emoji)} ${esc(h.nombre)}</span>
        <button class="btn-texto" data-accion="restaurar" data-id="${esc(h.id)}">Restaurar</button>
      </li>`
    )
    .join("");
  return `
    <details class="tarjeta archivados">
      <summary>Archivados (${archivados.length})</summary>
      <ul class="lista-simple">${filas}</ul>
    </details>`;
}

// ---------- Checklist "Antes de salir" ----------

function salidaHTML() {
  const { items, marcados } = leerSalida();
  const listos = items.filter((i) => marcados.includes(i.id)).length;

  const filas = items
    .map((item) => {
      const hecho = marcados.includes(item.id);
      if (editandoSalida) {
        return `
          <li class="fila-check">
            <span class="texto-item">${esc(item.texto)}</span>
            <button class="btn-icono peligro" data-accion="quitar-salida" data-id="${esc(item.id)}" aria-label="Quitar ${esc(item.texto)}">✕</button>
          </li>`;
      }
      return `
        <li class="fila-check ${hecho ? "hecho" : ""}">
          <button class="check-principal" data-accion="alternar-salida" data-id="${esc(item.id)}" aria-pressed="${hecho}">
            <span class="circulo" aria-hidden="true">${hecho ? "✓" : ""}</span>
            <span class="textos"><span class="nombre">${esc(item.texto)}</span></span>
          </button>
        </li>`;
    })
    .join("");

  const formAgregar = editandoSalida
    ? `<form id="form-salida" class="fila-agregar">
         <input name="texto" placeholder="Ej.: 🪪 Carnet" maxlength="40" required aria-label="Nuevo ítem">
         <button class="btn" type="submit">Agregar</button>
       </form>`
    : "";

  const todoListo = !editandoSalida && items.length && listos === items.length;

  return `
    <section class="tarjeta">
      <div class="encabezado-progreso">
        <h2>🚪 Antes de salir</h2>
        <button class="btn-texto compacto" data-accion="editar-salida">${editandoSalida ? "Listo" : "Editar"}</button>
      </div>
      ${editandoSalida ? "" : todoListo
        ? `<div class="fila-milo">${milo("caminata", { tamano: "chico" })}<p class="mensaje-exito">¡Todo listo, puedes salir!</p></div>`
        : `<p class="texto-suave">${listos}/${items.length} listos · se reinicia cada día</p>`}
      <ul class="lista-checks">${filas}</ul>
      ${formAgregar}
    </section>`;
}

// =========================================================
// DETALLE
// =========================================================

function detalleHTML(h) {
  if (!h) return `<p class="texto-suave">Este hábito ya no existe.</p>`;
  const hoy = hoyISO();
  const logs = leerLogs();
  const pct = porcentajeCumplimiento(h, logs, 30, hoy);
  const momento = MOMENTOS.find((m) => m.id === h.momento);
  const rachaActual = racha(h, logs, hoy);
  // Rachas largas: Milo con su trofeo
  const festejo =
    rachaActual >= 7
      ? `<div class="fila-milo">${milo("logro", { tamano: "chico" })}<p class="mensaje-exito">¡${rachaActual} ${h.frecuencia.tipo === "diario" ? "días" : "veces"} seguidos! Sigue así.</p></div>`
      : "";

  return `
    <button class="btn-texto volver" data-accion="volver">‹ Hábitos</button>
    <section class="tarjeta">
      <h2 class="titulo-habito">${esc(h.emoji)} ${esc(h.nombre)}</h2>
      <p class="texto-suave">${momento.emoji} ${momento.nombre} · ${esc(textoFrecuencia(h.frecuencia))}${h.archivado ? " · archivado" : ""}</p>
      ${h.nota ? `<p class="texto-suave">${esc(h.nota)}</p>` : ""}
      <div class="estadisticas">
        <div class="estadistica"><span class="valor">🔥 ${rachaActual}</span><span class="nombre">racha actual</span></div>
        <div class="estadistica"><span class="valor">${mejorRacha(h, logs, hoy)}</span><span class="nombre">mejor racha</span></div>
        <div class="estadistica"><span class="valor">${pct === null ? "—" : pct + "%"}</span><span class="nombre">últimos 30 días</span></div>
      </div>
      ${festejo}
    </section>
    <section class="tarjeta">
      <h2>Últimas 12 semanas</h2>
      ${mapaCalor({ hoy, estado: (fecha) => estadoDia(h, fecha, logs, hoy) })}
      <p class="leyenda-mapa">
        <span class="mc-celda hecho"></span> cumplido
        <span class="mc-celda fallado"></span> no cumplido
        <span class="mc-celda libre"></span> no tocaba
      </p>
      <p class="texto-suave nota">¿Olvidaste marcar un día? Toca su cuadrito para marcarlo o desmarcarlo.</p>
    </section>
    <div class="pila-botones">
      <button class="btn btn-bloque" data-accion="editar" data-id="${esc(h.id)}">✏️ Editar</button>
      <button class="btn btn-bloque btn-secundario" data-accion="${h.archivado ? "restaurar" : "archivar"}" data-id="${esc(h.id)}">
        ${h.archivado ? "↩️ Restaurar" : "📦 Archivar"}
      </button>
    </div>`;
}

// =========================================================
// FORMULARIO (crear / editar)
// =========================================================

function formHTML(h) {
  const datos = h ?? { nombre: "", emoji: "✅", nota: "", momento: "manana", frecuencia: { tipo: "diario" } };
  const f = datos.frecuencia;
  const dias = f.tipo === "dias" ? f.dias : [1, 2, 3, 4, 5];
  const cada = f.tipo === "intervalo" ? f.cada : 2;

  const radio = (name, value, texto, marcado) => `
    <label class="chip"><input type="radio" name="${name}" value="${value}"${marcado ? " checked" : ""}><span>${texto}</span></label>`;

  return `
    <button class="btn-texto volver" data-accion="${h ? "volver-detalle" : "volver"}" data-id="${esc(h?.id ?? "")}">‹ ${h ? "Volver" : "Hábitos"}</button>
    <form id="form-habito" class="tarjeta formulario form-habito">
      <h2>${h ? "Editar hábito" : "Nuevo hábito"}</h2>

      <label class="campo">
        <span>Nombre</span>
        <input name="nombre" value="${esc(datos.nombre)}" maxlength="40" required placeholder="Ej.: Leer 10 minutos">
      </label>

      <div class="campo">
        <span>Emoji</span>
        <div class="fila-emoji">
          <input name="emoji" value="${esc(datos.emoji)}" maxlength="8" aria-label="Emoji" class="input-emoji">
          <div class="emojis-rapidos">
            ${EMOJIS.map((e) => `<button type="button" class="emoji-rapido" data-accion="emoji" data-valor="${e}">${e}</button>`).join("")}
          </div>
        </div>
      </div>

      <label class="campo">
        <span>Nota (opcional)</span>
        <input name="nota" value="${esc(datos.nota ?? "")}" maxlength="80" placeholder="Ej.: mínimo 1 hora">
      </label>

      <div class="campo">
        <span>Momento del día</span>
        <div class="chips">
          ${MOMENTOS.map((m) => radio("momento", m.id, `${m.emoji} ${m.nombre}`, datos.momento === m.id)).join("")}
        </div>
      </div>

      <div class="campo">
        <span>Frecuencia</span>
        <div class="chips">
          ${radio("tipo", "diario", "Todos los días", f.tipo === "diario")}
          ${radio("tipo", "dias", "Días específicos", f.tipo === "dias")}
          ${radio("tipo", "intervalo", "Cada N días", f.tipo === "intervalo")}
        </div>
      </div>

      <div class="campo solo-dias">
        <span>¿Qué días?</span>
        <div class="chips dias">
          ${[1, 2, 3, 4, 5, 6, 0]
            .map((d) => `<label class="chip"><input type="checkbox" name="dias" value="${d}"${dias.includes(d) ? " checked" : ""}><span>${DIAS_SEMANA[d]}</span></label>`)
            .join("")}
        </div>
      </div>

      <label class="campo solo-intervalo">
        <span>Cada cuántos días (desde la última vez que lo hiciste)</span>
        <input type="number" name="cada" value="${cada}" min="2" max="30" inputmode="numeric">
      </label>

      <button class="btn btn-bloque" type="submit">${h ? "Guardar cambios" : "Crear hábito"}</button>
      ${h ? `<button class="btn-texto peligro-texto" type="button" data-accion="eliminar" data-id="${esc(h.id)}">Eliminar definitivamente</button>` : ""}
    </form>`;
}

/** Toma solo el primer emoji/carácter visible (un emoji puede ocupar varios caracteres). */
function primerEmoji(texto) {
  const limpio = texto.trim();
  if (!limpio) return "✅";
  if (typeof Intl.Segmenter === "function") {
    const [primero] = new Intl.Segmenter("es", { granularity: "grapheme" }).segment(limpio);
    return primero.segment;
  }
  return Array.from(limpio)[0];
}

/** Lee el formulario y arma el hábito. Devuelve null (con aviso) si algo falta. */
function leerFormulario(form) {
  const datos = new FormData(form);
  const nombre = datos.get("nombre").trim();
  if (!nombre) {
    mostrarAviso("Ponle un nombre al hábito");
    return null;
  }
  const tipo = datos.get("tipo");
  let frecuencia = { tipo: "diario" };
  if (tipo === "dias") {
    const dias = datos.getAll("dias").map(Number).sort();
    if (!dias.length) {
      mostrarAviso("Elige al menos un día");
      return null;
    }
    frecuencia = dias.length === 7 ? { tipo: "diario" } : { tipo: "dias", dias };
  } else if (tipo === "intervalo") {
    const cada = Math.round(Number(datos.get("cada")));
    if (!(cada >= 2 && cada <= 30)) {
      mostrarAviso("Elige entre 2 y 30 días");
      return null;
    }
    frecuencia = { tipo: "intervalo", cada };
  }
  return {
    nombre,
    emoji: primerEmoji(datos.get("emoji")),
    nota: datos.get("nota").trim(),
    momento: datos.get("momento"),
    frecuencia,
  };
}

// =========================================================
// EVENTOS
// =========================================================

function alHacerClic(e, raiz) {
  // Cuadritos del mapa de calor: marcar/desmarcar un día pasado
  const celda = e.target.closest(".mc-celda[data-fecha]");
  if (celda && pantalla.tipo === "detalle") {
    const marcado = alternarHecho(pantalla.id, celda.dataset.fecha);
    mostrarAviso(`${fechaCorta(celda.dataset.fecha)}: ${marcado ? "marcado ✓" : "desmarcado"}`);
    dibujar(raiz);
    return;
  }

  const boton = e.target.closest("[data-accion]");
  if (!boton) return;
  const { accion, id } = boton.dataset;

  switch (accion) {
    case "alternar": {
      const marcado = alternarHecho(id, hoyISO());
      dibujar(raiz);
      if (marcado) celebrarSiTerminaste();
      break;
    }
    case "detalle":
    case "volver-detalle":
      ir(raiz, { tipo: "detalle", id });
      break;
    case "volver":
      ir(raiz, { tipo: "lista" });
      break;
    case "nuevo":
      ir(raiz, { tipo: "form", id: null });
      break;
    case "editar":
      ir(raiz, { tipo: "form", id });
      break;
    case "archivar":
      archivarHabito(id, true);
      mostrarAviso("Archivado: conserva su historial");
      ir(raiz, { tipo: "lista" });
      break;
    case "restaurar":
      archivarHabito(id, false);
      mostrarAviso("Hábito restaurado");
      dibujar(raiz);
      break;
    case "eliminar":
      if (confirm("¿Eliminar este hábito y TODO su historial? Si solo quieres ocultarlo, usa Archivar.")) {
        eliminarHabito(id);
        mostrarAviso("Hábito eliminado");
        ir(raiz, { tipo: "lista" });
      }
      break;
    case "emoji":
      raiz.querySelector("[name=emoji]").value = boton.dataset.valor;
      break;
    case "alternar-salida":
      alternarSalida(id);
      dibujar(raiz);
      break;
    case "editar-salida":
      editandoSalida = !editandoSalida;
      dibujar(raiz);
      break;
    case "quitar-salida":
      quitarItemSalida(id);
      dibujar(raiz);
      break;
  }
}

function alEnviar(e, raiz) {
  e.preventDefault();
  const form = e.target;

  if (form.id === "form-salida") {
    const texto = form.texto.value.trim();
    if (texto) agregarItemSalida(texto);
    dibujar(raiz);
    raiz.querySelector("#form-salida [name=texto]")?.focus();
    return;
  }

  if (form.id === "form-habito") {
    const datos = leerFormulario(form);
    if (!datos) return;
    const id = pantalla.id;
    guardarHabito(id ? { ...datos, id } : datos);
    mostrarAviso(id ? "Cambios guardados ✓" : "Hábito creado ✓");
    ir(raiz, id ? { tipo: "detalle", id } : { tipo: "lista" });
  }
}

/** Mensaje cuando completas todos los hábitos de hoy. */
function celebrarSiTerminaste() {
  const hoy = hoyISO();
  const logs = leerLogs();
  const deHoy = habitosActivos().filter((h) => tocaEnFecha(h, hoy, logs));
  if (deHoy.length && deHoy.every((h) => estaHecho(logs, h.id, hoy))) {
    mostrarAviso("¡Completaste todos tus hábitos de hoy! 🎉");
  }
}
