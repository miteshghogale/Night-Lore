const https = require('https');

function makeHttpsRequest(url, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'NightLore-LiveTest/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runLiveTest() {
  console.log('=== TESTING LIVE PRODUCTION CLOUDFLARE D1 DATABASE (https://mynightlore.com) ===\n');

  console.log('1. GET Initial Counts for amityville-horror-case:');
  const r1 = await makeHttpsRequest('https://mynightlore.com/api/react?slug=amityville-horror-case');
  console.log('Status:', r1.status);
  console.log('Response:', JSON.stringify(r1.json, null, 2));

  console.log('\n2. POST Reaction "unsettling" to PRODUCTION D1:');
  const r2 = await makeHttpsRequest('https://mynightlore.com/api/react', 'POST', {
    story_slug: 'amityville-horror-case',
    reaction_type: 'unsettling'
  });
  console.log('Status:', r2.status);
  console.log('Response:', JSON.stringify(r2.json, null, 2));

  console.log('\n3. GET Updated Counts for amityville-horror-case after POST:');
  const r3 = await makeHttpsRequest('https://mynightlore.com/api/react?slug=amityville-horror-case');
  console.log('Status:', r3.status);
  console.log('Response:', JSON.stringify(r3.json, null, 2));

  console.log('\n4. GET Top Stories across system from PRODUCTION D1:');
  const r4 = await makeHttpsRequest('https://mynightlore.com/api/react?top=true');
  console.log('Status:', r4.status);
  console.log('Response:', JSON.stringify(r4.json, null, 2));
}

runLiveTest().catch(console.error);
