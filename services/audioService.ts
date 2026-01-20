
// Check for browser support
const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
export const audioCtx = AudioContextClass ? new AudioContextClass() : null;

export const playSound = (type: 'correct' | 'incorrect' | 'complete') => {
  if (!audioCtx) return;
  
  // Resume context if suspended (required by browsers)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  const gainNode = audioCtx.createGain();
  gainNode.connect(audioCtx.destination);

  const now = audioCtx.currentTime;

  if (type === 'correct') {
    // High pitch chime (Sine wave C5 -> C6)
    const osc = audioCtx.createOscillator();
    osc.connect(gainNode);
    osc.type = 'sine';
    
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.1);
    
    // Subtle volume envelope
    gainNode.gain.setValueAtTime(0.05, now); // Quiet start
    gainNode.gain.linearRampToValueAtTime(0.1, now + 0.05); // Attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5); // Decay
    
    osc.start(now);
    osc.stop(now + 0.5);

  } else if (type === 'incorrect') {
    // Low pitch thud (Triangle wave)
    const osc = audioCtx.createOscillator();
    osc.connect(gainNode);
    osc.type = 'triangle';
    
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.2);
    
    gainNode.gain.setValueAtTime(0.1, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    
    osc.start(now);
    osc.stop(now + 0.3);

  } else if (type === 'complete') {
    // Success fanfare (C Major arpeggio)
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    
    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const noteGain = audioCtx.createGain();
      osc.connect(noteGain);
      noteGain.connect(audioCtx.destination);
      
      osc.type = 'triangle';
      osc.frequency.value = freq;
      
      const startTime = now + (i * 0.1);
      const duration = i === notes.length - 1 ? 0.8 : 0.4;
      
      noteGain.gain.setValueAtTime(0.0, startTime);
      noteGain.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
      noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }
};
