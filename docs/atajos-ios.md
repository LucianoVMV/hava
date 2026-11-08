# 🦆 Guía: el iPhone como ayudante de Hava

Hava es una app web: **no puede bloquear apps, leer tu Tiempo de uso ni mandarte notificaciones
programadas**. Pero el iPhone sí puede, con **Tiempo de uso** y la app **Atajos** (ya viene instalada).
Esta guía te deja todo configurado en ~15 minutos.

> Los nombres de los menús son de iOS 17/18 en español. Si algo se llama un poco distinto en tu
> versión, busca el más parecido.

---

## 1. Limitar las redes de verdad (Límites de apps)

Esto **sí bloquea**: al llegar al límite, el iPhone tapa la app con una pantalla de "Límite de tiempo".

1. **Ajustes → Tiempo de uso → Límites de apps → Añadir límite**.
2. Marca la categoría **Redes sociales** (o despliégala y elige solo Instagram, TikTok…).
3. Toca **Siguiente** y elige el tiempo: por ejemplo **1 h 30 min** (el mismo límite que pusiste en Hava).
4. Opcional: **Personalizar días** si quieres más tiempo los fines de semana.
5. Toca **Añadir**.

💡 Para que no sea tan fácil saltártelo: *Tiempo de uso → Usar código de Tiempo de uso* y pídele a
alguien que lo ponga por ti. Sin código, al llegar al límite puedes tocar "Ignorar límite".

---

## 2. Un aviso de Milo cada vez que abres Instagram o TikTok

No bloquea, pero te hace **pensarlo dos veces** (que es justo lo que corta el "abrir por costumbre").

1. Abre **Atajos** → pestaña **Automatización** → **＋** (o *Nueva automatización*).
2. Elige **App**.
3. Toca **Elegir**, marca **Instagram** y **TikTok** (y las que quieras) → **OK**.
4. Deja marcado **Se abre** y elige **Ejecutar inmediatamente** → **Siguiente**.
5. Toca **Nuevo atajo en blanco** → **Añadir acción** → busca **Mostrar notificación**.
6. Escribe el mensaje, por ejemplo:
   > 🦆 Milo: ¿de verdad ahora? Tu límite es 1 h 30 al día.
7. Toca **Listo**.

Variante más "fuerte": en vez de *Mostrar notificación* usa **Mostrar alerta** (te obliga a tocar un
botón antes de seguir).

---

## 3. Primera media hora del día sin redes

Para **bloquear** en un horario, el iPhone usa **Tiempo de inactividad**: durante ese rato solo puedes
abrir las apps que marques como "siempre permitidas".

1. **Ajustes → Tiempo de uso → Tiempo de inactividad** → activa **Programado**.
2. Pon el horario, por ejemplo **06:30 a 07:00** (ajústalo a tu hora de despertar).
3. Vuelve y entra a **Siempre permitido**: deja Teléfono, Mensajes, Reloj, Safari (para abrir Hava), etc.
   Quita Instagram, TikTok y YouTube.

⚠️ El iPhone permite **un solo horario** de inactividad al día. Elige el que más te sirva:
- **Mañana** (06:30–07:00): la primera media hora sin redes.
- **Noche** (22:30–06:30): apoya tu hábito 📵 *Sin celular antes de dormir* (Hava te muestra "desde las
  22:30" según tu meta de sueño).

Si eliges la noche, para la mañana puedes usar la automatización de la sección 2 con un mensaje como
"🌅 Primero tu rutina, después las redes".

---

## 4. "Al salir de casa, recuérdame llaves, cargador y audífonos"

### Opción A — por hora (la más confiable)
1. **Atajos → Automatización → ＋ → Hora del día**.
2. Pon la hora a la que sueles salir, **unos minutos antes** (por ejemplo 07:15).
3. **Repetir → Semanalmente** y marca tus días de clases.
4. **Ejecutar inmediatamente** → **Siguiente** → **Nuevo atajo en blanco**.
5. Añade **Mostrar notificación**:
   > 🚪 Antes de salir: 🔑 Llaves · 🔌 Cargador · 🎧 Audífonos
6. **Listo**.

### Opción B — al salir de casa (por ubicación)
1. **Atajos → Automatización → ＋ → Salir**.
2. **Ubicación → Elegir** → busca tu casa → **Listo** (el radio más chico posible).
3. Elige **Ejecutar inmediatamente** → mismo mensaje que arriba.

⚠️ La ubicación se activa cuando ya **saliste** (a unos 100 m o más), así que sirve más como "¿te
olvidaste algo?" que como recordatorio previo. Por eso recomendamos la opción A, o las dos.

💡 La checklist de Hava (*Hábitos → Antes de salir*) es para marcar mientras guardas las cosas: el
aviso del iPhone te recuerda abrirla.

---

## 5. Recordatorios útiles para Hava

Todas se crean igual: **Atajos → Automatización → ＋ → Hora del día → Ejecutar inmediatamente →
Nuevo atajo en blanco → Mostrar notificación**.

| Cuándo | Mensaje sugerido |
|---|---|
| Todos los días, 09:00 | 📱 Anota en Hava tu tiempo de redes de ayer |
| Todos los días, 22:30 | 🌙 Hora de soltar el celular. Toca "Me voy a dormir" en Hava |
| Domingos, 20:00 | 💾 Exporta tu respaldo de Hava (Más → Ajustes) |

---

## 6. Abrir Hava rápido

- Deja el ícono de Hava en tu **pantalla de inicio o en el Dock** (lo agregaste desde Safari con
  *Compartir → Agregar a pantalla de inicio*).
- Las notificaciones de Atajos abren la app Atajos, no Hava: después del aviso, abre Hava desde su ícono.

---

## Lo que el iPhone NO permite (para que no pierdas tiempo buscándolo)

- Que una app web lea tu **Tiempo de uso**: por eso en Hava el registro de redes es manual.
- Que una app web **bloquee** otras apps: eso solo lo hacen *Límites de apps* y *Tiempo de inactividad*.
- **Alarmas o notificaciones programadas** desde Hava con la app cerrada: para eso están estos
  Atajos (y, más adelante, exportar recordatorios al **Calendario** con un archivo `.ics`).
