
(function () {
  var nav = document.getElementById('siteNav');
  if (!nav) return;

  function onScroll() {
    if (window.scrollY > 10) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }


  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
})();


