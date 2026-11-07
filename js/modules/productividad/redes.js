// Pantalla "Redes sociales": registro manual de minutos por app, límites y tendencia.
import { vistaProvisional } from "../../utils/dom.js";

export const titulo = "Redes";

export function render(contenedor) {
  vistaProvisional(
    contenedor,
    "Aquí registrarás a mano los minutos por app que ves en Ajustes → Tiempo de uso, con tu límite diario y semanal y un gráfico de tendencia."
  );
}
