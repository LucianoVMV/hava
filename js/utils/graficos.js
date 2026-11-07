// =========================================================
// graficos.js — gráficos simples en SVG, sin librerías
// =========================================================
//
// Un SVG es un dibujo hecho con texto (rectángulos, líneas…).
// Lo armamos como un string y el navegador lo dibuja.
// Los colores usan las variables CSS, así respetan el modo claro/oscuro.

import { escaparHTML } from "./dom.js";

/**
 * Gráfico de barras verticales.
 * @param {object} opciones
 * @param {(number|null)[]} opciones.valores   un valor por barra (null = sin dato)
 * @param {string[]} opciones.etiquetas         texto bajo cada barra
 * @param {number} [opciones.meta]              dibuja una línea punteada en este valor
 * @param {number} [opciones.maximo]            valor que corresponde al tope del gráfico
 * @param {(v:number)=>boolean} [opciones.cumple] decide si una barra se pinta "en meta"
 * @param {string} [opciones.descripcion]       texto para lectores de pantalla
 */
export function graficoBarras({ valores, etiquetas, meta, maximo, cumple, descripcion = "" }) {
  const ancho = 320;
  const alto = 160;
  const abajo = 22; // espacio para las etiquetas
  const altoUtil = alto - abajo - 8;
  const max = maximo ?? Math.max(1, meta ?? 0, ...valores.map((v) => v ?? 0));
  const paso = ancho / valores.length;
  const anchoBarra = Math.min(28, paso * 0.6);

  const y = (v) => alto - abajo - (Math.min(v, max) / max) * altoUtil;

  const barras = valores
    .map((v, i) => {
      const x = i * paso + (paso - anchoBarra) / 2;
      const etiqueta = `<text x="${x + anchoBarra / 2}" y="${alto - 6}" text-anchor="middle"
        font-size="12" fill="var(--texto-suave)">${escaparHTML(etiquetas[i] ?? "")}</text>`;
      if (v === null || v === undefined) {
        // Sin dato: un puntito para que se note el día vacío
        return `<circle cx="${x + anchoBarra / 2}" cy="${alto - abajo - 3}" r="2"
          fill="var(--borde)"/>${etiqueta}`;
      }
      const color = cumple && !cumple(v) ? "var(--texto-suave)" : "var(--acento)";
      const top = y(v);
      return `<rect x="${x}" y="${top}" width="${anchoBarra}" height="${alto - abajo - top}"
        rx="5" fill="${color}" opacity="${color === "var(--acento)" ? 1 : 0.45}"/>${etiqueta}`;
    })
    .join("");

  const lineaMeta =
    meta === undefined
      ? ""
      : `<line x1="0" x2="${ancho}" y1="${y(meta)}" y2="${y(meta)}"
          stroke="var(--exito)" stroke-width="1.5" stroke-dasharray="5 4"/>`;

  return `<svg class="grafico" viewBox="0 0 ${ancho} ${alto}" role="img"
    aria-label="${escaparHTML(descripcion)}">${barras}${lineaMeta}</svg>`;
}
