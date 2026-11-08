// =========================================================
// resumen.js — pantalla del Resumen semanal
// =========================================================

import { escaparHTML as esc, milo } from "../../utils/dom.js";
import { hoyISO, sumarDias, fechaCorta, formatoDuracion } from "../../utils/fechas.js";
import { compararSemanas, diferencia, conclusion } from "./resumen-datos.js";

export const titulo = "Resumen";

// Cuántas semanas hacia atrás estás viendo (0 = los últimos 7 días)
let semanasAtras = 0;

export function render(contenedor) {
  semanasAtras = 0;
  const raiz = document.createElement("div");
  contenedor.replaceChildren(raiz);
  raiz.addEventListener("click", (ev) => {
    const accion = ev.target.closest("[data-accion]")?.dataset.accion;
    if (accion === "anterior") semanasAtras++;
    else if (accion === "siguiente" && semanasAtras > 0) semanasAtras--;
    else return;
    dibujar(raiz);
  });
  dibujar(raiz);
}

function dibujar(raiz) {
  const hasta = sumarDias(hoyISO(), -7 * semanasAtras);
  const { actual, anterior } = compararSemanas(hasta);
  raiz.innerHTML = conclusionHTML(actual, anterior) + metricasHTML(actual, anterior);
}

// ---------- Conclusión ----------

function conclusionHTML(actual, anterior) {
  const c = conclusion(actual, anterior);
  const rango = `${fechaCorta(actual.desde)} – ${fechaCorta(actual.hasta)}`;
  const item = (t, clase) => `<li class="${clase}"><span aria-hidden="true">${t.icono}</span><span>${esc(t.texto)}</span></li>`;

  return `
    <section class="tarjeta resumen-cabecera">
      <div class="nav-semana">
        <button class="btn-icono" data-accion="anterior" aria-label="Semana anterior">‹</button>
        <div>
          <p class="nav-titulo">${semanasAtras === 0 ? "Últimos 7 días" : semanasAtras === 1 ? "Semana pasada" : `Hace ${semanasAtras} semanas`}</p>
          <p class="texto-suave nota">${esc(rango)}</p>
        </div>
        <button class="btn-icono" data-accion="siguiente" aria-label="Semana siguiente"${semanasAtras === 0 ? " disabled" : ""}>›</button>
      </div>
      ${milo(c.pose, { tamano: "grande" })}
      <h2 class="resumen-titulo">${esc(c.titulo)}</h2>
      ${c.texto ? `<p class="texto-suave texto-centro">${esc(c.texto)}</p>` : ""}
      ${c.logro || c.mejorar.length ? `
        <ul class="lista-conclusiones">
          ${c.logro ? item(c.logro, "logro") : ""}
          ${c.mejorar.map((t) => item(t, "mejorar")).join("")}
        </ul>` : ""}
    </section>`;
}

// ---------- Métricas ----------

/** Chip "▲ 12 %" en verde si es bueno, rojo si es malo. */
function chipCambio(dif) {
  if (!dif) return `<span class="chip-cambio neutro">— sin comparación</span>`;
  if (dif.pct === 0) return `<span class="chip-cambio neutro">= igual</span>`;
  return `<span class="chip-cambio ${dif.bueno ? "bueno" : "malo"}">${dif.sube ? "▲" : "▼"} ${dif.pct} ${dif.unidad}</span>`;
}

function fila({ icono, nombre, valor, dif, detalle }) {
  return `
    <li class="fila-metrica">
      <span class="metrica-icono" aria-hidden="true">${icono}</span>
      <span class="metrica-textos">
        <span class="metrica-nombre">${nombre}</span>
        <span class="metrica-detalle">${detalle}</span>
      </span>
      <span class="metrica-valor">
        <strong>${valor}</strong>
        ${chipCambio(dif)}
      </span>
    </li>`;
}

function metricasHTML(a, b) {
  const filas = [];

  // Hábitos
  const h = a.habitos;
  filas.push(fila({
    icono: "✅",
    nombre: "Hábitos",
    valor: h.pct === null ? "—" : `${Math.round(h.pct * 100)} %`,
    dif: diferencia(h.pct, b.habitos.pct, true, { puntos: true }),
    detalle: h.tocaban
      ? `${h.hechos} de ${h.tocaban} cumplidos${h.mejor ? ` · mejor: ${esc(h.mejor.habito.emoji)} ${esc(h.mejor.habito.nombre)}` : ""}`
      : "Sin hábitos marcados",
  }));

  // Estudio
  const e = a.estudio;
  filas.push(fila({
    icono: "📚",
    nombre: "Estudio",
    valor: formatoDuracion(e.total),
    dif: diferencia(e.total, b.estudio.total, true),
    detalle: e.total
      ? `Meta cumplida ${e.diasConMeta}/7 días${e.cursoTop ? ` · más: ${esc(e.cursoTop[0])}` : ""}`
      : "Sin sesiones de estudio",
  }));

  // Sueño
  const s = a.sueno;
  filas.push(fila({
    icono: "🌙",
    nombre: "Sueño (promedio)",
    valor: s.promedioMin === null ? "—" : formatoDuracion(s.promedioMin),
    dif: diferencia(s.promedioMin, b.sueno.promedioMin, true),
    detalle: s.registradas
      ? `${s.regularidadMin === null ? "" : `±${Math.round(s.regularidadMin)} min de variación · `}${s.enMeta}/${s.registradas} antes de ${esc(s.horaMeta)}`
      : "Sin noches registradas",
  }));

  // Agua
  const w = a.agua;
  filas.push(fila({
    icono: "💧",
    nombre: "Agua (por día)",
    valor: w.promedio === null ? "—" : `${w.promedio.toFixed(1).replace(".0", "")} vasos`,
    dif: diferencia(w.promedio, b.agua.promedio, true),
    detalle: w.diasRegistrados ? `Meta de ${w.meta} cumplida ${w.diasConMeta}/7 días` : "Sin vasos registrados",
  }));

  // Redes
  const r = a.redes;
  filas.push(fila({
    icono: "📱",
    nombre: "Redes (por día)",
    valor: r.promedio === null ? "—" : formatoDuracion(r.promedio),
    dif: diferencia(r.promedio, b.redes.promedio, false),
    detalle: r.registrados
      ? `Límite pasado ${r.diasPasados}/${r.registrados} días${r.appTop ? ` · más: ${esc(r.appTop[0])}` : ""}`
      : "Sin tiempo anotado",
  }));

  return `
    <section class="tarjeta">
      <h2>Comparado con la semana anterior</h2>
      <ul class="lista-metricas">${filas.join("")}</ul>
      <p class="texto-suave nota">Verde = mejoraste · rojo = empeoraste. En redes, bajar es bueno.</p>
    </section>`;
}
