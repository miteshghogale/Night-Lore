require('dotenv').config();

async function testTts() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const res = await fetch('https://api.elevenlabs.io/v1/text-to-speech/EkK5I93UQWFDigLMpZcX', {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey
    },
    body: JSON.stringify({
      text: "Test.",
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.55,
        similarity_boost: 0.75,
        style: 0.10,
        use_speaker_boost: true
      }
    })
  });

  console.log('Status:', res.status);
  console.log('Headers:', Object.fromEntries(res.headers.entries()));
  if (!res.ok) {
    console.log('Error Body:', await res.text());
  } else {
    const buf = await res.arrayBuffer();
    console.log('Audio received, bytes:', buf.byteLength);
  }
}

testTts().catch(console.error);
