// --- Constants ---
const defaultSkinPath = "/img/skin.png";
const API_BASE_URL = "https://api.cookieattack.de:8989"; // Adjust port if needed
const PLAYERS_PER_PAGE = 12; // Number of players to show per page

// --- Pagination State ---
let allPlayersData = []; // Holds ALL fetched and processed player data
let currentPage = 1;
let totalPages = 0;
let capeDataMap = new Map(); // To store capeId -> capeUrl mapping

// --- Utility Functions ---

// Floating header logic
window.addEventListener("scroll", () => {
    const header = document.querySelector("header");
    if (header) {
        if (window.scrollY > 50) {
            header.classList.add("floating");
        } else {
            header.classList.remove("floating");
        }
    }
});

// Function to get the skin URL for a Minecraft name/UUID
function getPlayerSkinUrl(identifier) {
    if (!identifier || typeof identifier !== 'string') {
        console.warn(`Invalid identifier for skin lookup: ${identifier}`);
        return defaultSkinPath;
    }
    return `https://starlightskins.lunareclipse.studio/render/skin/${identifier}/default`;
}

// --- Pagination & Rendering Logic ---

// Display Players for the Current Page
function displayCurrentPlayerPage() {
    const playerContainer = document.getElementById("playerContainer");
    const paginationControls = document.getElementById("paginationControls");

    if (!playerContainer || !paginationControls) {
        console.error("Player container or pagination controls not found!");
        return;
    }
    playerContainer.innerHTML = ''; // Clear previous page's players
    playerContainer.style.display = 'none'; // Hide while populating

    const startIndex = (currentPage - 1) * PLAYERS_PER_PAGE;
    const endIndex = startIndex + PLAYERS_PER_PAGE;
    const playersToShow = allPlayersData.slice(startIndex, endIndex);

    console.log(`Displaying page ${currentPage}, players ${startIndex + 1} to ${Math.min(endIndex, allPlayersData.length)} of ${allPlayersData.length}`);

    if (playersToShow.length === 0) {
        // This case should be covered by the initial fetch check
    } else {
        playersToShow.forEach((player) => {
            // Create and append the player card elements
            const playerCard = document.createElement("div");
            playerCard.className = "player-card";

            const canvas = document.createElement("canvas");
            canvas.width = 180;
            canvas.height = 250;
            playerCard.appendChild(canvas);

            const nameP = document.createElement("p");
            nameP.textContent = player.minecraft_name || player.minecraft_uuid;
            if (player.detail_error && player.minecraft_name === player.minecraft_uuid) {
                nameP.style.fontStyle = 'italic';
                nameP.title = 'Spielername konnte nicht abgerufen werden';
            }
            playerCard.appendChild(nameP);

            const capeIdText = player.current_cape_id !== null && player.current_cape_id !== undefined
                ? `Cape ID: ${player.current_cape_id}`
                : 'Kein Cape';
            const capeInfoP = document.createElement("p");
            capeInfoP.textContent = capeIdText;
            capeInfoP.style.fontSize = '0.8em';
            capeInfoP.style.color = '#aaa';
            playerCard.appendChild(capeInfoP);

            playerContainer.appendChild(playerCard);

            // Initialize SkinViewer for this card
            try {
                const viewer = new skinview3d.SkinViewer({
                    canvas: canvas,
                    width: canvas.width,
                    height: canvas.height,
                    background: 0x2a2a3a
                });

                viewer.fov = 70;
                viewer.zoom = 0.9;
                viewer.globalLight.intensity = 2.8;
                viewer.cameraLight.intensity = 0.7;
                viewer.autoRotate = true;
                viewer.autoRotateSpeed = 0.6;

                const skinIdentifier = player.minecraft_uuid || player.minecraft_name;
                const skinUrl = getPlayerSkinUrl(skinIdentifier);
                viewer.loadSkin(skinUrl)
                    .then(() => {/* console.log(`Loaded skin for ${player.minecraft_name || skinIdentifier}`) */}) // Reduce console spam
                    .catch(err => {
                        console.error(`Failed to load skin ${skinUrl}:`, err);
                        viewer.loadSkin(defaultSkinPath).catch(e => console.error("Failed to load default skin:", e));
                    });

                const capeId = player.current_cape_id;
                if (capeId !== null && capeId !== undefined && capeDataMap.has(capeId)) {
                    const capeUrl = capeDataMap.get(capeId);
                    viewer.loadCape(capeUrl, { backEquipment: 'cape' })
                        .then(() => {/* console.log(`Loaded cape ${capeId} for ${player.minecraft_name || skinIdentifier}`) */}) // Reduce console spam
                        .catch(err => console.error(`Failed to load cape ${capeUrl}:`, err));
                } else {
                    viewer.loadCape(null);
                }

            } catch (viewerError) {
                console.error("Error initializing player SkinViewer:", viewerError);
                const errorP = document.createElement("p");
                errorP.style.cssText = 'font-size: 0.8em; color: red; margin-top: 5px;';
                errorP.textContent = 'Vorschaufehler';
                playerCard.appendChild(errorP);
            }
        });
    }

    playerContainer.style.display = 'flex'; // Show the container with players
    renderPlayerPaginationControls(); // Update pagination controls
    paginationControls.style.display = totalPages > 1 ? 'flex' : 'none'; // Show controls only if needed
}

// Render Pagination Controls
function renderPlayerPaginationControls() {
    const controlsContainer = document.getElementById("paginationControls");
    if (!controlsContainer) return;
    controlsContainer.innerHTML = ''; // Clear existing

    if (totalPages <= 1) {
        controlsContainer.style.display = 'none';
        return; // No controls needed
    }

    // Previous Button
    const prevButton = document.createElement("button");
    prevButton.textContent = "‹ Zurück";
    prevButton.disabled = currentPage === 1;
    prevButton.onclick = () => changePlayerPage(currentPage - 1);
    controlsContainer.appendChild(prevButton);

    // Page Info Span
    const pageInfo = document.createElement("span");
    pageInfo.className = "pagination-info";
    pageInfo.textContent = `Seite ${currentPage} von ${totalPages}`;
    controlsContainer.appendChild(pageInfo);

    // Next Button
    const nextButton = document.createElement("button");
    nextButton.textContent = "Weiter ›";
    nextButton.disabled = currentPage === totalPages;
    nextButton.onclick = () => changePlayerPage(currentPage + 1);
    controlsContainer.appendChild(nextButton);

    controlsContainer.style.display = 'flex'; // Ensure visible
}

// Change Page Function
function changePlayerPage(newPage) {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
        currentPage = newPage;
        displayCurrentPlayerPage(); // Redraw players for the new page
        // Scroll to top of player list
        const container = document.getElementById("playerContainer");
        if (container) {
             window.scrollTo({ top: container.offsetTop - 100, behavior: 'smooth' });
        }
    }
}

// --- Data Fetching ---

// Fetch ALL data (Capes, Players, Player Details) and Initialize Pagination
async function fetchAllDataAndPaginate() {
    const playerContainer = document.getElementById("playerContainer");
    const loadingIndicator = document.getElementById("loadingIndicator");
    const loadingProgress = document.getElementById("loadingProgress");
    const paginationControls = document.getElementById("paginationControls");

    if (!playerContainer || !loadingIndicator || !paginationControls || !loadingProgress) {
        console.error("Essential elements for pagination/loading not found.");
        if(loadingIndicator) loadingIndicator.innerHTML = '<p style="color: #ff6b6b;">Seitenfehler: Wichtige Elemente fehlen.</p>';
        return;
    }

    loadingIndicator.style.display = 'block';
    loadingProgress.textContent = ''; // Clear progress text initially
    playerContainer.style.display = 'none';
    paginationControls.style.display = 'none'; // Hide controls initially

    try {
        // Step 1: Fetch Capes
        loadingIndicator.querySelector("span").textContent = "(Lade Capes...)";
        const capesResponse = await fetch(`${API_BASE_URL}/list_capes`);
        if (!capesResponse.ok) throw new Error(`Failed to fetch capes: ${capesResponse.status}`);
        const capesResult = await capesResponse.json();
        capeDataMap.clear(); // Ensure map is empty before populating
        (capesResult.capes || []).forEach(cape => {
            if (cape.cape_id !== undefined && cape.cape_image_url) {
                capeDataMap.set(cape.cape_id, cape.cape_image_url);
            }
        });
        console.log(`Created cape lookup map with ${capeDataMap.size} entries.`);

        // Step 2: Fetch Players List
        loadingIndicator.querySelector("span").textContent = "(Lade Spielerliste...)";
        const playersResponse = await fetch(`${API_BASE_URL}/list_players`);
        if (!playersResponse.ok) throw new Error(`Failed to fetch players: ${playersResponse.status}`);
        const playersResult = await playersResponse.json();
        let players = playersResult.players || [];

        // Filter out banned players *before* fetching details
        players = players.filter(p => !p.banned);

        if (players.length === 0) {
            playerContainer.innerHTML = '<p style="color: #ccc;">Keine (nicht gebannten) Spieler registriert.</p>';
            loadingIndicator.style.display = 'none';
            playerContainer.style.display = 'flex';
            paginationControls.style.display = 'none';
            return;
        }

        // Step 3: Fetch Player Details (Name) concurrently
        console.log(`Fetching details for ${players.length} players...`);
        const totalPlayersToFetch = players.length;
        let fetchedCount = 0;
        loadingIndicator.querySelector("span").textContent = `(Lade Spielerdetails 0/${totalPlayersToFetch})`;

        const playerDetailPromises = players.map(player =>
            fetch(`${API_BASE_URL}/get_player?identifier=${player.minecraft_uuid}`)
                .then(async (res) => {
                    fetchedCount++;
                    loadingIndicator.querySelector("span").textContent = `(Lade Spielerdetails ${fetchedCount}/${totalPlayersToFetch})`;
                    if (!res.ok) {
                        console.warn(`Failed to get details for UUID ${player.minecraft_uuid}: ${res.status}`);
                        return { ...player, minecraft_name: player.minecraft_uuid, detail_error: true };
                    }
                    const details = await res.json();
                    // Only keep necessary details to avoid overwriting base player data like banned status if API changes
                    return {
                        ...player,
                        minecraft_name: details.minecraft_name,
                        discord_id: details.discord_id, // Keep discord ID if needed
                        detail_error: false
                     };
                })
                .catch(error => {
                    fetchedCount++;
                    loadingIndicator.querySelector("span").textContent = `(Lade Spielerdetails ${fetchedCount}/${totalPlayersToFetch})`;
                    console.error(`Error fetching details for UUID ${player.minecraft_uuid}:`, error);
                    return { ...player, minecraft_name: player.minecraft_uuid, detail_error: true };
                })
        );

        allPlayersData = await Promise.all(playerDetailPromises);

        // Optional: Sort players after fetching details
        // allPlayersData.sort((a, b) => (a.minecraft_name || "").localeCompare(b.minecraft_name || ""));

        // Step 4: Setup Pagination and Display First Page
        totalPages = Math.ceil(allPlayersData.length / PLAYERS_PER_PAGE);
        currentPage = 1;

        loadingIndicator.style.display = 'none'; // Hide loading indicator

        if (allPlayersData.length === 0) {
            // Should have been caught earlier, but double-check
            playerContainer.innerHTML = '<p style="color: #ccc;">Keine (nicht gebannten) Spieler gefunden.</p>';
            playerContainer.style.display = 'flex';
            paginationControls.style.display = 'none';
        } else {
            displayCurrentPlayerPage(); // Display the first page
        }

    } catch (error) {
        console.error("Error fetching or processing player data:", error);
        loadingIndicator.style.display = 'none';
        playerContainer.innerHTML = `<p style="color: #ff6b6b;">Fehler beim Laden der Spielerliste: ${error.message}</p>`;
        playerContainer.style.display = 'flex';
        paginationControls.style.display = 'none'; // Hide controls on error
    }
}

// --- Event Listener Setup ---
document.addEventListener('DOMContentLoaded', () => {
    fetchAllDataAndPaginate(); // Start the data fetching and pagination process
});