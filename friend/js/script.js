document.addEventListener('DOMContentLoaded', () => {
    const gallery = document.querySelector('.gallery');
    const searchSelect = document.getElementById('searchSelect');
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalVideo = document.getElementById('modalVideo');
    const modalTags = document.getElementById('modalTags');
    const modalTitle = document.getElementById('modalTitle');
    const downloadBtn = document.getElementById('downloadBtn');
    
    let masonry = null;
    let mediaItems = [];
    let visibleItems = [];
    let currentIndex = 0;

    const API_BASE_URL = 'https://api.cookieattack.de/';
    const UPLOADS_URL = `${API_BASE_URL}/uploads`;

    const tagColors = {
        aufhausen: '#4CAF50',
        cookieattack: '#FF9800',
        minecraft: '#8BC34A',
        hyklos: '#9C27B0',
        leon: '#2196F3',
        frogi: '#4CAF50',
        mace: '#FF5722',
        eflix: '#3F51B5',
        rl: '#00BCD4',
        vertex: '#E91E63',
        prinz: '#9E9E9E',
        nils: '#673AB7',
        crazy: '#FF4081'
    };

    init();

    async function init() {
        try {
            await loadMedia();
            initMasonry();
            setupTagFilter();
            setupEventListeners();
        } catch (error) {
            console.error('Initialisierungsfehler:', error);
            showError('Fehler beim Laden der Inhalte');
        }
    }

    async function loadMedia() {
        try {
            const response = await fetch(`${API_BASE_URL}/media`);
            if (!response.ok) throw new Error(`HTTP Fehler: ${response.status}`);
            
            const data = await response.json();
            gallery.innerHTML = '';
            mediaItems = data.map(createMediaElement);
            mediaItems.forEach(item => gallery.appendChild(item));
            
        } catch (error) {
            console.error('Medien-Ladefehler:', error);
            throw error;
        }
    }

    function createMediaElement(media) {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.dataset.tags = media.tags.join(',').toLowerCase();

        const isVideo = media.filetype === 'video';
        const mediaElement = isVideo ? 
            document.createElement('video') : 
            document.createElement('img');

        mediaElement.src = `${UPLOADS_URL}/${media.filename}`;
        mediaElement.alt = media.title || media.filename;
        mediaElement.loading = 'lazy';
        
        if (isVideo) {
            mediaElement.muted = true;
            mediaElement.loop = true;
            mediaElement.playsInline = true;
            addVideoLabel(item);
        }

        item.appendChild(mediaElement);
        return item;
    }

    function addVideoLabel(item) {
        const label = document.createElement('div');
        label.className = 'video-label';
        label.textContent = 'VIDEO';
        item.appendChild(label);
    }

    function initMasonry() {
        masonry = new Masonry(gallery, {
            itemSelector: '.gallery-item',
            columnWidth: '.gallery-item',
            percentPosition: true,
            gutter: 10
        });

        imagesLoaded(gallery).on('progress', () => masonry.layout());
    }

    function setupTagFilter() {
        const tags = new Set();
        mediaItems.forEach(item => {
            item.dataset.tags.split(',').forEach(tag => tags.add(tag.trim()));
        });

        searchSelect.innerHTML = '<option value="">Alle anzeigen</option>';
        tags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            option.style.backgroundColor = tagColors[tag] || '#607D8B';
            option.style.color = 'white';
            searchSelect.appendChild(option);
        });
    }

    function setupEventListeners() {
        mediaItems.forEach((item, index) => {
            item.addEventListener('click', () => handleMediaClick(item, index));
        });

        searchSelect.addEventListener('change', () => {
            const filter = searchSelect.value.toLowerCase();
            mediaItems.forEach(item => {
                item.style.display = filter && !item.dataset.tags.includes(filter) ? 
                    'none' : 'block';
            });
            masonry.layout();
            updateVisibleItems();
        });

        modal.querySelector('.close').addEventListener('click', closeModal);
        modal.querySelector('.prev').addEventListener('click', () => navigate(-1));
        modal.querySelector('.next').addEventListener('click', () => navigate(1));
        
        document.addEventListener('keydown', (e) => {
            if (modal.style.display === 'block') {
                if (e.key === 'Escape') closeModal();
                if (e.key === 'ArrowLeft') navigate(-1);
                if (e.key === 'ArrowRight') navigate(1);
            }
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    function handleMediaClick(item, index) {
        currentIndex = index;
        updateVisibleItems();
        showModal(item);
    }

    function showModal(item) {
        const mediaElement = item.querySelector('img, video');
        const isVideo = mediaElement.tagName === 'VIDEO';

        const mediaUrl = `${UPLOADS_URL}/${mediaElement.alt}`;

        if (isVideo) {
            modalVideo.src = mediaUrl;
            modalVideo.style.display = 'block';
            modalImage.style.display = 'none';
            modalVideo.play();
        } else {
            modalImage.src = mediaUrl;
            modalImage.style.display = 'block';
            modalVideo.style.display = 'none';
        }

        modalTitle.textContent = mediaElement.alt;
        modalTags.innerHTML = item.dataset.tags.split(',').map(tag => 
            `<div class="tag" style="background-color: ${tagColors[tag] || '#607D8B'}">${tag}</div>`
        ).join('');

        downloadBtn.href = mediaUrl;
        downloadBtn.download = mediaElement.alt;

        modal.style.display = 'block';
        modal.classList.add('visible');
    }

    function navigate(direction) {
        currentIndex = (currentIndex + direction + visibleItems.length) % visibleItems.length;
        showModal(visibleItems[currentIndex]);
    }

    function updateVisibleItems() {
        visibleItems = mediaItems.filter(item => 
            item.style.display !== 'none' && getComputedStyle(item).display !== 'none'
        );
    }

    function closeModal() {
        modal.style.display = 'none';
        modal.classList.remove('visible');
        modalVideo.pause();
        modalVideo.currentTime = 0;
    }

    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        gallery.appendChild(errorDiv);
    }
});