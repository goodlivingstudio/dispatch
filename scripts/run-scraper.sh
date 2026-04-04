#!/bin/bash
# Gallery scraper — runs hourly via crontab
PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:$PATH"
cd /Users/jeremygrant/claude-projects/dispatch
ARENA_ACCESS_TOKEN=sYr1f8Vo8SZP8svt5vccuyWmPylU-pYU-q6tPIgQ9zI npx tsx scripts/gallery-scraper.ts >> /tmp/dispatch-scraper.log 2>&1
