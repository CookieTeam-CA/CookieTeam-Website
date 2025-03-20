document.addEventListener('DOMContentLoaded', () => {
    const videoContainer = document.querySelector('.video-container');
    const scrollUpButton = document.querySelector('.scroll-up');
    const scrollDownButton = document.querySelector('.scroll-down');

    // Funktion, um alle .mp4-Dateien aus dem img-Ordner zu laden
    async function loadVideos() {
        try {
            // Hier könntest du eine Backend-API verwenden, um die Dateiliste zu erhalten
            // Beispiel: const response = await fetch('/api/videos');
            // const videos = await response.json();

            // Für dieses Beispiel nehmen wir an, dass wir eine Liste aller .mp4-Dateien haben
            const videos = [
                'img/89.mp4',
                'img/90.mp4',
                'img/91.mp4',
                'img/92.mp4',
                'img/93.mp4',
                'img/94.mp4',
                'img/95.mp4',
                'img/112.mp4',
                'img/113.mp4',
                'img/114.mp4',
                'img/115.mp4',
                'img/116.mp4',
                'img/117.mp4',
                'img/118.mp4',
                'img/119.mp4',
                'img/120.mp4',
                'img/121.mp4',
                'img/122.mp4'
            ];

            // Videos zum Container hinzufügen
            videos.forEach(videoSrc => {
                const videoItem = document.createElement('div');
                videoItem.classList.add('video-item');

                const videoElement = document.createElement('video');
                videoElement.src = videoSrc;
                videoElement.muted = false; // Sound ist aktiviert
                videoElement.loop = true;
                videoElement.playsInline = true;
                videoElement.autoplay = false; // Autoplay deaktiviert

                videoItem.appendChild(videoElement);
                videoContainer.appendChild(videoItem);
            });

            // Automatisches Abspielen von sichtbaren Videos
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    const video = entry.target.querySelector('video');
                    if (entry.isIntersecting) {
                        video.play();
                    } else {
                        video.pause();
                        video.currentTime = 0; // Video zurücksetzen, wenn es nicht sichtbar ist
                    }
                });
            }, { threshold: 0.5 });

            document.querySelectorAll('.video-item').forEach(item => {
                observer.observe(item);
            });

            // Scroll-Buttons
            scrollUpButton.addEventListener('click', () => {
                const currentVideo = document.querySelector('.video-item:first-of-type');
                currentVideo.scrollIntoView({ behavior: 'smooth' });
            });

            scrollDownButton.addEventListener('click', () => {
                const nextVideo = document.querySelector('.video-item:last-of-type');
                nextVideo.scrollIntoView({ behavior: 'smooth' });
            });
        } catch (error) {
            console.error('Fehler beim Laden der Videos:', error);
        }
    }

    // Videos laden
    loadVideos();
});