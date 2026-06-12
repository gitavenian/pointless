// Core game flow: turns, scoring, board updates, and the round results.
// Depends on config.js (constants), audio.js (sound), and questions.js (data).

const questions = Array.isArray(window.GAME_QUESTIONS)
  ? window.GAME_QUESTIONS
  : [];

// Custom team names from the home page, falling back to TEAM 1/2/3.
const teamNames = loadTeamNames();

let questionIndex = 0;
let turnIndex = 0;
let turnOrder = [];
let teamResults = [];
// Raw answer points for the CURRENT question only — reset every question.
let teamTotals = Array(TEAM_COUNT).fill(0);
// Hidden placement points per question: questionPlacements[i] = [p0, p1, p2],
// where the team with the fewest raw points that question scores 1, then 2, then 3.
// These are never shown during play; the lowest total wins at the end.
let questionPlacements = [];
// Normalized answers already given this question (any team) — used to block repeats.
let usedAnswers = new Set();
let busy = false;
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
resetBtn.addEventListener("click", resetRound);
nextQuestionBtn.addEventListener("click", nextQuestion);
soundBtn.addEventListener("click", toggleSound);
answerInput.addEventListener("keydown", event => {
  if (event.key === "Enter") submitAnswer();
});

function loadTeamNames() {
  let stored = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(TEAM_NAMES_KEY));
    if (Array.isArray(parsed)) stored = parsed;
  } catch (error) {
    stored = [];
  }
  return Array.from({ length: TEAM_COUNT }, (_, index) => {
    const name = stored[index] && String(stored[index]).trim();
    return name ? name : `TEAM ${index + 1}`;
  });
}

function teamName(index) {
  return teamNames[index] || `TEAM ${index + 1}`;
}

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
      <div class="answer-slot">${teamName(index)}</div>
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

function startQuestion(index) {
  window.clearTimeout(revealTimer);
  questionIndex = index;
  turnIndex = 0;
  teamResults = [];
  usedAnswers = new Set();
  busy = false;

  // Every question is played fresh; only the hidden placement points carry over.
  teamTotals = Array(TEAM_COUNT).fill(0);
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
  saveState("playing");
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

function isLastQuestion() {
  return questionIndex === questions.length - 1;
}

// Rank this question's teams by raw points (fewest = best). The team with the
// fewest points scores 1, the next 2, the most 3. Ties share the better place
// (e.g. two teams tied for fewest both score 1, the third scores 3).
function computeQuestionPlacement() {
  return teamTotals.map(points =>
    1 + teamTotals.filter(other => other < points).length
  );
}

// Sum the hidden placement points across every completed question.
function totalPlacementPoints() {
  const totals = Array(TEAM_COUNT).fill(0);
  questionPlacements.forEach(placements => {
    if (!placements) return;
    placements.forEach((points, index) => {
      totals[index] += points;
    });
  });
  return totals;
}

function prepareTeamTurn() {
  const teamIndex = currentTeamIndex();
  const cards = getCards();
  cards.forEach((card, index) => card.classList.toggle("active", index === teamIndex));

  answerInput.disabled = false;
  showBtn.disabled = false;
  answerInput.value = "";
  answerInput.placeholder = `Type ${teamName(teamIndex)}'s answer`;
  turnLabel.textContent = teamName(teamIndex);
  answerInput.focus();
}

function flashInput() {
  answerInput.classList.add("input-error");
  window.setTimeout(() => answerInput.classList.remove("input-error"), 600);
}

function submitAnswer() {
  if (busy || turnIndex >= turnOrder.length || questions.length === 0) return;

  const rawAnswer = answerInput.value.trim();
  const teamIndex = currentTeamIndex();
  if (!rawAnswer) {
    flashInput();
    answerInput.focus();
    return;
  }

  // Block answers already given by any team this question.
  if (usedAnswers.has(normalize(rawAnswer))) {
    flashInput();
    showOverlay("ALREADY GIVEN", "notice");
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

function findMatch(rawAnswer) {
  return currentQuestion().answers.find(item => {
    const candidates = [item.answer, ...(Array.isArray(item.aliases) ? item.aliases : [])];
    return candidates.some(candidate => normalize(candidate) === normalize(rawAnswer));
  });
}

function revealAnswer(rawAnswer, card, teamIndex) {
  const match = findMatch(rawAnswer);
  if (match) {
    applyResult(rawAnswer, card, teamIndex, Number(match.score), true);
  } else {
    // Not on the board — the hosts pre-approve answers, so an unlisted answer is wrong (100).
    applyResult(rawAnswer, card, teamIndex, 100, false);
  }
}

function applyResult(rawAnswer, card, teamIndex, score, correct) {
  usedAnswers.add(normalize(rawAnswer));
  const result = {
    team: teamIndex + 1,
    pass: currentPass(),
    answer: rawAnswer,
    score,
    correct
  };

  teamResults.push(result);
  animateScore(score, finalScore => {
    teamTotals[teamIndex] += finalScore;
    updateTeamCard(card, result, teamIndex);

    if (!correct) {
      showIncorrect(card);
    } else if (finalScore === 0) {
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

// Re-draw a finished answer on its card without animation (used when resuming).
function renderResultOnCard(card, result) {
  card.classList.remove("locked", "active", "answered", "incorrect", "pointless");
  card.classList.add(result.correct ? "answered" : "incorrect");
  card.querySelector(".answer-name").textContent = result.answer;
  card.querySelector(".answer-score").textContent = teamTotals[result.team - 1];
  const icon = card.querySelector(".answer-result-icon");
  if (!result.correct) {
    icon.textContent = "X";
  } else if (Number(result.score) === 0) {
    card.classList.add("pointless");
    icon.textContent = "POINTLESS";
  } else {
    icon.textContent = "";
  }
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
    saveState("playing");
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
  nextQuestionBtn.textContent = isLastQuestion() ? "See Final Podium" : "Next Question";

  // Lock in (or recompute, after a reset) this question's hidden placement points.
  questionPlacements[questionIndex] = computeQuestionPlacement();
  saveState("results");

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
  if (isLastQuestion()) {
    finishGame();
    return;
  }
  startQuestion(questionIndex + 1);
}

// Save the final placement totals and hand off to the winner podium page.
// The lowest total wins, so the podium ranks these ascending.
function finishGame() {
  clearGameState();
  const totals = totalPlacementPoints();
  const teams = totals.map((total, index) => ({
    name: teamName(index),
    score: total
  }));
  try {
    localStorage.setItem(FINAL_SCORES_KEY, JSON.stringify(teams));
  } catch (error) {
    // localStorage may be blocked (e.g. file:// in some browsers); fall back to a query string.
    const encoded = encodeURIComponent(JSON.stringify(teams));
    window.location.href = `podium.html?scores=${encoded}`;
    return;
  }
  window.location.href = "podium.html";
}

function resetRound() {
  if (questions.length === 0) return;
  // Drop this question's placement so it is recomputed cleanly on replay.
  delete questionPlacements[questionIndex];
  startQuestion(questionIndex);
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

// --- Refresh-safe persistence -------------------------------------------------

function saveState(phase) {
  const state = {
    v: 1,
    questionCount: questions.length,
    questionIndex,
    turnIndex,
    teamTotals,
    teamResults,
    questionPlacements,
    usedAnswers: [...usedAnswers],
    phase
  };
  try {
    localStorage.setItem(GAME_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    // Persistence is best-effort; ignore when storage is unavailable.
  }
}

function clearGameState() {
  try {
    localStorage.removeItem(GAME_STATE_KEY);
  } catch (error) {
    // Nothing to clear when storage is unavailable.
  }
}

function loadState() {
  let state = null;
  try {
    state = JSON.parse(localStorage.getItem(GAME_STATE_KEY));
  } catch (error) {
    return null;
  }
  if (!state || state.v !== 1 || state.questionCount !== questions.length) return null;
  if (!Number.isInteger(state.questionIndex)) return null;
  if (state.questionIndex < 0 || state.questionIndex >= questions.length) return null;
  return state;
}

// Rebuild the board statically from saved state after a page reload.
function restoreState(state) {
  questionIndex = state.questionIndex;
  turnIndex = Number.isInteger(state.turnIndex) ? state.turnIndex : 0;
  teamTotals = Array.isArray(state.teamTotals) && state.teamTotals.length === TEAM_COUNT
    ? state.teamTotals.slice()
    : Array(TEAM_COUNT).fill(0);
  teamResults = Array.isArray(state.teamResults) ? state.teamResults : [];
  questionPlacements = Array.isArray(state.questionPlacements) ? state.questionPlacements : [];
  usedAnswers = new Set(Array.isArray(state.usedAnswers) ? state.usedAnswers : []);
  busy = false;
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

  teamResults.forEach(result => {
    const card = getCards()[result.team - 1];
    if (card) renderResultOnCard(card, result);
  });

  if (state.phase === "results" || turnIndex >= turnOrder.length) {
    showRoundResults();
  } else {
    prepareTeamTurn();
  }
}

// --- Boot ---------------------------------------------------------------------

if (questions.length > 0) {
  const saved = loadState();
  if (saved) {
    restoreState(saved);
  } else {
    startQuestion(0);
  }
} else {
  questionKicker.textContent = "QUESTION DATA ERROR";
  questionText.textContent = "CHECK QUESTIONS.JS";
  answerInput.disabled = true;
  showBtn.disabled = true;
}
