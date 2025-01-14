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

    fetch('titles.txt')
        .then(response => response.text())
        .then(text => {
            titles = text.split('\n').map(line => line.trim());
        });

    items.forEach((item, index) => {
        const isVideo = item.querySelector('video') !== null;

        if (isVideo) {
            const video = item.querySelector('video');
            const videoLabel = document.createElement('div');
            videoLabel.innerText = 'VIDEO';
            videoLabel.classList.add('video-label');
            item.appendChild(videoLabel);

            video.muted = true;
            video.loop = true;
            video.play();

            item.addEventListener('click', () => {
                const tags = item.getAttribute('data-tags').split(',').map(tag => tag.trim());
                const title = titles[index] || `Video ${index + 1}`;
                const videoSrc = video.getAttribute('src');

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
    });
});