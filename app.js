const NOTES = [
  { name: 'G#/Ab', traditional: 'G#/Ab minor', semitone: 8, camelot: '1A', major: '4B', color: '#55eadc' },
  { name: 'D#/Eb', traditional: 'D#/Eb minor', semitone: 3, camelot: '2A', major: '5B', color: '#8ff0b6' },
  { name: 'A#/Bb', traditional: 'A#/Bb minor', semitone: 10, camelot: '3A', major: '6B', color: '#b9f58b' },
  { name: 'F', traditional: 'F minor', semitone: 5, camelot: '4A', major: '7B', color: '#ffe08a' },
  { name: 'C', traditional: 'C minor', semitone: 0, camelot: '5A', major: '8B', color: '#ffbf99' },
  { name: 'G', traditional: 'G minor', semitone: 7, camelot: '6A', major: '9B', color: '#ff9a93' },
  { name: 'D', traditional: 'D minor', semitone: 2, camelot: '7A', major: '10B', color: '#f58bb8' },
  { name: 'A', traditional: 'A minor', semitone: 9, camelot: '8A', major: '11B', color: '#d99af9' },
  { name: 'E', traditional: 'E minor', semitone: 4, camelot: '9A', major: '12B', color: '#c6b4ff' },
  { name: 'B', traditional: 'B minor', semitone: 11, camelot: '10A', major: '1B', color: '#b7d4ff' },
  { name: 'F#/Gb', traditional: 'F#/Gb minor', semitone: 6, camelot: '11A', major: '2B', color: '#86d8ff' },
  { name: 'C#/Db', traditional: 'C#/Db minor', semitone: 1, camelot: '12A', major: '3B', color: '#5fe7f0' },
];

const noteGrid = document.querySelector('.note-grid');
const currentNote = document.querySelector('#current-note');
const stopButton = document.querySelector('#stop-button');
const octaveSelect = document.querySelector('#octave-select');
const soundSelect = document.querySelector('#sound-select');
const modeSelect = document.querySelector('#mode-select');
const volumeSlider = document.querySelector('#volume-slider');
const volumeValue = document.querySelector('#volume-value');

let audioContext;
let masterGain;
let activeVoice;
let activeNote;

function noteFrequency(semitone, octave) {
  // MIDI note 69 is A4 at 440 Hz. C in the selected octave is MIDI octave * 12 + 12.
  const midi = Number(octave) * 12 + 12 + semitone;
  return 440 * 2 ** ((midi - 69) / 12);
}

function ensureAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioContext.createGain();
    masterGain.gain.value = Number(volumeSlider.value) / 100;
    masterGain.connect(audioContext.destination);
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
}

function createVoice(frequency) {
  const now = audioContext.currentTime;
  const output = audioContext.createGain();
  output.gain.setValueAtTime(0.0001, now);
  output.gain.exponentialRampToValueAtTime(0.9, now + 0.025);
  output.connect(masterGain);

  const sound = soundSelect.value;
  const oscillators = [];

  const addOscillator = (type, detune = 0, gainAmount = 1) => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    osc.detune.value = detune;
    gain.gain.value = gainAmount;
    osc.connect(gain).connect(output);
    osc.start(now);
    oscillators.push(osc);
  };

  if (sound === 'soft') {
    addOscillator('sine', -4, 0.7);
    addOscillator('triangle', 4, 0.35);
  } else if (sound === 'piano') {
    output.gain.setValueAtTime(1, now);
    output.gain.exponentialRampToValueAtTime(0.18, now + 1.2);
    addOscillator('triangle', 0, 0.9);
    addOscillator('sine', 1200, 0.18);
  } else {
    addOscillator('sine');
  }

  return { output, oscillators };
}

function stopActiveVoice() {
  if (!activeVoice || !audioContext) return;
  const now = audioContext.currentTime;
  activeVoice.output.gain.cancelScheduledValues(now);
  activeVoice.output.gain.setTargetAtTime(0.0001, now, 0.025);
  activeVoice.oscillators.forEach((osc) => osc.stop(now + 0.12));
  activeVoice = null;
  activeNote = null;
  currentNote.textContent = 'Nothing';
  document.querySelectorAll('.note-button').forEach((button) => button.classList.remove('active'));
}

function playNote(note, button) {
  if (modeSelect.value === 'sustain' && activeNote?.camelot === note.camelot) {
    stopActiveVoice();
    return;
  }

  ensureAudio();
  stopActiveVoice();
  const frequency = noteFrequency(note.semitone, octaveSelect.value);
  activeVoice = createVoice(frequency);
  activeNote = note;
  currentNote.textContent = `${note.camelot} • ${note.traditional} / relative major ${note.major}`;
  button.classList.add('active');
}

function renderNotes() {
  document.querySelectorAll('.note-button').forEach((button) => {
    const note = NOTES.find((candidate) => candidate.camelot === button.dataset.note);
    if (!note) return;
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      playNote(note, button);
    });
    button.addEventListener('pointerup', () => {
      if (modeSelect.value === 'momentary') stopActiveVoice();
    });
    button.addEventListener('pointercancel', stopActiveVoice);
    button.addEventListener('pointerleave', () => {
      if (modeSelect.value === 'momentary') stopActiveVoice();
    });
  });
}

volumeSlider.addEventListener('input', () => {
  volumeValue.textContent = `${volumeSlider.value}%`;
  if (masterGain) masterGain.gain.value = Number(volumeSlider.value) / 100;
});
stopButton.addEventListener('click', stopActiveVoice);
soundSelect.addEventListener('change', stopActiveVoice);
octaveSelect.addEventListener('change', stopActiveVoice);
modeSelect.addEventListener('change', stopActiveVoice);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('service-worker.js'));
}

renderNotes();
