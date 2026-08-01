(() => {
  const STORAGE_KEY = 'letterfall.sound-enabled.v1';
  let context = null;
  let enabled = true;
  let unlockedByPlayer = false;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    enabled = stored === null ? true : stored === 'true';
  } catch {
    // Отсутствие localStorage не должно блокировать звук.
  }

  function audioContext() {
    if (context) return context;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    context = new AudioContextClass();
    return context;
  }

  function unlock() {
    if (!enabled) return;
    unlockedByPlayer = true;
    const currentContext = audioContext();
    if (currentContext?.state === 'suspended') currentContext.resume().catch(() => {});
  }

  function tone(frequency, startOffset, duration, options = {}) {
    if (!enabled || !unlockedByPlayer) return;
    const currentContext = audioContext();
    if (!currentContext) return;
    const start = currentContext.currentTime + startOffset;
    const oscillator = currentContext.createOscillator();
    const gain = currentContext.createGain();
    oscillator.type = options.type || 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    if (options.endFrequency) oscillator.frequency.exponentialRampToValueAtTime(options.endFrequency, start + duration);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(options.volume || .08, start + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain).connect(currentContext.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + .03);
  }

  function sequence(notes, options = {}) {
    notes.forEach(([frequency, offset, duration, extra = {}]) => {
      tone(frequency, offset, duration, { ...options, ...extra });
    });
  }

  function play(name) {
    if (!enabled) return;
    const sounds = {
      start: () => sequence([[330, 0, .1], [440, .08, .12], [660, .16, .22]], { volume: .05 }),
      correct: () => sequence([[523, 0, .09], [659, .07, .1], [784, .14, .16]], { volume: .065 }),
      heal: () => sequence([[523, 0, .1], [784, .1, .11], [1047, .2, .2]], { volume: .07 }),
      level: () => sequence([[392, 0, .09], [523, .08, .09], [659, .16, .1], [784, .24, .22]], { volume: .075, type: 'triangle' }),
      lost: () => sequence([[220, 0, .18, { endFrequency: 170 }], [160, .13, .24, { endFrequency: 110 }]], { volume: .08, type: 'sawtooth' }),
      finish: () => sequence([[330, 0, .16], [247, .13, .18], [165, .28, .34]], { volume: .08, type: 'triangle' }),
    };
    sounds[name]?.();
  }

  function setEnabled(value) {
    enabled = Boolean(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch {
      // Настройка действует хотя бы до перезагрузки страницы.
    }
    if (enabled) unlock();
    else context?.suspend().catch(() => {});
  }

  window.LetterfallSounds = {
    isEnabled: () => enabled,
    setEnabled,
    unlock,
    play,
    pause: () => context?.suspend().catch(() => {}),
    resume: () => enabled && context?.resume().catch(() => {}),
  };
})();
