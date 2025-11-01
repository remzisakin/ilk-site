const menuToggle = document.querySelector('.menu-toggle');
const primaryMenu = document.querySelector('#primary-menu');

if (menuToggle && primaryMenu) {
  menuToggle.addEventListener('click', () => {
    const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!expanded));
    primaryMenu.hidden = expanded;
  });

  document.addEventListener('click', (event) => {
    if (!primaryMenu.hidden && !primaryMenu.contains(event.target) && event.target !== menuToggle && !menuToggle.contains(event.target)) {
      primaryMenu.hidden = true;
      menuToggle.setAttribute('aria-expanded', 'false');
    }
  });
}

const messageInput = document.querySelector('#msg');
const sendBtn = document.querySelector('#send');
const logArea = document.querySelector('#log');

if (sendBtn && messageInput && logArea) {
  sendBtn.addEventListener('click', handleSendMessage);
  messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  });
}

async function handleSendMessage() {
  const userMessage = (messageInput.value || '').trim();

  if (!userMessage) {
    alert('Lütfen bir mesaj yazın!');
    messageInput.focus();
    return;
  }

  appendLog('Siz', userMessage);
  messageInput.value = '';
  sendBtn.disabled = true;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: userMessage }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || 'Sunucu hatası veya API anahtarı eksik.';
      appendLog('Sistem', errorMessage, true);
      return;
    }

    const data = await response.json();
    appendLog('Asistan', data.reply || 'Yanıt alınamadı.');
  } catch (error) {
    console.error('Sohbet isteği başarısız:', error);
    appendLog('Sistem', 'Sunucu hatası veya API anahtarı eksik.', true);
  } finally {
    sendBtn.disabled = false;
    messageInput.focus();
  }
}

function appendLog(author, message, isError = false) {
  const paragraph = document.createElement('p');
  const prefix = document.createElement('strong');
  prefix.textContent = `${author}: `;
  paragraph.appendChild(prefix);
  paragraph.append(message);

  if (isError) {
    paragraph.style.color = '#f7b7a3';
  }

  logArea.appendChild(paragraph);
  logArea.scrollTop = logArea.scrollHeight;
}
