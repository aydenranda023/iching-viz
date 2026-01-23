export function initAudio() {
    const audio = document.getElementById('bgm');
    const audioIcon = document.getElementById('audio-icon');
    const audioControl = document.getElementById('audio-control');

    if (!audio) {
        console.error("Audio element not found!");
        return;
    }

    audio.volume = 0.5;
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
                }).catch(e => console.error("Unlock failed:", e));

                // Clean up listeners immediately
                ['click', 'touchstart', 'touchend', 'pointerdown', 'keydown'].forEach(evt => {
                    document.removeEventListener(evt, enableAudio, { capture: true });
                });
            };

            // Use capture: true to intercept events before other handlers
            ['click', 'touchstart', 'touchend', 'pointerdown', 'keydown'].forEach(evt => {
                document.addEventListener(evt, enableAudio, { capture: true, once: true });
            });
        });
    }
}
