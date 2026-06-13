// Shared game constants. Loaded before game.js and podium.js.
const TEAM_COUNT = 3;
const REVEAL_DELAY = 1000;

// localStorage key used to hand final scores from the game to the podium page.
const FINAL_SCORES_KEY = "pointlessFinalScores";

// localStorage key holding the custom team names entered at the start of the game.
const TEAM_NAMES_KEY = "pointlessTeamNames";

// localStorage key holding in-progress game state so a refresh can resume.
const GAME_STATE_KEY = "pointlessGameState";
