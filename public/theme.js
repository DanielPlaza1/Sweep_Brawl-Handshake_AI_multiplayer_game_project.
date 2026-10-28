// Apply the saved theme before the stylesheet paints.
try { document.documentElement.dataset.theme = JSON.parse(localStorage.getItem('sweep-theme')) || 'dark'; }
catch { document.documentElement.dataset.theme = 'dark'; }
