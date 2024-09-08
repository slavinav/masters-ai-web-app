let currentAudio = null; // Track the current audio playback
let recognition = null; // Initialize recognition variable

document.addEventListener("DOMContentLoaded", () => {
  previewImage();
  const params = new URLSearchParams(window.location.search);
  const name = params.get("name");
  const welcomeMessageElement = document.getElementById("welcome-message");
  const startButton = document.getElementById("start-button");

  welcomeMessageElement.textContent = `Здравей, ${name}! Моля натисни бутона "започни", когато искаш забавлението да започне!`;

  const newGameButton = document.getElementById("new-game-button");
  newGameButton.addEventListener("click", (event) => {
    event.preventDefault(); // Prevent form submission
    window.location.reload(); // Reload the current page
  });
  newGameButton.style.opacity = 0;

  // Set up event listener for the start button
  startButton.addEventListener("click", () => {
    speakText("Какво виждаш на картинката?");
    newGameButton.style.opacity = 1;
    startButton.style.display = "none";
    welcomeMessageElement.style.display = "none";
  });

  // requestNewImage();
});

function previewImage() {
  // Retrieve the image URL from localStorage
  const newGeneratedImageUrl = localStorage.getItem("generatedImagesNewUrl");
  const newGeneratedImageData = localStorage.getItem("generatedImagesNewData");
  if (newGeneratedImageUrl && newGeneratedImageData) {
    localStorage.setItem("generatedImagesUrl", newGeneratedImageUrl);
    localStorage.setItem("generatedImagesData", newGeneratedImageData);
  }
  const generatedImagesUrl = localStorage.getItem("generatedImagesUrl");
  if (generatedImagesUrl) {
    // Update the src of the mainImage
    const mainImage = document.getElementById("mainImage");
    mainImage.src = generatedImagesUrl;
    mainImage.alt = "Generated Image";
  } else {
    console.error("No image URL found in localStorage");
  }
  loadNewPrompt(localStorage.getItem("generatedImagesData"));
}

async function loadNewPrompt(imageData) {
  await translatePrompt(imageData);
}

async function translatePrompt(systemContext) {
  try {
    // Send request to the /translate endpoint
    const response = await fetch("/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        context: systemContext,
      }),
    });

    const result = await response.json();
    if (response.ok) {
      console.log("Successfully translated prompt:", result.translatedContext);
    } else {
      console.error("Error translating prompt:", result.error);
    }
  } catch (error) {
    console.error("Error during translation request:", error.message);
    throw new Error("Failed to translate context");
  }
}

async function requestNewImage() {
  const newGameButton = document.getElementById("new-game-button");
  try {
    // Trigger image generation request
    const response = await fetch("/generate-images", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt:
          "generate a picture with one object suitable for children under 8 years old",
      }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log("Generated image URL:", result.imageData);
      // Store the image URL in localStorage for use in app.html
      localStorage.setItem(
        "generatedImagesNewData",
        result.imageData.revised_prompt
      );
      localStorage.setItem("generatedImagesNewUrl", result.imageData.url);
      newGameButton.disabled = false;
    } else {
      console.error("Error generating images:", result.error);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

async function speakText(text) {
  try {
    if (recognition) {
      recognition.stop(); // Stop any ongoing speech recognition
    }

    const response = await fetch("/speak", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: text }),
    });

    if (response.ok) {
      const data = await response.json();
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }

      // Play the bot's response
      currentAudio = new Audio(data.url);
      currentAudio.play().catch((error) => {
        console.error("Error playing audio:", error);
      });

      // Start recognition only after the bot finishes speaking
      currentAudio.onended = () => {
        startSpeechRecognition(); // Start listening after the bot speaks
      };
    } else {
      console.error("Error fetching TTS audio");
    }
  } catch (error) {
    console.error("Error in TTS fetch:", error);
  }
}

function startSpeechRecognition() {
  recognition = new (window.webkitSpeechRecognition ||
    window.SpeechRecognition)();
  recognition.lang = "bg-BG"; // Set the language to Bulgarian
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    let interimTranscript = "";
    let finalTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript.trim();

      if (event.results[i].isFinal) {
        finalTranscript += transcript + " ";
      } else {
        interimTranscript += transcript + " ";
      }
    }

    // Display interim transcript
    if (interimTranscript) {
      displayTranscription("user", interimTranscript);
    }

    // Process final transcript once complete
    if (finalTranscript) {
      console.log("Final User Transcript:", finalTranscript);
      processUserInput(finalTranscript);
    }
  };

  recognition.start(); // Start listening for user input
}

async function speakChatbotResponse(text) {
  // Display the transcription on the screen
  displayTranscription("bot", text);

  try {
    const response = await fetch("/speak", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: text }), // Send chatbot response for TTS
    });

    if (response.ok) {
      const data = await response.json();

      // Add a cache-busting query parameter to ensure the browser fetches the latest audio file
      const audioUrl = `${data.url}?t=${new Date().getTime()}`;

      if (currentAudio) {
        currentAudio.pause(); // Stop any previous audio
        currentAudio.currentTime = 0;
      }
      currentAudio = new Audio(audioUrl); // Update with new audio
      currentAudio.play().catch((error) => {
        console.error("Error playing audio:", error);
      });

      currentAudio.onended = () => {
        startSpeechRecognition();
      };
    } else {
      console.error("Error fetching TTS audio for chatbot response");
    }
  } catch (error) {
    console.error("Error in TTS fetch for chatbot response:", error);
  }
}

function displayTranscription(speaker, text) {
  const transcriptionElement = document.getElementById("transcription");

  transcriptionElement.innerHTML = "";

  const speakerLabel = speaker === "user" ? "Потребител:" : "Чатбот:";
  const newLine = document.createElement("p");
  newLine.textContent = `${speakerLabel} ${text}`;
  transcriptionElement.appendChild(newLine);
}

async function processUserInput(transcript) {
  try {
    const response = await fetch("/chatbot", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: transcript,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("Chatbot response:", data.response);

      // Display the chatbot's response
      displayTranscription("bot", data.response);

      // Trigger TTS for the chatbot response
      await speakChatbotResponse(data.response);
    } else {
      console.error("Error fetching chatbot response");
    }
  } catch (error) {
    console.error("Error in chatbot fetch:", error);
  }
}
