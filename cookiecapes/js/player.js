const defaultSkinPath = "/img/skin.png";
const API_BASE_URL = "https://api.cookieattack.de:8989";
const PLAYERS_PER_PAGE = 12;
const playerCardCanvasBackgroundColor = 0x1a1a1a; // Main page background for canvas in player cards

let allPlayersData = [];
let currentPage = 1;
let totalPages = 0;
let capeDataMap = new Map();

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

function getPlayerSkinUrl(identifier) {
    if (!identifier || typeof identifier !== 'string') {
        console.warn(`Invalid identifier for skin lookup: ${identifier}`);
        return defaultSkinPath;
    }
    return `https://starlightskins.lunareclipse.studio/render/skin/${identifier}/default`;
}

function displayCurrentPlayerPage() {
    const playerContainer = document.getElementById("playerContainer");
    const paginationControls = document.getElementById("paginationControls");

    if (!playerContainer || !paginationControls) {
        console.error("Player container or pagination controls not found!");
        return;
    }
    playerContainer.innerHTML = '';
    playerContainer.style.display = 'none';

    const startIndex = (currentPage - 1) * PLAYERS_PER_PAGE;
    const endIndex = startIndex + PLAYERS_PER_PAGE;
    const playersToShow = allPlayersData.slice(startIndex, endIndex);

    console.log(`Displaying page ${currentPage}, players ${startIndex + 1} to ${Math.min(endIndex, allPlayersData.length)} of ${allPlayersData.length}`);

    if (playersToShow.length > 0) {
        playersToShow.forEach((player) => {
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
            // capeInfoP.style.fontSize = '0.8em'; // Handled by CSS .player-card p:last-of-type
            // capeInfoP.style.color = '#aaa'; // Handled by CSS
            playerCard.appendChild(capeInfoP);

            playerContainer.appendChild(playerCard);

            try {
                const viewer = new skinview3d.SkinViewer({
                    canvas: canvas,
                    width: canvas.width,
                    height: canvas.height,
                    background: playerCardCanvasBackgroundColor
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
                    .then(() => {})
                    .catch(err => {
                        console.error(`Failed to load skin ${skinUrl}:`, err);
                        viewer.loadSkin(defaultSkinPath).catch(e => console.error("Failed to load default skin:", e));
                    });

                const capeId = player.current_cape_id;
                if (capeId !== null && capeId !== undefined && capeDataMap.has(capeId)) {
                    const correctedCapeUrl = capeDataMap.get(capeId);
                    viewer.loadCape(correctedCapeUrl, { backEquipment: 'cape' })
                        .then(() => {})
                        .catch(err => console.error(`Failed to load cape ${correctedCapeUrl}:`, err));
                } else {
                    viewer.loadCape(null);
                }

            } catch (viewerError) {
                console.error("Error initializing player SkinViewer:", viewerError);
                const errorP = document.createElement("p");
                errorP.style.cssText = `font-size: 0.8em; color: var(--error-color); margin-top: 5px;`;
                errorP.textContent = 'Vorschaufehler';
                playerCard.appendChild(errorP);
            }
        });
    }

    playerContainer.style.display = 'flex';
    renderPlayerPaginationControls();
    paginationControls.style.display = totalPages > 1 ? 'flex' : 'none';
}

function renderPlayerPaginationControls() {
    const controlsContainer = document.getElementById("paginationControls");
    if (!controlsContainer) return;
    controlsContainer.innerHTML = '';

    if (totalPages <= 1) {
        controlsContainer.style.display = 'none';
        return;
    }

    const prevButton = document.createElement("button");
    prevButton.textContent = "‹ Zurück";
    prevButton.disabled = currentPage === 1;
    prevButton.onclick = () => changePlayerPage(currentPage - 1);
    controlsContainer.appendChild(prevButton);

    const pageInfo = document.createElement("span");
    pageInfo.className = "pagination-info";
    pageInfo.textContent = `Seite ${currentPage} von ${totalPages}`;
    controlsContainer.appendChild(pageInfo);

    const nextButton = document.createElement("button");
    nextButton.textContent = "Weiter ›";
    nextButton.disabled = currentPage === totalPages;
    nextButton.onclick = () => changePlayerPage(currentPage + 1);
    controlsContainer.appendChild(nextButton);

    controlsContainer.style.display = 'flex';
}

function changePlayerPage(newPage) {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
        currentPage = newPage;
        displayCurrentPlayerPage();
        const container = document.getElementById("playerContainer");
        if (container) {
             window.scrollTo({ top: container.offsetTop - 100, behavior: 'smooth' });
        }
    }
}

async function fetchAllDataAndPaginate() {
    const playerContainer = document.getElementById("playerContainer");
    const loadingIndicator = document.getElementById("loadingIndicator");
    const loadingProgress = document.getElementById("loadingProgress"); // Assuming this span exists within loadingIndicator
    const paginationControls = document.getElementById("paginationControls");

    if (!playerContainer || !loadingIndicator || !paginationControls) { // Removed loadingProgress from this check as it's optional
        console.error("Essential elements for pagination/loading not found.");
        if(loadingIndicator) loadingIndicator.innerHTML = `<p style="color: var(--error-color);">Seitenfehler: Wichtige Elemente fehlen.</p>`;
        return;
    }
    
    const loadingIndicatorTextSpan = loadingIndicator.querySelector("span#loadingText") || loadingIndicator.appendChild(document.createElement('span'));
    loadingIndicatorTextSpan.id = "loadingText";


    loadingIndicator.style.display = 'block';
    if (loadingProgress) loadingProgress.textContent = ''; // Clear specific progress if element exists
    playerContainer.style.display = 'none';
    paginationControls.style.display = 'none';

    try {
        loadingIndicatorTextSpan.textContent = "Lade Capes...";
        const capesResponse = await fetch(`${API_BASE_URL}/list_capes`);
        if (!capesResponse.ok) throw new Error(`Failed to fetch capes: ${capesResponse.status}`);
        const capesResult = await capesResponse.json();
        capeDataMap.clear();

        (capesResult.capes || []).forEach(cape => {
            if (cape.cape_id !== undefined && cape.cape_image_url) {
                let originalImageUrl = cape.cape_image_url;
                let correctedImageUrl = originalImageUrl;

                try {
                    if (originalImageUrl && typeof originalImageUrl === 'string') {
                        const urlObj = new URL(originalImageUrl);
                        if (urlObj.protocol === 'http:' && urlObj.hostname === 'api.cookieattack.de' && urlObj.port === '8000') {
                            urlObj.protocol = 'https:';
                            urlObj.port = '8989';
                            correctedImageUrl = urlObj.toString();
                        }
                    }
                } catch (e) {
                    console.error(`Error processing cape URL: ${originalImageUrl}`, e);
                    correctedImageUrl = originalImageUrl; // Keep original if URL parsing fails
                }
                capeDataMap.set(cape.cape_id, correctedImageUrl);
            }
        });
        console.log(`Created cape lookup map with ${capeDataMap.size} entries.`);

        loadingIndicatorTextSpan.textContent = "Lade Spielerliste...";
        const playersResponse = await fetch(`${API_BASE_URL}/list_players`);
        if (!playersResponse.ok) throw new Error(`Failed to fetch players: ${playersResponse.status}`);
        const playersResult = await playersResponse.json();
        let players = playersResult.players || [];

        players = players.filter(p => !p.banned);

        if (players.length === 0) {
            playerContainer.innerHTML = `<p style="color: var(--text-color-dim);">Keine (nicht gebannten) Spieler registriert.</p>`;
            loadingIndicator.style.display = 'none';
            playerContainer.style.display = 'flex';
            paginationControls.style.display = 'none';
            return;
        }

        console.log(`Fetching details for ${players.length} players...`);
        const totalPlayersToFetch = players.length;
        let fetchedCount = 0;
        loadingIndicatorTextSpan.textContent = `Lade Spielerdetails (0/${totalPlayersToFetch})`;


        const playerDetailPromises = players.map(player =>
            fetch(`${API_BASE_URL}/get_player?identifier=${player.minecraft_uuid}`)
                .then(async (res) => {
                    fetchedCount++;
                    loadingIndicatorTextSpan.textContent = `Lade Spielerdetails (${fetchedCount}/${totalPlayersToFetch})`;
                    if (!res.ok) {
                        console.warn(`Failed to get details for UUID ${player.minecraft_uuid}: ${res.status}`);
                        return { ...player, minecraft_name: player.minecraft_uuid, detail_error: true }; // Use UUID as name placeholder
                    }
                    const details = await res.json();
                    return {
                        ...player, // Keep original player object data
                        minecraft_name: details.minecraft_name, // Overwrite/add minecraft_name from details
                        discord_id: details.discord_id,       // Add discord_id from details
                        detail_error: false
                     };
                })
                .catch(error => {
                    fetchedCount++;
                    loadingIndicatorTextSpan.textContent = `Lade Spielerdetails (${fetchedCount}/${totalPlayersToFetch})`;
                    console.error(`Error fetching details for UUID ${player.minecraft_uuid}:`, error);
                    return { ...player, minecraft_name: player.minecraft_uuid, detail_error: true }; // Use UUID as name placeholder
                })
        );

        allPlayersData = await Promise.all(playerDetailPromises);

        totalPages = Math.ceil(allPlayersData.length / PLAYERS_PER_PAGE);
        currentPage = 1;

        loadingIndicator.style.display = 'none';

        if (allPlayersData.length === 0) {
            playerContainer.innerHTML = `<p style="color: var(--text-color-dim);">Keine (nicht gebannten) Spieler gefunden.</p>`;
            playerContainer.style.display = 'flex';
            paginationControls.style.display = 'none';
        } else {
            displayCurrentPlayerPage();
        }

    } catch (error) {
        console.error("Error fetching or processing player data:", error);
        loadingIndicator.style.display = 'none';
        playerContainer.innerHTML = `<p style="color: var(--error-color);">Fehler beim Laden der Spielerliste: ${error.message}</p>`;
        playerContainer.style.display = 'flex';
        paginationControls.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchAllDataAndPaginate();
});