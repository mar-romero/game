---
name: game-balance
description: Tune and evaluate Factory Wars balance with reproducible seeds and explicit simulator limitations.
---

# Game balance and simulation

Use for economy, unit/building values, bot behavior, win rates, league tuning, and balance regressions.

1. Define the metric and target population before changing values (for example win rate by civilization, duration, resource curve, or bot matchup).
2. Identify whether the run uses the real `Match` engine, browser interaction harness, or approximate Python simulator. Never mix their results without stating the model gap.
3. Use fixed seeds and compare baseline against candidate on the same settings. Expand seeds/matchups enough to avoid drawing conclusions from a single run.
4. Check for regressions in all relevant factions, strategies, and early/mid/late game; inspect distributions as well as averages.
5. Keep balance tuning separate from structural refactoring and report command, seed range, metric, result, and limitations.
