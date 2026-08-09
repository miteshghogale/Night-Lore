import { GET, POST } from '../src/pages/api/react';

async function run() {
  console.log('--- TEST 1: GET Initial Counts ---');
  const req1 = new Request('http://localhost/api/react?slug=amityville-horror-case');
  const res1 = await GET({ request: req1 } as any);
  const data1 = await res1.json();
  console.log('GET Result:', JSON.stringify(data1, null, 2));

  console.log('\n--- TEST 2: POST Reaction "unsettling" ---');
  const req2 = new Request('http://localhost/api/react', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ story_slug: 'amityville-horror-case', reaction_type: 'unsettling' })
  });
  const res2 = await POST({ request: req2 } as any);
  const data2 = await res2.json();
  console.log('POST 1 Result:', JSON.stringify(data2, null, 2));

  console.log('\n--- TEST 3: POST Second Reaction "nosleep" ---');
  const req3 = new Request('http://localhost/api/react', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ story_slug: 'amityville-horror-case', reaction_type: 'nosleep' })
  });
  const res3 = await POST({ request: req3 } as any);
  const data3 = await res3.json();
  console.log('POST 2 Result:', JSON.stringify(data3, null, 2));

  console.log('\n--- TEST 4: GET Updated Single Story Counts ---');
  const req4 = new Request('http://localhost/api/react?slug=amityville-horror-case');
  const res4 = await GET({ request: req4 } as any);
  const data4 = await res4.json();
  console.log('GET Updated Result:', JSON.stringify(data4, null, 2));

  console.log('\n--- TEST 5: GET Top Stories Aggregation ---');
  const req5 = new Request('http://localhost/api/react?top=true');
  const res5 = await GET({ request: req5 } as any);
  const data5 = await res5.json();
  console.log('GET Top Result:', JSON.stringify(data5, null, 2));
}

run().catch(console.error);
