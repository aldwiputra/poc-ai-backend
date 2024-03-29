const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const base64 = require('base-64');

const app = express();
const OpenAI = require('openai');
const PORT = 8000;

const openai = new OpenAI({ apiKey: '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' });

app.use(cors());
app.use(express.json({ limit: '500mb' }));

app.get('/', (req, res) => {
  console.log('test');
  res.json({ message: 'Hello World!' });
});

app.post('/test', async (req, res) => {
  const base64AudioData = req.body.audio.split('base64,')[1];
  const filePath = path.join(__dirname, 'audio.mp3');
  const answerFilePath = path.join(__dirname, 'answer.mp3');

  fs.writeFileSync(filePath, Buffer.from(base64AudioData, 'base64'));

  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream('audio.mp3'),
    model: 'whisper-1',
  });

  const answerText = await openai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: "Please act like you're a patient with PTSD. I'm your therapist. answer this question: " + transcription.text,
      },
    ],
    model: 'gpt-3.5-turbo',
  });
  console.log(answerText.choices[0].message.content);

  const mp3 = await openai.audio.speech.create({
    model: 'tts-1',
    voice: 'alloy',
    input: answerText.choices[0].message.content,
  });
  const buffer = Buffer.from(await mp3.arrayBuffer());
  await fs.promises.writeFile(answerFilePath, buffer);

  let base64Data;

  // Read the generated MP3 file
  try {
    const data = fs.readFileSync(answerFilePath);
    // Encode the MP3 data to base64
    base64Data = data.toString('base64');
    console.log(base64Data);
  } catch (err) {
    console.error('Error reading file:', err);
  }

  res.json({ generated_text: answerText.choices[0].message.content, generated_audio: base64Data, transcription });
});

app.listen(PORT, (error) => {
  if (!error) {
    console.log('Server is Successfully Running,and App is listening on port ' + PORT);
  } else {
    console.log("Error occurred, server can't start", error);
  }
});
