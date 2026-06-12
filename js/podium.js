// Winner podium page. Reads final scores saved by game.js and reveals the
// teams one at a time, worst place first, with the lowest score crowned winner.
// Depends on config.js (FINAL_SCORES_KEY) and audio.js (playTone).

const stage = document.getElementById("podiumStage");
const titleEl = document.getElementById("podiumTitle");
const actionsEl = document.getElementById("podiumActions");

const MEDALS = { 1: "🥇", 2: "🥈", 3: "🥉" };
const PLACE_NUM = { 1: "1", 2: "2", 3: "3" };
const BLOCK_HEIGHT = { 1: "min(30vh, 240px)", 2: "min(22vh, 180px)", 3: "min(16vh, 130px)" };
const CONFETTI_COLORS = ["#fff23c", "#f13d91", "#22ff86", "#5b87ff", "#ffd34e", "#ff7ac0"];

// Reveal timing (ms): worst place first, winner last.
const FIRST_REVEAL = 600;
const REVEAL_GAP = 1100;

function loadTeams() {
  // Primary source: localStorage. Fallback: ?scores= query string.
  let raw = null;
  try {
    raw = localStorage.getItem(FINAL_SCORES_KEY);
  } catch (error) {
    raw = null;
  }
  if (!raw) {
    const params = new URLSearchParams(window.location.search);
    if (params.has("scores")) raw = decodeURIComponent(params.get("scores"));
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch (error) {
    return null;
  }
  return null;
}

// Rank teams: lowest score wins. Ties share a place; `rank` stays unique so
// each team always gets its own column even when scores are equal.
function rankTeams(teams) {
  const sorted = [...teams]
    .map(team => ({ name: team.name, score: Number(team.score) }))
    .sort((a, b) => a.score - b.score);
  const ranked = [];
  sorted.forEach((team, index) => {
    const prev = ranked[index - 1];
    const tiedWithPrev = prev && team.score === prev.score;
    ranked.push({
      name: team.name,
      score: team.score,
      place: tiedWithPrev ? prev.place : index + 1,
      rank: index
    });
  });
  return ranked;
}

// Arrange ranked teams so the winner sits in the center, runners-up alternate
// outward (e.g. for 3 teams: 2nd, 1st, 3rd).
function arrangeForStage(ranked) {
  const [winner, ...rest] = ranked;
  const left = [];
  const right = [];
  rest.forEach((team, index) => {
    if (index % 2 === 0) left.push(team);
    else right.push(team);
  });
  return [...left.reverse(), winner, ...right];
}

function buildColumn(team) {
  const col = document.createElement("div");
  col.className = "podium-col";
  col.dataset.place = String(team.place);
  col.style.setProperty("--block-height", BLOCK_HEIGHT[team.place] || "min(18vh, 140px)");

  const medal = MEDALS[team.place] || "🎖️";
  const placeNum = PLACE_NUM[team.place] || String(team.place);

  col.innerHTML = `
    <div class="podium-plaque">
      <div class="podium-medal">${medal}</div>
      <div class="podium-team">${team.name}</div>
      <div class="podium-points">${team.score}<small> PTS</small></div>
    </div>
    <div class="podium-block">
      <span class="podium-place-num">${placeNum}</span>
    </div>
  `;
  return col;
}

function revealColumn(col, place) {
  col.classList.add("revealed");
  // Winner gets a brighter chord and confetti; others a single rising tone.
  if (place === 1) {
    playTone(523, 0.18, "sine", 0.06);
    window.setTimeout(() => playTone(659, 0.18, "sine", 0.06), 130);
    window.setTimeout(() => playTone(784, 0.32, "sine", 0.07), 260);
    burstConfetti();
  } else {
    playTone(330 + (4 - place) * 60, 0.16, "triangle", 0.05);
  }
}

function burstConfetti(count = 120) {
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti";
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    const left = (i / count) * 100;
    // Deterministic spread (no Math.random needed) keeps it lively but stable.
    const duration = 2.6 + ((i * 37) % 18) / 10;
    const delay = ((i * 53) % 12) / 10;
    const drift = ((i * 71) % 40) - 20;
    piece.style.left = `${left}vw`;
    piece.style.background = color;
    piece.style.animationDuration = `${duration}s`;
    piece.style.animationDelay = `${delay}s`;
    piece.style.transform = `translateX(${drift}px)`;
    if (i % 3 === 0) piece.style.borderRadius = "50%";
    document.body.appendChild(piece);
    window.setTimeout(() => piece.remove(), (duration + delay) * 1000 + 200);
  }
}

function showWinnerTitle(winner) {
  titleEl.innerHTML = `
    ${winner.name} WINS!
  `;
}

function renderPodium(ranked) {
  const arranged = arrangeForStage(ranked);
  const columns = new Map();

  arranged.forEach(team => {
    const col = buildColumn(team);
    stage.appendChild(col);
    columns.set(team.rank, col);
  });

  // Reveal worst place first, winner last, for a dramatic build-up.
  const byRevealOrder = [...ranked].sort((a, b) => b.rank - a.rank);
  byRevealOrder.forEach((team, index) => {
    const delay = FIRST_REVEAL + index * REVEAL_GAP;
    window.setTimeout(() => revealColumn(columns.get(team.rank), team.place), delay);
  });

  const winner = ranked[0];
  const winnerDelay = FIRST_REVEAL + (byRevealOrder.length - 1) * REVEAL_GAP;
  window.setTimeout(() => showWinnerTitle(winner), winnerDelay + 200);
  actionsEl.hidden = false;
}

function renderEmptyState() {
  titleEl.textContent = "NO RESULTS YET";
  stage.innerHTML = `
    <div class="podium-empty">
      <p>Finish a full game to see the winners' podium. Play all the questions, then tap "See Final Podium".</p>
    </div>
  `;
  actionsEl.hidden = false;
}

function clearStoredScores() {
  try {
    localStorage.removeItem(FINAL_SCORES_KEY);
  } catch (error) {
    // Ignore — nothing to clear when storage is unavailable.
  }
}

// Play Again clears the stored result so a fresh game starts clean.
document.getElementById("playAgainBtn").addEventListener("click", event => {
  event.preventDefault();
  clearStoredScores();
  window.location.href = "Pointless.html";
});

const teams = loadTeams();
if (teams) {
  renderPodium(rankTeams(teams));
} else {
  renderEmptyState();
}
