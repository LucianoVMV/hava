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
 * Muestra un aviso corto abajo de la pantalla (p. ej. "Guardado ✓") que se va solo.
 */
export function mostrarAviso(texto) {
  let aviso = document.getElementById("aviso");
  if (!aviso) {
    aviso = document.createElement("div");
    aviso.id = "aviso";
    aviso.className = "aviso";
    aviso.setAttribute("role", "status");
    document.body.append(aviso);
  }
  aviso.textContent = texto;
  aviso.classList.add("visible");
  clearTimeout(aviso._temporizador);
  aviso._temporizador = setTimeout(() => aviso.classList.remove("visible"), 2000);
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
