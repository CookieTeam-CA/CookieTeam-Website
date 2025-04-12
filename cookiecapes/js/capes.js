// --- START OF FILE capes.js ---

window.addEventListener("scroll", () => {
    const header = document.querySelector("header");
    // Safety check if header exists
    if (header) {
        if (window.scrollY > 50) {
            header.classList.add("floating");
        } else {
            header.classList.remove("floating");
        }
    }
});

/**
 * Constructs the correct HTTPS image URL for a given original URL from the API.
 * @param {string} originalUrl - The URL received from the API (e.g., http://...:8000/capes/1.png)
 * @returns {string|null} The corrected HTTPS URL or null if the original URL is invalid.
 */
function getCorrectCapeImageUrl(originalUrl) {
    if (!originalUrl || typeof originalUrl !== 'string') {
        return null;
    }
    try {
        // Extract the filename (e.g., "1.png")
        const filename = originalUrl.substring(originalUrl.lastIndexOf('/') + 1);
        if (!filename) return null; // No filename found
        // Construct the new URL
        return `https://api.cookieattack.de:8989/capes/${filename}`;
    } catch (e) {
        console.error("Error constructing correct cape image URL from:", originalUrl, e);
        return null;
    }
}


async function fetchAllCapes() {
    try {
        // Using the correct API endpoint provided in the original script.js
        const response = await fetch("https://api.cookieattack.de:8989/list_capes");

        if (!response.ok) {
            const text = await response.text();
            console.error("API-Fehler (fetchAllCapes):", response.status, text);
            // Optionally display user-friendly error
            const container = document.getElementById("capeContainer");
            if(container) container.innerHTML = '<p style="color: #ff6b6b;">Fehler beim Laden der Capes.</p>';
            return;
        }

        const result = await response.json();
        const capes = result.capes || []; // Default to empty array if 'capes' is missing

        const validCapes = capes.filter(cape => cape.cape_image_url && cape.cape_image_url.trim() !== "");

        const container = document.getElementById("capeContainer");
        if (!container) {
             console.error("Element with ID 'capeContainer' not found for fetchAllCapes.");
             return;
        }

        if (validCapes.length === 0) {
            console.warn("Keine gültigen Capes zum Anzeigen gefunden (fetchAllCapes).");
            container.innerHTML = '<p style="color: #ccc;">Keine Capes zum Anzeigen gefunden.</p>';
            return;
        }

        container.innerHTML = ""; // Clear previous content

        validCapes.forEach((cape) => {
            const previewDiv = document.createElement("div");
            previewDiv.className = "cape-preview";

            const canvas = document.createElement("canvas");
            // Adjust size as needed for the full capes page
            canvas.width = 200; // Example size
            canvas.height = 280; // Example size
            previewDiv.appendChild(canvas);

            const name = document.createElement("p");
            name.textContent = cape.cape_name || "Unbenanntes Cape"; // Use default name if missing
            previewDiv.appendChild(name);

            container.appendChild(previewDiv);

            // --- *** URL KORREKTUR *** ---
            const correctedImageUrl = getCorrectCapeImageUrl(cape.cape_image_url);
            // --- *** URL KORREKTUR *** ---

            if (!correctedImageUrl) {
                console.warn(`Could not generate correct image URL for cape ID ${cape.cape_id}`);
                previewDiv.innerHTML += '<p style="font-size: 0.8em; color: red;">Bild-URL ungültig</p>';
                return; // Skip initializing viewer if URL is bad
            }

            try {
                const viewer = new skinview3d.SkinViewer({
                    canvas: canvas,
                    width: canvas.width,
                    height: canvas.height,
                    skin: "/img/skin.png", // Default skin for gallery display
                    background: 0x2a2a3a // Match preview background
                });

                // --- *** VERWENDE KORRIGIERTE URL *** ---
                viewer.loadCape(correctedImageUrl, { backEquipment: 'cape' })
                    .catch(err => console.error(`Failed to load cape ${correctedImageUrl} for preview:`, err));
                // --- *** VERWENDE KORRIGIERTE URL *** ---

                viewer.fov = 70;
                viewer.zoom = 0.85;
                viewer.globalLight.intensity = 3; // Slightly brighter lights
                viewer.cameraLight.intensity = 3;
                viewer.autoRotate = true;
                viewer.animation = new skinview3d.WalkingAnimation();
                viewer.animation.speed = 0.5;

                // --- Click Listener Correction ---
                // This listener seems problematic as `skinViewer` is not defined in this scope.
                // Assuming it should reload the cape in *this specific* viewer instance (`viewer`).
                // If it's meant to interact with a *different* main viewer, that logic needs adjustment.
                previewDiv.addEventListener("click", () => {
                    // Load the cape into the clicked preview's viewer instance
                     console.log(`Clicked cape preview, attempting to load: ${correctedImageUrl}`);
                     viewer.loadCape(correctedImageUrl, { backEquipment: 'cape' })
                         .catch(err => console.error(`Failed to reload cape ${correctedImageUrl} on click:`, err));
                    // If you have a main viewer elsewhere (e.g., called `mainSkinViewer`):
                    // if (typeof mainSkinViewer !== 'undefined' && mainSkinViewer) {
                    //     mainSkinViewer.loadCape(correctedImageUrl);
                    // }
                });
                // --- End Click Listener Correction ---

            } catch (viewerError) {
                 console.error("Error initializing gallery SkinViewer:", viewerError);
                 previewDiv.innerHTML = `<p>Vorschaufehler für ${cape.cape_name || 'Cape'}</p>`;
            }
        });

    } catch (err) {
        console.error("Fehler beim Laden der Capes (fetchAllCapes):", err);
        const container = document.getElementById("capeContainer");
        if(container) container.innerHTML = '<p style="color: #ff6b6b;">Ein Fehler ist aufgetreten.</p>';
    }
}

// Ensure the function runs after the DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchAllCapes);
} else {
    fetchAllCapes(); // DOM is already ready
}
// --- END OF FILE capes.js ---