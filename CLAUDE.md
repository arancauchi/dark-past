# Scripts Directory

This directory contains video scripts and analysis tools for a dark history YouTube channel focused on maritime disasters, Arctic expeditions, and historical tragedies.

## Goal

Optimize video scripts for retention by understanding what makes viewers stay or leave. The channel has experienced stagnation despite quality content — the problem is often structural (where content is placed) rather than quality (what the content is).

## Scripts

| File | Topic | Status |
|------|-------|--------|
| `greely.md` | Arctic expedition cannibalism | Ready to record (optimized) |
| `medusa.md` | Raft of the Medusa shipwreck | Published, monitoring |
| `kabul.md` | British Army of the Indus disaster | Published (27% retention) |
| `soviets.md` | Soviet space disasters | Published (600K views, ~52% retention) |
| `boyd.md` | Boyd massacre / cannibalism | Published (1.6M views) |

## Documentation Structure

### `analysis.md` — Data Log

Running document of **quantitative metrics** from YouTube Analytics API. Updated after each data pull.

Contains:
- Video performance tables (views, retention, AVD)
- Traffic source breakdowns (subscriber vs search vs suggested)
- Demographics and geography data
- Daily performance snapshots
- Case studies (e.g., Kabul algorithm spike)
- Data schema reference for querying the SQLite database

**Purpose:** Raw data and observations. "What the numbers say."

### `channel-strategy.md` — Strategy & Learnings

Strategic document combining **data insights + qualitative analysis**.

Contains:
- Part 1: Channel diagnosis and strategic recommendations
- Part 2: Video-by-video learnings (what worked, what didn't)
- Part 3: Scriptwriting principles (cold opens, villain/victim, hooks, structure)
- Video scorecard for pre-recording evaluation
- Success metrics and goals

**Purpose:** Actionable strategy. "What to do about it."

### `personas.md` — Viewer Personas

Three viewer personas for script analysis:

1. **Morbid Curiosity Viewer** — The largest segment. Clicked for horror, wants visceral details. Will leave in first 2-3 minutes if horror is delayed. Optimize for them first.

2. **History Buff** — Smaller but loyal. Wants accuracy and context. More forgiving of slow setup. Will fact-check you.

3. **Story Lover** — Needs characters to root for. Wants emotional arc, clear villain, satisfying ending. Overlaps with morbid curiosity.

## Key Concepts

### Hook Density
Target one hook every 60-90 seconds:
- **Forward hooks**: Tease what's coming ("By the end, the knife marks would tell a different story")
- **Emphasis hooks**: Underline what happened ("They killed them for the wine")

### Villain/Victim Dynamics
Clear villain + sympathetic victim = engagement. The villain must:
- Do something cruel we SEE (not just hear about)
- Have a specific victim we care about
- Face consequences (or not — which creates outrage)

### Structure
- **Frame structure** (strong): Open with horror, tell story, return to horror
- **Chronological** (weak): Events in order, best content often buried at end
- **Listicle** (strong): Built-in "what's #1?" curiosity, fresh starts prevent fatigue

### The Dying Accusation
Most powerful emotional beat: victim explicitly blaming villain with their last breath while loved ones listen (see Komarov in soviets.md).

## Workflow

1. Write script
2. Run through persona lens (would each persona still be watching at each section?)
3. Check hook density (one every 60-90 seconds)
4. Score against scorecard in channel-strategy.md (target 35+/40)
5. Record and publish
6. Pull analytics data: `node analytics/yt-analytics.js all --save`
7. Update analysis.md with new data
8. Update channel-strategy.md with learnings

## Critical Insight

**Don't bury your best content.** If your climax is at minute 10, most viewers will never see it. Open with the most compelling moment, then explain how it happened.

## Analytics Tool

### `analytics/yt-analytics.js`

CLI tool that pulls YouTube Analytics data and stores it in SQLite for analysis.

**Setup:**
- Requires OAuth credentials in `analytics/.env` (CLIENT_ID, CLIENT_SECRET)
- Data stored in `analytics/data/analytics.db`

**Commands:**
```bash
node yt-analytics.js channel --save      # Channel stats + daily metrics
node yt-analytics.js videos --save       # List all videos
node yt-analytics.js all --save          # Stats for all public videos
node yt-analytics.js video <ID> --save   # Stats for specific video
node yt-analytics.js video <ID> --retention --save  # Include retention curve
```

**What it stores:**
- Channel snapshots (subscribers, views, video count per day)
- Video snapshots (view/like/comment counts per day)
- Daily video stats (views, AVD, retention %, subs gained, likes, comments, shares)
- Period summaries (aggregate stats for date range)
- Traffic sources, demographics, geography
- Retention curves (with --retention flag)

**Database location:** `analytics/data/analytics.db`

**Querying examples:**
```sql
-- Retention by video
SELECT title, average_view_percentage FROM video_period_stats
JOIN videos USING(video_id) ORDER BY average_view_percentage DESC;

-- Daily performance for a video
SELECT date, views, average_view_duration/60.0 as avd_min
FROM video_daily_stats WHERE video_id = 'xxx';

-- Subscriber growth over time
SELECT date, subscribers FROM channel_snapshots ORDER BY date;
```

**Note:** Impressions/CTR are NOT available via YouTube API (blocked by Google). Only visible in YouTube Studio.
