# Pointless Team Game

A local browser-based team quiz inspired by *Pointless*. Teams try to find correct answers with the lowest possible scores.

## Start the Game

1. Keep all project files in the same folder.
2. Open `home.html` in a browser.
3. Click **Start The Game**.

You can also open `Pointless.html` directly.

No server or installation is required.

## Project Files

- `home.html` - Start page.
- `Pointless.html` - Main game page.
- `podium.html` - Winners' podium shown after the last question.
- `questions.js` - Questions and answers. Edit this file to change the quiz.
- `css/` - Stylesheets, split by area:
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
- Team totals continue into the next question.
- After both passes, the highest answers and pointless/lowest answers are revealed.
- After the final question, the game moves to the winners' podium.

## Winners' Podium

When the last question ends, **See Final Podium** opens `podium.html`. The teams are
revealed one at a time, lowest place first, and the team with the **fewest** total
points is crowned the winner (center, gold) with confetti. **Play Again** restarts a
fresh game; **Home** returns to the start page.

## Example Turn Orders

- `startTeam: 1` - `1, 2, 3`, then `3, 2, 1`
- `startTeam: 2` - `2, 3, 1`, then `1, 3, 2`

## Reset Round

**Reset Round** restarts the current question and removes only points earned during that question. Scores from previous questions remain.
