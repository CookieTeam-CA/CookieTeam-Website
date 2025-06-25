document.addEventListener('DOMContentLoaded', () => {
    
    // Teil 1: Hintergrund-Emoji-Animation
    const emoteContainer = document.querySelector('.background-animation-container');
    if (emoteContainer) {
        const emoteChars = ['🎉', '🎈', '🎂', '🎁', '🥳', '✨'];
        
        function animateAndRemove(element) {
            const startX = anime.random(0, window.innerWidth);
            const startY = window.innerHeight + anime.random(50, 150);
            element.style.left = `${startX}px`;
            element.style.top = `${startY}px`;
            
            anime({
                targets: element,
                translateY: `-${window.innerHeight + 250}px`,
                translateX: [
                    { value: `+=${anime.random(-80, 80)}`, duration: 3000 },
                    { value: `-=${anime.random(-80, 80)}`, duration: 3000 }
                ],
                rotate: { value: '1turn', duration: anime.random(6000, 12000), easing: 'linear' },
                opacity: [{ value: 1, duration: 500 }, { value: 1, duration: anime.random(5000, 9000) }, { value: 0, duration: 500 }],
                duration: anime.random(7000, 12000),
                easing: 'linear',
                complete: () => element.remove()
            });
        }

        function createRandomEmote() {
            const emote = document.createElement('div');
            emote.classList.add('emote');
            emote.innerText = emoteChars[anime.random(0, emoteChars.length - 1)];
            emoteContainer.appendChild(emote);
            animateAndRemove(emote);
        }

        // Starte einen kontinuierlichen Strom von Emojis
        setInterval(createRandomEmote, 600);
    }

    // Teil 2: GSAP Titel-Animation
    const h1 = document.querySelector('h1');
    if (h1 && h1.textContent.trim().length > 0) {
        const text = h1.textContent;
        const splitText = text.split("");
        h1.textContent = "";

        splitText.forEach(char => {
            const span = document.createElement('span');
            span.className = 'letter';
            span.textContent = char === ' ' ? '\u00A0' : char; // Leerzeichen behandeln
            h1.appendChild(span);
        });

        gsap.from('.letter', {
            y: "100%",
            opacity: 0,
            rotationZ: -20,
            duration: 1,
            ease: "power3.out",
            stagger: 0.05
        });
    }
});