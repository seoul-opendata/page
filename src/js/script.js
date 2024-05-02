document.addEventListener("DOMContentLoaded", function () {
  const button = document.getElementById("navbar-toggle");
  const menu = document.getElementById("navbar-dropdown");
  button.addEventListener("click", function () {
    menu.classList.toggle("hidden");
  });
});
