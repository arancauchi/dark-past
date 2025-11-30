#!/usr/bin/env node
/**
 * Retention Analyzer
 * Maps YouTube retention curves to script content line-by-line
 *
 * Usage: node retention-analyzer.js <video_id> <script_path>
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'data', 'analytics.db');

// Parse ISO 8601 duration (PT10M36S) to seconds
function parseDuration(duration) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
}

// Format seconds as MM:SS
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Parse script into segments with word counts
function parseScript(scriptPath) {
  const content = fs.readFileSync(scriptPath, 'utf8');
  const lines = content.split('\n');

  const segments = [];
  let currentSegment = { lines: [], text: '', startLine: 1 };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Check for section breaks
    if (line.match(/^---+$/) || line.match(/^(ACT \d|INTRO|COLD OPEN|OUTRO|CHAPTER|\d+\.)/i)) {
      if (currentSegment.text.trim()) {
        segments.push(currentSegment);
      }
      currentSegment = {
        lines: [],
        text: '',
        startLine: lineNum,
        header: line.match(/^(ACT|INTRO|COLD OPEN|OUTRO|CHAPTER|\d+\.)/i) ? line : null
      };
    }

    currentSegment.lines.push({ num: lineNum, text: line });
    currentSegment.text += line + ' ';
  }

  if (currentSegment.text.trim()) {
    segments.push(currentSegment);
  }

  // Calculate word counts and estimated timestamps
  const WPM = 155; // Words per minute for narration
  let cumulativeWords = 0;

  for (const seg of segments) {
    const words = seg.text.trim().split(/\s+/).filter(w => w.length > 0).length;
    seg.wordCount = words;
    seg.startWord = cumulativeWords;
    seg.endWord = cumulativeWords + words;
    seg.startTime = (cumulativeWords / WPM) * 60;
    seg.endTime = ((cumulativeWords + words) / WPM) * 60;
    cumulativeWords += words;
  }

  return { segments, totalWords: cumulativeWords };
}

// Get retention data from database
function getRetentionData(db, videoId) {
  const video = db.prepare(`
    SELECT video_id, title, duration
    FROM videos WHERE video_id = ?
  `).get(videoId);

  if (!video) {
    throw new Error(`Video ${videoId} not found`);
  }

  const retention = db.prepare(`
    SELECT elapsed_ratio, audience_watch_ratio, relative_retention_performance
    FROM video_retention
    WHERE video_id = ?
    ORDER BY elapsed_ratio
  `).all(videoId);

  if (retention.length === 0) {
    throw new Error(`No retention data for ${videoId}`);
  }

  return { video, retention };
}

// Find script content at a given timestamp
function findContentAtTime(segments, timeSeconds) {
  for (const seg of segments) {
    if (timeSeconds >= seg.startTime && timeSeconds < seg.endTime) {
      // Find approximate line within segment
      const segProgress = (timeSeconds - seg.startTime) / (seg.endTime - seg.startTime);
      const lineIndex = Math.floor(segProgress * seg.lines.length);
      return {
        segment: seg,
        line: seg.lines[Math.min(lineIndex, seg.lines.length - 1)],
        header: seg.header
      };
    }
  }
  return null;
}

// Calculate retention changes
function analyzeRetention(retention, durationSec) {
  const analysis = [];

  for (let i = 0; i < retention.length; i++) {
    const point = retention[i];
    const prevPoint = i > 0 ? retention[i - 1] : null;

    const timestamp = point.elapsed_ratio * durationSec;
    const retentionPct = point.audience_watch_ratio * 100;
    const change = prevPoint
      ? (point.audience_watch_ratio - prevPoint.audience_watch_ratio) * 100
      : 0;

    analysis.push({
      pct: Math.round(point.elapsed_ratio * 100),
      timestamp,
      retention: retentionPct,
      change,
      relative: point.relative_retention_performance * 100
    });
  }

  return analysis;
}

// Main analysis function
function analyze(videoId, scriptPath) {
  const db = new Database(DB_PATH, { readonly: true });

  try {
    // Get retention data
    const { video, retention } = getRetentionData(db, videoId);
    const durationSec = parseDuration(video.duration);

    console.log(`\n${'='.repeat(80)}`);
    console.log(`RETENTION ANALYSIS: ${video.title}`);
    console.log(`Duration: ${formatTime(durationSec)} | Data points: ${retention.length}`);
    console.log(`${'='.repeat(80)}\n`);

    // Parse script
    const { segments, totalWords } = parseScript(scriptPath);
    const estimatedDuration = (totalWords / 155) * 60;
    console.log(`Script: ${totalWords} words | Est. duration: ${formatTime(estimatedDuration)}`);
    console.log(`${'─'.repeat(80)}\n`);

    // Analyze retention
    const analysis = analyzeRetention(retention, durationSec);

    // Find significant drops and holds
    const significantPoints = analysis.filter(p =>
      Math.abs(p.change) > 3 || p.pct % 10 === 0 || p.pct <= 5
    );

    // Output detailed analysis
    console.log('DETAILED BREAKDOWN\n');
    console.log('Time     | %Through | Retention | Change  | Script Content');
    console.log('─'.repeat(80));

    let lastHeader = null;

    for (const point of analysis) {
      const content = findContentAtTime(segments, point.timestamp);

      // Show section headers
      if (content?.header && content.header !== lastHeader) {
        console.log(`\n${'─'.repeat(80)}`);
        console.log(`>>> ${content.header}`);
        console.log(`${'─'.repeat(80)}`);
        lastHeader = content.header;
      }

      // Determine if this is a significant point
      const isSignificant = Math.abs(point.change) > 5;
      const isDrop = point.change < -5;
      const isHold = Math.abs(point.change) < 1 && point.pct > 10;

      // Format change indicator
      let changeStr = point.change.toFixed(1).padStart(6);
      if (isDrop) changeStr = `\x1b[31m${changeStr}\x1b[0m`; // Red for drops
      else if (point.change > 2) changeStr = `\x1b[32m${changeStr}\x1b[0m`; // Green for gains

      // Get line preview
      let linePreview = '';
      if (content?.line) {
        linePreview = content.line.text.slice(0, 45);
        if (content.line.text.length > 45) linePreview += '...';
      }

      // Only show every point for first 10%, then significant points
      if (point.pct <= 10 || point.pct % 5 === 0 || Math.abs(point.change) > 3) {
        console.log(
          `${formatTime(point.timestamp).padStart(8)} | ` +
          `${point.pct.toString().padStart(3)}%     | ` +
          `${point.retention.toFixed(1).padStart(5)}%    | ` +
          `${changeStr}% | ` +
          `${linePreview}`
        );
      }
    }

    // Summary of biggest drops
    console.log(`\n${'='.repeat(80)}`);
    console.log('BIGGEST DROPS');
    console.log('─'.repeat(80));

    const sortedByDrop = [...analysis]
      .filter(p => p.change < 0)
      .sort((a, b) => a.change - b.change)
      .slice(0, 10);

    for (const point of sortedByDrop) {
      const content = findContentAtTime(segments, point.timestamp);
      console.log(
        `${formatTime(point.timestamp)} (${point.pct}%): ` +
        `${point.change.toFixed(1)}% drop | ` +
        `Line ${content?.line?.num || '?'}: "${content?.line?.text?.slice(0, 50) || 'N/A'}..."`
      );
    }

    // Find retention holds (flat sections)
    console.log(`\n${'='.repeat(80)}`);
    console.log('RETENTION HOLDS (viewers staying)');
    console.log('─'.repeat(80));

    const holds = [];
    let holdStart = null;

    for (let i = 1; i < analysis.length; i++) {
      if (Math.abs(analysis[i].change) < 1.5) {
        if (!holdStart) holdStart = analysis[i - 1];
      } else {
        if (holdStart && analysis[i - 1].pct - holdStart.pct >= 3) {
          holds.push({ start: holdStart, end: analysis[i - 1] });
        }
        holdStart = null;
      }
    }

    for (const hold of holds.slice(0, 5)) {
      const content = findContentAtTime(segments, hold.start.timestamp);
      console.log(
        `${formatTime(hold.start.timestamp)}-${formatTime(hold.end.timestamp)} ` +
        `(${hold.start.pct}%-${hold.end.pct}%): ` +
        `Held at ~${hold.start.retention.toFixed(0)}% | ` +
        `${content?.header || 'Unknown section'}`
      );
    }

    // Section-by-section retention
    console.log(`\n${'='.repeat(80)}`);
    console.log('SECTION ANALYSIS');
    console.log('─'.repeat(80));

    for (const seg of segments) {
      if (!seg.header) continue;

      const startPoint = analysis.find(p => p.timestamp >= seg.startTime);
      const endPoint = [...analysis].reverse().find(p => p.timestamp <= seg.endTime);

      if (startPoint && endPoint) {
        const sectionDrop = endPoint.retention - startPoint.retention;
        const dropRate = sectionDrop / ((seg.endTime - seg.startTime) / 60);

        console.log(
          `${seg.header.slice(0, 30).padEnd(30)} | ` +
          `${formatTime(seg.startTime)}-${formatTime(seg.endTime)} | ` +
          `${startPoint.retention.toFixed(0)}% → ${endPoint.retention.toFixed(0)}% | ` +
          `${sectionDrop > 0 ? '+' : ''}${sectionDrop.toFixed(1)}% (${dropRate.toFixed(1)}%/min)`
        );
      }
    }

  } finally {
    db.close();
  }
}

// CLI
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node retention-analyzer.js <video_id> <script_path>');
  console.log('\nExample:');
  console.log('  node retention-analyzer.js aCqzUCTWm8I ../scripts/boyd.md');
  process.exit(1);
}

analyze(args[0], args[1]);
