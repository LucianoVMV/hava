// Pantalla "Ajustes": metas, listas editables, respaldo, exportar .ics y borrar datos.
import { vistaProvisional } from "../../utils/dom.js";

export const titulo = "Ajustes";

export function render(contenedor) {
  vistaProvisional(
    contenedor,
    "Aquí configurarás tus metas y listas, exportarás o importarás tu respaldo, exportarás recordatorios al Calendario y podrás borrar todos los datos."
  );
}
