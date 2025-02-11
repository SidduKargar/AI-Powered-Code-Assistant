const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = 3001;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(cors());
app.use(express.json());

app.post('/generate-code', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const fullPrompt = `Generate code for the following request. Only provide the code without any explanations: ${prompt}`;
    
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    res.json({ code: text });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to generate code', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});