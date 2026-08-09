const http = require('http');

function makeRequest(url, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
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

async function runTests() {
  console.log('--- 1. Testing GET initial counts ---');
  const get1 = await makeRequest('http://localhost:4321/api/react?slug=amityville-horror-case');
  console.log('GET Result:', JSON.stringify(get1.json, null, 2));

  console.log('\n--- 2. Testing POST reaction: unsettling ---');
  const post1 = await makeRequest('http://localhost:4321/api/react', 'POST', {
    story_slug: 'amityville-horror-case',
    reaction_type: 'unsettling'
  });
  console.log('POST 1 Result:', JSON.stringify(post1.json, null, 2));

  console.log('\n--- 3. Testing POST reaction: nosleep ---');
  const post2 = await makeRequest('http://localhost:4321/api/react', 'POST', {
    story_slug: 'amityville-horror-case',
    reaction_type: 'nosleep'
  });
  console.log('POST 2 Result:', JSON.stringify(post2.json, null, 2));

  console.log('\n--- 4. Testing GET updated counts ---');
  const get2 = await makeRequest('http://localhost:4321/api/react?slug=amityville-horror-case');
  console.log('GET 2 Result:', JSON.stringify(get2.json, null, 2));

  console.log('\n--- 5. Testing GET top stories ---');
  const getTop = await makeRequest('http://localhost:4321/api/react?top=true');
  console.log('GET Top Result:', JSON.stringify(getTop.json, null, 2));
}

runTests().catch(console.error);
