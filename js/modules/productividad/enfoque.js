// Pantalla "Enfoque": temporizador Pomodoro, cursos e historial de estudio.
import { vistaProvisional } from "../../utils/dom.js";

export const titulo = "Enfoque";

export function render(contenedor) {
  vistaProvisional(
    contenedor,
    "Aquí estará el temporizador Pomodoro (25/5 por defecto), con tus cursos y el historial de horas de estudio."
  );
}
