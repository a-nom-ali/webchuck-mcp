export const systemSnippets = {
    "hello-world": "// Connection sound - electronic, cheerful with celebratory feel\n" +
        "// Set up master gain\n" +
        "Gain master => dac;\n" +
        "0.8 => master.gain;\n" +
        "\n" +
        "// Create a main bell-like sound\n" +
        "SinOsc bell => ADSR env1 => NRev reverb => master;\n" +
        "0.2 => bell.gain;\n" +
        "env1.set(10::ms, 100::ms, 0.7, 200::ms);\n" +
        "0.1 => reverb.mix;\n" +
        "\n" +
        "// Create a bright layer\n" +
        "TriOsc bright => ADSR env2 => reverb => master;\n" +
        "0.15 => bright.gain;\n" +
        "env2.set(5::ms, 80::ms, 0.8, 150::ms);\n" +
        "\n" +
        "// Create a short arpeggio effect\n" +
        "SinOsc arp => ADSR arpEnv => Echo e => master;\n" +
        "0.15 => arp.gain;\n" +
        "arpEnv.set(5::ms, 80::ms, 0.5, 100::ms);\n" +
        "250::ms => e.max => e.delay;\n" +
        "0.3 => e.mix;\n" +
        "0.7 => e.gain;\n" +
        "e => e;  // feedback path\n" +
        "\n" +
        "// Connect!\n" +
        "// First note - establish the sound\n" +
        "440 => bell.freq;\n" +
        "554 => bright.freq; // perfect fourth up\n" +
        "env1.keyOn();\n" +
        "env2.keyOn();\n" +
        "100::ms => now;\n" +
        "\n" +
        "// Second note - happy rising sound\n" +
        "523 => bell.freq; // up to C\n" +
        "659 => bright.freq; // perfect fourth up\n" +
        "env1.keyOff();\n" +
        "env2.keyOff();\n" +
        "env1.keyOn();\n" +
        "env2.keyOn();\n" +
        "100::ms => now;\n" +
        "\n" +
        "// Third note - positive confirmation\n" +
        "587 => bell.freq; // up to D\n" +
        "740 => bright.freq; // perfect fourth up\n" +
        "env1.keyOff();\n" +
        "env2.keyOff();\n" +
        "env1.keyOn();\n" +
        "env2.keyOn();\n" +
        "100::ms => now;\n" +
        "\n" +
        "// Fourth note - celebratory peak\n" +
        "659 => bell.freq; // up to E\n" +
        "830 => bright.freq; // perfect fourth up\n" +
        "env1.keyOff();\n" +
        "env2.keyOff();\n" +
        "env1.keyOn();\n" +
        "env2.keyOn();\n" +
        "120::ms => now;\n" +
        "\n" +
        "// Play the quick celebratory arpeggio\n" +
        "for (int i; i < 5; i++) {\n" +
        "    523 + (i * 50) => arp.freq;  // rising arpeggio\n" +
        "    arpEnv.keyOn();\n" +
        "    20::ms => now;\n" +
        "    arpEnv.keyOff();\n" +
        "    10::ms => now;\n" +
        "}\n" +
        "\n" +
        "// Final confirmation chord\n" +
        "880 => bell.freq; // higher A\n" +
        "1109 => bright.freq; // perfect fourth\n" +
        "env1.keyOff();\n" +
        "env2.keyOff();\n" +
        "env1.keyOn();\n" +
        "env2.keyOn();\n" +
        "20::ms => now;\n" +
        "\n" +
        "// Short silence\n" +
        "20::ms => now;\n" +
        "\n" +
        "// Final sparkle\n" +
        "1760 => bell.freq; // high A\n" +
        "2218 => bright.freq; // perfect fourth\n" +
        "0.1 => bell.gain;\n" +
        "0.05 => bright.gain;\n" +
        "env1.keyOff();\n" +
        "env2.keyOff();\n" +
        "env1.keyOn();\n" +
        "env2.keyOn();\n" +
        "300::ms => now;\n" +
        "\n" +
        "env1.keyOff();\n" +
        "env2.keyOff();\n" +
        "arpEnv.keyOff();\n" +
        "500::ms => now;",

    "error" : "// Enhanced \"wha-whaa\" error sound\n" +
        "// Set up master gain\n" +
        "Gain master => dac;\n" +
        "0.7 => master.gain;\n" +
        "\n" +
        "// Main tone with more character\n" +
        "SawOsc saw => LPF lpFilter => ADSR env1 => NRev reverb => master;\n" +
        "0.2 => saw.gain;\n" +
        "env1.set(20::ms, 80::ms, 0.6, 250::ms);\n" +
        "1500 => lpFilter.freq;\n" +
        "2.0 => lpFilter.Q;\n" +
        "0.15 => reverb.mix;\n" +
        "\n" +
        "// Secondary tone for richness\n" +
        "TriOsc tri => ADSR env2 => reverb => master;\n" +
        "0.15 => tri.gain;\n" +
        "env2.set(15::ms, 70::ms, 0.7, 220::ms);\n" +
        "\n" +
        "// First note - the \"wha\" (higher, anticipatory)\n" +
        "460 => saw.freq;\n" +
        "462 => tri.freq; // slight detuning\n" +
        "env1.keyOn();\n" +
        "env2.keyOn();\n" +
        "\n" +
        "// Create a slight bend up for the first note to emphasize the \"wha\"\n" +
        "for (int i; i < 5; i++) {\n" +
        "    460 + (i * 3) => saw.freq;\n" +
        "    462 + (i * 3) => tri.freq;\n" +
        "    10::ms => now;\n" +
        "}\n" +
        "\n" +
        "130::ms => now;\n" +
        "\n" +
        "// Release first note\n" +
        "env1.keyOff();\n" +
        "env2.keyOff();\n" +
        "80::ms => now;\n" +
        "\n" +
        "// Second note - the \"whaa\" (lower, comedy slide down)\n" +
        "410 => saw.freq;\n" +
        "412 => tri.freq;\n" +
        "env1.keyOn();\n" +
        "env2.keyOn();\n" +
        "\n" +
        "// More pronounced descending slide for the \"whaa\" part\n" +
        "// This creates a trombone-like comedy effect\n" +
        "for (int i; i < 12; i++) {\n" +
        "    410 - (i * 12) => saw.freq;\n" +
        "    412 - (i * 12) => tri.freq;\n" +
        "    \n" +
        "    // Gradually reduce the filter frequency for a \"closing\" sound\n" +
        "    1500 - (i * 80) => lpFilter.freq;\n" +
        "    \n" +
        "    15::ms => now;\n" +
        "}\n" +
        "\n" +
        "// Add vibrato at the end of the descent for comic effect\n" +
        "for (int i; i < 5; i++) {\n" +
        "    290 + (Math.sin(i * 1.5) * 10) => saw.freq;\n" +
        "    292 + (Math.sin(i * 1.5) * 10) => tri.freq;\n" +
        "    20::ms => now;\n" +
        "}\n" +
        "\n" +
        "// Release with natural decay\n" +
        "env1.keyOff();\n" +
        "env2.keyOff();\n" +
        "\n" +
        "// Let the sound decay naturally\n" +
        "400::ms => now;",

    "socket-error" : "// Socket Disconnect Error - Urgent attention-grabbing sound\n" +
        "// Master gain\n" +
        "Gain master => dac;\n" +
        "0.8 => master.gain;\n" +
        "\n" +
        "// Create primary tone with cutting quality\n" +
        "SawOsc saw1 => LPF lpf => ADSR env1 => NRev rev => master;\n" +
        "0.3 => saw1.gain;\n" +
        "env1.set(5::ms, 30::ms, 0.8, 300::ms);\n" +
        "0.1 => rev.mix;\n" +
        "\n" +
        "// Secondary tone for urgency\n" +
        "SawOsc saw2 => HPF hpf => ADSR env2 => rev => master;\n" +
        "0.25 => saw2.gain;\n" +
        "env2.set(5::ms, 50::ms, 0.7, 250::ms);\n" +
        "\n" +
        "// Modulation for alarm-like quality\n" +
        "SinOsc lfo => blackhole;\n" +
        "6.0 => lfo.freq; // Fast modulation for urgency\n" +
        "\n" +
        "// First urgent beep sequence\n" +
        "for (int i; i < 3; i++) {\n" +
        "    // Calculate modulated frequency for alarm-like quality\n" +
        "    600 + (lfo.last() * 50) => saw1.freq;\n" +
        "    1200 + (lfo.last() * 100) => saw2.freq;\n" +
        "    \n" +
        "    // Apply filter based on modulation for more texture\n" +
        "    1500 + (lfo.last() * 300) => lpf.freq;\n" +
        "    800 + (lfo.last() * 200) => hpf.freq;\n" +
        "    \n" +
        "    env1.keyOn();\n" +
        "    env2.keyOn();\n" +
        "    60::ms => now;\n" +
        "    \n" +
        "    env1.keyOff();\n" +
        "    env2.keyOff();\n" +
        "    40::ms => now;\n" +
        "}\n" +
        "\n" +
        "// Short break\n" +
        "50::ms => now;\n" +
        "\n" +
        "// Second urgent sequence - different pattern\n" +
        "// Create a \"connection lost\" signature\n" +
        "for (int i; i < 2; i++) {\n" +
        "    // Descending tones to indicate disconnection\n" +
        "    800 - (i * 150) => saw1.freq;\n" +
        "    1600 - (i * 300) => saw2.freq;\n" +
        "    \n" +
        "    2000 => lpf.freq;\n" +
        "    1000 => hpf.freq;\n" +
        "    \n" +
        "    env1.keyOn();\n" +
        "    env2.keyOn();\n" +
        "    100::ms => now;\n" +
        "    \n" +
        "    env1.keyOff();\n" +
        "    env2.keyOff();\n" +
        "    70::ms => now;\n" +
        "}\n" +
        "\n" +
        "// Final alarm burst - most urgent part\n" +
        "// Add a noise component for harshness\n" +
        "Noise noise => BPF bpf => ADSR noiseEnv => rev => master;\n" +
        "0.2 => noise.gain;\n" +
        "noiseEnv.set(10::ms, 20::ms, 0.9, 200::ms);\n" +
        "800 => bpf.freq;\n" +
        "2.0 => bpf.Q;\n" +
        "\n" +
        "// Final warning sound\n" +
        "300 => saw1.freq; // Low warning tone\n" +
        "1200 => saw2.freq; // High component\n" +
        "noiseEnv.keyOn();\n" +
        "env1.keyOn();\n" +
        "env2.keyOn();\n" +
        "150::ms => now;\n" +
        "\n" +
        "// Add pitch drop for disconnect feeling\n" +
        "for (int i; i < 8; i++) {\n" +
        "    300 - (i * 15) => saw1.freq;\n" +
        "    1200 - (i * 60) => saw2.freq;\n" +
        "    800 - (i * 40) => bpf.freq;\n" +
        "    15::ms => now;\n" +
        "}\n" +
        "\n" +
        "// Release all sounds\n" +
        "noiseEnv.keyOff();\n" +
        "env1.keyOff();\n" +
        "env2.keyOff();\n" +
        "\n" +
        "// Let the sound decay naturally\n" +
        "400::ms => now;",
};
