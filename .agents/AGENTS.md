# Agent Rules for Card AI India

## Ranking Golden Snapshot Changes
Whenever a change modifies the ranking golden snapshots (`tests/__snapshots__/ranking-golden.test.ts.snap`), the agent must provide a structured table showing the previous and new ranks of each card that changed.

### Example Format:
| Scenario / Query | Card ID | Previous Rank | New Rank | Change |
| :--- | :--- | :--- | :--- | :--- |
| `broad-generic` | `hdfc-infinia-metal` | 4th | 5th | -1 |
| `broad-generic` | `hsbc-travelone` | 6th | 4th | +2 |
