import { useEffect, useCallback, useState } from 'react';
import { audioEngine } from '@/services/audioEngine';

export const useAudio = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [midiInputs, setMidiInputs] = useState<MIDIInput[]>([]);

  const initAudio = useCallback(async () => {
    try {
      await audioEngine.init();
      audioEngine.setMidiInputsChangeCallback((inputs) => {
        setMidiInputs([...inputs]);
      });
      setIsLoaded(true);
      console.log("Audio Engine Successfully Initialized");
    } catch (e) {
      console.error("Audio Initialization Failed", e);
    }
  }, []);

  const playNote = useCallback((note: string) => {
    audioEngine.triggerAttack(note);
  }, []);

  const releaseNote = useCallback((note: string) => {
    audioEngine.triggerRelease(note);
  }, []);

  const setVolume = useCallback((val: number) => {
    audioEngine.setVolume(val);
  }, []);

  const setReverb = useCallback((val: number) => {
    audioEngine.setReverb(val);
  }, []);

  const setReeds = useCallback((val: number) => {
    audioEngine.setReeds(val);
  }, []);

  return {
    isLoaded,
    initAudio,
    playNote,
    releaseNote,
    setVolume,
    setReverb,
    setReeds,
    midiInputs
  };
};
