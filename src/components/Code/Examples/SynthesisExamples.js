// src/components/Code/Examples/chuckExamples.js
export const chuckExamples = {
  "Basics": [
    {
      name: "Hello Sine",
      description: "Simple sine wave oscillator",
      code: `// Basic sine wave example
// Connect a SinOsc (sine wave oscillator) to dac (audio output)
SinOsc s => dac;

// Set frequency to A4 (440 Hz)
440.0 => s.freq;

// Set gain (amplitude)
0.5 => s.gain;

// Let it sound for 2 seconds
2::second => now;
`
    },
    {
      name: "Sound Chain",
      description: "Create a chain of unit generators",
      code: `// Example of chaining unit generators
// Create a sawtooth oscillator
SawOsc saw => LPF filter => NRev reverb => dac;

// Set parameters
220.0 => saw.freq;
0.5 => saw.gain;
1000.0 => filter.freq;
2.0 => filter.Q;
0.1 => reverb.mix;

// Play for 4 seconds
4::second => now;
`
    }
  ],
  "Synthesis": [
    {
      name: "FM Synthesis",
      description: "Example of frequency modulation synthesis",
      code: `// FM synthesis example
// Modulator -> Carrier -> Output
SinOsc modulator => SinOsc carrier => dac;

// Carrier settings
220.0 => carrier.freq; // Base frequency
0.4 => carrier.gain;

// Modulator settings
5.0 => modulator.freq; // Modulation frequency
500.0 => modulator.gain; // Modulation depth

// Run for 5 seconds
5::second => now;
`
    },
    {
      name: "Additive Synthesis",
      description: "Creating complex tones with multiple sine waves",
      code: `// Additive synthesis example
// Create array of oscillators with harmonics
SinOsc osc[5];
float gains[5];

// Connect all oscillators to dac and set gains
for(0 => int i; i < osc.size(); i++) {
  osc[i] => dac;
  // Diminishing amplitude for higher harmonics
  1.0 / (i+1) => gains[i];
  gains[i] => osc[i].gain;
}

// Base frequency
440.0 => float baseFreq;

// Set frequencies to harmonic series
for(0 => int i; i < osc.size(); i++) {
  baseFreq * (i+1) => osc[i].freq;
}

// Let sound for 3 seconds
3::second => now;

// Fade out
for(1.0 => float g; g > 0.0; g - 0.01 => g) {
  for(0 => int i; i < osc.size(); i++) {
    gains[i] * g => osc[i].gain;
  }
  10::ms => now;
}
`
    }
  ],
  "Sequencing": [
    {
      name: "Simple Drum Machine",
      description: "Basic drum pattern sequencer",
      code: `// Simple drum sequencer
// Load drum samples
SndBuf kick => dac;
SndBuf snare => dac;
SndBuf hihat => dac;

// Load sound files (adjust paths as needed)
me.dir() + "/audio/kick.wav" => kick.read;
me.dir() + "/audio/snare.wav" => snare.read;
me.dir() + "/audio/hihat.wav" => hihat.read;

// Silence all samples initially
0 => kick.pos;
0 => snare.pos;
0 => hihat.pos;
0 => kick.gain;
0 => snare.gain;
0 => hihat.gain;

// Define some patterns (1 = play, 0 = silence)
[1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0] @=> int kickPattern[];
[0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,1] @=> int snarePattern[];
[1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1] @=> int hihatPattern[];

// Set gain levels
0.7 => kick.gain;
0.5 => snare.gain;
0.3 => hihat.gain;

// Tempo in BPM
120 => float BPM;
(60.0/BPM)::second / 4 => dur T; // Sixteenth note duration

// Main loop
while(true) {
  // Loop through each step in the pattern
  for(0 => int step; step < kickPattern.size(); step++) {
    // Play drum sounds based on patterns
    if(kickPattern[step]) {
      0 => kick.pos;
    }
    if(snarePattern[step]) {
      0 => snare.pos;
    }
    if(hihatPattern[step]) {
      0 => hihat.pos;
    }
    
    // Advance time
    T => now;
  }
}
`
    },
    {
      name: "Arpeggiator",
      description: "Create arpeggios from chords",
      code: `// Simple arpeggiator
// Connect a sawtooth oscillator through a low-pass filter
SawOsc saw => LPF lpf => NRev reverb => dac;

// Settings
0.2 => saw.gain;
2000 => lpf.freq;
0.1 => reverb.mix;

// Define a minor chord (C minor)
[261.63, 311.13, 392.00] @=> float chord[];

// Tempo
120 => float BPM;
(60.0/BPM)::second / 2 => dur T; // Eighth notes

// Arpeggio patterns: 0=up, 1=down, 2=up-down
0 => int pattern;

// Main loop
while(true) {
  // Play the arpeggio based on selected pattern
  if(pattern == 0) {
    // Up pattern
    for(0 => int i; i < chord.size(); i++) {
      chord[i] => saw.freq;
      T => now;
    }
  }
  else if(pattern == 1) {
    // Down pattern
    for(chord.size()-1 => int i; i >= 0; i--) {
      chord[i] => saw.freq;
      T => now;
    }
  }
  else if(pattern == 2) {
    // Up-down pattern
    for(0 => int i; i < chord.size(); i++) {
      chord[i] => saw.freq;
      T => now;
    }
    for(chord.size()-2 => int i; i > 0; i--) {
      chord[i] => saw.freq;
      T => now;
    }
  }
  
  // Change pattern occasionally
  if(Std.rand2f(0,1) > 0.8) {
    Std.rand2(0,2) => pattern;
  }
}
`
    }
  ],
  "Effects": [
    {
      name: "Echo Effect",
      description: "Create a simple echo/delay effect",
      code: `// Echo/delay effect example
SinOsc s => Delay delay => dac;
delay => Gain feedback => delay;

// Connect the oscillator directly to output as well (dry signal)
s => dac;

// Set parameters
440 => s.freq;
0.3 => s.gain;

// Set delay time and feedback level
0.5::second => delay.max => delay.delay;
0.7 => feedback.gain; // Feedback amount

// Create some notes
[60, 64, 67, 72] @=> int notes[];

// Play each note with echo
for(0 => int i; i < notes.size(); i++) {
  // Convert MIDI note to frequency
  Std.mtof(notes[i]) => s.freq;
  
  // Brief envelope
  0.5 => s.gain;
  0.1::second => now;
  0.0 => s.gain;
  
  // Wait before next note, allowing echo to sound
  0.4::second => now;
}

// Allow the echoes to fade out
3::second => now;
`
    },
    {
      name: "Auto-Wah",
      description: "Creating a Wah-Wah effect using envelope follower",
      code: `// Auto-wah effect example
SawOsc saw => LPF filter => dac;

// Envelope follower (controls filter frequency)
saw => Gain follower => blackhole;

// Initial settings
110 => saw.freq;
0.5 => saw.gain;
0.9 => follower.gain;

// Function to simulate envelope follower
fun void updateFilter() {
  // Initial filter settings
  1000 => float baseFreq;
  5000 => float range;
  5 => float q;
  
  while(true) {
    // Get signal level from follower
    Math.abs(follower.last()) => float level;
    
    // Map level to filter frequency
    baseFreq + (level*range) => filter.freq;
    q => filter.Q;
    
    // Update rate
    1::ms => now;
  }
}

// Start the filter update in a separate shred
spork ~ updateFilter();

// Play a simple pattern
[36, 48, 36, 43, 36, 38, 43, 36] @=> int notes[];
[1, 0.5, 0.25, 0.5, 0.25, 0.25, 0.5, 1] @=> float durs[];

// Main loop
while(true) {
  for(0 => int i; i < notes.size(); i++) {
    // Set note
    Std.mtof(notes[i]) => saw.freq;
    
    // Play for duration
    durs[i]::second => now;
  }
}
`
    }
  ]
};