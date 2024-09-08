const timeline = gsap.timeline();
let screenWidth;
let screenHeight;

window.addEventListener("orientationchange", resetTimeline);

function adjustWidthBasedOnOrientation() {
  screenWidth = window.visualViewport.width * window.visualViewport.scale;
  screenHeight = window.visualViewport.height * window.visualViewport.scale;
}

function startBalloonAnimation() {
  const balloon = addBalloon();
  animateBalloon(balloon);
}

function addBalloon() {
  const container = document.querySelector(".balloonContainer");
  const balloon = document.createElement("img");

  // Randomly choose a balloon image
  const balloonImages = ["green.png", "pink.png", "red.png", "yellow.png"];
  const randomImage =
    balloonImages[Math.floor(Math.random() * balloonImages.length)];

  balloon.src = `images/${randomImage}`;
  balloon.classList.add("balloon");
  container.appendChild(balloon);
  return balloon;
}

// Function to animate a single balloon
function animateBalloon(balloon) {
  adjustWidthBasedOnOrientation();

  // Generate random values for the animation
  const duration = Math.random() * 5 + 5; // Random duration between 5 and 10 seconds
  const sign = Math.random() < 0.5 ? -1 : 1; // Randomly choose -1 or 1
  const startX = sign * Math.random() * (screenWidth / 2 - 80);

  gsap.set(balloon, { x: startX, y: screenHeight });

  // Animate the balloon
  timeline.to(balloon, {
    y: -screenHeight - balloon.height, // Move to the top of the screen
    duration: duration,
    ease: "power1.inOut",
    onComplete: () => {
      balloon.remove(); // Remove the balloon element at the end of the animation
      startBalloonAnimation();
    },
  });
}

function resetTimeline() {
  if (timeline) {
    timeline.totalProgress(1);
  }
  const balloons = document.querySelectorAll(".balloon");
  balloons.forEach((balloon) => balloon.remove()); // Remove all existing balloons
  startBalloonAnimation(); // Restart animation
}

// Start the animation loop
startBalloonAnimation();
