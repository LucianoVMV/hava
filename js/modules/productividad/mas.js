// Pantalla "Más": menú con las secciones que no caben en la barra de pestañas.

export const titulo = "Más";

// Cada entrada apunta a una ruta definida en app.js
const SECCIONES = [
  { ruta: "redes", emoji: "📱", nombre: "Redes sociales" },
  { ruta: "sueno", emoji: "🌙", nombre: "Sueño" },
  { ruta: "resumen", emoji: "📊", nombre: "Resumen semanal" },
];

const AJUSTES = [{ ruta: "ajustes", emoji: "⚙️", nombre: "Ajustes y respaldo" }];

function listaHTML(items) {
  const filas = items
    .map(
      (s) => `
      <li>
        <a href="#/${s.ruta}">
          <span class="emoji" aria-hidden="true">${s.emoji}</span>
          <span>${s.nombre}</span>
          <span class="flecha" aria-hidden="true">›</span>
        </a>
      </li>`
    )
    .join("");
  return `<ul class="lista-menu">${filas}</ul>`;
}

export function render(contenedor) {
  contenedor.innerHTML = listaHTML(SECCIONES) + listaHTML(AJUSTES);
}
