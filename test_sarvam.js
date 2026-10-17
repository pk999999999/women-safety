const fs = require('fs');

async function test() {
  const formData = new FormData();
  // using an empty Blob
  const audioBlob = new Blob([new Uint8Array(200)], { type: 'audio/webm' });
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'saaras:v3'); 
  
  const sarvamResp = await fetch('https://api.sarvam.ai/speech-to-text', {
    method: 'POST',
    headers: { 'api-subscription-key': 'sk_irjxlsgv_463kUkMnDTyx98Y3RkZTpEpc' },
    body: formData
  });

  const text = await sarvamResp.text();
  fs.writeFileSync('c:\\Users\\HP\\OneDrive\\Desktop\\Women-Saftey-final\\Women-Saftey-final\\test_sarvam_res.txt', text);
}

test();
