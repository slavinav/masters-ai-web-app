const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const axios = require("axios");
const fs = require("fs");
const util = require("util");
require("dotenv").config();
const { Groq } = require("groq-sdk");
const { OpenAI } = require("openai");
const { Translate } = require("@google-cloud/translate").v2;
let chatBotPrompt;

// Initialize Groq client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const translate = new Translate({ key: process.env.GOOGLE_TRANSLATE_API_KEY });

const app = express();
// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files
app.use(express.static(path.join(__dirname, "public")));
app.use("/audio", express.static(path.join(__dirname, "audio"))); // Serve the audio files

// Route to serve the form
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

app.post("/generate-images", async (req, res) => {
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt:
        "generate a picture with one object suitable for children under 8 years old.",
      n: 1,
      size: "1024x1024",
    });

    const imageData = response.data[0];
    res.json({ imageData });
    // You can now store this URL in your database or use it as needed
  } catch (error) {
    console.error("Error generating image:", error.message);
  }
});

// Handle TTS request
app.post("/speak", async (req, res) => {
  const text = req.body.text;

  const requestData = {
    text: text,
    model_id: "eleven_multilingual_v2",
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      use_speaker_boost: true,
    },
  };

  try {
    // Ensure the audio directory exists
    const audioDir = path.join(__dirname, "audio");
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir);
    }

    const filePath = path.join(audioDir, "output.mp3");

    // Delete the existing file before generating a new one
    if (fs.existsSync(filePath)) {
      await util.promisify(fs.unlink)(filePath);
    }
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM`,
      requestData,
      {
        headers: {
          "xi-api-key": process.env.ELEVEN_LABS_API_KEY,
          "Content-Type": "application/json",
        },
        responseType: "arraybuffer",
      }
    );

    if (response.data) {
      // Write the binary audio content to a local file
      await util.promisify(fs.writeFile)(filePath, response.data, "binary");

      res.json({ url: "/audio/output.mp3" });
    } else {
      console.error("Error generating TTS: No audio content");
      res.status(500).send("Error generating TTS");
    }
  } catch (error) {
    console.error(
      "Error generating TTS:",
      error.response ? error.response.data : error.message
    );
    res.status(500).send("Error generating TTS");
  }
});
// Handle form submission and redirect to app.html with query parameters
app.post("/app", (req, res) => {
  const name = req.body.name;
  res.redirect(`/app.html?name=${encodeURIComponent(name)}`);
});

// Serve app.html from the views folder
app.get("/app.html", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "app.html"));
});

// Handle chatbot request
app.post("/chatbot", async (req, res) => {
  const text = req.body.text;
  const prompt =
    "Ти си приятен и любезен чатбот от женски пол, предназначен за ангажиране в прости и забавни разговори с малки деца. Отговаряй кратко, позитивно и на български език, родовете трябва да бъдат спазени. Нека разговорът да е ангажиран с картинка -";

  try {
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: prompt + chatBotPrompt,
        },
        {
          role: "user",
          content: text,
        },
      ],
      model: "llama3-70b-8192",
      temperature: 0.5,
      max_tokens: 80,
      top_p: 0.8,
      presence_penalty: 0.3,
    });
    let chatbotResponse =
      response.choices[0]?.message?.content || "No response";

    // Split the response into sentences
    let sentences = chatbotResponse.split(/(?<=[.!?])\s+/);
    // Rejoin the first two sentences
    chatbotResponse = sentences.slice(0, 2).join(" ");
    res.json({ response: chatbotResponse });
  } catch (error) {
    console.error("Error fetching chatbot response:", error.message);
    res.status(500).json({ error: "Error fetching chatbot response" });
  }
});

app.post("/translate", async (req, res) => {
  const systemContext = req.body.context;

  if (!systemContext) {
    return res.status(400).json({ error: "Missing required field: context" });
  }

  try {
    const [translation] = await translate.translate(systemContext, "bg");
    chatBotPrompt = [translation];
    res.json({ translatedContext: [translation] });
  } catch (error) {
    console.error("Translation error:", error.message);
    res.status(500).json({ error: "Error translating context" });
  }
});

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
