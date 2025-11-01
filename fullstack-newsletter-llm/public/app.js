const emailInput = document.querySelector('#email');
const subscribeBtn = document.querySelector('#subscribeBtn');
const thanksMessage = document.querySelector('#thanks');
const newsletterForm = document.querySelector('#newsletterForm');

const messageInput = document.querySelector('#msg');
const sendBtn = document.querySelector('#send');
const logArea = document.querySelector('#log');

newsletterForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = (emailInput.value || '').trim();

  if (!email) {
    alert('Lütfen e-posta adresinizi girin!');
    emailInput.focus();
    return;
  }

  subscribeBtn.disabled = true;

  try {
    const response = await fetch('/api/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || 'Sunucu hatası veya ağ sorunu.';
      thanksMessage.textContent = errorMessage;
      thanksMessage.style.color = '#b91c1c';
      return;
    }

    const result = await response.json();
    thanksMessage.textContent = result.message || 'Teşekkürler!';
    thanksMessage.style.color = '#047857';
    emailInput.value = '';

    // setTimeout(() => {
    //   thanksMessage.textContent = '';
    // }, 3000);
  } catch (error) {
    console.error('Bülten isteği başarısız:', error);
    thanksMessage.textContent = 'Sunucu hatası veya bağlantı sorunu.';
    thanksMessage.style.color = '#b91c1c';
  } finally {
    subscribeBtn.disabled = false;
  }
});

sendBtn.addEventListener('click', async () => {
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
});

function appendLog(author, message, isError = false) {
  const paragraph = document.createElement('p');
  const prefix = document.createElement('strong');
  prefix.textContent = `${author}: `;
  paragraph.appendChild(prefix);
  paragraph.append(message);

  if (isError) {
    paragraph.style.color = '#b91c1c';
  }

  logArea.appendChild(paragraph);
  logArea.scrollTop = logArea.scrollHeight;
}
