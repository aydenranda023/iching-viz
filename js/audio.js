export function initAudio() {
    const audio = document.getElementById('bgm');
    const audioIcon = document.getElementById('audio-icon');
    const audioControl = document.getElementById('audio-control');

    if (!audio || !audioIcon || !audioControl) {
        console.error("Audio elements not found!");
        return;
    }

    audio.volume = 0.5;

    // Icons
    const iconMute = './icon/Volume-2_Mute.png';
    const iconPlay = './icon/Volume-2_1.png';

    // Update icon based on state
    function updateIcon() {
        if (audio.paused || audio.muted) {
            audioIcon.src = iconMute;
        } else {
            audioIcon.src = iconPlay;
        }
    }

    // Toggle function
    function toggleAudio() {
        if (audio.paused) {
            audio.play().then(() => {
                updateIcon();
            }).catch(e => console.error("Play failed:", e));
        } else {
            if (audio.muted) {
                audio.muted = false;
                updateIcon();
            } else {
                audio.muted = true; // Or pause? User usually expects pause or mute. Let's pause for "off".
                audio.pause();
                updateIcon();
            }
        }
    }

    // Bind click event
    audioControl.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering other clicks
        toggleAudio();
    });

    // Initial autoplay attempt
    const playPromise = audio.play();

    if (playPromise !== undefined) {
        playPromise.then(() => {
            updateIcon();
        }).catch(error => {
            console.log("Autoplay prevented. Waiting for user interaction.");
            updateIcon(); // Should show mute initially if autoplay failed

            const enableAudio = () => {
                audio.play().then(() => updateIcon());
                document.removeEventListener('click', enableAudio);
                document.removeEventListener('touchstart', enableAudio);
            };

            document.addEventListener('click', enableAudio);
            document.addEventListener('touchstart', enableAudio);
        });
    }
}
