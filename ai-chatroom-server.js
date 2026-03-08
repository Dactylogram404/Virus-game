const express = require('express');
const multer = require('multer');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Endpoint for image uploads
app.post('/upload', upload.single('image'), (req, res) => {
    res.json({ message: 'Image uploaded successfully', imageUrl: `/uploads/${req.file.filename}` });
});

// Function to send message to AI bots
async function sendMessageToAI(ai, message) {
    const response = await axios.post(`https://api.${ai}.com/chat`, { message });
    return response.data;
}

// Chat endpoint
app.post('/chat', async (req, res) => {
    const { message, context } = req.body;
    const responses = await Promise.all([
        sendMessageToAI('claude', message),
        sendMessageToAI('chatgpt', message),
        sendMessageToAI('grok', message),
        sendMessageToAI('gemini', message)
    ]);
    res.json({ responses });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});