window.addEventListener("scroll", () => {
    const header = document.querySelector("header");
    if (window.scrollY > 50) {
        header.classList.add("floating");
    } else {
        header.classList.remove("floating");
    }
});

document.querySelector(".logo").addEventListener("click", (event) => {
    event.preventDefault();
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
});

document.querySelector(".home").addEventListener("click", (event) => {
    event.preventDefault();
    window.scrollTo({
        top: 1080,
        behavior: "smooth"
    });
});

const modal = document.getElementById("dashboard-modal");
const modalContent = document.querySelector(".modal-content");
const closeButton = document.querySelector(".close-button");

if (!modal) console.error("Modal-Element nicht gefunden.");
if (!modalContent) console.error("Modal-Inhalts-Element nicht gefunden.");
if (!closeButton) console.error("Schließen-Button nicht gefunden.");

function openModal() {
    if (modal) {
        modal.style.display = "flex";
        modal.classList.remove("fade-out");
        modal.classList.add("fade-in");
        console.log("Modal geöffnet.");
    } else {
        console.error("Modal-Element ist nicht definiert.");
    }
}

function closeModal() {
    if (modal) {
        modal.classList.remove("fade-in");
        modal.classList.add("fade-out");
        console.log("Modal wird geschlossen.");

        modal.addEventListener("animationend", handleAnimationEnd, { once: true });
    } else {
        console.error("Modal-Element ist nicht definiert.");
    }
}

function handleAnimationEnd() {
    modal.style.display = "none";
    modal.classList.remove("fade-out");
    console.log("Modal vollständig ausgeblendet und versteckt.");
}

const dashboardButton = document.getElementById("open-dashboard-button");
if (dashboardButton) {
    dashboardButton.addEventListener("click", openModal);
    console.log("Dashboard-Button Event Listener hinzugefügt.");
} else {
    console.error("Dashboard-Button mit der ID 'open-dashboard-button' nicht gefunden.");
}

if (closeButton) {
    closeButton.addEventListener("click", closeModal);
    console.log("Schließen-Button Event Listener hinzugefügt.");
} else {
    console.error("Schließen-Button nicht gefunden.");
}

if (modal) {
    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeModal();
            console.log("Klick außerhalb des Modals erkannt. Modal wird geschlossen.");
        }
    });
}

function copyToClipboard() {
    const textToCopy = "play.cookieattack.de";
    const copyIcon = document.getElementById("copyIcon");

    navigator.clipboard.writeText(textToCopy).then(() => {
        copyIcon.src = "img/copied-icon.png";
        copyIcon.classList.add("icon-copied");

        setTimeout(() => {
            copyIcon.classList.remove("icon-copied");
            copyIcon.offsetWidth;
            copyIcon.src = "img/copy-icon.png";
            copyIcon.classList.add("icon-copied");
        }, 1000);
    }).catch(err => {
        console.error("Kopieren fehlgeschlagen", err);
    });
}

const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
const particleCount = 100;
const minDistance = 50;
let mouseX = null;
let mouseY = null;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

canvas.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

function createParticles() {
    particles = Array.from({ length: particleCount }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 3 + 1,
    }));
}

function updateParticles() {
    particles.forEach((p, i) => {
        if (mouseX && mouseY) {
            const dx = mouseX - p.x;
            const dy = mouseY - p.y;
            const distanceToMouse = Math.sqrt(dx * dx + dy * dy);
            
            const attractionForce = Math.min(5 / distanceToMouse, 0.1);
            p.vx += dx * attractionForce;
            p.vy += dy * attractionForce;
        }

        p.x += p.vx;
        p.y += p.vy;
        p.vx = Math.min(Math.max(p.vx, -0.3), 0.3);
        p.vy = Math.min(Math.max(p.vy, -0.3), 0.3);

        if (p.x < 0 || p.x > canvas.width) p.vx = -p.vx;
        if (p.y < 0 || p.y > canvas.height) p.vy = -p.vy;

        particles.forEach((other, j) => {
            if (i !== j) {
                const dx = p.x - other.x;
                const dy = p.y - other.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < minDistance) {
                    const angle = Math.atan2(dy, dx);
                    p.vx += Math.cos(angle) * 0.05;
                    p.vy += Math.sin(angle) * 0.05;
                }
            }
        });
    });
}

function drawParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = '#ff7f00';
        ctx.fill();
    });
}

function animateParticles() {
    updateParticles();
    drawParticles();
    requestAnimationFrame(animateParticles);
}

createParticles();
animateParticles();