const https = require('https');

function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchHTML(res.headers.location));
      }
      let html = '';
      res.on('data', chunk => html += chunk);
      res.on('end', () => resolve(html));
    }).on('error', reject);
  });
}

async function run() {
  const html = await fetchHTML('https://mynightlore.com/story/amityville-horror-case/');
  console.log('HTML Length:', html.length);
  console.log('Contains data-reactions-container:', html.includes('data-reactions-container'));
  console.log('Contains data-story-slug="amityville-horror-case":', html.includes('data-story-slug="amityville-horror-case"'));
  console.log('Contains literal {storySlug}:', html.includes('{storySlug}'));

  const idx = html.indexOf('data-reactions-container');
  if (idx !== -1) {
    console.log('\n--- Live HTML snippet around container ---');
    console.log(html.substring(idx - 50, idx + 350));
  }
}

run().catch(console.error);
