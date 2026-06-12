// Web Audio helpers shared by the game board and the podium page.
let soundEnabled = true;
let audioCtx = null;

function ensureAudio() {
  if (!soundEnabled) return null;
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, duration, type = "sine", gainValue = 0.035) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = gainValue;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.stop(ctx.currentTime + duration);
}

function tickSound(current, target) {
  if (current % 4 !== 0 && current - target > 5) return;
  playTone(240 + current * 3, 0.025, "square", 0.018);
}
