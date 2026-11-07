// =========================================================
// avisos.js — sonido, vibración y "pantalla encendida" (solo con la app abierta)
// =========================================================
//
// Limitaciones reales en iPhone (no se pueden evitar desde una PWA):
//  - Si la app está cerrada o la pantalla bloqueada, NO puede sonar: iOS congela el código.
//  - iOS no permite vibrar desde la web (navigator.vibrate no existe en Safari).
//  - El sonido solo funciona si antes tocaste un botón (iOS lo exige); por eso
//    "desbloqueamos" el audio al tocar Iniciar.
// Para que el aviso funcione, lo mejor es dejar la app abierta con la pantalla
// encendida: para eso usamos Wake Lock (evita que la pantalla se apague sola).

let contextoAudio = null;
let bloqueoPantalla = null;

/** Prepara el audio. Debe llamarse dentro de un toque del usuario (p. ej. al tocar Iniciar). */
export function desbloquearAudio() {
  try {
    contextoAudio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (contextoAudio.state === "suspended") contextoAudio.resume();
  } catch {
    contextoAudio = null; // sin audio: seguimos sin sonido
  }
}

/** Tres pitidos cortos (generados, sin archivos de audio). */
export function sonarAviso() {
  if (contextoAudio && contextoAudio.state === "running") {
    const inicio = contextoAudio.currentTime;
    [0, 0.35, 0.7].forEach((retraso) => pitido(inicio + retraso));
  }
  // Vibrar: funciona en Android; en iPhone no existe. Solo si ya tocaste la pantalla
  // (si no, el navegador lo bloquea y muestra un error).
  if (navigator.userActivation?.hasBeenActive ?? true) navigator.vibrate?.([200, 100, 200]);
}

function pitido(cuando) {
  const osc = contextoAudio.createOscillator();
  const volumen = contextoAudio.createGain();
  osc.type = "sine";
  osc.frequency.value = 880; // nota La, suena claro sin ser molesto
  volumen.gain.setValueAtTime(0.0001, cuando);
  volumen.gain.exponentialRampToValueAtTime(0.4, cuando + 0.02);
  volumen.gain.exponentialRampToValueAtTime(0.0001, cuando + 0.25);
  osc.connect(volumen).connect(contextoAudio.destination);
  osc.start(cuando);
  osc.stop(cuando + 0.3);
}

/** Evita que la pantalla se apague (si el navegador lo permite). */
export async function mantenerPantalla(activar) {
  try {
    if (activar && !bloqueoPantalla && "wakeLock" in navigator) {
      bloqueoPantalla = await navigator.wakeLock.request("screen");
      bloqueoPantalla.addEventListener("release", () => (bloqueoPantalla = null));
    } else if (!activar && bloqueoPantalla) {
      await bloqueoPantalla.release();
      bloqueoPantalla = null;
    }
  } catch {
    bloqueoPantalla = null; // p. ej. batería baja: el sistema lo rechaza
  }
}

export const pantallaSoportada = () => "wakeLock" in navigator;
