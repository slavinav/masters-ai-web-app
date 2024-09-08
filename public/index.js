const audio = document.getElementById("background-music");

// Function to play music
function playMusic() {
  audio.play();
}

// Event listener to play music on user click
window.addEventListener("click", playMusic);

function adjustFormForOrientation() {
  const form = document.getElementById("funForm");
  const h1 = document.getElementById("headline");

  // Get the current orientation
  const orientation = window.orientation;

  if (orientation === 0 || orientation === 180) {
    // Portrait mode
    form.style.maxHeight = "80vh";
    form.style.padding = "15px";
    h1.style.fontSize = "2em";
    h1.style.marginBottom = "20px";
  } else if (orientation === 90 || orientation === -90) {
    // Landscape mode
    form.style.maxHeight = "75vh";
    form.style.padding = "10px";
    h1.style.fontSize = "1.5em";
    h1.style.marginBottom = "10px";
  }
}

// Initial adjustment
adjustFormForOrientation();
// Listen for orientation changes
window.addEventListener("orientationchange", adjustFormForOrientation);

document.addEventListener("DOMContentLoaded", async () => {
  const submitButton = document.getElementById("submit-button");
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
        "generatedImagesData",
        result.imageData.revised_prompt
      );
      localStorage.setItem("generatedImagesUrl", result.imageData.url);
      submitButton.disabled = false;
    } else {
      console.error("Error generating images:", result.error);
    }
  } catch (error) {
    console.error("Error:", error);
  }
});
