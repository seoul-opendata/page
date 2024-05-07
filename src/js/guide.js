document.addEventListener("DOMContentLoaded", function () {
    const button = document.getElementById("help");
    const menu = document.getElementById("info");
    button.addEventListener("click", function () {
      menu.classList.toggle("hidden");
    });
  });

document.querySelectorAll('.tab-button').forEach(function(tabButton) {
    tabButton.addEventListener('click', function() {
        document.querySelectorAll('.tab-content').forEach(function(content) {
            content.classList.add('hidden');
        });
        document.getElementById(tabButton.dataset.target).classList.remove('hidden');
    });
});