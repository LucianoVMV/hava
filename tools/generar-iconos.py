"""
generar-iconos.py — crea los íconos de Hava a partir del logo (solo se usa al desarrollar)

El logo (diseno/logo-hava.png) tiene fondo crema, el cuadrado redondeado y el texto "Hava".
Para un ícono de app eso no sirve tal cual: iOS y Android redondean las esquinas
por su cuenta, así que el ícono debe ser un cuadrado lleno hasta los bordes.
Este script:
  1. Encuentra la "H" con Milo dentro del cuadrado verde azulado.
  2. La pone centrada sobre un fondo verde azulado que llena todo el ícono.

Uso (desde la carpeta del proyecto; requiere Pillow y numpy):
    python tools/generar-iconos.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
LOGO = RAIZ / "diseno" / "logo-hava.png"
DESTINO = RAIZ / "icons"
TEAL = (7, 70, 79)  # #07464f, el color del cuadrado del logo


def recortar_marca(logo):
    """Devuelve la "H" con Milo, recortada justo, sin el texto ni el cuadrado."""
    datos = np.array(logo.convert("RGB")).astype(int)
    es_teal = np.abs(datos - np.array(TEAL)).sum(axis=2) < 40
    # El cuadrado es la zona teal de la mitad de arriba (abajo está el texto "Hava")
    ys, xs = np.nonzero(es_teal[: logo.height * 2 // 3])
    x0, y0, x1, y1 = xs.min(), ys.min(), xs.max(), ys.max()
    # Dentro del cuadrado, la marca es todo lo que NO es teal (dejando fuera las esquinas)
    margen = (x1 - x0) // 8
    interior = ~es_teal[y0 + margen : y1 - margen, x0 + margen : x1 - margen]
    iy, ix = np.nonzero(interior)
    caja = (x0 + margen + ix.min(), y0 + margen + iy.min(), x0 + margen + ix.max() + 1, y0 + margen + iy.max() + 1)
    return logo.convert("RGB").crop(caja)


def icono(marca, tamano, proporcion):
    """Marca centrada ocupando `proporcion` del ancho, sobre fondo teal lleno."""
    lienzo = Image.new("RGB", (tamano, tamano), TEAL)
    ancho = round(tamano * proporcion)
    alto = round(marca.height * ancho / marca.width)
    chica = marca.resize((ancho, alto), Image.LANCZOS)
    lienzo.paste(chica, ((tamano - ancho) // 2, (tamano - alto) // 2))
    return lienzo


def main():
    marca = recortar_marca(Image.open(LOGO))
    salidas = {
        "icon-180.png": (180, 0.62),  # apple-touch-icon (iPhone)
        "icon-192.png": (192, 0.62),
        "icon-512.png": (512, 0.62),
        "icon-maskable-512.png": (512, 0.50),  # Android recorta en círculo: más margen
        "favicon-32.png": (32, 0.74),  # pestaña del navegador
    }
    for nombre, (tamano, proporcion) in salidas.items():
        ruta = DESTINO / nombre
        icono(marca, tamano, proporcion).save(ruta, optimize=True)
        print(f"icons/{nombre}  {ruta.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
