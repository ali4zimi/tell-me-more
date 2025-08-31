# Backend API Integration Example

## Overview
This document shows how to create a backend service that works with the TellMeMore Chrome extension's AI integration feature.

## API Endpoint

### POST `/ask-about-movie`

The extension will send POST requests to this endpoint with the following JSON payload:

```json
{
  "question": "What is the main character thinking about?",
  "subtitles": [
    "Hello, how are you?",
    "I'm fine, thank you.",
    "What are you doing tonight?",
    "I'm going to watch a movie."
  ],
  "platform": "openai",
  "apiKey": "your-api-key-here"
}
```

### Request Parameters
- `question` (string): The user's question about the movie/show
- `subtitles` (array): Array of subtitle text from the current viewing session
- `platform` (string): Selected AI platform (`openai`, `anthropic`, `google`, `ollama`)
- `apiKey` (string): User's API key for the selected platform

### Response Format
The backend should return a JSON response with the AI's answer:

```json
{
  "response": "Based on the subtitles, the main character seems to be making plans for the evening and engaging in casual conversation."
}
```

Alternative response field names also supported:
- `answer`
- `result`

## Example Node.js/Express Backend

```javascript
const express = require('express');
const cors = require('cors');
const app = express();

// Enable CORS for Chrome extension
app.use(cors({
  origin: ['chrome-extension://*', 'http://localhost:*']
}));

app.use(express.json());

app.post('/ask-about-movie', async (req, res) => {
  try {
    const { question, subtitles, platform, apiKey } = req.body;
    
    // Validate request
    if (!question || !Array.isArray(subtitles)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Process with your AI service based on platform
    let aiResponse;
    
    switch (platform) {
      case 'openai':
        aiResponse = await callOpenAI(question, subtitles, apiKey);
        break;
      case 'anthropic':
        aiResponse = await callAnthropic(question, subtitles, apiKey);
        break;
      case 'google':
        aiResponse = await callGoogle(question, subtitles, apiKey);
        break;
      case 'ollama':
        aiResponse = await callOllama(question, subtitles);
        break;
      default:
        throw new Error('Unsupported AI platform');
    }
    
    res.json({ response: aiResponse });
    
  } catch (error) {
    console.error('AI processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

async function callOpenAI(question, subtitles, apiKey) {
  // Implement OpenAI API call
  const prompt = `Based on these subtitles: ${subtitles.join(' ')}
  
  Answer this question: ${question}`;
  
  // Your OpenAI API implementation here
  return "AI response from OpenAI";
}

// Implement other AI service functions...

app.listen(3000, () => {
  console.log('AI backend running on port 3000');
});
```

## Testing

1. Set up your backend endpoint (e.g., `http://localhost:5000`)
2. Configure the extension:
   - Go to extension options
   - Select your AI platform
   - Enter your API key
   - Set backend endpoint to your server URL
3. Watch a movie/show on a supported platform
4. Open the AI chat and ask questions about the content

## Error Handling

The extension will fall back to mock responses if:
- Backend endpoint is not configured
- API key is missing (except for Ollama)
- Backend returns an error
- Network request fails

This ensures the extension remains functional even with backend issues.
