# Scripts Directory

Video scripts and analysis tools for a dark history YouTube channel focused on maritime disasters, Arctic expeditions, and historical tragedies.

## Scripts

Located in `scripts/` directory.

## Documentation

| File | Purpose |
|------|---------|
| `analysis.md` | Raw analytics data. "What the numbers say." |
| `channel-strategy.md` | Strategy, learnings, scriptwriting principles. "What to do about it." |
| `personas.md` | Three viewer personas for script analysis. |
| `style-guide.md` | Writing voice and rhythm guidelines. |
| `retention.md` | Line-by-line retention analysis. What causes drops vs holds. |

**When to reference each doc:**
- **Analyzing performance / pulling data** → Read `analysis.md`
- **Writing, editing, or ideating scripts** → Read `personas.md`, `channel-strategy.md`, `style-guide.md`, and `retention.md`
- **Updating after a data pull** → Update both `analysis.md` (raw data) and `channel-strategy.md` (learnings)
- **Understanding why viewers leave** → Read `retention.md`

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
node analytics/yt-analytics.js all --save          # Stats for all videos (includes retention)
node analytics/yt-analytics.js video <ID> --save   # Single video stats (includes retention)
```

Data stored in `analytics/data/analytics.db`. Retention curves are fetched automatically.

**Retention Analyzer** — Map retention curves to script content:
```bash
node analytics/retention-analyzer.js <video_id> <script_path>
```

**Note:** Impressions/CTR not available via API — only in YouTube Studio.
