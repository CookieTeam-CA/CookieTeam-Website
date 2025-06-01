document.addEventListener('DOMContentLoaded', () => {
    // Monat ist 0-indiziert: Juli ist der 6. Monat
    const targetDate = new Date(2025, 6, 4, 16, 0, 0).getTime();

    // Elemente des Countdowns abrufen
    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');
    const eventMessageEl = document.getElementById('event-message');
    const countdownContainer = document.getElementById('countdown');

    function updateCountdown() {
        const now = new Date().getTime();
        const distance = targetDate - now; // Differenz in Millisekunden

        // Wenn der Countdown abgelaufen ist
        if (distance < 0) {
            clearInterval(countdownInterval); // Stoppt den Interval
            eventMessageEl.innerHTML = '🎉 CookieAttack 5 beginnt 🎉';
            countdownContainer.style.display = 'none'; // Versteckt den Countdown
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        daysEl.innerHTML = String(days).padStart(2, '0');
        hoursEl.innerHTML = String(hours).padStart(2, '0');
        minutesEl.innerHTML = String(minutes).padStart(2, '0');
        secondsEl.innerHTML = String(seconds).padStart(2, '0');
    }

    // Die Funktion einmal direkt aufrufen, um eine sofortige Anzeige zu gewährleisten
    updateCountdown();

    // Den Countdown jede Sekunde aktualisieren
    const countdownInterval = setInterval(updateCountdown, 1000);
});