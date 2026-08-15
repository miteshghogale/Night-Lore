require('dotenv').config();

async function testUser() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const res = await fetch('https://api.elevenlabs.io/v1/user', {
    headers: { 'xi-api-key': apiKey }
  });
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Body:', text);
}

testUser().catch(console.error);
