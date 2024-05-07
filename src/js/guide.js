document.getElementById('guide-button').addEventListener('click', function() {
    document.getElementById('myModal').classList.remove('hidden');
});

document.getElementById('close-button').addEventListener('click', function() {
    document.getElementById('myModal').classList.add('hidden');
});

document.querySelectorAll('.tab-button').forEach(function(tabButton) {
    tabButton.addEventListener('click', function() {
        document.querySelectorAll('.tab-content').forEach(function(content) {
            content.classList.add('hidden');
        });
        document.getElementById(tabButton.dataset.target).classList.remove('hidden');
    });
});