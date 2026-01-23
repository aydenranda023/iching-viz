export function initAudio() {
    const audio = new Audio('./music/generative-soundscape-organic-granular-synthesis-soft-glitch-textures-biomorphic-sounds-gentle-sub-bass-floating-weightless-dreamy-introspection-finding-inner-voice-calming-hypnotic-meditative-soft-chimes-in-dista.mp3');
    audio.loop = true;
    audio.volume = 0.5; // Set a reasonable default volume

    // Try to play automatically
    const playPromise = audio.play();

    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.log("Autoplay prevented. Waiting for user interaction.");
            // Auto-play was prevented
            // Show a UI element to let the user manually start playback
            const enableAudio = () => {
                audio.play();
                document.removeEventListener('click', enableAudio);
                document.removeEventListener('touchstart', enableAudio);
            };

            document.addEventListener('click', enableAudio);
            document.addEventListener('touchstart', enableAudio);
        });
    }
}
