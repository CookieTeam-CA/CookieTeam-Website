document.addEventListener('DOMContentLoaded', () => {
    const gallery = document.querySelector('.gallery');
    const items = Array.from(gallery.children);
    const searchSelect = document.getElementById('searchSelect');

    // Shuffle the items array
    items.sort(() => Math.random() - 0.5);

    // Clear the gallery and append the shuffled items back to the gallery
    gallery.innerHTML = '';
    items.forEach(item => gallery.appendChild(item));

    // Initialize Masonry
    const msnry = new Masonry(gallery, {
        itemSelector: '.gallery-item',
        columnWidth: '.gallery-item',
        percentPosition: true,
        gutter: 10
    });

    // Ensure layout is correctly applied after all images have loaded
    imagesLoaded(gallery, () => {
        msnry.layout();
    });

    // Filter gallery items based on selected tag
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