require('dotenv').config();

async function checkQuota() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const res = await fetch('https://api.elevenlabs.io/v1/user', {
    headers: { 'xi-api-key': apiKey }
  });

  console.log('HTTP Status:', res.status);
  const text = await res.text();
  console.log('Response:', text);
}

checkQuota().catch(console.error);
