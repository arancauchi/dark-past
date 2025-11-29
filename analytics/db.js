const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'analytics.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  -- Channel snapshots (one per day)
  CREATE TABLE IF NOT EXISTS channel_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT NOT NULL,
    date TEXT NOT NULL DEFAULT (date('now')),
    title TEXT,
    subscribers INTEGER,
    total_views INTEGER,
    video_count INTEGER,
    fetched_at TEXT DEFAULT (datetime('now')),
    UNIQUE(channel_id, date)
  );

  -- Videos metadata
  CREATE TABLE IF NOT EXISTS videos (
    video_id TEXT PRIMARY KEY,
    title TEXT,
    published_at TEXT,
    duration TEXT,
    description TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- Video snapshots (point-in-time stats, one per video per day)
  CREATE TABLE IF NOT EXISTS video_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id TEXT NOT NULL,
    date TEXT NOT NULL DEFAULT (date('now')),
    view_count INTEGER,
    like_count INTEGER,
    comment_count INTEGER,
    fetched_at TEXT DEFAULT (datetime('now')),
    UNIQUE(video_id, date),
    FOREIGN KEY (video_id) REFERENCES videos(video_id)
  );

  -- Daily video stats from analytics API
  CREATE TABLE IF NOT EXISTS video_daily_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id TEXT NOT NULL,
    date TEXT NOT NULL,
    views INTEGER,
    estimated_minutes_watched REAL,
    average_view_duration REAL,
    average_view_percentage REAL,
    subscribers_gained INTEGER,
    likes INTEGER,
    comments INTEGER,
    shares INTEGER,
    fetched_at TEXT DEFAULT (datetime('now')),
    UNIQUE(video_id, date),
    FOREIGN KEY (video_id) REFERENCES videos(video_id)
  );

  -- Video period summary stats (aggregate for a date range)
  CREATE TABLE IF NOT EXISTS video_period_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id TEXT NOT NULL,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    views INTEGER,
    estimated_minutes_watched REAL,
    average_view_duration REAL,
    average_view_percentage REAL,
    subscribers_gained INTEGER,
    likes INTEGER,
    comments INTEGER,
    shares INTEGER,
    impressions INTEGER,
    ctr REAL,
    fetched_at TEXT DEFAULT (datetime('now')),
    UNIQUE(video_id, period_start, period_end),
    FOREIGN KEY (video_id) REFERENCES videos(video_id)
  );

  -- Traffic sources
  CREATE TABLE IF NOT EXISTS video_traffic_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id TEXT NOT NULL,
    source_type TEXT NOT NULL,
    views INTEGER,
    estimated_minutes_watched REAL,
    period_start TEXT,
    period_end TEXT,
    fetched_at TEXT DEFAULT (datetime('now')),
    UNIQUE(video_id, source_type, period_start, period_end),
    FOREIGN KEY (video_id) REFERENCES videos(video_id)
  );

  -- Demographics
  CREATE TABLE IF NOT EXISTS video_demographics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id TEXT NOT NULL,
    age_group TEXT,
    gender TEXT,
    viewer_percentage REAL,
    period_start TEXT,
    period_end TEXT,
    fetched_at TEXT DEFAULT (datetime('now')),
    UNIQUE(video_id, age_group, gender, period_start, period_end),
    FOREIGN KEY (video_id) REFERENCES videos(video_id)
  );

  -- Geography
  CREATE TABLE IF NOT EXISTS video_geography (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id TEXT NOT NULL,
    country TEXT NOT NULL,
    views INTEGER,
    estimated_minutes_watched REAL,
    period_start TEXT,
    period_end TEXT,
    fetched_at TEXT DEFAULT (datetime('now')),
    UNIQUE(video_id, country, period_start, period_end),
    FOREIGN KEY (video_id) REFERENCES videos(video_id)
  );

  -- Retention curve data
  CREATE TABLE IF NOT EXISTS video_retention (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id TEXT NOT NULL,
    elapsed_ratio REAL NOT NULL,
    audience_watch_ratio REAL,
    relative_retention_performance REAL,
    fetched_at TEXT DEFAULT (datetime('now')),
    UNIQUE(video_id, elapsed_ratio),
    FOREIGN KEY (video_id) REFERENCES videos(video_id)
  );

  -- CTR data
  CREATE TABLE IF NOT EXISTS video_ctr (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id TEXT NOT NULL,
    date TEXT,
    impressions INTEGER,
    ctr REAL,
    fetched_at TEXT DEFAULT (datetime('now')),
    UNIQUE(video_id, date),
    FOREIGN KEY (video_id) REFERENCES videos(video_id)
  );

  -- Channel daily stats
  CREATE TABLE IF NOT EXISTS channel_daily_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT NOT NULL,
    date TEXT NOT NULL,
    views INTEGER,
    estimated_minutes_watched REAL,
    average_view_duration REAL,
    average_view_percentage REAL,
    subscribers_gained INTEGER,
    subscribers_lost INTEGER,
    likes INTEGER,
    comments INTEGER,
    shares INTEGER,
    fetched_at TEXT DEFAULT (datetime('now')),
    UNIQUE(channel_id, date)
  );

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_video_snapshots_video_id ON video_snapshots(video_id);
  CREATE INDEX IF NOT EXISTS idx_video_daily_stats_video_id ON video_daily_stats(video_id);
  CREATE INDEX IF NOT EXISTS idx_video_daily_stats_date ON video_daily_stats(date);
`);

// Prepared statements
const stmts = {
  upsertChannelSnapshot: db.prepare(`
    INSERT INTO channel_snapshots (channel_id, date, title, subscribers, total_views, video_count)
    VALUES (?, date('now'), ?, ?, ?, ?)
    ON CONFLICT(channel_id, date) DO UPDATE SET
      title = excluded.title,
      subscribers = excluded.subscribers,
      total_views = excluded.total_views,
      video_count = excluded.video_count,
      fetched_at = datetime('now')
  `),

  upsertVideo: db.prepare(`
    INSERT INTO videos (video_id, title, published_at, duration, description, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(video_id) DO UPDATE SET
      title = excluded.title,
      duration = excluded.duration,
      description = excluded.description,
      updated_at = datetime('now')
  `),

  upsertVideoSnapshot: db.prepare(`
    INSERT INTO video_snapshots (video_id, date, view_count, like_count, comment_count)
    VALUES (?, date('now'), ?, ?, ?)
    ON CONFLICT(video_id, date) DO UPDATE SET
      view_count = excluded.view_count,
      like_count = excluded.like_count,
      comment_count = excluded.comment_count,
      fetched_at = datetime('now')
  `),

  upsertVideoDailyStats: db.prepare(`
    INSERT INTO video_daily_stats (video_id, date, views, estimated_minutes_watched, average_view_duration, average_view_percentage, subscribers_gained, likes, comments, shares)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(video_id, date) DO UPDATE SET
      views = excluded.views,
      estimated_minutes_watched = excluded.estimated_minutes_watched,
      average_view_duration = excluded.average_view_duration,
      average_view_percentage = excluded.average_view_percentage,
      subscribers_gained = excluded.subscribers_gained,
      likes = excluded.likes,
      comments = excluded.comments,
      shares = excluded.shares,
      fetched_at = datetime('now')
  `),

  upsertVideoPeriodStats: db.prepare(`
    INSERT INTO video_period_stats (video_id, period_start, period_end, views, estimated_minutes_watched, average_view_duration, average_view_percentage, subscribers_gained, likes, comments, shares, impressions, ctr)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(video_id, period_start, period_end) DO UPDATE SET
      views = excluded.views,
      estimated_minutes_watched = excluded.estimated_minutes_watched,
      average_view_duration = excluded.average_view_duration,
      average_view_percentage = excluded.average_view_percentage,
      subscribers_gained = excluded.subscribers_gained,
      likes = excluded.likes,
      comments = excluded.comments,
      shares = excluded.shares,
      impressions = excluded.impressions,
      ctr = excluded.ctr,
      fetched_at = datetime('now')
  `),

  upsertVideoTrafficSource: db.prepare(`
    INSERT INTO video_traffic_sources (video_id, source_type, views, estimated_minutes_watched, period_start, period_end)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(video_id, source_type, period_start, period_end) DO UPDATE SET
      views = excluded.views,
      estimated_minutes_watched = excluded.estimated_minutes_watched,
      fetched_at = datetime('now')
  `),

  upsertVideoDemographics: db.prepare(`
    INSERT INTO video_demographics (video_id, age_group, gender, viewer_percentage, period_start, period_end)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(video_id, age_group, gender, period_start, period_end) DO UPDATE SET
      viewer_percentage = excluded.viewer_percentage,
      fetched_at = datetime('now')
  `),

  upsertVideoGeography: db.prepare(`
    INSERT INTO video_geography (video_id, country, views, estimated_minutes_watched, period_start, period_end)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(video_id, country, period_start, period_end) DO UPDATE SET
      views = excluded.views,
      estimated_minutes_watched = excluded.estimated_minutes_watched,
      fetched_at = datetime('now')
  `),

  upsertVideoRetention: db.prepare(`
    INSERT INTO video_retention (video_id, elapsed_ratio, audience_watch_ratio, relative_retention_performance)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(video_id, elapsed_ratio) DO UPDATE SET
      audience_watch_ratio = excluded.audience_watch_ratio,
      relative_retention_performance = excluded.relative_retention_performance,
      fetched_at = datetime('now')
  `),

  upsertVideoCtr: db.prepare(`
    INSERT INTO video_ctr (video_id, date, impressions, ctr)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(video_id, date) DO UPDATE SET
      impressions = excluded.impressions,
      ctr = excluded.ctr,
      fetched_at = datetime('now')
  `),

  updatePeriodStatsCtr: db.prepare(`
    UPDATE video_period_stats
    SET impressions = ?, ctr = ?, fetched_at = datetime('now')
    WHERE video_id = ? AND period_start = ? AND period_end = ?
  `),

  upsertChannelDailyStats: db.prepare(`
    INSERT INTO channel_daily_stats (channel_id, date, views, estimated_minutes_watched, average_view_duration, average_view_percentage, subscribers_gained, subscribers_lost, likes, comments, shares)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(channel_id, date) DO UPDATE SET
      views = excluded.views,
      estimated_minutes_watched = excluded.estimated_minutes_watched,
      average_view_duration = excluded.average_view_duration,
      average_view_percentage = excluded.average_view_percentage,
      subscribers_gained = excluded.subscribers_gained,
      subscribers_lost = excluded.subscribers_lost,
      likes = excluded.likes,
      comments = excluded.comments,
      shares = excluded.shares,
      fetched_at = datetime('now')
  `),
};

function saveChannelStats(data) {
  const { channel, period, dailyStats } = data;

  // Save channel snapshot (one per day)
  stmts.upsertChannelSnapshot.run(
    channel.id,
    channel.title,
    parseInt(channel.subscribers) || 0,
    parseInt(channel.totalViews) || 0,
    parseInt(channel.videoCount) || 0
  );

  // Save daily stats
  if (dailyStats.rows) {
    for (const row of dailyStats.rows) {
      // row: [day, views, estimatedMinutesWatched, averageViewDuration, averageViewPercentage, subscribersGained, subscribersLost, likes, comments, shares]
      stmts.upsertChannelDailyStats.run(
        channel.id,
        row[0], // date
        row[1], // views
        row[2], // estimatedMinutesWatched
        row[3], // averageViewDuration
        row[4], // averageViewPercentage
        row[5], // subscribersGained
        row[6], // subscribersLost
        row[7], // likes
        row[8], // comments
        row[9]  // shares
      );
    }
  }

  return { saved: true, channelId: channel.id };
}

function saveVideoStats(data) {
  const { video, period, summary, dailyStats, trafficSources, demographics, geography } = data;

  if (data.error) {
    return { saved: false, error: data.error };
  }

  // Save video metadata
  stmts.upsertVideo.run(
    video.id,
    video.title,
    video.publishedAt,
    video.duration,
    null // description not in stats response
  );

  // Save video snapshot (one per day)
  stmts.upsertVideoSnapshot.run(
    video.id,
    parseInt(video.viewCount) || 0,
    parseInt(video.likeCount) || 0,
    parseInt(video.commentCount) || 0
  );

  // Save period summary stats
  if (summary && summary.rows && summary.rows.length > 0) {
    const row = summary.rows[0];
    // row: [views, estimatedMinutesWatched, averageViewDuration, averageViewPercentage, subscribersGained, likes, comments, shares]
    stmts.upsertVideoPeriodStats.run(
      video.id,
      period.start,
      period.end,
      row[0], // views
      row[1], // estimatedMinutesWatched
      row[2], // averageViewDuration
      row[3], // averageViewPercentage
      row[4], // subscribersGained
      row[5], // likes
      row[6], // comments
      row[7], // shares
      null,   // impressions (added via CTR data)
      null    // ctr (added via CTR data)
    );
  }

  // Save daily stats
  if (dailyStats.rows) {
    for (const row of dailyStats.rows) {
      // row: [day, views, estimatedMinutesWatched, averageViewDuration, averageViewPercentage, subscribersGained, likes, comments, shares]
      stmts.upsertVideoDailyStats.run(
        video.id,
        row[0], // date
        row[1], // views
        row[2], // estimatedMinutesWatched
        row[3], // averageViewDuration
        row[4], // averageViewPercentage
        row[5], // subscribersGained
        row[6], // likes
        row[7], // comments
        row[8]  // shares
      );
    }
  }

  // Save traffic sources
  if (trafficSources.rows) {
    for (const row of trafficSources.rows) {
      // row: [sourceType, views, estimatedMinutesWatched]
      stmts.upsertVideoTrafficSource.run(
        video.id,
        row[0], // sourceType
        row[1], // views
        row[2], // estimatedMinutesWatched
        period.start,
        period.end
      );
    }
  }

  // Save demographics
  if (demographics.rows) {
    for (const row of demographics.rows) {
      // row: [ageGroup, gender, viewerPercentage]
      stmts.upsertVideoDemographics.run(
        video.id,
        row[0], // ageGroup
        row[1], // gender
        row[2], // viewerPercentage
        period.start,
        period.end
      );
    }
  }

  // Save geography
  if (geography.rows) {
    for (const row of geography.rows) {
      // row: [country, views, estimatedMinutesWatched]
      stmts.upsertVideoGeography.run(
        video.id,
        row[0], // country
        row[1], // views
        row[2], // estimatedMinutesWatched
        period.start,
        period.end
      );
    }
  }

  return { saved: true, videoId: video.id };
}

function saveRetentionData(data) {
  if (data.error) {
    return { saved: false, error: data.error };
  }

  const { videoId, retentionCurve } = data;

  if (retentionCurve.rows) {
    for (const row of retentionCurve.rows) {
      // row: [elapsedVideoTimeRatio, audienceWatchRatio, relativeRetentionPerformance]
      stmts.upsertVideoRetention.run(
        videoId,
        row[0], // elapsedRatio
        row[1], // audienceWatchRatio
        row[2]  // relativeRetentionPerformance
      );
    }
  }

  return { saved: true, videoId };
}

function saveCtrData(data) {
  if (data.error) {
    return { saved: false, error: data.error };
  }

  const { videoId, period, daily } = data;

  // Save daily CTR data
  if (daily && daily.rows) {
    for (const row of daily.rows) {
      // row: [day, impressions, ctr]
      stmts.upsertVideoCtr.run(
        videoId,
        row[0], // date
        row[1], // impressions
        row[2]  // ctr
      );
    }
  }

  // Save summary CTR to period stats
  if (data.summary && data.summary.rows && data.summary.rows.length > 0) {
    const row = data.summary.rows[0];
    // Update period stats with impressions and CTR
    if (period) {
      stmts.updatePeriodStatsCtr.run(
        row[0], // impressions
        row[1], // ctr
        videoId,
        period.start,
        period.end
      );
    }
    // Also save to video_ctr table with null date for summary
    stmts.upsertVideoCtr.run(
      videoId,
      null,   // no specific date (summary)
      row[0], // impressions
      row[1]  // ctr
    );
  }

  return { saved: true, videoId };
}

function saveVideoList(videos) {
  for (const v of videos) {
    stmts.upsertVideo.run(
      v.videoId,
      v.title,
      v.publishedAt,
      null, // duration not in list response
      v.description
    );
  }
  return { saved: true, count: videos.length };
}

module.exports = {
  db,
  saveChannelStats,
  saveVideoStats,
  saveRetentionData,
  saveCtrData,
  saveVideoList,
};
