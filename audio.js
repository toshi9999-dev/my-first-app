const melody = [262, 330, 392, 523, 440, 392, 330, 294, 262, 330, 392, 587, 523, 440, 392, 330];
const bass = [131, 131, 165, 165, 196, 196, 165, 165];

export function createAudio(musicButton) {
  let context;
  let timer;
  let musicOn = false;
  let step = 0;

  const ensureContext = () => {
    context ||= new (window.AudioContext || window.webkitAudioContext)();
    context.resume();
  };

  const tone = (frequency, duration = 0.12, type = "square", volume = 0.035) => {
    if (!context) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  };

  const playMusicStep = () => {
    if (!context || context.state !== "running") return;
    tone(melody[step % melody.length], 0.15, "square", 0.018);
    if (step % 2 === 0) tone(bass[Math.floor(step / 2) % bass.length], 0.3, "triangle", 0.022);
    step += 1;
  };

  const updateButton = () => {
    musicButton.innerHTML = musicOn ? "MUSIC <span>♪ ON</span>" : "MUSIC <span>OFF</span>";
    musicButton.setAttribute("aria-pressed", String(musicOn));
  };

  const startMusic = () => {
    if (musicOn) return;
    ensureContext();
    musicOn = true;
    step = 0;
    playMusicStep();
    timer = window.setInterval(playMusicStep, 180);
    updateButton();
  };

  const stopMusic = () => {
    musicOn = false;
    window.clearInterval(timer);
    timer = undefined;
    updateButton();
  };

  musicButton.addEventListener("click", () => (musicOn ? stopMusic() : startMusic()));
  updateButton();

  return {
    toggleMusic: () => (musicOn ? stopMusic() : startMusic()),
    jump: () => { ensureContext(); tone(440, 0.08, "square", 0.025); },
    coin: () => { ensureContext(); tone(740, 0.09, "sine", 0.035); window.setTimeout(() => tone(988, 0.1, "sine", 0.025), 45); },
    stomp: () => { ensureContext(); tone(110, 0.12, "sawtooth", 0.03); },
    land: () => { if (context) tone(90, 0.06, "triangle", 0.018); },
    goal: () => { ensureContext(); [523, 659, 784].forEach((note, index) => window.setTimeout(() => tone(note, 0.18, "sine", 0.028), index * 85)); }
  };
}
