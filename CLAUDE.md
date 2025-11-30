# Scripts Directory

Video scripts and analysis tools for a dark history YouTube channel focused on maritime disasters, Arctic expeditions, and historical tragedies.

## Scripts

| File | Topic | Status |
|------|-------|--------|
| `tromelin.md` | Abandoned slaves, 15 years on island | Draft 2 (optimized) |
| `greely.md` | Arctic expedition cannibalism | Ready to record |
| `medusa.md` | Raft of the Medusa shipwreck | Published (35% retention) |
| `kabul.md` | British Army of the Indus disaster | Published (27% retention) |
| `soviets.md` | Soviet space disasters | Published (52% retention, 641K views) |
| `boyd.md` | Boyd massacre / cannibalism | Published (34% retention, 1.6M views) |

## Documentation

| File | Purpose |
|------|---------|
| `analysis.md` | Raw analytics data. "What the numbers say." |
| `channel-strategy.md` | Strategy, learnings, scriptwriting principles. "What to do about it." |
| `personas.md` | Three viewer personas for script analysis. |
| `style-guide.md` | Writing voice and rhythm guidelines. |

**When to reference each doc:**
- **Analyzing performance / pulling data** → Read `analysis.md`
- **Writing, editing, or ideating scripts** → Read `personas.md`, `channel-strategy.md`, and `style-guide.md`
- **Updating after a data pull** → Update both `analysis.md` (raw data) and `channel-strategy.md` (learnings)

## Workflow

1. Write script
2. Run through persona lens (would each persona still be watching?)
3. Check hook density (one every 60-90 seconds)
4. Score against scorecard in channel-strategy.md (target 35+/40)
5. Record and publish
6. Pull analytics: `node analytics/yt-analytics.js all --save`
7. Update analysis.md and channel-strategy.md with learnings

## Analytics CLI

```bash
node analytics/yt-analytics.js channel --save      # Channel stats
node analytics/yt-analytics.js videos --save       # List all videos
node analytics/yt-analytics.js all --save          # Stats for all videos
node analytics/yt-analytics.js video <ID> --save   # Single video stats
node analytics/yt-analytics.js video <ID> --retention --save  # With retention curve
```

Data stored in `analytics/data/analytics.db`

**Note:** Impressions/CTR not available via API — only in YouTube Studio.
