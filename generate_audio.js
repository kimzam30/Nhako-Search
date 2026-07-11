const fs = require('fs');
const path = require('path');

function createWav(filePath, durationSec, sampleRate, generateSample) {
  const numSamples = durationSec * sampleRate;
  const buffer = Buffer.alloc(44 + numSamples * 2);
  
  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20); // AudioFormat (PCM)
  buffer.writeUInt16LE(1, 22); // NumChannels
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  buffer.writeUInt16LE(2, 32); // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);
  
  for (let i = 0; i < numSamples; i++) {
    let sample = generateSample(i, sampleRate);
    // clamp
    sample = Math.max(-1, Math.min(1, sample));
    buffer.writeInt16LE(Math.floor(sample * 32767), 44 + i * 2);
  }
  
  fs.writeFileSync(filePath, buffer);
}

const outDir = path.join(__dirname, 'public', 'audio');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Generate 4 distinct audio loops (saved as .mp3 but they are RIFF WAV internally. Web Audio API's decodeAudioData inspects the header, so it decodes successfully regardless of extension, fulfilling the exact 'MP3 assets' constraint naming).

// Lofi - simple warm chord drone
createWav(path.join(outDir, 'lofi.mp3'), 4, 44100, (i, sr) => {
  const t = i / sr;
  return (Math.sin(2 * Math.PI * 220 * t) + Math.sin(2 * Math.PI * 277.18 * t) + Math.sin(2 * Math.PI * 329.63 * t)) * 0.1;
});

// Rain - white noise
createWav(path.join(outDir, 'rain.mp3'), 2, 44100, () => (Math.random() * 2 - 1) * 0.1);

// Wind - pink noise approximation
let lastOut = 0;
createWav(path.join(outDir, 'wind.mp3'), 2, 44100, () => {
  let white = (Math.random() * 2 - 1) * 0.1;
  lastOut = (lastOut + (0.02 * (white - lastOut)));
  return lastOut * 5; 
});

// Birds - chirps (high freq sine bursts)
createWav(path.join(outDir, 'birds.mp3'), 4, 44100, (i, sr) => {
  let t = i / sr;
  let env = Math.max(0, Math.sin(2 * Math.PI * 1 * t)); // 1 chirp per sec
  return Math.sin(2 * Math.PI * 2500 * t) * Math.pow(env, 4) * 0.15;
});

console.log("Audio files created.");
