// A dynamic Wild West soundscape with interactive controls

// Global master controls (these will be exposed as UI sliders)
// @param master volume control for the entire soundscape
// @range 0.0 1.0
0.7 => global float master_volume;

// @param master tempo control (affects all rhythmic elements)
// @range 60.0 180.0
120.0 => global float master_tempo;

// @param master pitch control (transposes all melodic elements)
// @range -12.0 12.0
0.0 => global float master_pitch;

// Preset selection
// @param select different Western soundtrack presets
// @options lonely_cowboy tumbleweed_town high_noon_showdown campfire_stories saloon_brawl
"lonely_cowboy" => global string current_preset;

// Individual sound element controls
// @param harmonica volume
// @range 0.0 1.0
0.8 => global float harmonica_volume;

// @param guitar volume
// @range 0.0 1.0
0.8 => global float guitar_volume;

// @param percussion volume
// @range 0.0 1.0
0.7 => global float percussion_volume;

// @param ambient sounds volume
// @range 0.0 1.0
0.5 => global float ambient_volume;

// @param reverb amount
// @range 0.0 1.0
0.6 => global float reverb_amount;

// Effect settings
// @param tremolo depth for guitar
// @range 0.0 1.0
0.4 => global float tremolo_depth;

// @param echo/delay amount
// @range 0.0 1.0
0.3 => global float echo_amount;

// Basic instruments setup
SinOsc harmonica => ADSR harmonicaEnv => NRev harmonicaReverb => Gain harmonicaMaster => dac;
TriOsc guitar => ADSR guitarEnv => NRev guitarReverb => Gain guitarMaster => dac;
Noise wind => BPF windFilter => ADSR windEnv => Gain ambientMaster => dac;
SndBuf hoofbeats => ADSR hoofbeatsEnv => Gain percussionMaster => dac;

// Set initial parameters
master_volume => harmonicaMaster.gain;
master_volume => guitarMaster.gain;
master_volume * ambient_volume => ambientMaster.gain;
master_volume * percussion_volume => percussionMaster.gain;

// ADSR settings
harmonicaEnv.set(0.1::second, 0.1::second, 0.8, 0.3::second);
guitarEnv.set(0.05::second, 0.1::second, 0.7, 0.5::second);
windEnv.set(1.0::second, 0.5::second, 0.7, 2.0::second);
hoofbeatsEnv.set(0.01::second, 0.05::second, 0.9, 0.2::second);

// Reverb settings
reverb_amount => harmonicaReverb.mix;
reverb_amount => guitarReverb.mix;

// Filter settings for wind sound
800.0 => windFilter.freq;
0.8 => windFilter.Q;

// Helper function to convert MIDI note to frequency with master pitch control
fun float getNoteFreq(float midi) {
    return Std.mtof(midi + master_pitch);
}

// Function to update all parameters based on global controls
fun void updateParameters() {
    while (true) {
        // Update master volumes
        master_volume * harmonica_volume => harmonicaMaster.gain;
        master_volume * guitar_volume => guitarMaster.gain;
        master_volume * ambient_volume => ambientMaster.gain;
        master_volume * percussion_volume => percussionMaster.gain;

        // Update effects
        reverb_amount => harmonicaReverb.mix;
        reverb_amount => guitarReverb.mix;

        // Brief wait before checking again
        10::ms => now;
    }
}

// Function to play harmonica melody
fun void playHarmonica() {
    [60, 62, 64, 67, 69, 71, 72] @=> int scale[]; // C major scale

    while (true) {
        // Select different patterns based on preset
        if (current_preset == "lonely_cowboy") {
            for (0 => int i; i < 8; i++) {
                scale[Math.random2(0, scale.size()-1)] => int noteValue;
                getNoteFreq(noteValue) => harmonica.freq;
                harmonicaEnv.keyOn();
                (60.0 / master_tempo)::second => now;
                harmonicaEnv.keyOff();
                (60.0 / master_tempo)::second => now;
            }
        }
        else if (current_preset == "high_noon_showdown") {
            for (0 => int i; i < 4; i++) {
                getNoteFreq(scale[2]) => harmonica.freq;
                harmonicaEnv.keyOn();
                (30.0 / master_tempo)::second => now;
                harmonicaEnv.keyOff();
                (30.0 / master_tempo)::second => now;

                getNoteFreq(scale[0]) => harmonica.freq;
                harmonicaEnv.keyOn();
                (60.0 / master_tempo)::second => now;
                harmonicaEnv.keyOff();
                (60.0 / master_tempo)::second => now;
            }
        }
        else if (current_preset == "campfire_stories") {
            [getNoteFreq(60), getNoteFreq(64), getNoteFreq(67)] @=> float chordNotes[];

            for (0 => int i; i < chordNotes.size(); i++) {
                chordNotes[i] => harmonica.freq;
                harmonicaEnv.keyOn();
                (120.0 / master_tempo)::second => now;
                harmonicaEnv.keyOff();
                (60.0 / master_tempo)::second => now;
            }
        }
        else if (current_preset == "saloon_brawl") {
            for (0 => int i; i < 12; i++) {
                scale[Math.random2(0, scale.size()-1)] => int noteValue;
                getNoteFreq(noteValue) => harmonica.freq;
                harmonicaEnv.keyOn();
                (30.0 / master_tempo)::second => now;
                harmonicaEnv.keyOff();
                (15.0 / master_tempo)::second => now;
            }
        }
        else { // Default or "tumbleweed_town"
            for (0 => int i; i < 4; i++) {
                scale[Math.random2(0, scale.size()-1)] => int noteValue;
                getNoteFreq(noteValue) => harmonica.freq;
                harmonicaEnv.keyOn();
                (90.0 / master_tempo)::second => now;
                harmonicaEnv.keyOff();
                (90.0 / master_tempo)::second => now;
            }
        }

        // Short pause between phrases
        (120.0 / master_tempo)::second => now;
    }
}

// Function to play guitar accompaniment
fun void playGuitar() {
    // Guitar patterns
    [55, 48, 52, 55] @=> int bassLine[]; // G, C, D, G progression
    0 => int bassIndex;

    // Create our own echo effect manually
    Gain echoGain[3];
    for (0 => int i; i < echoGain.size(); i++) {
        guitar => echoGain[i] => dac;
        echo_amount / (i+2) => echoGain[i].gain; // Diminishing echo volume
    }

    while (true) {
        // Change pattern based on preset
        if (current_preset == "lonely_cowboy") {
            // Slow arpeggios
            getNoteFreq(bassLine[bassIndex]) => guitar.freq;
            guitarEnv.keyOn();
            (120.0 / master_tempo)::second => now;
            guitarEnv.keyOff();
            (40.0 / master_tempo)::second => now;

            (bassIndex + 1) % bassLine.size() => bassIndex;
        }
        else if (current_preset == "high_noon_showdown") {
            // Tense single notes
            getNoteFreq(bassLine[bassIndex] - 12) => guitar.freq; // Lower octave
            guitarEnv.keyOn();
            (60.0 / master_tempo)::second => now;
            guitarEnv.keyOff();
            (60.0 / master_tempo)::second => now;

            (bassIndex + 1) % bassLine.size() => bassIndex;
        }
        else if (current_preset == "campfire_stories") {
            // Gentle strumming
            for (0 => int i; i < 4; i++) {
                getNoteFreq(bassLine[bassIndex] + Math.random2(0, 12)) => guitar.freq;
                guitarEnv.keyOn();
                (30.0 / master_tempo)::second => now;
                guitarEnv.keyOff();
                (30.0 / master_tempo)::second => now;
            }

            (bassIndex + 1) % bassLine.size() => bassIndex;
        }
        else if (current_preset == "saloon_brawl") {
            // Fast strumming
            for (0 => int i; i < 8; i++) {
                getNoteFreq(bassLine[bassIndex] + Math.random2(0, 12)) => guitar.freq;
                guitarEnv.keyOn();
                (15.0 / master_tempo)::second => now;
                guitarEnv.keyOff();
                (15.0 / master_tempo)::second => now;
            }

            (bassIndex + 1) % bassLine.size() => bassIndex;
        }
        else { // Default or "tumbleweed_town"
            // Sparse notes
            getNoteFreq(bassLine[bassIndex]) => guitar.freq;
            guitarEnv.keyOn();
            (180.0 / master_tempo)::second => now;
            guitarEnv.keyOff();
            (60.0 / master_tempo)::second => now;

            (bassIndex + 1) % bassLine.size() => bassIndex;
        }

        // Add tremolo effect
        for (0 => int i; i < 10; i++) {
            (1.0 + Math.sin(i * 0.5) * tremolo_depth) * guitar_volume => float tremVol;
            master_volume * tremVol => guitarMaster.gain;
            10::ms => now;
        }
    }
}

// Function to play ambient sounds
fun void playAmbientSounds() {
    while (true) {
        // Wind sounds
        if (current_preset == "tumbleweed_town" || current_preset == "lonely_cowboy") {
            windEnv.keyOn();
            (2000.0 / master_tempo)::ms => now;
            windEnv.keyOff();
            (1000.0 / master_tempo)::ms => now;
        }
        else {
            // Less wind for other presets
            if (Math.random2(0, 10) > 7) {
                windEnv.keyOn();
                (1000.0 / master_tempo)::ms => now;
                windEnv.keyOff();
            }
            (2000.0 / master_tempo)::ms => now;
        }
    }
}

// Function to play percussion
fun void playPercussion() {
    while (true) {
        if (current_preset == "high_noon_showdown") {
            // Dramatic heartbeat-like drums
            for (0 => int i; i < 2; i++) {
                hoofbeatsEnv.keyOn();
                (30.0 / master_tempo)::second => now;
                hoofbeatsEnv.keyOff();
                (30.0 / master_tempo)::second => now;
            }
            (240.0 / master_tempo)::second => now;
        }
        else if (current_preset == "saloon_brawl") {
            // Chaotic percussion
            for (0 => int i; i < 8; i++) {
                if (Math.random2(0, 10) > 3) {
                    hoofbeatsEnv.keyOn();
                    (15.0 / master_tempo)::second => now;
                    hoofbeatsEnv.keyOff();
                }
                else {
                    (15.0 / master_tempo)::second => now;
                }
            }
        }
        else if (current_preset == "lonely_cowboy") {
            // Horse hoofbeats in the distance
            if (Math.random2(0, 10) > 8) {
                for (0 => int i; i < 4; i++) {
                    hoofbeatsEnv.keyOn();
                    (60.0 / master_tempo)::second => now;
                    hoofbeatsEnv.keyOff();
                    (60.0 / master_tempo)::second => now;
                }
            }
            (480.0 / master_tempo)::second => now;
        }
        else {
            // Sparse rhythmic elements
            if (Math.random2(0, 10) > 7) {
                hoofbeatsEnv.keyOn();
                (60.0 / master_tempo)::second => now;
                hoofbeatsEnv.keyOff();
            }
            (120.0 / master_tempo)::second => now;
        }
    }
}

// Start all processes
spork ~ updateParameters();
spork ~ playHarmonica();
spork ~ playGuitar();
spork ~ playAmbientSounds();
spork ~ playPercussion();

// Print instructions
<<< "Wild West Soundscape is running! Use the sliders to control the sound." >>>;
<<< "Available presets: lonely_cowboy, tumbleweed_town, high_noon_showdown, campfire_stories, saloon_brawl" >>>;

// Keep program running
while (true) {
    1::second => now;
}