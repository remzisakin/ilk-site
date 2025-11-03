const menuToggle = document.querySelector('.menu-toggle');
const primaryMenu = document.querySelector('#primary-menu');

if (menuToggle && primaryMenu) {
  const openMenu = () => {
    if (primaryMenu.classList.contains('is-open')) {
      return;
    }
    primaryMenu.hidden = false;
    requestAnimationFrame(() => {
      primaryMenu.classList.add('is-open');
    });
  };

  const closeMenu = () => {
    if (primaryMenu.hidden) return;
    primaryMenu.classList.remove('is-open');
  };

  menuToggle.addEventListener('click', () => {
    const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!expanded));
    if (expanded) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  primaryMenu.addEventListener('transitionend', (event) => {
    if (event.propertyName === 'max-height' && !primaryMenu.classList.contains('is-open')) {
      primaryMenu.hidden = true;
    }
  });

  document.addEventListener('click', (event) => {
    if (!primaryMenu.hidden && !primaryMenu.contains(event.target) && event.target !== menuToggle && !menuToggle.contains(event.target)) {
      menuToggle.setAttribute('aria-expanded', 'false');
      closeMenu();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !primaryMenu.hidden) {
      menuToggle.setAttribute('aria-expanded', 'false');
      closeMenu();
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

const recordForm = document.querySelector('#record-form');
const recordNameInput = document.querySelector('#record-name');
const recordAmountInput = document.querySelector('#record-amount');
const saveRecordButton = document.querySelector('#save-record');
const cancelRecordButton = document.querySelector('#cancel-record');
const newRecordButton = document.querySelector('#new-record-button');
const recordSelect = document.querySelector('#record-select');
const recordList = document.querySelector('#record-list');

if (
  recordForm &&
  recordNameInput &&
  recordAmountInput &&
  saveRecordButton &&
  cancelRecordButton &&
  newRecordButton &&
  recordSelect &&
  recordList
) {
  let records = [];
  let currentRecordId = null;
  let recordCounter = 0;

  const setFormEnabled = (enabled) => {
    [recordNameInput, recordAmountInput, saveRecordButton, cancelRecordButton].forEach((element) => {
      element.disabled = !enabled;
    });

    recordForm.classList.toggle('is-editing', enabled);

    if (!enabled) {
      recordForm.reset();
      saveRecordButton.textContent = 'Kaydet';
    }
  };

  const formatAmount = (amountRaw) => {
    if (typeof amountRaw !== 'string') {
      return '';
    }

    const trimmed = amountRaw.trim();

    if (!trimmed) {
      return '';
    }

    return trimmed.includes('€') ? trimmed : `${trimmed} €`;
  };

  const renderRecordSelect = () => {
    recordSelect.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = records.length ? 'Bir kayıt seçin…' : 'Kayıt bulunmuyor';
    placeholder.disabled = true;
    placeholder.selected = !currentRecordId;
    recordSelect.appendChild(placeholder);

    records.forEach((record) => {
      const option = document.createElement('option');
      option.value = record.id;
      const displayName = record.name ? record.name : 'Adsız kayıt';
      option.textContent = `${displayName} — ${formatAmount(record.amount)}`;
      if (record.id === currentRecordId) {
        option.selected = true;
        placeholder.selected = false;
      }
      recordSelect.appendChild(option);
    });

    recordSelect.disabled = records.length === 0;
  };

  const renderRecordList = () => {
    recordList.innerHTML = '';

    if (!records.length) {
      const emptyItem = document.createElement('li');
      emptyItem.className = 'record-list-empty';
      emptyItem.textContent = 'Henüz kayıt yok.';
      recordList.appendChild(emptyItem);
      return;
    }

    records.forEach((record) => {
      const item = document.createElement('li');
      item.className = 'record-list-item';
      if (record.id === currentRecordId) {
        item.classList.add('is-selected');
      }
      item.dataset.recordId = record.id;
      item.tabIndex = 0;
      item.setAttribute('role', 'button');
      item.setAttribute('aria-pressed', record.id === currentRecordId ? 'true' : 'false');

      const name = document.createElement('span');
      name.className = 'record-list-name';
      name.textContent = record.name ? record.name : 'Adsız kayıt';

      const amount = document.createElement('span');
      amount.className = 'record-list-amount';
      amount.textContent = formatAmount(record.amount);

      item.append(name, amount);
      recordList.appendChild(item);
    });
  };

  const renderRecords = () => {
    renderRecordSelect();
    renderRecordList();
  };

  const findRecord = (id) => records.find((record) => record.id === id);

  const activateRecord = (id) => {
    const record = findRecord(id);

    if (!record) {
      return;
    }

    currentRecordId = record.id;
    recordNameInput.value = record.name ?? '';
    recordAmountInput.value = record.amount ?? '';
    setFormEnabled(true);
    saveRecordButton.textContent = 'Güncelle';
    renderRecordList();
  };

  newRecordButton.addEventListener('click', () => {
    currentRecordId = null;
    setFormEnabled(true);
    saveRecordButton.textContent = 'Kaydet';
    recordForm.reset();
    recordSelect.value = '';
    renderRecords();
    recordNameInput.focus();
  });

  recordSelect.addEventListener('change', (event) => {
    const selectedId = event.target.value;
    if (!selectedId) {
      return;
    }

    activateRecord(selectedId);
  });

  recordList.addEventListener('click', (event) => {
    const item = event.target.closest('li[data-record-id]');
    if (!item) {
      return;
    }

    const { recordId } = item.dataset;
    if (!recordId) {
      return;
    }

    recordSelect.value = recordId;
    activateRecord(recordId);
  });

  recordList.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    const item = event.target.closest('li[data-record-id]');
    if (!item) {
      return;
    }

    event.preventDefault();
    const { recordId } = item.dataset;
    if (!recordId) {
      return;
    }

    recordSelect.value = recordId;
    activateRecord(recordId);
  });

  recordForm.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!recordForm.reportValidity()) {
      return;
    }

    const name = recordNameInput.value.trim();
    const amountRaw = recordAmountInput.value;

    if (!amountRaw.trim()) {
      recordAmountInput.focus();
      return;
    }

    if (currentRecordId) {
      const existing = findRecord(currentRecordId);
      if (existing) {
        existing.name = name;
        existing.amount = amountRaw;
      }
    } else {
      recordCounter += 1;
      const newRecord = {
        id: String(recordCounter),
        name,
        amount: amountRaw,
      };
      records = [...records, newRecord];
    }

    currentRecordId = null;
    renderRecords();
    recordSelect.value = '';
    setFormEnabled(false);
  });

  cancelRecordButton.addEventListener('click', () => {
    recordSelect.value = '';
    currentRecordId = null;
    setFormEnabled(false);
    renderRecords();
  });

  renderRecords();
  setFormEnabled(false);
}
