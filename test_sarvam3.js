const fs = require('fs');

async function test() {
  const fileBuffer = fs.readFileSync('c:\\Users\\HP\\OneDrive\\Desktop\\Women-Saftey-final\\Women-Saftey-final\\test.mp3');
  const formData = new FormData();
  const audioBlob = new Blob([fileBuffer], { type: 'audio/mp3' });
  formData.append('file', audioBlob, 'test.mp3');
  formData.append('model', 'saaras:v3'); 
  formData.append('mode', 'transcribe');
  
  const sarvamResp = await fetch('https://api.sarvam.ai/speech-to-text', {
    method: 'POST',
    headers: { 'api-subscription-key': 'sk_irjxlsgv_463kUkMnDTyx98Y3RkZTpEpc' },
    body: formData
  });

  const text = await sarvamResp.text();
  fs.writeFileSync('c:\\Users\\HP\\OneDrive\\Desktop\\Women-Saftey-final\\Women-Saftey-final\\test_sarvam_res.txt', text);
}

test();
