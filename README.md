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
- `style.css` - Game design and layout.
- `script.js` - Game behavior, scoring, and turns.
- `questions.js` - Questions and answers. Edit this file to change the quiz.

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
- `startTeam` - Team that answers first (`1` to `4`).
- `answers` - Accepted answers and their scores.
- `aliases` - Optional extra spellings that count as the same answer (e.g. `aliases: ["Antigua", "Barbuda"]`).

Answers are matched without considering capitalization or punctuation. A typed answer counts if it matches the `answer` text or any entry in its `aliases` list.

## Game Rules

- Four teams play.
- Each team answers twice per question.
- The first pass follows the configured starting-team order.
- The second pass reverses that order, so the starting team answers last.
- Correct answers add their listed score.
- Pointless answers add `0`.
- Incorrect answers add `100`.
- Team totals continue into the next question.
- After both passes, the highest answers and pointless/lowest answers are revealed.

## Example Turn Orders

- `startTeam: 1` - `1, 2, 3, 4`, then `4, 3, 2, 1`
- `startTeam: 2` - `2, 3, 4, 1`, then `1, 4, 3, 2`

## Reset Round

**Reset Round** restarts the current question and removes only points earned during that question. Scores from previous questions remain.
