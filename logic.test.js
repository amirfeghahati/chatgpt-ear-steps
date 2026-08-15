const test = require("node:test");
const assert = require("node:assert/strict");
const { NOTES, generateSequence, createIntervalQuestion, classifySequence } = require("./logic.js");

const allNotes = NOTES.map((note) => note.id);

test("covers the supplied Setar range in two overlapping registers", () => {
  const low = NOTES.filter((note) => note.register === "low" || note.register === "both");
  const high = NOTES.filter((note) => note.register === "high" || note.register === "both");
  assert.equal(low.length, 8);
  assert.equal(high.length, 8);
  assert.equal(low[0].pitch, "F3");
  assert.equal(low.at(-1).pitch, "F4");
  assert.equal(high[0].pitch, "F4");
  assert.equal(high.at(-1).pitch, "F5");
  assert.equal(low[0].frequency, 174.61);
  assert.equal(high.at(-1).frequency, 698.46);
});

for (const length of [2, 3, 4]) {
  for (const pattern of ["ascending", "descending", ...(length > 2 ? ["upDown", "downUp"] : [])]) {
    test(`generates ${length}-note ${pattern} sequences`, () => {
      for (let index = 0; index < 100; index += 1) {
        const result = generateSequence({
          selectedNoteIds: allNotes,
          length,
          allowedPatterns: [pattern],
        });
        assert.equal(result.notes.length, length);
        assert.equal(result.pattern, pattern);
        assert.equal(classifySequence(result.notes), pattern);
      }
    });
  }
}

test("uses only selected notes", () => {
  const selectedNoteIds = ["do4", "mi4", "sol4", "do5"];
  for (let index = 0; index < 50; index += 1) {
    const result = generateSequence({
      selectedNoteIds,
      length: 3,
      allowedPatterns: ["ascending", "descending", "upDown", "downUp"],
    });
    assert.ok(result.notes.every((note) => selectedNoteIds.includes(note.id)));
  }
});

test("rejects too few selected notes", () => {
  assert.throws(
    () => generateSequence({ selectedNoteIds: ["do4", "re4"], length: 3, allowedPatterns: ["ascending"] }),
    /at least 3/,
  );
});

test("rejects shapes that do not apply to two notes", () => {
  assert.throws(
    () => generateSequence({ selectedNoteIds: allNotes, length: 2, allowedPatterns: ["upDown"] }),
    /at least one sequence shape/,
  );
});

test("classifies a sequence with multiple turns as mixed", () => {
  const byId = Object.fromEntries(NOTES.map((note) => [note.id, note]));
  assert.equal(classifySequence([byId.do4, byId.mi4, byId.re4, byId.sol4]), "mixed");
});

test("builds a four-choice interval question for an adjacent pair", () => {
  const byId = Object.fromEntries(NOTES.map((note) => [note.id, note]));
  const question = createIntervalQuestion([byId.do4, byId.mi4, byId.sol4], () => 0);
  assert.equal(question.targetIndex, 0);
  assert.equal(question.correctSteps, 2);
  assert.equal(question.interval.name, "a 3rd");
  assert.equal(question.options.length, 4);
  assert.equal(new Set(question.options).size, 4);
  assert.ok(question.options.includes(question.correctSteps));
});

test("can target every gap in a longer sequence", () => {
  const sequence = [NOTES[0], NOTES[1], NOTES[4], NOTES[7]];
  const lastGap = createIntervalQuestion(sequence, () => 0.999);
  assert.equal(lastGap.targetIndex, 2);
  assert.equal(lastGap.correctSteps, 3);
});

test("provides a Do-based acoustic reference for every scale-step distance", () => {
  const { INTERVALS } = require("./logic.js");
  const expectedSemitones = [2, 4, 5, 7, 9, 11, 12];
  assert.deepEqual(Object.values(INTERVALS).map((interval) => interval.referenceSemitones), expectedSemitones);
  assert.ok(Object.values(INTERVALS).every((interval) => interval.referenceName));
});
