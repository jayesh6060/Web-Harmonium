export interface Note {
  note: string;
  time: string;
  duration: string;
}

export interface Song {
  id: string;
  name: string;
  tempo: number;
  notes: Note[];
}

export const SONGS: Song[] = [
  {
    id: 'twinkle',
    name: "Twinkle Twinkle Little Star",
    tempo: 100,
    notes: [
      { note: "C4", time: "0:0:0", duration: "4n" },
      { note: "C4", time: "0:0:2", duration: "4n" },
      { note: "G4", time: "0:1:0", duration: "4n" },
      { note: "G4", time: "0:1:2", duration: "4n" },
      { note: "A4", time: "0:2:0", duration: "4n" },
      { note: "A4", time: "0:2:2", duration: "4n" },
      { note: "G4", time: "0:3:0", duration: "2n" },
      { note: "F4", time: "1:0:0", duration: "4n" },
      { note: "F4", time: "1:0:2", duration: "4n" },
      { note: "E4", time: "1:1:0", duration: "4n" },
      { note: "E4", time: "1:1:2", duration: "4n" },
      { note: "D4", time: "1:2:0", duration: "4n" },
      { note: "D4", time: "1:2:2", duration: "4n" },
      { note: "C4", time: "1:3:0", duration: "2n" },
    ]
  },
  {
    id: 'birthday',
    name: "Happy Birthday",
    tempo: 120,
    notes: [
      { note: "C4", time: "0:0:0", duration: "8n." },
      { note: "C4", time: "0:0:0.75", duration: "16n" },
      { note: "D4", time: "0:0:1", duration: "4n" },
      { note: "C4", time: "0:1:0", duration: "4n" },
      { note: "F4", time: "0:1:2", duration: "4n" },
      { note: "E4", time: "0:2:0", duration: "2n" },
    ]
  }
];
