// =========================================================
// dom.js — pequeñas ayudas para dibujar HTML
// =========================================================

/**
 * Escapa texto para insertarlo en HTML sin riesgo.
 * Importante cuando mostremos datos que tú escribes (nombres de hábitos, cursos…):
 * evita que un texto como "<script>" se interprete como código.
 */
export function escaparHTML(texto) {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Tarjeta temporal para pantallas que todavía no construimos.
 * La iremos reemplazando paso a paso.
 */
export function vistaProvisional(contenedor, descripcion) {
  contenedor.innerHTML = `
    <section class="tarjeta">
      <span class="etiqueta">En construcción</span>
      <p class="texto-suave">${escaparHTML(descripcion)}</p>
    </section>
  `;
}
