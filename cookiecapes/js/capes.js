window.addEventListener("scroll", () => {
    const header = document.querySelector("header");
    if (window.scrollY > 50) {
        header.classList.add("floating");
    } else {
        header.classList.remove("floating");
    }
});

async function fetchAllCapes() {
    try {
        const response = await fetch("http://api.cookieattack.de:8000/list_capes");

        if (!response.ok) {
            const text = await response.text();
            console.error("API-Fehler:", response.status, text);
            return;
        }

        const result = await response.json();
        const capes = result.capes;

        const validCapes = capes.filter(cape => cape.cape_image_url && cape.cape_image_url.trim() !== "");

        if (validCapes.length === 0) {
            console.warn("Keine gültigen Capes gefunden.");
            return;
        }

        const container = document.getElementById("capeContainer");
        container.innerHTML = "";

        validCapes.forEach((cape) => {
            const previewDiv = document.createElement("div");
            previewDiv.className = "cape-preview";

            const canvas = document.createElement("canvas");
            canvas.width = 300;
            canvas.height = 350;
            previewDiv.appendChild(canvas);

            const name = document.createElement("p");
            name.textContent = cape.cape_name;
            previewDiv.appendChild(name);

            container.appendChild(previewDiv);

            const viewer = new skinview3d.SkinViewer({
                canvas: canvas,
                width: 300,
                height: 350,
                skin: "/img/skin.png"
            });

            viewer.loadCape(cape.cape_image_url);
            viewer.autoRotate = true;
            viewer.animation = new skinview3d.WalkingAnimation();
            viewer.animation.speed = 0.5;

            previewDiv.addEventListener("click", () => {
                skinViewer.loadCape(cape.cape_image_url);
            });
        });

    } catch (err) {
        console.error("Fehler beim Laden der Capes:", err);
    }
}

fetchAllCapes();
