// 1. Mobile Sidebar Toggle
const toggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');

if (toggle && sidebar) {
  toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  
  document.querySelectorAll('.sidebar nav a').forEach(link => {
    link.addEventListener('click', () => {
      sidebar.classList.remove('open');
      document.querySelectorAll('.sidebar nav a').forEach(a => a.classList.remove('active'));
      link.classList.add('active');
    });
  });
}

// 2. Dark/Light Mode
const themeBtn = document.getElementById('theme-toggle');
const html = document.documentElement;

if (themeBtn) {
  const savedTheme = localStorage.getItem('theme') || 'light';
  html.setAttribute('data-theme', savedTheme);
  themeBtn.textContent = savedTheme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';

  themeBtn.addEventListener('click', () => {
    const newTheme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    themeBtn.textContent = newTheme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
  });
}

// 3. WhatsApp Form Submit
const whatsappForm = document.getElementById('whatsappForm');
let whatsappURL = ''; // we will save the link here

if (whatsappForm) {
  whatsappForm.addEventListener('submit', (e) => {
    e.preventDefault(); // stop page refresh

    // Get values
    const name = document.getElementById('w-name').value;
    const email = document.getElementById('w-email').value;
    const phone = document.getElementById('w-phone').value;
    const message = document.getElementById('w-message').value;

    // 1. BUILD WHATSAPP LINK BUT DON'T OPEN YET
    const whatsappNumber = '263789795789'; // your number without +
    const text = `Hi Wealth Intel Construction\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\nMessage: ${message}`;
    whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
    
    // 2. SHOW THANK YOU POPUP
    const popup = document.getElementById('thankYouPopup');
    if(popup) popup.style.display = 'flex';

    // 3. CLEAR FORM
    whatsappForm.reset();
  });
}


function closePopup() {
  document.getElementById('thankYouPopup').style.display = 'none';
  if(whatsappURL !== ''){
    window.open(whatsappURL, '_blank');
    whatsappURL = '';
  }
}