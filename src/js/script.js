document.addEventListener("DOMContentLoaded", function () {
  const button = document.getElementById("navbar-toggle");
  const menu = document.getElementById("navbar-dropdown");
  button.addEventListener("click", function () {
    menu.classList.toggle("hidden");
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const button = document.getElementById("close");
  const menu = document.getElementById("ad");
  button.addEventListener("click", function () {
    menu.classList.add("hidden");
  });
});