import { useEffect, useCallback } from 'react';

const KEY_TO_NOTE: Record<string, string> = {
  // Number row (Black Keys)
  '1': 'G#3', '2': 'A#3', '4': 'C#4', '5': 'D#4', '7': 'F#4', '8': 'G#4', '9': 'A#4', '-': 'C#5', '=': 'D#5',
  
  // QWERTY row (White Keys)
  '`': 'G3', 'q': 'A3', 'w': 'B3', 'e': 'C4', 'r': 'D4', 't': 'E4', 'y': 'F4', 
  'u': 'G4', 'i': 'A4', 'o': 'B4', 'p': 'C5', '[': 'D5', ']': 'E5', '\\': 'F5',
};

export const useKeyboardMappings = (
  onPlay: (note: string) => void,
  onRelease: (note: string) => void,
  transpose: number = 0
) => {

  const getTransposedNote = useCallback((note: string, offset: number) => {
    // Basic transposition logic
    // We can use Tone's frequency converter for more accuracy, 
    // but simple pitch shift is basically MIDI shift.
    // However, since we work with strings, we'll convert to MIDI and back.
    const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const match = note.match(/^([A-G]#?)(\d+)$/);
    if (!match) return note;
    
    const [, name, octave] = match;
    const midi = notes.indexOf(name) + (parseInt(octave, 10)) * 12 + offset;
    
    const newName = notes[midi % 12];
    const newOctave = Math.floor(midi / 12);
    return `${newName}${newOctave}`;
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.repeat) return;
    const key = e.key.toLowerCase();
    if (KEY_TO_NOTE[key]) {
      const actualNote = getTransposedNote(KEY_TO_NOTE[key], transpose);
      onPlay(actualNote);
    }
  }, [onPlay, transpose, getTransposedNote]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    if (KEY_TO_NOTE[key]) {
      const actualNote = getTransposedNote(KEY_TO_NOTE[key], transpose);
      onRelease(actualNote);
    }
  }, [onRelease, transpose, getTransposedNote]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);
};
