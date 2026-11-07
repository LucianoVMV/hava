// Pantalla "Sueño": hora de dormir/despertar, promedio semanal y regularidad.
import { vistaProvisional } from "../../utils/dom.js";

export const titulo = "Sueño";

export function render(contenedor) {
  vistaProvisional(
    contenedor,
    "Aquí registrarás a qué hora duermes y despiertas, y verás tu promedio semanal y qué tan regular es tu horario."
  );
}
