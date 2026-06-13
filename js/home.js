// Start page: save the three team names, then open the game.
// Depends on config.js for the storage keys.

const startForm = document.getElementById("startForm");
const nameInputs = [
  document.getElementById("teamName1"),
  document.getElementById("teamName2"),
  document.getElementById("teamName3")
];

startForm.addEventListener("submit", event => {
  event.preventDefault();
  // Blank fields fall back to TEAM 1/2/3 when the game reads them back.
  const names = nameInputs.map((input, index) => {
    const value = input.value.trim();
    return value ? value : `TEAM ${index + 1}`;
  });
  try {
    localStorage.setItem(TEAM_NAMES_KEY, JSON.stringify(names));
    // Starting from home means a brand-new game — drop any in-progress state
    // so the game begins fresh instead of resuming an old one.
    localStorage.removeItem(GAME_STATE_KEY);
  } catch (error) {
    // Storage may be blocked; the game falls back to default names.
  }
  window.location.href = "Pointless.html";
});
