// Pantalla "Hábitos": crear/editar hábitos, rachas, mapa de calor y checklist "Antes de salir".
import { vistaProvisional } from "../../utils/dom.js";

export const titulo = "Hábitos";

export function render(contenedor) {
  vistaProvisional(
    contenedor,
    "Aquí podrás crear tus hábitos, ver tus rachas y el calendario de cumplimiento, y editar tu checklist «Antes de salir»."
  );
}
