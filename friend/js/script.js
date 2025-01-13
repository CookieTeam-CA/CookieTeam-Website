document.addEventListener('DOMContentLoaded', () => {
    const gallery = document.querySelector('.gallery');
    const items = Array.from(gallery.children);
    const searchSelect = document.getElementById('searchSelect');
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalInfo = document.getElementById('modalInfo');
    const modalTags = document.getElementById('modalTags');
    const modalTitle = document.getElementById('modalTitle');
    const closeBtn = document.querySelector('.close');
    const downloadBtn = document.getElementById('downloadBtn');

    let titles = [];
    const tagOptions = Array.from(searchSelect.options);

    // Farben für jeden Tag definieren
    const tagColors = {
        cookieattack3: '#ffa500',
        cookieattack4: '#ffa500',
        minecraft: '#008000',
        leon: '#0000FF'
    };

    // Titel aus titles.txt laden
    fetch('titles.txt')
        .then(response => response.text())
        .then(text => {
            titles = text.split('\n').map(line => line.trim());
        });

    items.forEach((item, index) => {
        item.addEventListener('click', () => {
            const tagIds = item.getAttribute('data-tags').split(',').map(tag => tag.trim());
            const title = titles[index] || `Bild ${index + 1}`;
            const pngSrc = `img/png/${index + 1}.png`;

            modalTags.innerHTML = ''; // Vorherige Tags entfernen
            tagIds.forEach(tagId => {
                const option = tagOptions.find(opt => opt.value === tagId);
                if (option) {
                    const tagElement = document.createElement('div');
                    tagElement.classList.add('tag');
                    tagElement.innerText = option.innerText;
                    tagElement.style.backgroundColor = tagColors[tagId] || '#555'; // Farbe aus Palette oder Standardfarbe
                    modalTags.appendChild(tagElement);
                }
            });

            modalImage.src = pngSrc;
            modalTitle.innerText = `Titel: ${title}`;
            downloadBtn.href = pngSrc;

            modal.style.display = 'block';
            modal.classList.add('show');
        });
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        modal.classList.remove('show');
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
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
    });
});
