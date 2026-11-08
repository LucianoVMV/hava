"""
procesar-milo.py — prepara las ilustraciones de Milo para la app (solo se usa al desarrollar)

Toma los originales de diseno/milo-originales/ y genera img/milo/*.webp:
  1. Quita "restos" sueltos en los bordes (líneas que quedaron al recortar
     cada patito de una imagen más grande).
  2. Recorta el espacio transparente sobrante.
  3. Reduce el tamaño (máx. 320 px: se muestran a ~150 px, el doble para pantallas retina).
  4. Guarda en WebP: con transparencia y mucho más liviano que PNG.

Uso (desde la carpeta del proyecto; requiere Pillow y numpy):
    python tools/procesar-milo.py
"""
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
ORIGEN = RAIZ / "diseno" / "milo-originales"
DESTINO = RAIZ / "img" / "milo"
TAMANO_MAX = 320

# nombre original (sin "hava_patito_NN_") → nombre corto para el código
NOMBRES = {
    "saludo": "saludo",
    "focus_laptop": "laptop",
    "musica": "musica",
    "tareas_completadas": "tareas",
    "descanso": "descanso",
    "estudio": "estudio",
    "ejercicio": "ejercicio",
    "logro": "logro",
    "calendario": "calendario",
    "cafe": "cafe",
    "caminata": "caminata",
    "meditacion": "meditacion",
    "ideas": "ideas",
    "notificaciones": "notificaciones",
    "celebracion": "celebracion",
    "objetivos": "objetivos",
    "agua": "agua",
    "preocupado": "preocupado",
}


def componentes(mascara):
    """Separa la máscara en manchas conectadas. Devuelve listas de (y, x)."""
    alto, ancho = mascara.shape
    visto = np.zeros_like(mascara, dtype=bool)
    grupos = []
    for y0, x0 in zip(*np.nonzero(mascara)):
        if visto[y0, x0]:
            continue
        cola, grupo = deque([(y0, x0)]), []
        visto[y0, x0] = True
        while cola:
            y, x = cola.popleft()
            grupo.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < alto and 0 <= nx < ancho and mascara[ny, nx] and not visto[ny, nx]:
                    visto[ny, nx] = True
                    cola.append((ny, nx))
        grupos.append(grupo)
    return grupos


def limpiar_bordes(imagen):
    """Borra manchas pequeñas y aplanadas que tocan el borde (restos del recorte)."""
    datos = np.array(imagen)
    alto, ancho = datos.shape[:2]
    mascara = datos[:, :, 3] > 20
    total = mascara.sum()
    for grupo in componentes(mascara):
        ys = [p[0] for p in grupo]
        xs = [p[1] for p in grupo]
        toca_borde = min(ys) == 0 or min(xs) == 0 or max(ys) == alto - 1 or max(xs) == ancho - 1
        pequena = len(grupo) < total * 0.15
        aplanada = (max(ys) - min(ys)) < alto * 0.25
        if toca_borde and pequena and aplanada:
            for y, x in grupo:
                datos[y, x, 3] = 0
    return Image.fromarray(datos)


def procesar(ruta):
    imagen = Image.open(ruta).convert("RGBA")
    imagen = limpiar_bordes(imagen)
    imagen = imagen.crop(imagen.getchannel("A").point(lambda a: 255 if a > 20 else 0).getbbox())
    # Un pequeño margen para que nada quede pegado al borde
    margen = round(max(imagen.size) * 0.03)
    lienzo = Image.new("RGBA", (imagen.width + 2 * margen, imagen.height + 2 * margen), (0, 0, 0, 0))
    lienzo.paste(imagen, (margen, margen))
    lienzo.thumbnail((TAMANO_MAX, TAMANO_MAX), Image.LANCZOS)
    return lienzo


def main():
    DESTINO.mkdir(parents=True, exist_ok=True)
    for ruta in sorted(ORIGEN.glob("hava_patito_*.png")):
        clave = ruta.stem.split("_", 3)[3]  # "hava_patito_06_estudio" → "estudio"
        nombre = NOMBRES.get(clave, clave)
        salida = DESTINO / f"{nombre}.webp"
        procesar(ruta).save(salida, "WEBP", quality=88, method=6)
        print(f"{salida.relative_to(RAIZ)}  {salida.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
