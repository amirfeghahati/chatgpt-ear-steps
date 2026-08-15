(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EarTrainer = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const NOTES = [
    { id: "fa3", name: "Fa", pitch: "F3", frequency: 174.61, degree: 0, register: "low" },
    { id: "sol3", name: "Sol", pitch: "G3", frequency: 196.0, degree: 1, register: "low" },
    { id: "la3", name: "La", pitch: "A3", frequency: 220.0, degree: 2, register: "low" },
    { id: "si3", name: "Si", pitch: "B3", frequency: 246.94, degree: 3, register: "low" },
    { id: "do4", name: "Do", pitch: "C4", frequency: 261.63, degree: 4, register: "low" },
    { id: "re4", name: "Re", pitch: "D4", frequency: 293.66, degree: 5, register: "low" },
    { id: "mi4", name: "Mi", pitch: "E4", frequency: 329.63, degree: 6, register: "low" },
    { id: "fa4", name: "Fa", pitch: "F4", frequency: 349.23, degree: 7, register: "both" },
    { id: "sol4", name: "Sol", pitch: "G4", frequency: 392.0, degree: 8, register: "high" },
    { id: "la4", name: "La", pitch: "A4", frequency: 440.0, degree: 9, register: "high" },
    { id: "si4", name: "Si", pitch: "B4", frequency: 493.88, degree: 10, register: "high" },
    { id: "do5", name: "Do", pitch: "C5", frequency: 523.25, degree: 11, register: "high" },
    { id: "re5", name: "Re", pitch: "D5", frequency: 587.33, degree: 12, register: "high" },
    { id: "mi5", name: "Mi", pitch: "E5", frequency: 659.25, degree: 13, register: "high" },
    { id: "fa5", name: "Fa", pitch: "F5", frequency: 698.46, degree: 14, register: "high" },
  ];

  const PATTERNS = {
    ascending: { label: "Rising", short: "Rising", minLength: 2 },
    descending: { label: "Falling", short: "Falling", minLength: 2 },
    upDown: { label: "Up then down", short: "Up / down", minLength: 3 },
    downUp: { label: "Down then up", short: "Down / up", minLength: 3 },
  };

  const INTERVALS = {
    1: { steps: 1, name: "a 2nd", shortName: "2nd", example: "Do–Re", hint: "neighboring notes", referenceName: "Major 2nd", referenceSemitones: 2 },
    2: { steps: 2, name: "a 3rd", shortName: "3rd", example: "Do–Mi", hint: "skip one note", referenceName: "Major 3rd", referenceSemitones: 4 },
    3: { steps: 3, name: "a 4th", shortName: "4th", example: "Do–Fa", hint: "three scale steps", referenceName: "Perfect 4th", referenceSemitones: 5 },
    4: { steps: 4, name: "a 5th", shortName: "5th", example: "Do–Sol", hint: "four scale steps", referenceName: "Perfect 5th", referenceSemitones: 7 },
    5: { steps: 5, name: "a 6th", shortName: "6th", example: "Do–La", hint: "five scale steps", referenceName: "Major 6th", referenceSemitones: 9 },
    6: { steps: 6, name: "a 7th", shortName: "7th", example: "Do–Si", hint: "six scale steps", referenceName: "Major 7th", referenceSemitones: 11 },
    7: { steps: 7, name: "an octave", shortName: "Octave", example: "Do–high Do", hint: "same name, next octave", referenceName: "Octave", referenceSemitones: 12 },
  };

  function randomItem(items, random = Math.random) {
    return items[Math.floor(random() * items.length)];
  }

  function shuffled(items, random = Math.random) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  function takeSorted(items, count, direction, random) {
    const result = shuffled(items, random).slice(0, count).sort((a, b) => a.degree - b.degree);
    return direction === "down" ? result.reverse() : result;
  }

  function buildTurningSequence(notes, length, pattern, random) {
    const pivotPosition = length === 3 ? 1 : randomItem([1, 2], random);
    const leftCount = pivotPosition;
    const rightCount = length - pivotPosition - 1;

    if (pattern === "upDown") {
      const candidates = notes.filter((pivot) => {
        const lowerCount = notes.filter((note) => note.degree < pivot.degree).length;
        return lowerCount >= Math.max(leftCount, rightCount);
      });
      if (!candidates.length) return null;
      const pivot = randomItem(candidates, random);
      const lower = notes.filter((note) => note.degree < pivot.degree);
      const left = takeSorted(lower, leftCount, "up", random);
      const right = takeSorted(lower, rightCount, "down", random);
      return [...left, pivot, ...right];
    }

    const candidates = notes.filter((pivot) => {
      const higherCount = notes.filter((note) => note.degree > pivot.degree).length;
      return higherCount >= Math.max(leftCount, rightCount);
    });
    if (!candidates.length) return null;
    const pivot = randomItem(candidates, random);
    const higher = notes.filter((note) => note.degree > pivot.degree);
    const left = takeSorted(higher, leftCount, "down", random);
    const right = takeSorted(higher, rightCount, "up", random);
    return [...left, pivot, ...right];
  }

  function generateSequence(options) {
    const {
      selectedNoteIds,
      length,
      allowedPatterns,
      random = Math.random,
      previousSignature = "",
    } = options;
    const notes = NOTES.filter((note) => selectedNoteIds.includes(note.id));
    const patterns = allowedPatterns.filter((pattern) => PATTERNS[pattern]?.minLength <= length);

    if (notes.length < length) {
      throw new Error(`Choose at least ${length} different notes for this sequence length.`);
    }
    if (!patterns.length) {
      throw new Error("Choose at least one sequence shape.");
    }

    for (let attempt = 0; attempt < 30; attempt += 1) {
      const pattern = randomItem(patterns, random);
      let sequence;
      if (pattern === "ascending") sequence = takeSorted(notes, length, "up", random);
      else if (pattern === "descending") sequence = takeSorted(notes, length, "down", random);
      else sequence = buildTurningSequence(notes, length, pattern, random);

      if (!sequence) continue;
      const signature = `${pattern}:${sequence.map((note) => note.id).join("-")}`;
      if (signature !== previousSignature || attempt === 29) return { pattern, notes: sequence, signature };
    }
    throw new Error("That combination cannot make the selected shapes. Add a few more notes.");
  }

  function createIntervalQuestion(sequence, random = Math.random) {
    if (!Array.isArray(sequence) || sequence.length < 2) {
      throw new Error("An interval question needs at least two notes.");
    }
    const targetIndex = Math.floor(random() * (sequence.length - 1));
    const from = sequence[targetIndex];
    const to = sequence[targetIndex + 1];
    const correctSteps = Math.abs(to.degree - from.degree);
    const distractors = shuffled(
      Object.keys(INTERVALS).map(Number).filter((steps) => steps !== correctSteps),
      random,
    ).slice(0, 3);

    return {
      targetIndex,
      from,
      to,
      correctSteps,
      interval: INTERVALS[correctSteps],
      options: [correctSteps, ...distractors].sort((a, b) => a - b),
    };
  }

  function classifySequence(sequence) {
    const directions = sequence.slice(1).map((note, index) =>
      Math.sign(note.degree - sequence[index].degree),
    );
    if (directions.some((value) => value === 0)) return "mixed";
    if (directions.every((value) => value > 0)) return "ascending";
    if (directions.every((value) => value < 0)) return "descending";
    const runs = directions.filter((direction, index) => index === 0 || direction !== directions[index - 1]);
    if (runs.length === 2 && runs[0] > 0 && runs[1] < 0) return "upDown";
    if (runs.length === 2 && runs[0] < 0 && runs[1] > 0) return "downUp";
    return "mixed";
  }

  return { NOTES, PATTERNS, INTERVALS, generateSequence, createIntervalQuestion, classifySequence };
});
