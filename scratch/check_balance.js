require('dotenv').config();

async function checkBalance() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error('ELEVENLABS_API_KEY is not set');
    process.exit(1);
  }

  const res = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
    headers: {
      'xi-api-key': apiKey
    }
  });

  if (!res.ok) {
    console.error(`HTTP error ${res.status}: ${await res.text()}`);
    process.exit(1);
  }

  const data = await res.json();
  console.log('Subscription Info:', JSON.stringify(data, null, 2));

  const charCount = data.character_count || 0;
  const charLimit = data.character_limit || 0;
  const remainingChars = charLimit - charCount;
  
  console.log(`Character count used: ${charCount}`);
  console.log(`Character limit: ${charLimit}`);
  console.log(`Remaining characters: ${remainingChars}`);
}

checkBalance().catch(err => console.error(err));
