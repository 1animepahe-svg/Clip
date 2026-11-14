(function () {
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.getElementById('nav');
  if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        nav.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const demoBtn = document.getElementById('demoBtn');
  const demoText = document.getElementById('demoText');
  if (demoBtn && demoText) {
    const steps = [
      'Importing source…',
      'Scanning selected window…',
      'Finding highlight moments…',
      'Applying clip length & format…',
      'Rendering clips with captions…',
      'Done! Clips ready to export.'
    ];
    let i = 0;
    let timer = null;

    demoBtn.addEventListener('click', () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
        demoBtn.textContent = 'Preview scan flow';
        i = 0;
        demoText.textContent = 'Ready to scan highlights…';
        return;
      }
      demoBtn.textContent = 'Stop preview';
      demoText.textContent = steps[i];
      timer = setInterval(() => {
        i += 1;
        if (i >= steps.length) {
          clearInterval(timer);
          timer = null;
          demoBtn.textContent = 'Replay preview';
          i = 0;
          return;
        }
        demoText.textContent = steps[i];
      }, 1200);
    });
  }
})();
