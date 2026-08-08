const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const STORIES_DIR = path.join(__dirname, '..', 'src', 'content', 'stories');

// Helper to make fetch request with timeout & headers
async function checkUrl(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
      redirect: 'follow'
    });
    clearTimeout(timeoutId);
    return { status: res.status, ok: res.ok, finalUrl: res.url };
  } catch (err) {
    clearTimeout(timeoutId);
    return { status: 0, ok: false, error: err.message };
  }
}

// Check Wayback Machine for a snapshot
async function checkWayback(url) {
  try {
    const apiUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
    const res = await fetch(apiUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const closest = data?.archived_snapshots?.closest;
    if (closest && closest.available && closest.url) {
      // Ensure https protocol for archive link
      let archiveUrl = closest.url.replace(/^http:/, 'https:');
      // Verify snapshot actually loads
      const snapCheck = await checkUrl(archiveUrl, 10000);
      return {
        url: archiveUrl,
        timestamp: closest.timestamp,
        status: snapCheck.status,
        ok: snapCheck.ok
      };
    }
  } catch (err) {
    console.error(`Wayback check error for ${url}:`, err.message);
  }
  return null;
}

// Simple YAML frontmatter parser for sources
function parseStoryFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  
  // Extract title and sources from YAML frontmatter
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return { fileName, title: fileName, sources: [] };

  const fmText = fmMatch[1];
  let titleMatch = fmText.match(/title:\s*"([^"]+)"/) || fmText.match(/title:\s*'([^']+)'/) || fmText.match(/title:\s*(.+)/);
  const title = titleMatch ? titleMatch[1].trim() : fileName;

  const sources = [];
  const sourcesBlockMatch = fmText.match(/sources:\s*\r?\n([\s\S]*?)(?=\r?\n\w+:|$)/);
  if (sourcesBlockMatch) {
    const block = sourcesBlockMatch[1];
    // parse items like:
    //   - label: "..."
    //     url: "..."
    const itemRegex = /-\s*label:\s*"([^"]+)"\r?\n\s*url:\s*"([^"]+)"/g;
    let match;
    while ((match = itemRegex.exec(block)) !== null) {
      sources.push({ label: match[1], url: match[2] });
    }
  }

  return { fileName, title, sources, fullContent: content, filePath };
}

async function main() {
  const files = fs.readdirSync(STORIES_DIR).filter(f => f.endsWith('.md'));
  console.log(`Found ${files.length} story files.\n`);

  const results = [];

  for (const file of files) {
    const filePath = path.join(STORIES_DIR, file);
    const story = parseStoryFile(filePath);
    console.log(`========================================`);
    console.log(`Story: ${story.title} (${story.fileName})`);
    console.log(`Sources found: ${story.sources.length}`);

    const storyResult = {
      file: story.fileName,
      title: story.title,
      sources: []
    };

    for (const source of story.sources) {
      console.log(`\n  Checking: ${source.label}`);
      console.log(`  URL: ${source.url}`);
      
      const liveCheck = await checkUrl(source.url);
      console.log(`  Live Status: ${liveCheck.status} (ok: ${liveCheck.ok}) ${liveCheck.error ? `[Error: ${liveCheck.error}]` : ''}`);

      const itemResult = {
        label: source.label,
        originalUrl: source.url,
        liveStatus: liveCheck.status,
        liveError: liveCheck.error || null,
        wayback: null,
        actionRecommended: ''
      };

      if (liveCheck.status === 200) {
        itemResult.actionRecommended = 'KEEP';
        console.log(`  => Status 200 OK. Keeping link.`);
      } else {
        console.log(`  => Non-200 status (${liveCheck.status}). Checking Wayback Machine...`);
        const wb = await checkWayback(source.url);
        if (wb && (wb.ok || wb.status === 200)) {
          itemResult.wayback = wb;
          console.log(`  => Wayback snapshot found: ${wb.url} (Status: ${wb.status})`);
          itemResult.actionRecommended = 'REPLACE_WITH_WAYBACK';
        } else if (wb) {
          itemResult.wayback = wb;
          console.log(`  => Wayback snapshot exists but returns status ${wb.status}: ${wb.url}`);
          itemResult.actionRecommended = liveCheck.status === 403 ? 'FLAG_403_MANUAL' : 'REMOVE_LINK_PLAIN_TEXT';
        } else {
          console.log(`  => No Wayback snapshot available.`);
          if (liveCheck.status === 403) {
            itemResult.actionRecommended = 'FLAG_403_MANUAL';
          } else {
            itemResult.actionRecommended = 'REMOVE_LINK_PLAIN_TEXT';
          }
        }
      }

      storyResult.sources.push(itemResult);
    }

    results.push(storyResult);
  }

  // Save report JSON
  const reportPath = path.join(__dirname, 'link_check_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n========================================`);
  console.log(`Link check complete. Saved to ${reportPath}`);
}

main();
