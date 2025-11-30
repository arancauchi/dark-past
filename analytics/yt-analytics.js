#!/usr/bin/env node
/**
 * YouTube Analytics CLI Tool
 * Pulls analytics data from your YouTube channel.
 *
 * Setup:
 * 1. Go to Google Cloud Console (console.cloud.google.com)
 * 2. Create a project and enable YouTube Data API v3 + YouTube Analytics API
 * 3. Create OAuth 2.0 credentials (Desktop app)
 * 4. Add to .env: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
 * 5. npm install
 * 6. Run: node yt-analytics.js --help
 */

const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const url = require("node:url");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { google } = require("googleapis");
const db = require("./db");

const SCOPES = [
	"https://www.googleapis.com/auth/youtube.readonly",
	"https://www.googleapis.com/auth/yt-analytics.readonly",
];

const SCRIPT_DIR = __dirname;
const TOKEN_FILE = path.join(SCRIPT_DIR, "token.json");

async function getAuthenticatedClient() {
	const client_id = process.env.CLIENT_ID;
	const client_secret = process.env.CLIENT_SECRET;

	if (!client_id || !client_secret) {
		console.error("Error: CLIENT_ID and CLIENT_SECRET must be set in .env");
		process.exit(1);
	}

	const oauth2Client = new google.auth.OAuth2(
		client_id,
		client_secret,
		"http://localhost:3000/oauth2callback",
	);

	// Check for existing token
	if (fs.existsSync(TOKEN_FILE)) {
		const token = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8"));
		oauth2Client.setCredentials(token);

		// Refresh if expired
		if (token.expiry_date && token.expiry_date < Date.now()) {
			const { credentials: newCreds } = await oauth2Client.refreshAccessToken();
			oauth2Client.setCredentials(newCreds);
			fs.writeFileSync(TOKEN_FILE, JSON.stringify(newCreds, null, 2));
		}

		return oauth2Client;
	}

	// Need to authenticate
	const authUrl = oauth2Client.generateAuthUrl({
		access_type: "offline",
		scope: SCOPES,
	});

	console.error("Authorize this app by visiting:", authUrl);

	// Start local server to receive callback
	const code = await new Promise((resolve, _reject) => {
		const server = http
			.createServer((req, res) => {
				const parsedUrl = url.parse(req.url, true);
				if (parsedUrl.pathname === "/oauth2callback") {
					const code = parsedUrl.query.code;
					res.writeHead(200, { "Content-Type": "text/html" });
					res.end(
						"<h1>Authentication successful!</h1><p>You can close this window.</p>",
					);
					server.close();
					resolve(code);
				}
			})
			.listen(3000, () => {
				console.error("Waiting for authentication...");
			});
	});

	const { tokens } = await oauth2Client.getToken(code);
	oauth2Client.setCredentials(tokens);
	fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));

	return oauth2Client;
}

async function getChannelId(youtube) {
	const response = await youtube.channels.list({
		part: "id",
		mine: true,
	});
	return response.data.items[0].id;
}

function formatDate(date) {
	return date.toISOString().split("T")[0];
}

function getDates(days, customStart = null, customEnd = null) {
	// If custom dates provided, use those
	if (customStart && customEnd) {
		return {
			startDate: customStart,
			endDate: customEnd,
		};
	}

	const end = new Date();
	const start = new Date();
	start.setDate(start.getDate() - days);
	return {
		startDate: formatDate(start),
		endDate: formatDate(end),
	};
}

function getDateRangeFromPublish(publishedAt) {
	// Get dates from video publish date to today
	const published = new Date(publishedAt);
	const end = new Date();
	return {
		startDate: formatDate(published),
		endDate: formatDate(end),
	};
}

async function getChannelStats(youtube, youtubeAnalytics, days) {
	const channelId = await getChannelId(youtube);
	const { startDate, endDate } = getDates(days);

	// Basic channel info
	const channelInfo = await youtube.channels.list({
		part: "snippet,statistics,contentDetails",
		id: channelId,
	});
	const channel = channelInfo.data.items[0];

	// Analytics data
	const analytics = await youtubeAnalytics.reports.query({
		ids: `channel==${channelId}`,
		startDate,
		endDate,
		metrics:
			"views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost,likes,comments,shares",
		dimensions: "day",
		sort: "day",
	});

	// Traffic sources
	const traffic = await youtubeAnalytics.reports.query({
		ids: `channel==${channelId}`,
		startDate,
		endDate,
		metrics: "views,estimatedMinutesWatched",
		dimensions: "insightTrafficSourceType",
		sort: "-views",
	});

	return {
		channel: {
			id: channelId,
			title: channel.snippet.title,
			subscribers: channel.statistics.subscriberCount,
			totalViews: channel.statistics.viewCount,
			videoCount: channel.statistics.videoCount,
		},
		period: { start: startDate, end: endDate },
		dailyStats: {
			columns: analytics.data.columnHeaders,
			rows: analytics.data.rows || [],
		},
		trafficSources: {
			columns: traffic.data.columnHeaders,
			rows: traffic.data.rows || [],
		},
	};
}

async function getVideoList(youtube, maxResults) {
	const channelId = await getChannelId(youtube);

	const channelResponse = await youtube.channels.list({
		part: "contentDetails",
		id: channelId,
	});

	const uploadsPlaylistId =
		channelResponse.data.items[0].contentDetails.relatedPlaylists.uploads;

	const videos = [];
	let nextPageToken = null;

	while (videos.length < maxResults) {
		const response = await youtube.playlistItems.list({
			part: "snippet,contentDetails",
			playlistId: uploadsPlaylistId,
			maxResults: Math.min(50, maxResults - videos.length),
			pageToken: nextPageToken,
		});

		for (const item of response.data.items) {
			videos.push({
				videoId: item.contentDetails.videoId,
				title: item.snippet.title,
				publishedAt: item.snippet.publishedAt,
				description:
					item.snippet.description.slice(0, 200) +
					(item.snippet.description.length > 200 ? "..." : ""),
			});
		}

		nextPageToken = response.data.nextPageToken;
		if (!nextPageToken) break;
	}

	return videos;
}

async function getVideoStats(youtube, youtubeAnalytics, videoId, days, customStart = null, customEnd = null) {
	const channelId = await getChannelId(youtube);
	const { startDate, endDate } = getDates(days, customStart, customEnd);

	// Basic video info
	const videoInfo = await youtube.videos.list({
		part: "snippet,statistics,contentDetails,status",
		id: videoId,
	});

	if (!videoInfo.data.items.length) {
		return { error: `Video ${videoId} not found` };
	}

	const video = videoInfo.data.items[0];

	// Skip non-public videos
	if (video.status.privacyStatus !== "public") {
		return {
			error: `Video ${videoId} is ${video.status.privacyStatus}, skipping`,
		};
	}

	// Basic analytics
	const analytics = await youtubeAnalytics.reports.query({
		ids: `channel==${channelId}`,
		startDate,
		endDate,
		metrics:
			"views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,likes,comments,shares",
		filters: `video==${videoId}`,
	});

	// Daily breakdown
	const daily = await youtubeAnalytics.reports.query({
		ids: `channel==${channelId}`,
		startDate,
		endDate,
		metrics:
			"views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,likes,comments,shares",
		dimensions: "day",
		filters: `video==${videoId}`,
		sort: "day",
	});

	// Traffic sources
	const traffic = await youtubeAnalytics.reports.query({
		ids: `channel==${channelId}`,
		startDate,
		endDate,
		metrics: "views,estimatedMinutesWatched",
		dimensions: "insightTrafficSourceType",
		filters: `video==${videoId}`,
		sort: "-views",
	});

	// Demographics
	const demographics = await youtubeAnalytics.reports.query({
		ids: `channel==${channelId}`,
		startDate,
		endDate,
		metrics: "viewerPercentage",
		dimensions: "ageGroup,gender",
		filters: `video==${videoId}`,
		sort: "-viewerPercentage",
	});

	// Geographic data
	const geography = await youtubeAnalytics.reports.query({
		ids: `channel==${channelId}`,
		startDate,
		endDate,
		metrics: "views,estimatedMinutesWatched",
		dimensions: "country",
		filters: `video==${videoId}`,
		sort: "-views",
		maxResults: 20,
	});

	return {
		video: {
			id: videoId,
			title: video.snippet.title,
			publishedAt: video.snippet.publishedAt,
			duration: video.contentDetails.duration,
			viewCount: video.statistics.viewCount,
			likeCount: video.statistics.likeCount,
			commentCount: video.statistics.commentCount,
		},
		period: { start: startDate, end: endDate },
		summary: {
			columns: analytics.data.columnHeaders,
			rows: analytics.data.rows || [],
		},
		dailyStats: {
			columns: daily.data.columnHeaders,
			rows: daily.data.rows || [],
		},
		trafficSources: {
			columns: traffic.data.columnHeaders,
			rows: traffic.data.rows || [],
		},
		demographics: {
			columns: demographics.data.columnHeaders,
			rows: demographics.data.rows || [],
		},
		geography: {
			columns: geography.data.columnHeaders,
			rows: geography.data.rows || [],
		},
	};
}

async function getRetentionData(youtube, youtubeAnalytics, videoId) {
	const channelId = await getChannelId(youtube);

	try {
		const retention = await youtubeAnalytics.reports.query({
			ids: `channel==${channelId}`,
			startDate: "2020-01-01",
			endDate: formatDate(new Date()),
			metrics: "audienceWatchRatio,relativeRetentionPerformance",
			dimensions: "elapsedVideoTimeRatio",
			filters: `video==${videoId}`,
			sort: "elapsedVideoTimeRatio",
		});

		return {
			videoId,
			retentionCurve: {
				columns: retention.data.columnHeaders,
				rows: retention.data.rows || [],
			},
		};
	} catch (error) {
		return {
			videoId,
			error: error.message,
			note: "Retention data may require YouTube Partner Program access",
		};
	}
}

async function _getCtrData(youtube, youtubeAnalytics, videoId, days) {
	const channelId = await getChannelId(youtube);
	const { startDate, endDate } = getDates(days);

	try {
		const ctr = await youtubeAnalytics.reports.query({
			ids: `channel==${channelId}`,
			startDate,
			endDate,
			metrics: "impressions,impressionsClickThroughRate",
			filters: `video==${videoId}`,
		});

		const dailyCtr = await youtubeAnalytics.reports.query({
			ids: `channel==${channelId}`,
			startDate,
			endDate,
			metrics: "impressions,impressionsClickThroughRate",
			dimensions: "day",
			filters: `video==${videoId}`,
			sort: "day",
		});

		return {
			videoId,
			period: { start: startDate, end: endDate },
			summary: {
				columns: ctr.data.columnHeaders,
				rows: ctr.data.rows || [],
			},
			daily: {
				columns: dailyCtr.data.columnHeaders,
				rows: dailyCtr.data.rows || [],
			},
		};
	} catch (error) {
		return {
			videoId,
			error: error.message,
		};
	}
}

function printHelp() {
	console.log(`
YouTube Analytics CLI Tool

Usage:
  node yt-analytics.js <command> [options]

Commands:
  channel              Get channel-wide statistics
  videos               List recent videos
  video <id>           Get stats for specific video
  all                  Get stats for all recent videos
  backfill [id]        Backfill historical data from publish date
                       If no ID given, backfills all videos

Options:
  --days <n>           Number of days to look back (default: 28)
  --max <n>            Max videos to list/fetch (default: 20)
  --save               Save data to SQLite database (data/analytics.db)
  --start <date>       Custom start date (YYYY-MM-DD)
  --end <date>         Custom end date (YYYY-MM-DD)
  --help               Show this help

Examples:
  node yt-analytics.js channel
  node yt-analytics.js channel --days 90
  node yt-analytics.js videos --max 10
  node yt-analytics.js video dQw4w9WgXcQ
  node yt-analytics.js all --max 5 --days 7 --save

  # Backfill all videos from their publish dates
  node yt-analytics.js backfill --save

  # Backfill specific video from publish date
  node yt-analytics.js backfill dQw4w9WgXcQ --save

  # Backfill with custom date range
  node yt-analytics.js backfill --start 2023-01-01 --end 2023-12-31 --save
`);
}

function parseArgs(args) {
	const parsed = {
		command: null,
		videoId: null,
		days: 28,
		max: 20,
		save: false,
		startDate: null,
		endDate: null,
	};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		if (arg === "--help" || arg === "-h") {
			printHelp();
			process.exit(0);
		} else if (arg === "--days") {
			parsed.days = parseInt(args[++i], 10);
		} else if (arg === "--max") {
			parsed.max = parseInt(args[++i], 10);
		} else if (arg === "--save") {
			parsed.save = true;
		} else if (arg === "--start") {
			parsed.startDate = args[++i];
		} else if (arg === "--end") {
			parsed.endDate = args[++i];
		} else if (!parsed.command) {
			parsed.command = arg;
		} else if ((parsed.command === "video" || parsed.command === "backfill") && !parsed.videoId) {
			parsed.videoId = arg;
		}
	}

	return parsed;
}

async function main() {
	const args = parseArgs(process.argv.slice(2));

	if (!args.command) {
		printHelp();
		process.exit(1);
	}

	const auth = await getAuthenticatedClient();
	const youtube = google.youtube({ version: "v3", auth });
	const youtubeAnalytics = google.youtubeAnalytics({ version: "v2", auth });

	let result;

	switch (args.command) {
		case "channel":
			result = await getChannelStats(youtube, youtubeAnalytics, args.days);
			if (args.save) {
				const saved = db.saveChannelStats(result);
				console.error(`Saved channel stats: ${saved.channelId}`);
			}
			break;

		case "videos":
			result = { videos: await getVideoList(youtube, args.max) };
			if (args.save) {
				const saved = db.saveVideoList(result.videos);
				console.error(`Saved ${saved.count} videos`);
			}
			break;

		case "video":
			if (!args.videoId) {
				console.error("Error: video command requires a video ID");
				process.exit(1);
			}
			result = await getVideoStats(
				youtube,
				youtubeAnalytics,
				args.videoId,
				args.days,
			);

			if (!result.error) {
				result.retention = await getRetentionData(
					youtube,
					youtubeAnalytics,
					args.videoId,
				);
			}
			if (args.save) {
				const saved = db.saveVideoStats(result);
				console.error(`Saved video stats: ${saved.videoId || saved.error}`);
				if (result.retention) {
					const retSaved = db.saveRetentionData(result.retention);
					console.error(
						`Saved retention data: ${retSaved.saved ? "success" : retSaved.error}`,
					);
				}
			}
			break;

		case "all": {
			const videos = await getVideoList(youtube, args.max);
			result = { videos: [] };

			// Initialize progress state
			const progress = videos.map((v) => ({
				title: v.title.slice(0, 45).padEnd(45),
				status: "pending",
				videoId: v.videoId,
			}));

			const CONCURRENCY = 20;
			const isTTY = process.stderr.isTTY;

			// Render progress table
			function renderProgress() {
				if (!isTTY) return;

				// Move cursor up and clear lines
				if (progress.length > 0) {
					process.stderr.write(`\x1b[${progress.length}A`);
				}

				for (const p of progress) {
					const statusIcon =
						p.status === "pending" ? "○" :
						p.status === "fetching" ? "◐" :
						p.status === "done" ? "●" :
						"✗";
					const statusColor =
						p.status === "pending" ? "\x1b[90m" :
						p.status === "fetching" ? "\x1b[33m" :
						p.status === "done" ? "\x1b[32m" :
						"\x1b[31m";
					process.stderr.write(
						`\x1b[2K${statusColor}${statusIcon}\x1b[0m ${p.title}\n`
					);
				}
			}

			// Initial render
			if (isTTY) {
				for (const p of progress) {
					process.stderr.write(`○ ${p.title}\n`);
				}
			}

			// Process videos with concurrency limit
			async function processVideo(index) {
				const v = videos[index];
				progress[index].status = "fetching";
				renderProgress();

				try {
					const stats = await getVideoStats(
						youtube,
						youtubeAnalytics,
						v.videoId,
						args.days,
					);

					if (stats.error) {
						progress[index].status = "error";
						renderProgress();
						return null;
					}

					// Fetch retention data
					const retention = await getRetentionData(
						youtube,
						youtubeAnalytics,
						v.videoId,
					);
					stats.retention = retention;

					if (args.save) {
						db.saveVideoStats(stats);
						if (retention && !retention.error) {
							db.saveRetentionData(retention);
						}
					}

					progress[index].status = "done";
					renderProgress();
					return stats;
				} catch (err) {
					progress[index].status = "error";
					renderProgress();
					return null;
				}
			}

			// Run with concurrency limit
			const queue = [...videos.keys()];
			const results = new Array(videos.length);

			async function worker() {
				while (queue.length > 0) {
					const index = queue.shift();
					if (index !== undefined) {
						results[index] = await processVideo(index);
					}
				}
			}

			await Promise.all(
				Array(Math.min(CONCURRENCY, videos.length))
					.fill(null)
					.map(() => worker())
			);

			result.videos = results.filter(Boolean);

			if (!isTTY) {
				console.error(`Fetched stats for ${result.videos.length} videos`);
			}
			if (args.save) {
				console.error(`\nSaved stats for ${result.videos.length} videos`);
			}
			break;
		}

		case "backfill": {
			// Backfill historical data from publish date (or custom range)
			let videosToBackfill = [];

			if (args.videoId) {
				// Single video
				const videoInfo = await youtube.videos.list({
					part: "snippet",
					id: args.videoId,
				});
				if (videoInfo.data.items.length) {
					videosToBackfill.push({
						videoId: args.videoId,
						title: videoInfo.data.items[0].snippet.title,
						publishedAt: videoInfo.data.items[0].snippet.publishedAt,
					});
				}
			} else {
				// All videos
				videosToBackfill = await getVideoList(youtube, args.max);
			}

			result = { videos: [] };

			for (const v of videosToBackfill) {
				const { startDate, endDate } = args.startDate && args.endDate
					? { startDate: args.startDate, endDate: args.endDate }
					: getDateRangeFromPublish(v.publishedAt);

				console.error(`Backfilling ${v.title.slice(0, 40)}... (${startDate} to ${endDate})`);

				try {
					const stats = await getVideoStats(
						youtube,
						youtubeAnalytics,
						v.videoId,
						args.days,
						startDate,
						endDate,
					);

					if (!stats.error) {
						const retention = await getRetentionData(
							youtube,
							youtubeAnalytics,
							v.videoId,
						);
						stats.retention = retention;

						if (args.save) {
							db.saveVideoStats(stats);
							if (retention && !retention.error) {
								db.saveRetentionData(retention);
							}
						}
						result.videos.push(stats);
						console.error(`  ✓ Saved ${stats.dailyStats.rows.length} days of data`);
					} else {
						console.error(`  ✗ ${stats.error}`);
					}
				} catch (err) {
					console.error(`  ✗ Error: ${err.message}`);
				}
			}

			console.error(`\nBackfilled ${result.videos.length} videos`);
			break;
		}

		default:
			console.error(`Unknown command: ${args.command}`);
			printHelp();
			process.exit(1);
	}
}

main().catch((error) => {
	console.error("Error:", error.message);
	process.exit(1);
});
