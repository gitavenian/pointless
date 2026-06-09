const TEAM_COUNT = 4;
const REVEAL_DELAY = 1000;

const questions = Array.isArray(window.GAME_QUESTIONS)
  ? window.GAME_QUESTIONS
  : [];
let questionIndex = 0;
let turnIndex = 0;
let turnOrder = [];
let teamResults = [];
let teamTotals = Array(TEAM_COUNT).fill(0);
let questionStartTotals = [...teamTotals];
let busy = false;
let soundEnabled = true;
let audioCtx = null;
let revealTimer = null;

const gameShell = document.getElementById("gameShell");
const answerInput = document.getElementById("answerInput");
const scoreDisplay = document.getElementById("scoreDisplay");
const marker = document.getElementById("marker");
const tubeFill = document.getElementById("tubeFill");
const cardsRow = document.getElementById("cardsRow");
const tower = document.getElementById("tower");
const soundBtn = document.getElementById("soundBtn");
const showBtn = document.getElementById("showBtn");
const resetBtn = document.getElementById("resetBtn");
const turnLabel = document.getElementById("turnLabel");
const questionContent = document.getElementById("questionContent");
const questionKicker = document.getElementById("questionKicker");
const questionText = document.getElementById("questionText");
const roundResults = document.getElementById("roundResults");
const highestAnswers = document.getElementById("highestAnswers");
const lowestAnswers = document.getElementById("lowestAnswers");
const lowestHeading = document.getElementById("lowestHeading");
const feedbackOverlay = document.getElementById("feedbackOverlay");
const nextQuestionBtn = document.getElementById("nextQuestionBtn");

showBtn.addEventListener("click", submitAnswer);
document.getElementById("resetBtn").addEventListener("click", resetRound);
nextQuestionBtn.addEventListener("click", nextQuestion);
soundBtn.addEventListener("click", toggleSound);
answerInput.addEventListener("keydown", event => {
  if (event.key === "Enter") submitAnswer();
});

function normalize(text) {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function createTeamCards() {
  cardsRow.innerHTML = "";

  for (let index = 0; index < TEAM_COUNT; index++) {
    const card = document.createElement("article");
    card.className = "answer-card";
    card.innerHTML = `
      <div class="answer-slot">TEAM ${index + 1}</div>
      <div class="answer-name">-</div>
      <div class="answer-score">${teamTotals[index]}</div>
      <div class="answer-result-icon" aria-hidden="true"></div>
    `;
    cardsRow.appendChild(card);
  }
}

function getStartingTeam(question) {
  const configured = Number(question.startTeam);
  if (Number.isInteger(configured) && configured >= 1 && configured <= TEAM_COUNT) {
    return configured - 1;
  }
  return questionIndex % TEAM_COUNT;
}

function buildTurnOrder(startingTeam) {
  const firstPass = Array.from(
    { length: TEAM_COUNT },
    (_, offset) => (startingTeam + offset) % TEAM_COUNT
  );
  return [...firstPass, ...[...firstPass].reverse()];
}

function startQuestion(index, preserveScores = true) {
  window.clearTimeout(revealTimer);
  questionIndex = index;
  turnIndex = 0;
  teamResults = [];
  busy = false;

  if (!preserveScores) {
    teamTotals = Array(TEAM_COUNT).fill(0);
  }
  questionStartTotals = [...teamTotals];
  turnOrder = buildTurnOrder(getStartingTeam(currentQuestion()));

  createTeamCards();
  clearBoardEffects();
  questionContent.hidden = false;
  roundResults.hidden = true;
  nextQuestionBtn.hidden = true;
  questionKicker.textContent = currentQuestion().prompt || "WE ASKED 100 PEOPLE";
  questionText.textContent = currentQuestion().question;
  scoreDisplay.textContent = "100";
  setTowerPosition(100);
  resetBtn.disabled = false;
  prepareTeamTurn();
}

function currentQuestion() {
  return questions[questionIndex];
}

function currentTeamIndex() {
  return turnOrder[turnIndex];
}

function currentPass() {
  return Math.floor(turnIndex / TEAM_COUNT) + 1;
}

function prepareTeamTurn() {
  const teamIndex = currentTeamIndex();
  const cards = getCards();
  cards.forEach((card, index) => card.classList.toggle("active", index === teamIndex));

  answerInput.disabled = false;
  showBtn.disabled = false;
  answerInput.value = "";
  answerInput.placeholder = `Type Team ${teamIndex + 1}'s answer`;
  turnLabel.textContent = `TEAM ${teamIndex + 1}`;
  answerInput.focus();
}

function submitAnswer() {
  if (busy || turnIndex >= turnOrder.length || questions.length === 0) return;

  const rawAnswer = answerInput.value.trim();
  const teamIndex = currentTeamIndex();
  if (!rawAnswer) {
    answerInput.classList.add("input-error");
    window.setTimeout(() => answerInput.classList.remove("input-error"), 500);
    answerInput.focus();
    return;
  }

  busy = true;
  answerInput.disabled = true;
  showBtn.disabled = true;
  clearBoardEffects();

  const card = getCards()[teamIndex];
  card.classList.remove("incorrect", "pointless");
  card.classList.add("locked");
  card.querySelector(".answer-name").textContent = rawAnswer;
  card.querySelector(".answer-result-icon").textContent = "";
  scoreDisplay.textContent = "100";
  setTowerPosition(100);
  playTone(440, 0.08, "triangle", 0.05);

  revealTimer = window.setTimeout(
    () => revealAnswer(rawAnswer, card, teamIndex),
    REVEAL_DELAY
  );
}

function revealAnswer(rawAnswer, card, teamIndex) {
  const match = currentQuestion().answers.find(
    item => normalize(item.answer) === normalize(rawAnswer)
  );
  const result = {
    team: teamIndex + 1,
    pass: currentPass(),
    answer: rawAnswer,
    score: match ? Number(match.score) : 100,
    correct: Boolean(match)
  };

  teamResults.push(result);
  animateScore(result.score, score => {
    teamTotals[teamIndex] += score;
    updateTeamCard(card, result, teamIndex);

    if (!result.correct) {
      showIncorrect(card);
    } else if (score === 0) {
      showPointless(card);
    } else {
      playTone(520, 0.12, "sine", 0.05);
      window.setTimeout(continueGame, 650);
    }
  });
}

function updateTeamCard(card, result, teamIndex) {
  card.classList.remove("locked");
  card.classList.add(result.correct ? "answered" : "incorrect");
  card.querySelector(".answer-score").textContent = teamTotals[teamIndex];
}

function animateScore(target, onComplete) {
  let current = 100;

  function step() {
    scoreDisplay.textContent = current;
    setTowerPosition(current);
    tickSound(current, target);

    if (current === target) {
      onComplete(target);
      return;
    }

    const difference = current - target;
    const decrement = difference > 45 ? 4 : difference > 20 ? 2 : 1;
    current = Math.max(target, current - decrement);
    window.setTimeout(step, difference < 8 ? 90 : difference < 25 ? 45 : 24);
  }

  step();
}

function showIncorrect(card) {
  card.querySelector(".answer-result-icon").textContent = "X";
  gameShell.classList.add("incorrect-flash");
  tower.classList.add("hundred-hit");
  showOverlay("X", "incorrect");
  playTone(180, 0.28, "sawtooth", 0.07);
  window.setTimeout(continueGame, 1350);
}

function showPointless(card) {
  card.classList.add("pointless");
  card.querySelector(".answer-result-icon").textContent = "POINTLESS";
  gameShell.classList.add("pointless-flash");
  tower.classList.add("pointless-hit");
  showOverlay("POINTLESS", "pointless");
  playTone(660, 0.18, "sine", 0.08);
  window.setTimeout(() => playTone(880, 0.25, "sine", 0.08), 120);
  window.setTimeout(continueGame, 1500);
}

function showOverlay(text, type) {
  feedbackOverlay.textContent = text;
  feedbackOverlay.className = `feedback-overlay visible ${type}`;
}

function continueGame() {
  clearBoardEffects();
  turnIndex++;
  busy = false;

  if (turnIndex < turnOrder.length) {
    prepareTeamTurn();
  } else {
    showRoundResults();
  }
}

function getLowestRevealAnswers() {
  const sortedLow = [...currentQuestion().answers]
    .sort((a, b) => Number(a.score) - Number(b.score));
  const pointless = sortedLow.filter(item => Number(item.score) === 0);
  const nonPointless = sortedLow.filter(item => Number(item.score) !== 0);
  const minimumRows = 3;
  const extraNeeded = Math.max(0, minimumRows - pointless.length);
  return [...pointless, ...nonPointless.slice(0, extraNeeded)];
}

function showRoundResults() {
  answerInput.disabled = true;
  showBtn.disabled = true;
  turnLabel.textContent = "RESULTS";
  questionContent.hidden = true;
  roundResults.hidden = false;
  nextQuestionBtn.hidden = false;

  const sortedHigh = [...currentQuestion().answers]
    .sort((a, b) => Number(b.score) - Number(a.score))
    .slice(0, 3);
  const lowAnswers = getLowestRevealAnswers();
  const pointlessCount = lowAnswers.filter(item => Number(item.score) === 0).length;

  renderAnswerList(highestAnswers, sortedHigh);
  renderAnswerList(lowestAnswers, lowAnswers);
  if (pointlessCount === 0) {
    lowestHeading.textContent = "LOWEST ANSWERS";
  } else if (pointlessCount === lowAnswers.length) {
    lowestHeading.textContent = "POINTLESS ANSWERS";
  } else {
    lowestHeading.textContent = "POINTLESS & LOWEST";
  }
}

function renderAnswerList(list, answers) {
  list.innerHTML = "";
  answers.forEach(item => {
    const row = document.createElement("li");
    row.innerHTML = `<span>${item.answer}</span><strong>${item.score}</strong>`;
    list.appendChild(row);
  });
}

function nextQuestion() {
  const nextIndex = (questionIndex + 1) % questions.length;
  startQuestion(nextIndex, true);
}

function resetRound() {
  if (questions.length === 0) return;
  teamTotals = [...questionStartTotals];
  startQuestion(questionIndex, true);
}

function getCards() {
  return [...cardsRow.querySelectorAll(".answer-card")];
}

function clearBoardEffects() {
  gameShell.classList.remove("incorrect-flash", "pointless-flash");
  tower.classList.remove("pointless-hit", "hundred-hit");
  feedbackOverlay.className = "feedback-overlay";
  feedbackOverlay.textContent = "";
}

function setTowerPosition(score) {
  const clamped = Math.max(0, Math.min(100, score));
  const percentFromTop = 100 - clamped;
  marker.style.top = `${percentFromTop}%`;
  tubeFill.style.height = `${percentFromTop}%`;
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  soundBtn.textContent = soundEnabled ? "Sound: On" : "Sound: Off";
}

function ensureAudio() {
  if (!soundEnabled) return null;
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, duration, type = "sine", gainValue = 0.035) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = gainValue;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.stop(ctx.currentTime + duration);
}

function tickSound(current, target) {
  if (current % 4 !== 0 && current - target > 5) return;
  playTone(240 + current * 3, 0.025, "square", 0.018);
}

if (questions.length > 0) {
  startQuestion(0, false);
} else {
  questionKicker.textContent = "QUESTION DATA ERROR";
  questionText.textContent = "CHECK QUESTIONS.JS";
  answerInput.disabled = true;
  showBtn.disabled = true;
}
