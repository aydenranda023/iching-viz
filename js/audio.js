export function initAudio() {
    const audio = document.getElementById('bgm');
    const audioIcon = document.getElementById('audio-icon');
    const audioControl = document.getElementById('audio-control');

    // Rotating sound
    const rotatingAudio = new Audio('./music/rotating.mp3');
    rotatingAudio.loop = true;
    rotatingAudio.volume = 0;
    let fadeOutInterval = null;


    if (!audio) {
        console.error("Audio element not found!");
        return;
    }

    audio.volume = 0.4;
    // Ensure we start unmuted
    audio.muted = false;

    // Icons
    const iconMute = './icon/Volume-2_Mute.png';
    const iconPlay = './icon/Volume-2_1.png';

    // Update icon based on state
    function updateIcon() {
        if (!audioIcon) return; // Skip if no icon

        if (audio.muted) {
            audioIcon.src = iconMute;
        } else if (audio.paused) {
            audioIcon.src = iconMute;
        } else {
            audioIcon.src = iconPlay;
        }
    }

    // Toggle function
    function toggleAudio() {
        if (audio.paused) {
            audio.play().then(() => {
                if (audioIcon) audioIcon.src = iconPlay; // Force update
            }).catch(e => console.error("Play failed:", e));
        } else {
            // If playing, we pause it (effectively muting/stopping)
            audio.pause();
            if (audioIcon) audioIcon.src = iconMute;
        }
    }

    // Bind click event if control exists
    if (audioControl) {
        audioControl.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering other clicks
            toggleAudio();
        });
    }

    // Initial State: Assume we want to play, so show Play icon
    if (audioIcon) audioIcon.src = iconPlay;

    // Try to play automatically
    const playPromise = audio.play();

    if (playPromise !== undefined) {
        playPromise.then(() => {
            // Autoplay success
            updateIcon();
        }).catch(error => {
            console.log("Autoplay prevented. Waiting for user interaction.");
            // Autoplay failed.
            if (audioIcon) audioIcon.src = iconPlay;

            const enableAudio = () => {
                audio.play().then(() => {
                    updateIcon();
                    console.log("Audio unlocked by user interaction.");
                    // Only remove listeners if playback succeeded
                    ['click', 'touchstart', 'touchend', 'pointerdown', 'keydown'].forEach(evt => {
                        document.removeEventListener(evt, enableAudio, { capture: true });
                    });
                }).catch(e => {
                    console.error("Unlock failed (will retry on next interaction):", e);
                    // Do NOT remove listeners here, let them trigger again
                });
            };

            // Use capture: true to intercept events before other handlers
            // Removed 'once: true' so we can retry if needed
            ['click', 'touchstart', 'touchend', 'pointerdown', 'keydown'].forEach(evt => {
                document.addEventListener(evt, enableAudio, { capture: true });
            });
        });
    }
}

let rotatingAudioInstance = null;
let fadeOutInterval = null;

export function playRotatingSound() {
    if (!rotatingAudioInstance) {
        rotatingAudioInstance = new Audio('./music/rotating.mp3');
        rotatingAudioInstance.loop = true;
    }

    // Clear any existing fade out
    if (fadeOutInterval) {
        clearInterval(fadeOutInterval);
        fadeOutInterval = null;
    }

    if (rotatingAudioInstance.paused) {
        rotatingAudioInstance.volume = 1.0;
        rotatingAudioInstance.play().catch(e => console.log("Rotating sound play failed (likely interaction required):", e));
    } else {
        // If already playing, ensure volume is up
        rotatingAudioInstance.volume = 1.0;
    }
}

export function stopRotatingSound() {
    if (!rotatingAudioInstance || rotatingAudioInstance.paused) return;

    // If already fading out, don't start another one
    if (fadeOutInterval) return;

    fadeOutInterval = setInterval(() => {
        if (rotatingAudioInstance.volume > 0.05) {
            rotatingAudioInstance.volume -= 0.05;
        } else {
            rotatingAudioInstance.pause();
            rotatingAudioInstance.volume = 0;
            clearInterval(fadeOutInterval);
            fadeOutInterval = null;
        }
    }, 50); // Fade out over ~0.5 seconds
}
