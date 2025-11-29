# YouTube Analytics Data Log

Running document tracking channel metrics from YouTube Analytics API. Data informs strategy decisions in `channel-strategy.md`.

---

## Data Pull: 2025-11-29

### Channel Overview

| Metric | Value |
|--------|-------|
| Total lifetime views | 2.34M |
| Videos analyzed | 8 |
| Data period | Nov 1-29, 2025 |

---

### Video Performance Summary

| Video | Length | Total Views | Nov Views | Retention | AVD |
|-------|--------|-------------|-----------|-----------|-----|
| Boyd (Cannibals) | 11:28 | 1,623,899 | 1,071 | 34.1% | 3.9 min |
| Soviet Space | 10:36 | 641,228 | 27 | 52.1% | 5.5 min |
| Shipwreck Massacre | 14:44 | 23,793 | 104 | 30.2% | 4.5 min |
| Desert Expedition | 12:52 | 21,463 | 86 | 40.4% | 5.2 min |
| NASA Disaster | 9:47 | 19,889 | 50 | 34.9% | 3.4 min |
| WW1 Tank Crew | 6:36 | 6,225 | 30 | **65.8%** | 4.3 min |
| Kabul (Afghan) | 14:50 | 1,775 | 1,772 | 27.2% | 4.0 min |
| Medusa (Raft) | 9:56 | 62 | 0 | - | - |

**Key observation:** Shorter videos retain dramatically better (65.8% at 6min vs 27% at 14min). Sweet spot appears to be 9-11 minutes.

---

### Traffic Sources (Channel-Wide)

| Source | Views | % of Total | Mins/View |
|--------|-------|------------|-----------|
| SUBSCRIBER | 2,137 | **68.1%** | 3.9 |
| YT_SEARCH | 319 | 10.2% | 3.5 |
| RELATED_VIDEO | 244 | 7.8% | 4.9 |
| YT_CHANNEL | 149 | 4.7% | 4.2 |
| NO_LINK_OTHER | 94 | 3.0% | 4.0 |
| EXT_URL | 75 | 2.4% | 3.7 |
| YT_OTHER_PAGE | 56 | 1.8% | 5.9 |
| PLAYLIST | 36 | 1.1% | 4.5 |
| NOTIFICATION | 16 | 0.5% | 6.0 |
| END_SCREEN | 14 | 0.4% | **10.1** |

**Key observation:** 68% subscriber-dependent. End screen and notification traffic watches longest. Search traffic bounces fastest.

---

### Traffic Sources by Video

| Video | Subscriber | Search | Related | External |
|-------|------------|--------|---------|----------|
| Kabul | **93.3%** | 0.8% | 0.8% | 0.2% |
| Soviet | 66.7% | 11.1% | 7.4% | 3.7% |
| Boyd | 41.8% | 22.7% | 17.8% | 1.0% |
| NASA | 10.0% | 18.0% | 14.0% | 36.0% |
| Shipwreck | 8.7% | 18.3% | 8.7% | 15.4% |
| Desert | 4.7% | 23.3% | 23.3% | 24.4% |
| WW1 Tank | - | 36.7% | 3.3% | 13.3% |

**Key observation:** Boyd has healthiest traffic mix (only 42% subscriber). Kabul is 93% subscriber-dependent — no external discovery.

---

### Demographics

| Age Group | Gender | % of Audience |
|-----------|--------|---------------|
| 65+ | Male | 33.8% |
| 55-64 | Male | 22.5% |
| 25-34 | Male | 20.3% |
| 35-44 | Male | 12.7% |
| 45-54 | Male | 10.7% |

**Key observation:** 100% male. 56% over age 55. Older viewers more patient but algorithm tests with younger demos.

---

### Geography

| Country | Views | Avg Watch | % of Total |
|---------|-------|-----------|------------|
| US | 911 | 4.3 min | 58% |
| India | 132 | 3.0 min | 8% |
| UK | 127 | **4.7 min** | 8% |
| Canada | 108 | 4.1 min | 7% |
| Germany | 72 | 3.7 min | 5% |
| Australia | 55 | 2.4 min | 4% |
| New Zealand | 44 | 4.4 min | 3% |
| Poland | 38 | **0.6 min** | 2% |

**Key observation:** UK viewers watch longest. India has volume but low engagement. Poland bounces hard (wrong audience).

---

### Engagement Rates

| Video | Like Rate | Subs/1K Views | Comments/1K |
|-------|-----------|---------------|-------------|
| WW1 Tank | **10.0%** | 0.0 | 0.0 |
| Medusa | 16.1% | - | 16.1 |
| Kabul | 3.5% | **14.7** | 5.6 |
| Desert | 3.5% | 11.6 | 0.0 |
| NASA | 4.0% | 0.0 | 0.0 |
| Shipwreck | 2.9% | **19.2** | 0.0 |
| Soviet | 1.6% | 37.0 | 0.0 |
| Boyd | 1.2% | 9.3 | 1.4 |

**Key observation:** High retention = high engagement (WW1 Tank 10% like rate). Kabul/Shipwreck convert subscribers best despite lower retention.

---

### Evergreen Analysis

| Video | Age | Nov Views | Daily Avg | Status |
|-------|-----|-----------|-----------|--------|
| Boyd | 3 years | 1,071 | **38.3** | Evergreen |
| Shipwreck | 15 months | 104 | 3.7 | Slow decay |
| Desert | 2.8 years | 86 | 3.1 | Flatlined |
| NASA | 2.8 years | 50 | 1.8 | Flatlined |
| WW1 Tank | 2.8 years | 30 | 1.1 | Flatlined |
| Soviet | 2.8 years | 27 | **1.0** | Dead |

**Key observation:** Only Boyd is evergreen (38 views/day after 3 years). Soviet went from 600K to 1 view/day — algorithm-driven, no search tail.

---

### Kabul Algorithm Spike (Case Study)

Daily breakdown showing what happens when algorithm pushes to cold audience:

| Date | Views | AVD | Retention | Notes |
|------|-------|-----|-----------|-------|
| Nov 18 (launch) | 90 | 5.8 min | **39.3%** | Subscribers |
| Nov 19 | 130 | 3.8 min | 25.5% | Mixed |
| Nov 20 (spike) | **1,156** | 3.6 min | **24.2%** | Algorithm browse |
| Nov 21 | 294 | 4.8 min | 32.6% | Decay |
| Nov 22 | 58 | 5.0 min | 33.7% | Organic |
| Nov 23 | 26 | 7.1 min | **48.2%** | Organic |
| Nov 24 | 8 | 7.1 min | 47.7% | Organic |
| Nov 25 | 4 | 4.6 min | 30.7% | Organic |
| Nov 26 | 6 | 3.4 min | 23.1% | Organic |

**Key observation:**
- Subscribers retained at 39% (day 1)
- Algorithm cold traffic retained at 24% (day 3)
- Organic searchers retained at 48% (day 5-6)
- The opening fails strangers, not the content

---

### Boyd Daily Performance (Evergreen Baseline)

| Date | Views | Retention | AVD |
|------|-------|-----------|-----|
| Nov 1 | 49 | 27.5% | 3.1 min |
| Nov 2 | 66 | 28.6% | 3.3 min |
| Nov 3 | 37 | 43.2% | 5.0 min |
| Nov 10 | 28 | 31.1% | 3.6 min |
| Nov 17 | 27 | 41.2% | 4.7 min |
| Nov 24 | 93 | 32.8% | 3.8 min |
| Nov 26 | 59 | 32.8% | 3.8 min |

**Key observation:** Steady 30-60 views/day with 30-43% retention. Consistent baseline from search traffic ("cannibals" keyword).

---

### Soviet Daily Performance (Dead Video)

| Date | Views | Retention | AVD |
|------|-------|-----------|-----|
| Nov 1-20 | 0 | - | - |
| Nov 21 | 3 | 62.7% | 6.6 min |
| Nov 22 | 12 | 51.4% | 5.5 min |
| Nov 23 | 6 | 50.1% | 5.3 min |
| Nov 24 | 2 | 38.7% | 4.1 min |
| Nov 25 | 3 | 41.2% | 4.4 min |
| Nov 26 | 1 | 99.5% | 10.5 min |

**Key observation:** Zero views for 20 days, then trickle. High retention when found (50%+) but no discovery path. Confirms algorithm-dependent, not search-driven.

---

### Retention vs Length Correlation

| Length Bucket | Avg Retention | Videos |
|---------------|---------------|--------|
| 6-7 min | 65.8% | WW1 Tank |
| 9-11 min | 40.4% | Soviet, Boyd, NASA, Medusa |
| 12-15 min | 32.5% | Kabul, Shipwreck, Desert |

**Key observation:** Every additional minute costs ~3-4% retention. 14-min videos retain half as well as 6-min videos.

---

## Data Schema Reference

Database: `analytics/data/analytics.db`

Key tables:
- `videos` - Video metadata (title, duration, published_at)
- `video_snapshots` - Daily view/like/comment counts
- `video_daily_stats` - Per-day metrics (views, AVD, retention, engagement)
- `video_period_stats` - Aggregate metrics for date range
- `video_traffic_sources` - Traffic source breakdown
- `video_demographics` - Age/gender breakdown
- `video_geography` - Country breakdown
- `channel_snapshots` - Channel-level daily stats

---

## Changelog

- **2025-11-29**: Initial data pull
  - 8 videos analyzed
  - Traffic sources, demographics, geography captured
  - Kabul spike case study documented
  - Retention vs length correlation calculated
