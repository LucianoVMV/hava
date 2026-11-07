// Pantalla "Hoy": resumen del día (hábitos, agua, redes, acceso al temporizador).
import { vistaProvisional } from "../../utils/dom.js";

export const titulo = "Hoy";

export function render(contenedor) {
  vistaProvisional(
    contenedor,
    "Aquí verás tus hábitos del día, los vasos de agua, tu tiempo en redes y un acceso rápido al temporizador."
  );
}
