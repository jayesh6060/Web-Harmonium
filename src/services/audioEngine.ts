import * as Tone from 'tone';

class AudioEngine {
  private sampler: Tone.Sampler | null = null;
  private convolver: Tone.Convolver | null = null;
  private volume: Tone.Volume | null = null;
  private isInitialized: boolean = false;

  private reeds: number = 0;
  private midiInputs: MIDIInput[] = [];
  private onMidiInputsChange: ((inputs: MIDIInput[]) => void) | null = null;

  async init() {
    if (this.isInitialized) return;

    await Tone.start();
    
    // Create Sampler with the reference site's exact sample
    this.sampler = new Tone.Sampler({
      urls: {
        'C4': '/audio/harmonium.wav'
      },
      attack: 0.1,
      release: 0.5
    });

    // Create Convolution Reverb with reference site's IR
    this.convolver = new Tone.Convolver('/audio/reverb_ir.wav');
    const reverbGain = new Tone.Gain(0.3).toDestination();
    this.convolver.connect(reverbGain);

    this.volume = new Tone.Volume(0).toDestination(); // DRY path
    this.sampler.connect(this.volume);
    this.volume.connect(this.convolver); // Send to reverb in parallel

    await Tone.loaded();

    this.isInitialized = true;
    this.setupMidi();
  }

  private async setupMidi() {
    if (typeof window === 'undefined' || !navigator.requestMIDIAccess) {
      console.warn("MIDI not supported in this environment");
      return;
    }

    try {
      const access = await navigator.requestMIDIAccess();
      const updateInputs = () => {
        this.midiInputs = Array.from(access.inputs.values());
        if (this.onMidiInputsChange) this.onMidiInputsChange(this.midiInputs);
      };

      access.onstatechange = updateInputs;
      updateInputs();

      access.inputs.forEach((input) => {
        input.onmidimessage = (msg) => this.handleMidiMessage(msg);
      });
    } catch (e) {
      console.error("MIDI access failed", e);
    }
  }

  private handleMidiMessage(event: any) {
    const [status, note, velocity] = event.data;
    const command = status & 0xF0;
    
    if (command === 0x90 && velocity > 0) { // Note ON
      const noteName = Tone.Frequency(note, 'midi').toNote();
      this.triggerAttack(noteName);
    } else if (command === 0x80 || (command === 0x90 && velocity === 0)) { // Note OFF
      const noteName = Tone.Frequency(note, 'midi').toNote();
      this.triggerRelease(noteName);
    }
  }

  setMidiInputsChangeCallback(cb: (inputs: MIDIInput[]) => void) {
    this.onMidiInputsChange = cb;
    cb(this.midiInputs);
  }

  getMidiInputs() {
    return this.midiInputs;
  }

  triggerAttack(note: string) {
    if (!this.isInitialized || !this.sampler) return;
    
    const noteObj = Tone.Frequency(note);
    this.sampler.triggerAttack(note);

    if (this.reeds >= 1) {
      this.sampler.triggerAttack(noteObj.transpose(-12).toNote());
    }
    if (this.reeds >= 2) {
      this.sampler.triggerAttack(noteObj.transpose(12).toNote());
    }
  }

  triggerRelease(note: string) {
    if (!this.isInitialized || !this.sampler) return;

    const noteObj = Tone.Frequency(note);
    this.sampler.triggerRelease(note);

    if (this.reeds >= 1) {
      this.sampler.triggerRelease(noteObj.transpose(-12).toNote());
    }
    if (this.reeds >= 2) {
      this.sampler.triggerRelease(noteObj.transpose(12).toNote());
    }
  }

  setReeds(count: number) {
    this.reeds = count;
  }

  setVolume(value: number) {
    if (this.volume) {
      this.volume.volume.value = Tone.gainToDb(value);
    }
  }

  setReverb(value: number) {
    // Note: Tone.Convolver doesn't have a direct 'wet' property.
    // For now, we'll keep the reverb at a fixed level matching the reference site.
  }

  getTone() {
    return Tone;
  }
}

export const audioEngine = new AudioEngine();
