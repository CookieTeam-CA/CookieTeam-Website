document.addEventListener('DOMContentLoaded', () => {
    const gallery = document.querySelector('.gallery');
    const items = Array.from(gallery.children);
    const searchSelect = document.getElementById('searchSelect');
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalVideo = document.getElementById('modalVideo');
    const modalInfo = document.getElementById('modalInfo');
    const modalTags = document.getElementById('modalTags');
    const modalTitle = document.getElementById('modalTitle');
    const closeBtn = document.querySelector('.close');
    const downloadBtn = document.getElementById('downloadBtn');
    
    const xButton = document.createElement('button');
    xButton.innerText = 'X';
    xButton.classList.add('x-button');
    modal.appendChild(xButton);

    let resizeTimer;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            msnry.layout();
        }, 300); // Layout nur alle 300ms aktualisieren
    });

    let titles = [];
    const tagOptions = Array.from(searchSelect.options);

    const tagColors = {
        cookieattack3: '#ffa500',
        cookieattack4: '#ffa500',
        minecraft: '#008000',
        leon: '#0000FF',
        frogi: '#008000',
        mace: '#ffa500',
        eflix: '#C0C0FF',
        rl: '#0000FF',
        crazy: '#8800ff',
        nils: '#8800ff'
    };

    tagOptions.forEach(option => {
        const color = tagColors[option.value];
        if (color) {
            option.style.backgroundColor = color;
            option.style.color = 'white';
        }
    });

    fetch('titles.txt')
        .then(response => response.text())
        .then(text => {
            titles = text.split('\n').map(line => line.trim());
        });

    // Funktion zur Überprüfung, ob ein GIF existiert
    async function checkGifExists(gifPath) {
        try {
            const response = await fetch(gifPath);
            return response.ok;
        } catch {
            return false;
        }
    }

    items.forEach((item, index) => {
        const isVideo = item.querySelector('video') !== null;

        if (isVideo) {
            const video = item.querySelector('video');
            const videoLabel = document.createElement('div');
            videoLabel.innerText = 'VIDEO';
            videoLabel.classList.add('video-label');
            item.appendChild(videoLabel);

            // Vorschau für Videos (GIF oder Platzhalter-Bild)
            const videoSrc = video.getAttribute('src');
            const videoNumber = videoSrc.match(/\d+/)[0]; // Extrahiere die Nummer aus dem Dateinamen
            const gifPath = `img/gifs/${videoNumber}.gif`;

            checkGifExists(gifPath).then((gifExists) => {
                const previewImg = document.createElement('img');
                previewImg.classList.add('video-preview');
                previewImg.src = gifExists ? gifPath : 'img/assets/no_preview.png';
                previewImg.alt = `Vorschau ${videoNumber}`;
                item.insertBefore(previewImg, video);

                // Verstecke das Video-Element, bis es angeklickt wird
                video.style.display = 'none';
            });

            item.addEventListener('click', () => {
                const tags = item.getAttribute('data-tags').split(',').map(tag => tag.trim());
                const title = titles[index] || `Video ${index + 1}`;

                modalImage.style.display = 'none';
                modalVideo.style.display = 'block';
                modalVideo.src = videoSrc;
                modalVideo.play();

                modalTags.innerHTML = '';
                tags.forEach(tagId => {
                    const option = tagOptions.find(opt => opt.value === tagId);
                    if (option) {
                        const tagElement = document.createElement('div');
                        tagElement.classList.add('tag');
                        tagElement.innerText = option.innerText;
                        tagElement.style.backgroundColor = tagColors[tagId] || '#555';
                        modalTags.appendChild(tagElement);
                    }
                });

                modalTitle.innerText = `Titel: ${title}`;
                downloadBtn.href = videoSrc;

                modal.style.display = 'block';
                modal.classList.add('show');
            });
        } else {
            item.addEventListener('click', () => {
                const tags = item.getAttribute('data-tags').split(',').map(tag => tag.trim());
                const title = titles[index] || `Bild ${index + 1}`;
                const pngSrc = `img/png/${index + 1}.png`;

                modalImage.src = pngSrc;
                modalVideo.style.display = 'none';
                modalImage.style.display = 'block';

                modalTags.innerHTML = '';
                tags.forEach(tagId => {
                    const option = tagOptions.find(opt => opt.value === tagId);
                    if (option) {
                        const tagElement = document.createElement('div');
                        tagElement.classList.add('tag');
                        tagElement.innerText = option.innerText;
                        tagElement.style.backgroundColor = tagColors[tagId] || '#555';
                        modalTags.appendChild(tagElement);
                    }
                });

                modalTitle.innerText = `Titel: ${title}`;
                downloadBtn.href = pngSrc;

                modal.style.display = 'block';
                modal.classList.add('show');
            });
        }
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        modal.classList.remove('show');
        modalVideo.pause();
    });

    xButton.addEventListener('click', () => {
        modal.style.display = 'none';
        modal.classList.remove('show');
        modalVideo.pause();
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
            modalVideo.pause();
        }
    });

    items.sort(() => Math.random() - 0.5);
    gallery.innerHTML = '';
    items.forEach(item => gallery.appendChild(item));

    const msnry = new Masonry(gallery, {
        itemSelector: '.gallery-item',
        columnWidth: '.gallery-item',
        percentPosition: true,
        gutter: 10
    });

    imagesLoaded(gallery, () => {
        msnry.layout();
    });

    searchSelect.addEventListener('change', () => {
        const selectedTag = searchSelect.value.toLowerCase();
        items.forEach(item => {
            const tags = item.getAttribute('data-tags').toLowerCase();
            if (selectedTag === "" || tags.includes(selectedTag)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
        msnry.layout();
        updateVisibleItems();
    });

    updateVisibleItems();

    searchSelect.addEventListener('change', () => {
        updateVisibleItems();
    });

    const galleryItems = document.querySelectorAll('.gallery-item');

    galleryItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            currentIndex = visibleItems.indexOf(item);
            showSlide(currentIndex);
            modal.style.display = 'block';
            modal.classList.add('show');
        });
    });

    let zoomLevel = 1;
    modalImage.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (e.deltaY < 0) {
            zoomLevel += 0.1;
        } else {
            zoomLevel -= 0.1;
        }
        zoomLevel = Math.max(1, Math.min(zoomLevel, 3));
        modalImage.style.transform = `scale(${zoomLevel})`;
    });
});

let visibleItems = [];
let currentIndex = 0;

function updateVisibleItems() {
    const allItems = document.querySelectorAll('.gallery-item');
    visibleItems = Array.from(allItems).filter(item => item.style.display !== 'none');
}

function showSlide(index) {
    const itemCount = visibleItems.length;

    if (index >= itemCount) {
        currentIndex = 0;
    } else if (index < 0) {
        currentIndex = itemCount - 1;
    } else {
        currentIndex = index;
    }

    const currentItem = visibleItems[currentIndex];
    const isVideo = currentItem.querySelector('video') !== null;

    if (isVideo) {
        const videoSrc = currentItem.querySelector('video').getAttribute('src');
        modalImage.style.display = 'none';
        modalVideo.style.display = 'block';
        modalVideo.src = videoSrc;
        modalVideo.play();
    } else {
        const imgSrc = currentItem.querySelector('img').getAttribute('src');
        modalVideo.style.display = 'none';
        modalImage.style.display = 'block';
        modalImage.src = imgSrc;
    }
}

document.querySelector('.prev').addEventListener('click', () => showSlide(currentIndex - 1));
document.querySelector('.next').addEventListener('click', () => showSlide(currentIndex + 1));

const style = document.createElement('style');
style.innerHTML = `
    .x-button {
        position: absolute;
        top: 10px;
        right: 10px;
        background-color: transparent;
        border: none;
        font-size: 24px;
        color: white;
        cursor: pointer;
    }
    .x-button:hover {
        color: red;
    }
`;
document.head.appendChild(style);