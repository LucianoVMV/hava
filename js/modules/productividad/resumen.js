// Pantalla "Resumen semanal": comparación con la semana anterior y una conclusión accionable.
import { vistaProvisional } from "../../utils/dom.js";

export const titulo = "Resumen";

export function render(contenedor) {
  vistaProvisional(
    contenedor,
    "Aquí verás tu semana: hábitos cumplidos, horas de estudio, sueño y redes comparados con la semana anterior, más una recomendación."
  );
}
