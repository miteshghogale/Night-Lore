require('dotenv').config();

async function testEndpoints() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const endpoints = [
    'https://api.elevenlabs.io/v1/user',
    'https://api.elevenlabs.io/v1/user/subscription',
    'https://api.elevenlabs.io/v1/user/character-count',
    'https://api.elevenlabs.io/v1/usage/character-stats'
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, { headers: { 'xi-api-key': apiKey } });
      console.log(`${ep} -> ${res.status}`);
      if (res.ok) {
        console.log(await res.json());
      }
    } catch (e) {
      console.log(`${ep} -> Error: ${e.message}`);
    }
  }
}

testEndpoints();
