'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styles from './Piano.module.css';
import { useAudio } from '@/hooks/useAudio';
import { useKeyboardMappings } from '@/hooks/useKeyboard';
import { SONGS, Song, Note } from '@/data/songs';
import { Settings, Play, Pause, Music, Volume2, Waves, Sliders, ChevronDown, Upload } from 'lucide-react';
import * as Tone from 'tone';

const NOTES = [
  'G3', 'G#3', 'A3', 'A#3', 'B3', 'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
  'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5'
];

const SHORTCUTS: Record<string, string> = {
  'G3': '`', 'G#3': '1', 'A3': 'q', 'A#3': '2', 'B3': 'w',
  'C4': 'e', 'C#4': '4', 'D4': 'r', 'D#4': '5', 'E4': 't', 'F4': 'y', 'F#4': '7', 
  'G4': 'u', 'G#4': '8', 'A4': 'i', 'A#4': '9', 'B4': 'o',
  'C5': 'p', 'C#5': '-', 'D5': '[', 'D#5': '=', 'E5': ']', 'F5': '\\'
};

const BLUE_LABELS: Record<string, string> = {
  'C4': 'C', 'D4': 'D', 'E4': 'E', 'F4': 'F', 'G4': 'G', 'A4': 'A', 'B4': 'B'
};

const SARGAM: Record<string, string> = {
  'C': 'Sa', 'C#': 'Re(k)', 'D': 'Re', 'D#': 'Ga(k)', 'E': 'Ga', 
  'F': 'Ma', 'F#': 'Ma(t)', 'G': 'Pa', 'G#': 'Dha(k)', 'A': 'Dha', 
  'A#': 'Ni(k)', 'B': 'Ni'
};

export default function Piano() {
  const { 
    isLoaded, initAudio, playNote, releaseNote, 
    setVolume, setReverb, setReeds, midiInputs 
  } = useAudio();
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [guidedNote, setGuidedNote] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tempo, setTempo] = useState(120);
  const [transpose, setTranspose] = useState(0);
  const [volume, setVolumeVal] = useState(0.8);
  const [reverb, setReverbVal] = useState(0.3);
  const [reeds, setReedsVal] = useState(0);
  const [octave, setOctave] = useState(0);
  const [activeDrones, setActiveDrones] = useState<Set<string>>(new Set());
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [showSongs, setShowSongs] = useState(false);
  const [scheduledPart, setScheduledPart] = useState<Tone.Part | null>(null);
  const [userSongs, setUserSongs] = useState<Song[]>([]);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Load user songs from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('melodyMind_userSongs');
    if (saved) {
      try {
        setUserSongs(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load saved songs", e);
      }
    }
  }, []);

  // Save to localStorage when userSongs change
  useEffect(() => {
    if (userSongs.length > 0) {
      localStorage.setItem('melodyMind_userSongs', JSON.stringify(userSongs));
    }
  }, [userSongs]);

  const allSongs = [...SONGS, ...userSongs];

  const getTransposedNote = useCallback((note: string, offset: number) => {
    const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const match = note.match(/^([A-G]#?)(\d+)$/);
    if (!match) return note;
    
    const [, name, octaveNum] = match;
    const midi = notes.indexOf(name) + (parseInt(octaveNum, 10)) * 12 + offset + (octave * 12);
    
    const newName = notes[midi % 12];
    const newOctave = Math.floor(midi / 12);
    return `${newName}${newOctave}`;
  }, [octave]);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePlayNote = useCallback((note: string) => {
    if (!mounted) return;
    setActiveNotes(prev => new Set(prev).add(note));
    playNote(note);
  }, [playNote, mounted]);

  const handleReleaseNote = useCallback((note: string) => {
    if (!mounted) return;
    setActiveNotes(prev => {
      const next = new Set(prev);
      next.delete(note);
      return next;
    });
    releaseNote(note);
  }, [releaseNote, mounted]);

  useKeyboardMappings(handlePlayNote, handleReleaseNote, transpose);

  const stopPlayback = useCallback(() => {
    if (scheduledPart) {
      scheduledPart.stop();
      scheduledPart.dispose();
      setScheduledPart(null);
    }
    Tone.getTransport().stop();
    setIsPlaying(false);
    setGuidedNote(null);
  }, [scheduledPart]);

  const startPlayback = useCallback((song: Song) => {
    if (!isLoaded) return;
    
    stopPlayback(); // Reset current if any
    
    Tone.getTransport().bpm.value = song.tempo;
    
    const part = new Tone.Part((time, value) => {
      const noteObj = value as Note;
      const transposedNote = getTransposedNote(noteObj.note, transpose);
      
      // Draw visual guide on time
      Tone.Draw.schedule(() => {
        setGuidedNote(noteObj.note);
        // Clear guide after duration
        setTimeout(() => {
          setGuidedNote(current => current === noteObj.note ? null : current);
        }, Tone.Time(noteObj.duration).toMilliseconds());
      }, time);

      // Auto-play the note
      playNote(transposedNote);
      setTimeout(() => releaseNote(transposedNote), Tone.Time(noteObj.duration).toMilliseconds());

    }, song.notes.map(n => [n.time, n])).start(0);

    setScheduledPart(part);
    Tone.getTransport().start();
    setIsPlaying(true);
  }, [isLoaded, playNote, releaseNote, stopPlayback]);

  const toggleSongPlayback = () => {
    if (isPlaying) {
      stopPlayback();
    } else if (currentSong) {
      startPlayback(currentSong);
    } else {
      setShowSongs(true);
    }
  };

  const selectSong = (song: Song) => {
    setCurrentSong(song);
    setShowSongs(false);
    startPlayback(song);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        console.log("File loaded, starts parsing...");
        setUploadStatus("Reading file...");
        const text = event.target?.result as string;
        const json = JSON.parse(text);
        
        let name = json.name || json.title || "Uploaded Song";
        let notes: any[] = [];

        // Support for Whisper-style transcription JSON (shown in user's screenshot)
        if (json.segments && Array.isArray(json.segments)) {
          console.log("Whisper-style JSON detected");
          name = json.text ? `Transcript: ${json.text.substring(0, 30)}...` : "Transcript";
          
          let currentTime = 0;
          const firstStart = json.segments[0]?.start || 0;

          notes = json.segments.map((seg: any, index: number) => {
            const duration = Number(seg.end - seg.start);
            // On second note onwards, we compact the time if the gap is too large
            if (index > 0) {
              const gap = Number(seg.start) - Number(json.segments[index-1].end);
              // Compact gaps larger than 1.5 seconds down to 0.5s for better musicality
              currentTime += (gap > 1.5 ? 0.5 : gap) + (Number(json.segments[index-1].end) - Number(json.segments[index-1].start));
            } else {
              currentTime = 0; // Start at 0 regardless of absolute 'start' time
            }

            return {
              note: "C4",
              time: currentTime.toFixed(3),
              duration: duration.toFixed(3)
            };
          });
          console.log("Compacted transcript into", notes.length, "notes. Total duration:", currentTime.toFixed(2), "seconds");
        } 
        // Support for direct array or object with notes/data/sequence
        else {
          notes = Array.isArray(json) ? json : (json.notes || json.data || json.sequence);
        }
        
        if (!notes || !Array.isArray(notes)) {
          throw new Error("Valid notes array not found (expected 'notes' or 'segments')");
        }

        const newSong: Song = {
          id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: name.toString(),
          tempo: Number(json.tempo) || 120,
          notes: notes
        };

        setUserSongs(prev => [...prev, newSong]);
        setCurrentSong(newSong);
        setUploadStatus(`Success: ${newSong.name} added!`);
        console.log("Successfully added song", newSong.name);
        
        // Hide success message after 3 seconds
        setTimeout(() => setUploadStatus(null), 3000);
        
        setShowSongs(false);
        startPlayback(newSong);
      } catch (err: any) {
        console.error("Upload error:", err);
        setUploadStatus(`Error: ${err.message || "Invalid JSON"}`);
        setTimeout(() => setUploadStatus(null), 5000);
      }
    };

    reader.onerror = () => {
      setUploadStatus("Error reading file");
    };

    setUploadStatus("Uploading...");
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadTemplate = () => {
    const template = {
      name: "My Custom Song",
      tempo: 120,
      notes: [
        { note: "C4", time: "0:0:0", duration: "4n" },
        { note: "D4", time: "0:0:2", duration: "4n" },
        { note: "E4", time: "0:1:0", duration: "4n" }
      ]
    };
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "song_template.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleDrone = (note: string) => {
    if (activeDrones.has(note)) {
      setActiveDrones(prev => {
        const next = new Set(prev);
        next.delete(note);
        return next;
      });
      releaseNote(note);
    } else {
      setActiveDrones(prev => new Set(prev).add(note));
      playNote(note);
    }
  };

  const getSargam = (note: string) => {
    const name = note.replace(/\d+/, '');
    return SARGAM[name] || '';
  };

  const getTransposeNoteName = (offset: number) => {
    const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const idx = (offset % 12 + 12) % 12;
    return notes[idx];
  };

  const isBlack = (note: string) => note.includes('#');

  if (!mounted) return <div className={styles.pianoModule} style={{ height: '400px' }} />;

  return (
    <div className={styles.pianoModule}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1>MelodyMind</h1>
          <span className={styles.subtitle}>Harmonium & Piano Trainer</span>
        </div>
        
        {!isLoaded && (
          <button onClick={initAudio} className={styles.initButton}>
            <Play size={18} /> Enable Audio
          </button>
        )}
      </header>

      <main className={styles.main}>
        <div className={styles.referenceControls}>
          {/* Volume Block */}
          <div className={styles.controlBlock}>
            <div className={styles.blockTitle}>Volume: {Math.round(volume * 100)}%</div>
            <input 
              type="range" min="0" max="1" step="0.01" 
              className={styles.refSlider}
              value={volume} onChange={(e) => {
                const val = parseFloat(e.target.value);
                setVolumeVal(val);
                setVolume(val);
              }}
            />
          </div>

          {/* Reverb Block */}
          <div className={styles.controlBlock}>
            <div className={styles.blockTitle}>Reverb</div>
            <div className={styles.toggleRow}>
              <button 
                onClick={() => {
                  const newVal = reverb > 0 ? 0 : 0.6;
                  setReverbVal(newVal);
                  setReverb(newVal);
                }}
                className={`${styles.toggle} ${reverb > 0 ? styles.on : ''}`}
              >
                <div className={styles.toggleBall} />
              </button>
            </div>
          </div>

          {/* MIDI Block */}
          <div className={styles.controlBlock}>
            <div className={styles.blockTitle}>MIDI Keyboard Supported!</div>
            <div className={styles.midiInfo}>
              {midiInputs.length > 0 ? (
                <select className={styles.midiSelect}>
                  {midiInputs.map((input: any) => (
                    <option key={input.id} value={input.id}>
                      {input.name || "MIDI Device"}
                    </option>
                  ))}
                </select>
              ) : (
                <span className={styles.midiStatus}>Plug in a MIDI keyboard to start</span>
              )}
            </div>
          </div>

          {/* Transpose Block */}
          <div className={styles.controlBlock}>
            <div className={styles.blockTitle}>Transpose - {getTransposeNoteName(transpose)}</div>
            <div className={styles.incControls}>
              <button onClick={() => setTranspose(p => p - 1)} className={styles.incBtn}>-</button>
              <span className={styles.incVal}>{transpose}</span>
              <button onClick={() => setTranspose(p => p + 1)} className={styles.incBtn}>+</button>
            </div>
          </div>

          {/* Octave Block */}
          <div className={styles.controlBlock}>
            <div className={styles.blockTitle}>Current Octave</div>
            <div className={styles.incControls}>
              <button onClick={() => setOctave(p => Math.max(-4, p - 1))} className={styles.incBtn}>-</button>
              <span className={styles.incVal}>{octave}</span>
              <button onClick={() => setOctave(p => Math.min(4, p + 1))} className={styles.incBtn}>+</button>
            </div>
          </div>

          {/* Reeds Block */}
          <div className={styles.controlBlock}>
            <div className={styles.blockTitle}>Additional Reeds</div>
            <div className={styles.incControls}>
              <button onClick={() => setReedsVal(p => Math.max(0, p - 1))} className={styles.incBtn}>-</button>
              <span className={styles.incVal}>{reeds}</span>
              <button onClick={() => setReedsVal(p => Math.min(2, p + 1))} className={styles.incBtn}>+</button>
            </div>
          </div>
        </div>

        <div className={styles.keyboardContainer}>
          <div className={styles.keyboard}>
            {NOTES.map((note) => {
              const black = isBlack(note);
              const active = activeNotes.has(note);
              const guided = guidedNote === note;
              
              return (
                <div
                  key={note}
                  className={`${styles.key} ${black ? styles.black : styles.white} ${active || activeDrones.has(note) ? styles.active : ''} ${guided ? styles.guided : ''}`}
                  onMouseDown={() => handlePlayNote(note)}
                  onMouseUp={() => handleReleaseNote(note)}
                  onMouseLeave={() => active && handleReleaseNote(note)}
                  onTouchStart={(e) => { e.preventDefault(); handlePlayNote(note); }}
                  onTouchEnd={(e) => { e.preventDefault(); handleReleaseNote(note); }}
                >
                  <div className={styles.shortcut}>{SHORTCUTS[note]}</div>
                  {!black && (
                    <div className={styles.noteLabels}>
                      {BLUE_LABELS[note] && <span className={styles.blueLabel}>{BLUE_LABELS[note]}</span>}
                      <span className={styles.sargam}>{getSargam(note)}</span>
                      <span className={styles.noteName}>{note.replace(/\d+/, '')}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        <div className={styles.hints}>
          <p>Use your computer keyboard to play. (QWERTY row for white keys, Number row for black keys)</p>
        </div>
      </main>
    </div>
  );
}
