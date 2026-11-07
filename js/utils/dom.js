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

const dosDigitos = (n) => String(n).padStart(2, "0");

/**
 * Selector de hora en formato 24 h (dos listas: hora y minutos).
 * ¿Por qué no <input type="time">? Porque si el teléfono o la PC usan formato
 * de 12 h (a. m./p. m.), no deja escribir "00:30" y confunde la medianoche.
 * En iPhone, cada lista se abre como la ruedita nativa.
 *
 * @param {string} nombre  base del nombre; crea los campos "<nombre>-h" y "<nombre>-m"
 * @param {string} valor   hora inicial "HH:MM"
 * @param {object} [op]
 * @param {number} [op.inicio=0]  primera hora de la lista (18 → 18, 19…23, 00, 01…17)
 * @param {number} [op.paso=5]    cada cuántos minutos hay opción
 */
export function selectorHora(nombre, valor, { inicio = 0, paso = 5 } = {}) {
  const [h, m] = valor.split(":").map(Number);
  const horas = Array.from({ length: 24 }, (_, i) => (inicio + i) % 24);
  const minutos = [];
  for (let i = 0; i < 60; i += paso) minutos.push(i);
  // Si la hora guardada no cae en el paso (p. ej. 00:13), la agregamos para no perderla
  if (!minutos.includes(m)) minutos.push(m);
  minutos.sort((a, b) => a - b);

  const opciones = (lista, elegido) =>
    lista
      .map((n) => `<option value="${dosDigitos(n)}"${n === elegido ? " selected" : ""}>${dosDigitos(n)}</option>`)
      .join("");

  return `
    <div class="selector-hora">
      <select name="${nombre}-h" aria-label="Hora">${opciones(horas, h)}</select>
      <span aria-hidden="true">:</span>
      <select name="${nombre}-m" aria-label="Minutos">${opciones(minutos, m)}</select>
    </div>`;
}

/** Lee el valor "HH:MM" de un selectorHora dentro de un formulario. */
export function leerHora(form, nombre) {
  return `${form.elements[`${nombre}-h`].value}:${form.elements[`${nombre}-m`].value}`;
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
