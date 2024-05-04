document.getElementById('alarm').addEventListener('click', function() {
  var page = document.getElementById('page');
  if (page.classList.contains('hidden')) {
    page.classList.remove('hidden');
  } else {
    page.classList.add('hidden');
  }
});