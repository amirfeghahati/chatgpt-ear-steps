(() => {
  "use strict";

  const { NOTES, PATTERNS, INTERVALS, generateSequence, createIntervalQuestion } = window.EarTrainer;

  const state = {
    mode: "ear",
    length: 3,
    tempo: 0.75,
    register: "low",
    timbre: "pluck",
    selectedNoteIds: NOTES.filter((note) => note.register === "low" || note.register === "both").map((note) => note.id),
    allowedPatterns: Object.keys(PATTERNS),
    current: null,
    phase: "contour",
    intervalChallenge: true,
    intervalQuestion: null,
    intervalAnswered: false,
    answered: false,
    revealed: false,
    playing: false,
    score: 0,
    attempts: 0,
    intervalScore: 0,
    intervalAttempts: 0,
    streak: 0,
    question: 1,
    learnSteps: 2,
    learnDirection: "ascending",
  };

  const elements = {
    modeTabs: [...document.querySelectorAll(".mode-tab")],
    sidebar: document.querySelector(".sidebar"),
    mobileSettingsToggle: document.querySelector("#mobileSettingsToggle"),
    settingsSummary: document.querySelector("#settingsSummary"),
    notePicker: document.querySelector("#notePicker"),
    selectAllNotes: document.querySelector("#selectAllNotes"),
    registerPicker: document.querySelector("#registerPicker"),
    noteRangeHint: document.querySelector("#noteRangeHint"),
    lengthPicker: document.querySelector("#lengthPicker"),
    patternPicker: document.querySelector("#patternPicker"),
    intervalChallenge: document.querySelector("#intervalChallenge"),
    soundPicker: document.querySelector("#soundPicker"),
    tempo: document.querySelector("#tempo"),
    tempoOutput: document.querySelector("#tempoOutput"),
    modeEyebrow: document.querySelector("#modeEyebrow"),
    pageTitle: document.querySelector("#pageTitle"),
    scoreValue: document.querySelector("#scoreValue"),
    intervalScoreValue: document.querySelector("#intervalScoreValue"),
    streakValue: document.querySelector("#streakValue"),
    questionNumber: document.querySelector("#questionNumber"),
    soundLabel: document.querySelector(".sound-label"),
    noteDots: document.querySelector("#noteDots"),
    listenTitle: document.querySelector("#listenTitle"),
    listenSubtitle: document.querySelector("#listenSubtitle"),
    quizProgress: document.querySelector("#quizProgress"),
    answerPrompt: document.querySelector("#answerPrompt"),
    intervalGuide: document.querySelector("#intervalGuide"),
    answerGrid: document.querySelector("#answerGrid"),
    feedback: document.querySelector("#feedback"),
    playQuiz: document.querySelector("#playQuiz"),
    revealAnswer: document.querySelector("#revealAnswer"),
    nextQuestion: document.querySelector("#nextQuestion"),
    earPanel: document.querySelector("#earPanel"),
    instrumentPanel: document.querySelector("#instrumentPanel"),
    learnPanel: document.querySelector("#learnPanel"),
    sessionStats: document.querySelector("#sessionStats"),
    installApp: document.querySelector("#installApp"),
    practiceContour: document.querySelector("#practiceContour"),
    practiceSequence: document.querySelector("#practiceSequence"),
    playPractice: document.querySelector("#playPractice"),
    newPractice: document.querySelector("#newPractice"),
    learnDirection: document.querySelector("#learnDirection"),
    learnStepNumber: document.querySelector("#learnStepNumber"),
    learnIntervalName: document.querySelector("#learnIntervalName"),
    learnSemitones: document.querySelector("#learnSemitones"),
    learnSequence: document.querySelector("#learnSequence"),
    learnPlay: document.querySelector("#learnPlay"),
    distanceLibrary: document.querySelector("#distanceLibrary"),
    toast: document.querySelector("#toast"),
  };

  let audioContext = null;
  let activeOscillators = [];
  let playTimer = null;
  let toastTimer = null;
  let deferredInstallPrompt = null;

  function loadStats() {
    try {
      const stored = JSON.parse(localStorage.getItem("earStepsStats") || "{}");
      state.score = Number(stored.score) || 0;
      state.attempts = Number(stored.attempts) || 0;
      state.intervalScore = Number(stored.intervalScore) || 0;
      state.intervalAttempts = Number(stored.intervalAttempts) || 0;
      state.streak = Number(stored.streak) || 0;
    } catch (_) {
      // A blocked localStorage should never prevent practice.
    }
  }

  function saveStats() {
    try {
      localStorage.setItem("earStepsStats", JSON.stringify({
        score: state.score,
        attempts: state.attempts,
        intervalScore: state.intervalScore,
        intervalAttempts: state.intervalAttempts,
        streak: state.streak,
      }));
    } catch (_) {
      // Stats are a convenience, not a requirement.
    }
  }

  function renderStats() {
    elements.scoreValue.textContent = `${state.score} / ${state.attempts}`;
    elements.intervalScoreValue.textContent = `${state.intervalScore} / ${state.intervalAttempts}`;
    elements.streakValue.textContent = state.streak;
  }

  function availableNotes() {
    return NOTES.filter((note) => note.register === state.register || note.register === "both");
  }

  function noteById(id) {
    return NOTES.find((note) => note.id === id);
  }

  function solfegeLabel(note) {
    const octave = note.pitch.match(/\d+$/)?.[0] || "";
    return `${note.name}${octave}`;
  }

  function frequencyLabel(note) {
    return `${note.frequency.toFixed(2)} Hz`;
  }

  function sequenceLabel(notes) {
    return notes.map(solfegeLabel).join(" – ");
  }

  function renderNotePicker() {
    const registerNotes = availableNotes();
    elements.notePicker.innerHTML = registerNotes.map((note) => {
      const checked = state.selectedNoteIds.includes(note.id);
      return `
        <label class="note-option ${checked ? "selected" : ""}" title="${note.pitch}">
          <input type="checkbox" value="${note.id}" ${checked ? "checked" : ""} />
          <span>${note.name}<small>${note.pitch}</small></span>
        </label>`;
    }).join("");
    elements.selectAllNotes.textContent = state.selectedNoteIds.length === registerNotes.length
      ? `Use ${state.length} only`
      : "Select all";
    elements.registerPicker.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("active", button.dataset.register === state.register);
    });
    elements.noteRangeHint.textContent = state.register === "low"
      ? "Low Setar register · Fa3–Fa4 · 175–349 Hz"
      : "High Setar register · Fa4–Fa5 · 349–698 Hz";
    renderSettingsSummary();
  }

  function renderSettingsSummary() {
    if (elements.settingsSummary) {
      const intervalStatus = state.intervalChallenge ? "distance on" : "distance off";
      const registerName = state.register === "low" ? "Low" : "High";
      elements.settingsSummary.textContent = `${registerName} · ${state.length} notes · ${intervalStatus}`;
    }
  }

  function patternIcon(pattern) {
    const paths = {
      ascending: '<path d="m3 30 17-9 12 3 17-16"/><path d="m42 8 7 0 0 7"/>',
      descending: '<path d="m3 8 17 9 12-3 17 16"/><path d="m42 30 7 0 0-7"/>',
      upDown: '<path d="M3 30 26 7l23 23"/>',
      downUp: '<path d="M3 8 26 31 49 8"/>',
    };
    return `<svg viewBox="0 0 52 38" aria-hidden="true">${paths[pattern]}</svg>`;
  }

  function renderContourAnswers() {
    const patterns = Object.keys(PATTERNS).filter((key) => PATTERNS[key].minLength <= state.length);
    elements.answerGrid.classList.remove("interval-answers");
    elements.answerGrid.classList.toggle("two-answers", patterns.length === 2);
    elements.answerGrid.innerHTML = patterns.map((pattern, index) => `
      <button class="answer-card" type="button" data-answer="${pattern}" ${state.answered || state.revealed ? "disabled" : ""}>
        <span class="answer-number">${index + 1}</span>
        ${patternIcon(pattern)}
        <strong>${PATTERNS[pattern].label}</strong>
      </button>
    `).join("");
  }

  function intervalStepLabel(steps) {
    return `${steps} scale ${steps === 1 ? "step" : "steps"}`;
  }

  function renderIntervalAnswers() {
    const question = state.intervalQuestion;
    if (!question) return;
    elements.answerGrid.classList.remove("two-answers");
    elements.answerGrid.classList.add("interval-answers");
    elements.answerGrid.innerHTML = question.options.map((steps, index) => {
      const interval = INTERVALS[steps];
      return `
        <button class="answer-card interval-answer-card" type="button" data-interval="${steps}" ${state.intervalAnswered || state.revealed ? "disabled" : ""}>
          <span class="answer-number">${index + 1}</span>
          <span class="interval-number">${steps}</span>
          <strong>${intervalStepLabel(steps)}</strong>
          <small>${interval.name} · like ${interval.example}</small>
        </button>`;
    }).join("");
  }

  function renderAnswerGrid() {
    if (state.phase === "interval") renderIntervalAnswers();
    else renderContourAnswers();
  }

  function renderDots(reveal = false) {
    const notes = state.current?.notes || Array.from({ length: state.length });
    elements.noteDots.innerHTML = notes.map((note, index) => {
      const label = reveal && note
        ? `<span>${solfegeLabel(note)}</span><small>${frequencyLabel(note)}</small>`
        : "";
      return `<i style="--delay:${index * 0.08}s">${label}</i>`;
    }).join("");
    elements.noteDots.classList.toggle("revealed", reveal);
    elements.noteDots.classList.remove("interval-map");
  }

  function renderIntervalMap() {
    const targetIndex = state.intervalQuestion.targetIndex;
    elements.noteDots.innerHTML = state.current.notes.map((_, index) => {
      const highlighted = index === targetIndex || index === targetIndex + 1;
      const connector = index < state.current.notes.length - 1
        ? `<b class="${index === targetIndex ? "focus-link" : ""}">→</b>`
        : "";
      return `<i class="${highlighted ? "focus-note" : ""}">${index + 1}</i>${connector}`;
    }).join("");
    elements.noteDots.classList.remove("revealed");
    elements.noteDots.classList.add("interval-map");
  }

  function renderPractice() {
    if (!state.current) return;
    elements.practiceContour.textContent = PATTERNS[state.current.pattern].label;
    elements.practiceContour.dataset.pattern = state.current.pattern;
    elements.practiceSequence.innerHTML = state.current.notes.map((note, index) => `
      <div class="practice-note-chip" style="--delay:${index * 0.05}s">
        <span>${solfegeLabel(note)}</span>
        <small>${note.pitch} · ${frequencyLabel(note)}</small>
      </div>
      ${index < state.current.notes.length - 1 ? '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7 4 6 6-6 6"/></svg>' : ""}
    `).join("");
  }

  function learningNotes() {
    const learningScale = ["do4", "re4", "mi4", "fa4", "sol4", "la4", "si4", "do5"].map(noteById);
    const pair = [learningScale[0], learningScale[state.learnSteps]];
    return state.learnDirection === "descending" ? pair.reverse() : pair;
  }

  function renderDistanceLab() {
    const interval = INTERVALS[state.learnSteps];
    const notes = learningNotes();
    elements.learnStepNumber.textContent = state.learnSteps;
    elements.learnIntervalName.textContent = interval.referenceName;
    elements.learnSemitones.textContent = `${interval.example} reference · ${interval.referenceSemitones} semitones`;
    elements.learnSequence.innerHTML = `
      <div class="learn-note-chip">
        <span>${notes[0].name}</span>
        <small>${notes[0].pitch}</small>
      </div>
      <div class="learn-arrow ${state.learnDirection}">
        <svg viewBox="0 0 50 24" aria-hidden="true"><path d="M3 18c14 0 25-7 39-14"/><path d="m35 3 8 1-2 8"/></svg>
        <small>${state.learnDirection === "ascending" ? "higher" : "lower"}</small>
      </div>
      <div class="learn-note-chip target">
        <span>${notes[1].name}</span>
        <small>${notes[1].pitch}</small>
      </div>`;

    elements.distanceLibrary.innerHTML = Object.values(INTERVALS).map((item) => `
      <button type="button" class="distance-reference-card ${item.steps === state.learnSteps ? "active" : ""}" data-distance="${item.steps}">
        <span class="distance-count"><b>${item.steps}</b><small>${item.steps === 1 ? "step" : "steps"}</small></span>
        <span class="distance-card-copy">
          <strong>${item.referenceName}</strong>
          <small>${item.example}</small>
        </span>
        <span class="semitone-count">${item.referenceSemitones}<small>semi</small></span>
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7 4 6 6-6 6"/></svg>
      </button>`).join("");
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 3200);
  }

  function isStandaloneApp() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  function supportsPwaInstallation() {
    const localHosts = ["localhost", "127.0.0.1"];
    return window.location.protocol === "https:" || localHosts.includes(window.location.hostname);
  }

  function configurePwa() {
    if (!supportsPwaInstallation() || isStandaloneApp()) return;
    elements.installApp.hidden = false;

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      elements.installApp.classList.add("ready");
    });

    window.addEventListener("appinstalled", () => {
      deferredInstallPrompt = null;
      elements.installApp.hidden = true;
      showToast("EarSteps is installed and ready offline.");
    });

    elements.installApp.addEventListener("click", async () => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        if (choice.outcome === "accepted") elements.installApp.hidden = true;
        return;
      }
      const isAppleMobile = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
      showToast(isAppleMobile
        ? "On iPhone or iPad: tap Share, then Add to Home Screen."
        : "Open the browser menu and choose Install app or Add to Home screen.");
    });
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || !supportsPwaInstallation()) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js")
        .then(() => navigator.serviceWorker.ready)
        .then(() => document.documentElement.setAttribute("data-offline-ready", "true"))
        .catch((error) => {
          console.warn("EarSteps offline mode could not start:", error);
        });
    });
    window.addEventListener("offline", () => showToast("You are offline. EarSteps will keep working."));
    window.addEventListener("online", () => showToast("Back online."));
  }

  function selectedPatterns() {
    return [...elements.patternPicker.querySelectorAll('input[type="checkbox"]:checked')]
      .map((input) => input.value)
      .filter((pattern) => PATTERNS[pattern].minLength <= state.length);
  }

  function createSequence({ autoplay = false } = {}) {
    try {
      stopPlayback();
      state.allowedPatterns = selectedPatterns();
      state.current = generateSequence({
        selectedNoteIds: state.selectedNoteIds,
        length: state.length,
        allowedPatterns: state.allowedPatterns,
        previousSignature: state.current?.signature,
      });
      state.phase = "contour";
      state.intervalQuestion = null;
      state.intervalAnswered = false;
      state.answered = false;
      state.revealed = false;
      elements.feedback.className = "feedback";
      elements.feedback.innerHTML = "";
      elements.revealAnswer.disabled = false;
      elements.revealAnswer.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5Z"/><circle cx="10" cy="10" r="2.3"/></svg> Show notes';
      elements.questionNumber.textContent = `QUESTION ${state.question}`;
      elements.soundLabel.innerHTML = `<i></i> ${state.length} notes`;
      elements.listenTitle.textContent = "Tap to listen";
      elements.listenSubtitle.textContent = "You can replay the sequence";
      elements.answerPrompt.textContent = "Choose the shape you heard";
      elements.intervalGuide.hidden = true;
      elements.quizProgress.hidden = !state.intervalChallenge;
      elements.quizProgress.querySelectorAll("[data-progress-phase]").forEach((step) => {
        step.classList.toggle("active", step.dataset.progressPhase === "contour");
        step.classList.remove("completed");
      });
      if (state.mode === "ear") {
        elements.modeEyebrow.textContent = state.intervalChallenge
          ? "EAR TRAINING · TWO-PART QUIZ"
          : "EAR TRAINING · LEVEL 1";
        elements.pageTitle.textContent = "Which way did the melody move?";
      }
      renderAnswerGrid();
      renderDots(false);
      renderPractice();
      if (autoplay && state.mode === "ear") playCurrent(elements.playQuiz);
    } catch (error) {
      showToast(error.message);
    }
  }

  function setControlsForLength() {
    elements.lengthPicker.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("active", Number(button.dataset.length) === state.length);
    });
    elements.patternPicker.querySelectorAll(".check-card").forEach((card) => {
      const unavailable = state.length < Number(card.dataset.minLength);
      card.classList.toggle("unavailable", unavailable);
      card.querySelector("input").disabled = unavailable;
    });
    renderSettingsSummary();
  }

  function getAudioContext() {
    if (!audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) throw new Error("Audio is not supported by this browser.");
      audioContext = new AudioContext();
    }
    if (audioContext.state === "suspended") audioContext.resume();
    return audioContext;
  }

  function scheduleCleanTone(context, frequency, start, duration) {
    const ringDuration = Math.max(0.75, duration * 1.7);
    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, start);
    master.gain.exponentialRampToValueAtTime(0.2, start + 0.012);
    master.gain.exponentialRampToValueAtTime(0.0001, start + ringDuration);
    master.connect(context.destination);

    [
      { multiple: 1, gain: 1 },
      { multiple: 2, gain: 0.14 },
      { multiple: 3, gain: 0.055 },
      { multiple: 4, gain: 0.022 },
    ].forEach((partial) => {
      const oscillator = context.createOscillator();
      const partialGain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency * partial.multiple, start);
      partialGain.gain.value = partial.gain;
      oscillator.connect(partialGain).connect(master);
      oscillator.start(start);
      oscillator.stop(start + ringDuration + 0.03);
      activeOscillators.push(oscillator);
    });
  }

  function schedulePluckedTone(context, frequency, start, duration) {
    const ringDuration = Math.max(1.1, duration * 2.5);
    const sampleRate = context.sampleRate;
    const sampleCount = Math.ceil(sampleRate * ringDuration);
    const period = Math.max(2, Math.round(sampleRate / frequency));
    const buffer = context.createBuffer(1, sampleCount, sampleRate);
    const samples = buffer.getChannelData(0);

    let smoothedNoise = 0;
    for (let index = 0; index < period; index += 1) {
      smoothedNoise = smoothedNoise * 0.28 + (Math.random() * 2 - 1) * 0.72;
      samples[index] = smoothedNoise;
    }
    const damping = frequency < 260 ? 0.9972 : 0.9964;
    for (let index = period; index < sampleCount; index += 1) {
      const delayedIndex = index - period;
      const neighborIndex = delayedIndex === 0 ? period - 1 : delayedIndex - 1;
      samples[index] = damping * 0.5 * (samples[delayedIndex] + samples[neighborIndex]);
    }

    const source = context.createBufferSource();
    const highPass = context.createBiquadFilter();
    const body = context.createBiquadFilter();
    const lowPass = context.createBiquadFilter();
    const master = context.createGain();

    source.buffer = buffer;
    highPass.type = "highpass";
    highPass.frequency.value = 95;
    highPass.Q.value = 0.55;
    body.type = "peaking";
    body.frequency.value = 720;
    body.Q.value = 0.8;
    body.gain.value = 3.2;
    lowPass.type = "lowpass";
    lowPass.frequency.value = 3300;
    lowPass.Q.value = 0.5;
    master.gain.setValueAtTime(0.0001, start);
    master.gain.exponentialRampToValueAtTime(0.34, start + 0.004);
    master.gain.exponentialRampToValueAtTime(0.0001, start + ringDuration);

    source.connect(highPass).connect(body).connect(lowPass).connect(master).connect(context.destination);
    source.start(start);
    source.stop(start + ringDuration + 0.02);
    activeOscillators.push(source);
  }

  function scheduleTone(context, frequency, start, duration) {
    if (state.timbre === "pluck") schedulePluckedTone(context, frequency, start, duration);
    else scheduleCleanTone(context, frequency, start, duration);
  }

  function stopPlayback() {
    clearTimeout(playTimer);
    activeOscillators.forEach((oscillator) => {
      try { oscillator.stop(); } catch (_) { /* already stopped */ }
    });
    activeOscillators = [];
    state.playing = false;
    document.querySelectorAll(".playing").forEach((element) => element.classList.remove("playing"));
    document.querySelector(".listening-stage")?.classList.remove("is-playing");
  }

  function playNotes(playbackNotes, button) {
    if (!playbackNotes?.length) return;
    if (state.playing) {
      stopPlayback();
      return;
    }
    try {
      const context = getAudioContext();
      const noteDuration = Math.min(0.55, state.tempo * 0.72);
      const start = context.currentTime + 0.06;
      activeOscillators = [];
      playbackNotes.forEach((note, index) => {
        scheduleTone(context, note.frequency, start + index * state.tempo, noteDuration);
      });
      state.playing = true;
      button.classList.add("playing");
      document.querySelector(".listening-stage")?.classList.add("is-playing");
      const soundTail = state.timbre === "pluck"
        ? Math.max(1.1, noteDuration * 2.5)
        : Math.max(0.75, noteDuration * 1.7);
      const totalTime = ((playbackNotes.length - 1) * state.tempo + soundTail + 0.1) * 1000;
      playTimer = setTimeout(() => {
        state.playing = false;
        activeOscillators = [];
        button.classList.remove("playing");
        document.querySelector(".listening-stage")?.classList.remove("is-playing");
      }, totalTime);
    } catch (error) {
      showToast(error.message);
    }
  }

  function playCurrent(button) {
    if (!state.current) return;
    const playbackNotes = state.mode === "ear" && state.phase === "interval" && state.intervalQuestion
      ? [state.intervalQuestion.from, state.intervalQuestion.to]
      : state.current.notes;
    playNotes(playbackNotes, button);
  }

  function beginIntervalChallenge() {
    stopPlayback();
    state.phase = "interval";
    state.intervalQuestion = createIntervalQuestion(state.current.notes);
    state.intervalAnswered = false;
    state.revealed = false;

    const pairStart = state.intervalQuestion.targetIndex + 1;
    const pairEnd = pairStart + 1;
    elements.questionNumber.textContent = `QUESTION ${state.question} · PART 2`;
    elements.soundLabel.innerHTML = "<i></i> 2-note focus";
    elements.modeEyebrow.textContent = "EAR TRAINING · INTERVAL SIZE";
    elements.pageTitle.textContent = "How large was the highlighted jump?";
    elements.listenTitle.textContent = `Hear notes ${pairStart} and ${pairEnd}`;
    elements.listenSubtitle.textContent = "Only the highlighted pair will play";
    elements.answerPrompt.textContent = "Choose the distance you heard";
    elements.intervalGuide.hidden = false;
    elements.intervalGuide.innerHTML = `
      <span>Focus pair</span>
      <strong>Note ${pairStart} <b>→</b> Note ${pairEnd}</strong>
      <small>Ignore direction—how many scale steps apart?</small>`;
    elements.quizProgress.querySelector('[data-progress-phase="contour"]').className = "completed";
    elements.quizProgress.querySelector('[data-progress-phase="interval"]').className = "active";
    elements.revealAnswer.disabled = false;
    elements.revealAnswer.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5Z"/><circle cx="10" cy="10" r="2.3"/></svg> Show distance';
    elements.feedback.className = "feedback success compact-feedback";
    elements.feedback.innerHTML = `<svg viewBox="0 0 22 22"><path d="m5 11 4 4 8-9"/></svg><span><strong>${PATTERNS[state.current.pattern].label}—correct.</strong> Now listen for the size of one jump.</span>`;
    renderIntervalMap();
    renderAnswerGrid();
    playCurrent(elements.playQuiz);
  }

  function revealNotes() {
    if (!state.current) return;
    state.revealed = true;
    renderDots(true);
    renderAnswerGrid();
    if (state.phase === "interval") {
      const question = state.intervalQuestion;
      elements.answerGrid.querySelector(`[data-interval="${question.correctSteps}"]`)?.classList.add("correct");
      elements.feedback.className = "feedback revealed-feedback";
      elements.feedback.innerHTML = `<span>Distance</span><strong>${intervalStepLabel(question.correctSteps)} (${question.interval.name})</strong> · ${solfegeLabel(question.from)} ${frequencyLabel(question.from)} → ${solfegeLabel(question.to)} ${frequencyLabel(question.to)}`;
    } else {
      elements.answerGrid.querySelector(`[data-answer="${state.current.pattern}"]`)?.classList.add("correct");
      elements.feedback.className = "feedback revealed-feedback";
      elements.feedback.innerHTML = `<span>Answer</span><strong>${PATTERNS[state.current.pattern].label}</strong> · ${sequenceLabel(state.current.notes)}`;
    }
    elements.revealAnswer.disabled = true;
  }

  function submitAnswer(pattern) {
    if (state.answered || state.revealed || !state.current) return;
    state.answered = true;
    state.attempts += 1;
    const correct = pattern === state.current.pattern;
    if (correct) state.score += 1;
    else state.streak = 0;
    saveStats();
    renderStats();

    if (correct && state.intervalChallenge) {
      beginIntervalChallenge();
      return;
    }

    if (correct) state.streak += 1;
    renderDots(true);
    renderAnswerGrid();

    const chosen = elements.answerGrid.querySelector(`[data-answer="${pattern}"]`);
    const answer = elements.answerGrid.querySelector(`[data-answer="${state.current.pattern}"]`);
    chosen?.classList.add(correct ? "correct" : "incorrect");
    answer?.classList.add("correct");

    elements.feedback.className = `feedback ${correct ? "success" : "error"}`;
    elements.feedback.innerHTML = correct
      ? `<svg viewBox="0 0 22 22"><path d="m5 11 4 4 8-9"/></svg><span><strong>Exactly right!</strong> ${sequenceLabel(state.current.notes)} moves ${PATTERNS[state.current.pattern].label.toLowerCase()}.</span>`
      : `<svg viewBox="0 0 22 22"><path d="M7 7l8 8M15 7l-8 8"/></svg><span><strong>Not this time.</strong> It was ${PATTERNS[state.current.pattern].label.toLowerCase()}: ${sequenceLabel(state.current.notes)}.</span>`;
    elements.revealAnswer.disabled = true;
    saveStats();
    renderStats();
  }

  function submitIntervalAnswer(steps) {
    if (state.intervalAnswered || state.revealed || !state.intervalQuestion) return;
    state.intervalAnswered = true;
    state.intervalAttempts += 1;
    const correct = steps === state.intervalQuestion.correctSteps;
    if (correct) {
      state.intervalScore += 1;
      state.streak += 1;
    } else {
      state.streak = 0;
    }
    saveStats();
    renderStats();
    renderDots(true);
    renderAnswerGrid();

    const chosen = elements.answerGrid.querySelector(`[data-interval="${steps}"]`);
    const answer = elements.answerGrid.querySelector(`[data-interval="${state.intervalQuestion.correctSteps}"]`);
    chosen?.classList.add(correct ? "correct" : "incorrect");
    answer?.classList.add("correct");

    const question = state.intervalQuestion;
    elements.feedback.className = `feedback ${correct ? "success" : "error"}`;
    elements.feedback.innerHTML = correct
      ? `<svg viewBox="0 0 22 22"><path d="m5 11 4 4 8-9"/></svg><span><strong>You heard it.</strong> ${solfegeLabel(question.from)} → ${solfegeLabel(question.to)} is ${intervalStepLabel(question.correctSteps)}, called ${question.interval.name}.</span>`
      : `<svg viewBox="0 0 22 22"><path d="M7 7l8 8M15 7l-8 8"/></svg><span><strong>Close.</strong> ${solfegeLabel(question.from)} → ${solfegeLabel(question.to)} is ${intervalStepLabel(question.correctSteps)}, called ${question.interval.name}.</span>`;
    elements.revealAnswer.disabled = true;
  }

  function nextSequence(autoplay = false) {
    state.question += 1;
    createSequence({ autoplay });
  }

  function changeMode(mode) {
    if (mode === state.mode) return;
    stopPlayback();
    state.mode = mode;
    elements.modeTabs.forEach((tab) => {
      const active = tab.dataset.mode === mode;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    const isEar = mode === "ear";
    const isInstrument = mode === "instrument";
    const isLearn = mode === "learn";
    elements.earPanel.hidden = !isEar;
    elements.instrumentPanel.hidden = !isInstrument;
    elements.learnPanel.hidden = !isLearn;
    elements.sessionStats.hidden = isLearn;
    elements.sidebar.classList.toggle("learn-mode", isLearn);
    if (isLearn) {
      elements.modeEyebrow.textContent = "DISTANCE LAB · LEARN BY COMPARING";
      elements.pageTitle.textContent = "Build a feeling for distance.";
      history.replaceState(null, "", "#learn");
      renderDistanceLab();
      return;
    }
    elements.modeEyebrow.textContent = isEar ? "EAR TRAINING · LEVEL 1" : "SETAR PRACTICE · SIGHT & SOUND";
    elements.pageTitle.textContent = isEar ? "Which way did the melody move?" : "Turn the pattern into movement.";
    history.replaceState(null, "", isEar ? "#ear" : "#setar");
    createSequence();
  }

  elements.modeTabs.forEach((tab) => tab.addEventListener("click", () => changeMode(tab.dataset.mode)));

  elements.mobileSettingsToggle.addEventListener("click", () => {
    const isOpen = elements.sidebar.classList.toggle("settings-open");
    elements.mobileSettingsToggle.setAttribute("aria-expanded", String(isOpen));
  });

  elements.notePicker.addEventListener("change", (event) => {
    if (!event.target.matches('input[type="checkbox"]')) return;
    const nextNoteIds = [...elements.notePicker.querySelectorAll("input:checked")].map((input) => input.value);
    if (nextNoteIds.length < state.length) {
      event.target.checked = true;
      showToast(`A ${state.length}-note sequence needs at least ${state.length} pitches.`);
      return;
    }
    state.selectedNoteIds = nextNoteIds;
    renderNotePicker();
    createSequence();
  });

  elements.selectAllNotes.addEventListener("click", () => {
    const registerNotes = availableNotes();
    state.selectedNoteIds = state.selectedNoteIds.length === registerNotes.length
      ? registerNotes.slice(0, state.length).map((note) => note.id)
      : registerNotes.map((note) => note.id);
    renderNotePicker();
    createSequence();
  });

  elements.registerPicker.addEventListener("click", (event) => {
    const button = event.target.closest("[data-register]");
    if (!button || button.dataset.register === state.register) return;
    state.register = button.dataset.register;
    state.selectedNoteIds = availableNotes().map((note) => note.id);
    stopPlayback();
    renderNotePicker();
    createSequence();
  });

  elements.lengthPicker.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-length]");
    if (!button) return;
    state.length = Number(button.dataset.length);
    if (state.selectedNoteIds.length < state.length) {
      const additions = availableNotes()
        .filter((note) => !state.selectedNoteIds.includes(note.id))
        .slice(0, state.length - state.selectedNoteIds.length)
        .map((note) => note.id);
      state.selectedNoteIds = [...state.selectedNoteIds, ...additions];
      renderNotePicker();
    }
    setControlsForLength();
    if (!selectedPatterns().length) {
      const firstAvailable = elements.patternPicker.querySelector(`.check-card[data-min-length="2"] input`);
      firstAvailable.checked = true;
    }
    createSequence();
  });

  elements.patternPicker.addEventListener("change", (event) => {
    if (!event.target.matches('input[type="checkbox"]')) return;
    const availableChecked = selectedPatterns();
    if (!availableChecked.length) {
      event.target.checked = true;
      showToast("Keep at least one available sequence shape selected.");
      return;
    }
    createSequence();
  });

  elements.intervalChallenge.addEventListener("change", () => {
    state.intervalChallenge = elements.intervalChallenge.checked;
    renderSettingsSummary();
    createSequence();
  });

  elements.soundPicker.addEventListener("click", (event) => {
    const button = event.target.closest("[data-timbre]");
    if (!button) return;
    state.timbre = button.dataset.timbre;
    elements.soundPicker.querySelectorAll("button").forEach((item) => {
      item.classList.toggle("active", item === button);
    });
    stopPlayback();
    const previewNote = state.current?.notes[0] || availableNotes()[0];
    playNotes([previewNote], button);
  });

  elements.tempo.addEventListener("input", () => {
    state.tempo = Number(elements.tempo.value);
    elements.tempoOutput.textContent = `${state.tempo.toFixed(2)} sec`;
    const progress = ((state.tempo - Number(elements.tempo.min)) /
      (Number(elements.tempo.max) - Number(elements.tempo.min))) * 100;
    elements.tempo.style.background = `linear-gradient(to right, var(--green) 0 ${progress}%, #dce3df ${progress}% 100%)`;
  });

  elements.answerGrid.addEventListener("click", (event) => {
    const answer = event.target.closest("[data-answer]");
    if (answer) submitAnswer(answer.dataset.answer);
    const intervalAnswer = event.target.closest("[data-interval]");
    if (intervalAnswer) submitIntervalAnswer(Number(intervalAnswer.dataset.interval));
  });

  elements.playQuiz.addEventListener("click", () => playCurrent(elements.playQuiz));
  elements.playPractice.addEventListener("click", () => playCurrent(elements.playPractice));
  elements.learnPlay.addEventListener("click", () => playNotes(learningNotes(), elements.learnPlay));
  elements.revealAnswer.addEventListener("click", revealNotes);
  elements.nextQuestion.addEventListener("click", () => nextSequence(true));
  elements.newPractice.addEventListener("click", () => nextSequence(false));

  elements.learnDirection.addEventListener("click", (event) => {
    const button = event.target.closest("[data-direction]");
    if (!button) return;
    state.learnDirection = button.dataset.direction;
    elements.learnDirection.querySelectorAll("button").forEach((item) => {
      item.classList.toggle("active", item === button);
    });
    stopPlayback();
    renderDistanceLab();
    playNotes(learningNotes(), elements.learnPlay);
  });

  elements.distanceLibrary.addEventListener("click", (event) => {
    const card = event.target.closest("[data-distance]");
    if (!card) return;
    state.learnSteps = Number(card.dataset.distance);
    stopPlayback();
    renderDistanceLab();
    playNotes(learningNotes(), elements.learnPlay);
  });

  document.querySelector(".comparison-stack").addEventListener("click", (event) => {
    const button = event.target.closest("[data-compare]");
    if (!button) return;
    const comparisonNotes = {
      "do-re": ["do4", "re4"],
      "mi-fa": ["mi4", "fa4"],
      "re-do": ["re4", "do4"],
      "fa-mi": ["fa4", "mi4"],
    };
    const notes = comparisonNotes[button.dataset.compare].map(noteById);
    stopPlayback();
    playNotes(notes, button);
  });

  document.querySelector(".self-check").addEventListener("click", (event) => {
    const rating = event.target.closest("[data-rating]")?.dataset.rating;
    if (rating === "again") playCurrent(elements.playPractice);
    if (rating === "got-it") {
      showToast("Nice. A fresh phrase is ready.");
      nextSequence(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.target.matches("input, button")) return;
    if (state.mode === "ear" && event.code === "Space") {
      event.preventDefault();
      playCurrent(elements.playQuiz);
    }
    if (state.mode === "ear" && /^[1-4]$/.test(event.key)) {
      const answers = [...elements.answerGrid.querySelectorAll("[data-answer], [data-interval]")];
      answers[Number(event.key) - 1]?.click();
    }
    if (event.key === "Enter" && state.mode === "ear") nextSequence(true);
  });

  window.addEventListener("beforeunload", stopPlayback);

  loadStats();
  renderStats();
  renderNotePicker();
  setControlsForLength();
  elements.tempo.dispatchEvent(new Event("input"));
  createSequence();
  configurePwa();
  registerServiceWorker();
  if (window.location.hash === "#setar") changeMode("instrument");
  if (window.location.hash === "#learn") changeMode("learn");
})();
