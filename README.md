# Pointless Team Game

A local browser-based team quiz inspired by *Pointless*. Teams try to find correct answers with the lowest possible scores.

## Start the Game

1. Keep all project files in the same folder.
2. Open `home.html` in a browser.
3. Enter the three team names (or leave them blank for TEAM 1/2/3).
4. Click **Start The Game**.

You can also open `Pointless.html` directly, which uses the last-entered names (or the defaults).

No server or installation is required.

## Project Files

- `home.html` - Start page.
- `Pointless.html` - Main game page.
- `podium.html` - Winners' podium shown after the last question.
- `questions.js` - Questions and answers. Edit this file to change the quiz.
- `css/` - Stylesheets, split by area:
  - `home.css` - Start page (title, team-name fields, Start button).
  - `variables.css` - Colors, resets, page background.
  - `game.css` - Overall shell and playfield layout.
  - `tower.css` - Score tower and marker.
  - `board.css` - Question board and round results.
  - `cards.css` - Team answer cards.
  - `host.css` - Host control bar.
  - `effects.css` - Overlays, flashes, keyframes, responsive rules.
  - `podium.css` - Winners' podium page.
- `js/` - Scripts, split by responsibility:
  - `config.js` - Shared constants (team count, timings, storage key).
  - `home.js` - Saves team names on the start page and opens the game.
  - `audio.js` - Sound effects.
  - `game.js` - Game flow, scoring, and turns.
  - `podium.js` - Winners' podium reveal and confetti.

## Add Questions

Edit `questions.js` and add another object inside `window.GAME_QUESTIONS`:

```js
{
  question: "Your Question",
  prompt: "We asked 100 people",
  startTeam: 3,
  answers: [
    { answer: "Rare answer", score: 0 },
    { answer: "Another answer", score: 4, aliases: ["Alt spelling", "Short name"] },
    { answer: "Common answer", score: 65 }
  ]
}
```

Remember to place a comma between question objects.

## Question Settings

- `question` - Text displayed on the game board.
- `prompt` - Small text shown above the question.
- `startTeam` - Team that answers first (`1` to `3`).
- `answers` - Accepted answers and their scores.
- `aliases` - Optional extra spellings that count as the same answer (e.g. `aliases: ["Antigua", "Barbuda"]`).

Answers are matched without considering capitalization or punctuation. A typed answer counts if it matches the `answer` text or any entry in its `aliases` list.

## Game Rules

- Three teams play.
- Each team answers twice per question.
- The first pass follows the configured starting-team order.
- The second pass reverses that order, so the starting team answers last.
- Correct answers add their listed score.
- Pointless answers add `0`.
- Incorrect answers add `100`.
- After both passes, the highest answers and pointless/lowest answers are revealed.

### Scoring

- Each question is scored on its own. Raw answer points are shown on the board but
  **reset every question** — they do not carry over.
- When a question ends, the teams are ranked by that question's raw points:
  the team with the **fewest** points earns **1** placement point, the next **2**,
  and the team with the most **3**. (Ties share the better place — e.g. two teams
  tied for fewest both earn `1`, the third earns `3`.)
- Placement points are **hidden during play** and quietly stored.
- After the final question, the placement points are totalled and the team with the
  **lowest total** wins.

## Winners' Podium

When the last question ends, **See Final Podium** opens `podium.html`. The teams are
revealed one at a time, lowest place first, and the team with the **fewest** total
placement points is crowned the winner (center, gold) with confetti. **Play Again**
restarts a fresh game; **Home** returns to the start page.

## Example Turn Orders

- `startTeam: 1` - `1, 2, 3`, then `3, 2, 1`
- `startTeam: 2` - `2, 3, 1`, then `1, 3, 2`

## Undo Answer

**Undo Answer** steps back over the most recent answer so the host can re-enter it after a mistake. It refunds that answer's score and returns to the team that gave it — earlier teams and the earlier pass of the same question are kept. It also works from the results screen, stepping back into play. Pressing it repeatedly walks back one answer at a time.
