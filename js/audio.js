export function initAudio() {
    const audio = document.getElementById('bgm');
    const audioIcon = document.getElementById('audio-icon');
    const audioControl = document.getElementById('audio-control');

    if (!audio || !audioIcon || !audioControl) {
        console.error("Audio elements not found!");
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
        if (audio.muted) {
            audioIcon.src = iconMute;
        } else if (audio.paused) {
            // If paused but NOT muted, we might be in "waiting for interaction" state
            // or user manually paused.
            // For this specific requirement, if user manually paused, we show mute icon?
            // Or we need a separate "Pause" state?
            // The user only provided "Volume-2_1" (Sound) and "Volume-2_Mute" (Mute).
            // So "Pause" usually implies "Mute" or "Off" visually here.
            audioIcon.src = iconMute;
        } else {
            audioIcon.src = iconPlay;
        }
    }

    // Toggle function
    function toggleAudio() {
        if (audio.paused) {
            audio.play().then(() => {
                audioIcon.src = iconPlay; // Force update
            }).catch(e => console.error("Play failed:", e));
        } else {
            // If playing, we pause it (effectively muting/stopping)
            audio.pause();
            audioIcon.src = iconMute;
        }
    }

    // Bind click event
    audioControl.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering other clicks
        toggleAudio();
    });

    // Initial State: Assume we want to play, so show Play icon
    audioIcon.src = iconPlay;

    // Try to play automatically
    const playPromise = audio.play();

    if (playPromise !== undefined) {
        playPromise.then(() => {
            // Autoplay success
            updateIcon();
        }).catch(error => {
            console.log("Autoplay prevented. Waiting for user interaction.");
            // Autoplay failed.
            // CRITICAL CHANGE: Do NOT call updateIcon() here, which would set it to Mute.
            // We want it to look like it's "on" and waiting for the first touch.
            audioIcon.src = iconPlay;

            const enableAudio = () => {
                audio.play().then(() => {
                    updateIcon();
                });
                document.removeEventListener('click', enableAudio);
                document.removeEventListener('touchstart', enableAudio);
            };

            document.addEventListener('click', enableAudio);
            document.addEventListener('touchstart', enableAudio);
        });
    }
}
