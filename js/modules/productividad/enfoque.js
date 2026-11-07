// =========================================================
// enfoque.js — pantalla de Enfoque: temporizador Pomodoro e historial de estudio
// =========================================================
//
// Hay dos "relojes":
//  1. Un vigilante GLOBAL (cada 1 s, siempre activo, aunque estés en otra pantalla):
//     detecta cuando termina una fase, guarda la sesión y suena el aviso.
//  2. Un reloj de PANTALLA (4 veces por segundo, solo mientras ves Enfoque):
//     actualiza el círculo y los números sin redibujar todo.

import { escaparHTML as esc, mostrarAviso } from "../../utils/dom.js";
import { hoyISO, horaActual, diaCorto, fechaCorta, formatoDuracion } from "../../utils/fechas.js";
import { graficoBarras } from "../../utils/graficos.js";
import { desbloquearAudio, sonarAviso, mantenerPantalla, pantallaSoportada } from "../../utils/avisos.js";
import * as e from "./enfoque-datos.js";

export const titulo = "Enfoque";

const RADIO = 88;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

let raizActual = null;

// =========================================================
// VIGILANTE GLOBAL
// =========================================================

function vigilar() {
  const resultado = e.revisarFin();
  if (!resultado) return;

  mantenerPantalla(false);
  if (!resultado.tarde) sonarAviso();
  mostrarAviso(mensajeFin(resultado));

  // Redibujamos la pantalla que se esté viendo
  if (raizActual?.isConnected) dibujar(raizActual);
  else if (["", "#/hoy"].includes(location.hash)) window.dispatchEvent(new HashChangeEvent("hashchange"));
}

function mensajeFin({ fase, minutos, curso, tarde, habitoMarcado }) {
  if (fase !== "enfoque") return "Descanso terminado. ¡A seguir! 📚";
  let texto = tarde
    ? `Terminaste ${minutos} min de ${curso} mientras la app estaba cerrada ✓`
    : `¡Pomodoro completo! ${minutos} min de ${curso}. Toma un descanso ☕`;
  if (habitoMarcado) texto += ` · Hábito «${habitoMarcado}» marcado ✅`;
  return texto;
}

setInterval(vigilar, 1000);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  vigilar();
  // iOS suelta el "pantalla encendida" al salir de la app: lo pedimos de nuevo
  if (e.leerTemporizador().estado === "corriendo" && e.leerConfig().pantallaEncendida) mantenerPantalla(true);
});

// =========================================================
// PANTALLA
// =========================================================

export function render(contenedor) {
  vigilar(); // por si algo terminó mientras la app estaba cerrada
  const raiz = document.createElement("div");
  raizActual = raiz;
  contenedor.replaceChildren(raiz);
  raiz.addEventListener("click", (ev) => alHacerClic(ev, raiz));
  raiz.addEventListener("change", (ev) => alCambiar(ev, raiz));
  raiz.addEventListener("submit", (ev) => alEnviar(ev, raiz));
  dibujar(raiz);

  // Reloj de pantalla: se apaga solo cuando sales de Enfoque
  const reloj = setInterval(() => {
    if (!raiz.isConnected) return clearInterval(reloj);
    actualizarReloj(raiz);
  }, 250);
}

function dibujar(raiz) {
  const config = e.leerConfig();
  const t = e.leerTemporizador();
  const sesiones = e.leerSesiones();
  const hoy = hoyISO();
  // Recordamos qué desplegables estaban abiertos
  const abiertos = new Set([...raiz.querySelectorAll("details[open]")].map((d) => d.id));

  raiz.innerHTML =
    temporizadorHTML(t, config) +
    hoyHTML(hoy, sesiones, config) +
    semanaHTML(hoy, sesiones) +
    historialHTML(sesiones, config, abiertos.has("detalle-manual")) +
    ajustesHTML(config, abiertos.has("detalle-ajustes"));
  actualizarReloj(raiz);
}

// ---------- Temporizador ----------

function temporizadorHTML(t, config) {
  const fase = e.FASES[t.fase];
  const enCiclo = t.ciclo % config.cadaLargo;
  const puntos = Array.from({ length: config.cadaLargo }, (_, i) => `<span class="punto ${i < enCiclo ? "lleno" : ""}"></span>`).join("");

  const selectorCurso =
    t.fase === "enfoque"
      ? `<label class="campo selector-curso">
           <span>Curso o tema</span>
           <select name="curso">
             ${config.cursos.map((c) => `<option${c === t.curso ? " selected" : ""}>${esc(c)}</option>`).join("")}
             ${t.curso && !config.cursos.includes(t.curso) ? `<option selected>${esc(t.curso)}</option>` : ""}
             <option value="__nuevo">＋ Agregar curso…</option>
           </select>
         </label>`
      : "";

  let botones;
  if (t.estado === "corriendo") {
    botones = `<button class="btn" data-accion="pausar">⏸ Pausar</button>
               <button class="btn btn-secundario" data-accion="detener">⏹ Detener</button>`;
  } else if (t.estado === "pausado") {
    botones = `<button class="btn" data-accion="reanudar">▶ Reanudar</button>
               <button class="btn btn-secundario" data-accion="detener">⏹ Detener</button>`;
  } else {
    botones = `<button class="btn" data-accion="iniciar">▶ ${t.fase === "enfoque" ? "Empezar a estudiar" : "Iniciar descanso"}</button>
               ${t.fase !== "enfoque" ? `<button class="btn btn-secundario" data-accion="saltar">Saltar</button>` : ""}`;
  }

  return `
    <section class="tarjeta temporizador fase-${t.fase}">
      <p class="fase-actual">${fase.emoji} ${fase.nombre}</p>
      <div class="anillo">
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <circle class="anillo-fondo" cx="100" cy="100" r="${RADIO}"/>
          <circle class="anillo-progreso" cx="100" cy="100" r="${RADIO}"
            stroke-dasharray="${CIRCUNFERENCIA}" stroke-dashoffset="${CIRCUNFERENCIA}"/>
        </svg>
        <div class="anillo-texto">
          <span class="tiempo" id="tiempo" role="timer" aria-live="off">--:--</span>
          <span class="texto-suave" id="hora-fin"></span>
        </div>
      </div>
      <div class="puntos" title="Pomodoros de este ciclo">${puntos}</div>
      ${selectorCurso}
      <div class="acciones">${botones}</div>
      <p class="texto-suave nota texto-centro">
        Deja la app abierta: si bloqueas el iPhone, el aviso no sonará (el tiempo igual se cuenta).
      </p>
    </section>`;
}

/** Actualiza solo el círculo y los números (rápido, sin redibujar). */
function actualizarReloj(raiz) {
  const t = e.leerTemporizador();
  const ms = e.restanteMs(t);
  const total = t.duracionMin * 60000;
  const segundos = Math.ceil(ms / 1000);
  const texto = `${String(Math.floor(segundos / 60)).padStart(2, "0")}:${String(segundos % 60).padStart(2, "0")}`;

  const tiempo = raiz.querySelector("#tiempo");
  if (tiempo) tiempo.textContent = texto;
  const anillo = raiz.querySelector(".anillo-progreso");
  if (anillo) anillo.style.strokeDashoffset = String(CIRCUNFERENCIA * (ms / total));
  const horaFin = raiz.querySelector("#hora-fin");
  if (horaFin) {
    horaFin.textContent =
      t.estado === "corriendo" ? `termina ${horaActual(new Date(t.fin))}` : t.estado === "pausado" ? "en pausa" : "";
  }
  document.title = t.estado === "listo" ? "Enfoque · Mini Apps" : `${texto} · ${e.FASES[t.fase].nombre}`;
}

// ---------- Hoy / semana ----------

function hoyHTML(hoy, sesiones, config) {
  const minutos = e.minutosDelDia(hoy, sesiones);
  const pct = Math.min(100, Math.round((minutos / config.metaDiaria) * 100));
  const cumplida = minutos >= config.metaDiaria;
  return `
    <section class="tarjeta">
      <div class="encabezado-progreso">
        <h2>Estudio de hoy</h2>
        <span class="contador">${formatoDuracion(minutos)}</span>
      </div>
      <div class="barra-progreso"><div style="width:${pct}%"></div></div>
      <p class="texto-suave">${cumplida ? "✅ ¡Meta del día cumplida!" : `Meta: ${formatoDuracion(config.metaDiaria)} · te faltan ${formatoDuracion(config.metaDiaria - minutos)}`}</p>
    </section>`;
}

function semanaHTML(hoy, sesiones) {
  const dias = e.semana(hoy, sesiones);
  const total = dias.reduce((s, d) => s + d.minutos, 0);
  const cursos = e.porCurso(hoy, sesiones);
  const maximo = cursos[0]?.[1] ?? 1;

  const grafico = graficoBarras({
    valores: dias.map((d) => (d.minutos ? d.minutos / 60 : null)),
    etiquetas: dias.map((d) => diaCorto(d.fecha)),
    maximo: Math.max(2, ...dias.map((d) => d.minutos / 60)),
    descripcion: "Horas de estudio en los últimos 7 días",
  });

  const listaCursos = cursos
    .map(
      ([curso, min]) => `
      <li>
        <span class="nombre-curso">${esc(curso)}</span>
        <span class="barra-curso"><span style="width:${Math.round((min / maximo) * 100)}%"></span></span>
        <span class="total-curso">${formatoDuracion(min)}</span>
      </li>`
    )
    .join("");

  return `
    <section class="tarjeta">
      <div class="encabezado-progreso">
        <h2>Últimos 7 días</h2>
        <span class="contador">${formatoDuracion(total)}</span>
      </div>
      ${total ? grafico : `<p class="texto-suave">Aún no hay sesiones esta semana.</p>`}
      ${cursos.length ? `<ul class="lista-cursos">${listaCursos}</ul>` : ""}
    </section>`;
}

// ---------- Historial ----------

function historialHTML(sesiones, config, manualAbierto) {
  const recientes = [...sesiones].sort((a, b) => (a.inicio < b.inicio ? 1 : -1)).slice(0, 10);
  const filas = recientes
    .map(
      (s) => `
      <li class="fila-sesion">
        <span class="fecha">${esc(fechaCorta(e.fechaSesion(s)))} ${esc(horaActual(new Date(s.inicio)))}</span>
        <span class="curso">${esc(s.curso)}</span>
        <span class="min">${formatoDuracion(s.minutos)}</span>
        <button class="btn-icono peligro" data-accion="borrar-sesion" data-id="${esc(s.id)}" aria-label="Borrar sesión">✕</button>
      </li>`
    )
    .join("");

  return `
    <section class="tarjeta">
      <h2>Historial</h2>
      ${filas ? `<ul class="lista-simple">${filas}</ul>` : `<p class="texto-suave">Tus sesiones aparecerán aquí.</p>`}
      <details class="detalle-desplegable" id="detalle-manual"${manualAbierto ? " open" : ""}>
        <summary>＋ Agregar sesión sin temporizador</summary>
        <form id="form-manual" class="formulario">
          <div class="fila-2">
            <label class="campo">
              <span>Curso</span>
              <select name="curso">${config.cursos.map((c) => `<option>${esc(c)}</option>`).join("")}</select>
            </label>
            <label class="campo">
              <span>Minutos</span>
              <input type="number" name="minutos" value="30" min="1" max="600" inputmode="numeric" required>
            </label>
          </div>
          <button class="btn btn-bloque" type="submit">Guardar sesión de hoy</button>
        </form>
      </details>
    </section>`;
}

// ---------- Ajustes ----------

function ajustesHTML(config, abierto) {
  const numero = (name, texto, min, max) => `
    <label class="campo">
      <span>${texto}</span>
      <input type="number" name="${name}" value="${config[name]}" min="${min}" max="${max}" inputmode="numeric">
    </label>`;

  const cursos = config.cursos
    .map(
      (c) => `
      <li class="fila-check">
        <span class="texto-item">${esc(c)}</span>
        <button class="btn-icono peligro" data-accion="quitar-curso" data-curso="${esc(c)}" aria-label="Quitar ${esc(c)}">✕</button>
      </li>`
    )
    .join("");

  return `
    <details class="tarjeta detalle-tarjeta" id="detalle-ajustes"${abierto ? " open" : ""}>
      <summary>⚙️ Ajustes del temporizador</summary>
      <div class="formulario ajustes-enfoque">
        <div class="fila-2">
          ${numero("enfoque", "Enfoque (min)", 1, 120)}
          ${numero("corto", "Descanso corto (min)", 1, 60)}
          ${numero("largo", "Descanso largo (min)", 1, 60)}
          ${numero("cadaLargo", "Descanso largo cada", 2, 10)}
        </div>
        ${numero("metaDiaria", "Meta de estudio diaria (min)", 10, 720)}
        ${pantallaSoportada() ? `
          <label class="fila-interruptor">
            <input type="checkbox" name="pantallaEncendida"${config.pantallaEncendida ? " checked" : ""}>
            <span>Mantener la pantalla encendida mientras corre</span>
          </label>` : ""}
        <h3 class="subtitulo">Cursos</h3>
        <ul class="lista-checks">${cursos}</ul>
        <form id="form-curso" class="fila-agregar">
          <input name="curso" placeholder="Ej.: Cálculo II" maxlength="40" required aria-label="Nuevo curso">
          <button class="btn" type="submit">Agregar</button>
        </form>
        <p class="texto-suave nota">
          Si un curso se llama igual que un hábito (p. ej. «Cursos online»), al llegar a
          ${e.MINUTOS_PARA_HABITO} min en el día el hábito se marca solo.
        </p>
      </div>
    </details>`;
}

// =========================================================
// EVENTOS
// =========================================================

function alHacerClic(ev, raiz) {
  const boton = ev.target.closest("[data-accion]");
  if (!boton) return;
  const config = e.leerConfig();

  switch (boton.dataset.accion) {
    case "iniciar":
      desbloquearAudio(); // iOS solo permite sonido si se prepara dentro de un toque
      e.iniciar(raiz.querySelector(".temporizador [name=curso]")?.value);
      if (config.pantallaEncendida) mantenerPantalla(true);
      break;
    case "pausar":
      e.pausar();
      mantenerPantalla(false);
      break;
    case "reanudar":
      desbloquearAudio();
      e.reanudar();
      if (config.pantallaEncendida) mantenerPantalla(true);
      break;
    case "detener": {
      const t = e.leerTemporizador();
      const minutos = e.minutosTranscurridos(t);
      const guardarParcial = minutos >= 1 && confirm(`¿Guardar los ${minutos} min que estudiaste?`);
      const habito = e.detener(guardarParcial);
      mantenerPantalla(false);
      if (guardarParcial) mostrarAviso(`${minutos} min guardados ✓${habito ? ` · Hábito «${habito}» marcado ✅` : ""}`);
      break;
    }
    case "saltar":
      e.saltar();
      break;
    case "borrar-sesion":
      if (!confirm("¿Borrar esta sesión?")) return;
      e.borrarSesion(boton.dataset.id);
      break;
    case "quitar-curso":
      if (config.cursos.length <= 1) return mostrarAviso("Deja al menos un curso");
      e.quitarCurso(boton.dataset.curso);
      break;
    default:
      return;
  }
  dibujar(raiz);
}

function alCambiar(ev, raiz) {
  const { name, value, type, checked } = ev.target;

  if (name === "curso" && ev.target.closest(".temporizador")) {
    if (value === "__nuevo") {
      const nombre = prompt("Nombre del curso o tema:")?.trim();
      if (nombre) {
        e.agregarCurso(nombre.slice(0, 40));
        e.cambiarCurso(nombre.slice(0, 40));
      }
      dibujar(raiz);
    } else {
      e.cambiarCurso(value);
    }
    return;
  }

  if (type === "checkbox" && name === "pantallaEncendida") {
    e.guardarConfig({ pantallaEncendida: checked });
    if (!checked) mantenerPantalla(false);
    return;
  }

  const limites = { enfoque: [1, 120], corto: [1, 60], largo: [1, 60], cadaLargo: [2, 10], metaDiaria: [10, 720] };
  if (limites[name]) {
    const n = Math.round(Number(value));
    const [min, max] = limites[name];
    if (!(n >= min && n <= max)) return mostrarAviso(`Elige entre ${min} y ${max}`);
    e.guardarConfig({ [name]: n });
    e.aplicarDuracionSiListo(); // si está esperando, que use la nueva duración
    dibujar(raiz);
  }
}

function alEnviar(ev, raiz) {
  ev.preventDefault();
  const form = ev.target;
  if (form.id === "form-manual") {
    const minutos = Math.round(Number(form.minutos.value));
    if (!(minutos >= 1 && minutos <= 600)) return mostrarAviso("Pon entre 1 y 600 minutos");
    const habito = e.agregarSesion({ minutos, curso: form.curso.value });
    mostrarAviso(`${minutos} min guardados ✓${habito ? ` · Hábito «${habito}» marcado ✅` : ""}`);
  } else if (form.id === "form-curso") {
    const nombre = form.curso.value.trim().slice(0, 40);
    if (nombre && !e.agregarCurso(nombre)) mostrarAviso("Ese curso ya existe");
  }
  dibujar(raiz);
}
