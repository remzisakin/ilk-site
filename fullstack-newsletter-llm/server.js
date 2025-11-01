import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import https from 'https';
import {
  appendFile,
  access,
  constants as fsConstants,
  readFile,
} from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Ortam değişkenlerini yükle
dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.warn('Uyarı: OPENAI_API_KEY bulunamadı. /api/chat uç noktası çalışmayacaktır.');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const subscribersFilePath = path.join(__dirname, 'data', 'subscribers.csv');

const OPENAI_CA_CERT_PATH = process.env.OPENAI_CA_CERT_PATH;
const OPENAI_SKIP_TLS_VERIFY = process.env.OPENAI_SKIP_TLS_VERIFY === '1';

let openAiHttpsAgent;

if (OPENAI_SKIP_TLS_VERIFY) {
  openAiHttpsAgent = new https.Agent({ rejectUnauthorized: false });
  console.warn('Uyarı: OPENAI_SKIP_TLS_VERIFY=1 ayarlandı. TLS sertifika doğrulaması devre dışı.');
} else if (OPENAI_CA_CERT_PATH) {
  try {
    const customCa = await readFile(OPENAI_CA_CERT_PATH, 'utf8');
    openAiHttpsAgent = new https.Agent({ ca: customCa });
    console.log('OpenAI API isteği için özel CA sertifikası yüklendi.');
  } catch (error) {
    console.error('Özel CA sertifikası yüklenemedi:', error);
  }
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function ensureSubscribersFile() {
  try {
    await access(subscribersFilePath, fsConstants.F_OK);
  } catch (err) {
    // Dosya yoksa başlık satırı ile oluştur.
    await appendFile(subscribersFilePath, 'email,created_at\n');
  }
}

async function isEmailAlreadySubscribed(email) {
  try {
    const fileContent = await readFile(subscribersFilePath, 'utf8');
    return fileContent
      .split('\n')
      .slice(1)
      .filter((line) => line.trim().length > 0)
      .some((line) => {
        const [storedEmail] = line.split(',');
        const normalisedEmail = storedEmail
          ?.replace(/^"|"$/g, '')
          .replace(/""/g, '"')
          .trim()
          .toLowerCase();
        return normalisedEmail === email.toLowerCase();
      });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

// Sunucu başlarken abonelik dosyasının var olduğundan emin ol.
ensureSubscribersFile().catch((error) => {
  console.error('Abonelik dosyası oluşturulamadı:', error);
});

app.post('/api/subscribe', async (req, res) => {
  const { email } = req.body ?? {};

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Geçerli bir e-posta adresi girin.' });
  }

  const trimmedEmail = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
    return res.status(400).json({ error: 'Geçerli bir e-posta adresi girin.' });
  }

  try {
    await ensureSubscribersFile();
  } catch (error) {
    console.error('Abonelik dosyası hazırlanamadı:', error);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }

  try {
    const alreadySubscribed = await isEmailAlreadySubscribed(trimmedEmail);

    if (alreadySubscribed) {
      return res.status(409).json({ error: 'Bu e-posta adresi zaten kayıtlı.' });
    }
  } catch (error) {
    console.error('Abonelik kayıtları okunamadı:', error);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }

  const now = new Date().toISOString();
  const line = `"${trimmedEmail.replace(/"/g, '""')}",${now}\n`;

  try {
    await appendFile(subscribersFilePath, line, 'utf8');
    return res.json({ ok: true, message: 'Teşekkürler!' });
  } catch (error) {
    console.error('Abonelik kaydı yazılamadı:', error);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body ?? {};

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Lütfen bir mesaj yazın.' });
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'Sunucu yapılandırması eksik: OPENAI_API_KEY bulunamadı.' });
  }

  try {
    const fetchOptions = {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        input: `Kullanıcı dedi ki: "${message}". Kısa, anlaşılır ve Türkçe cevap ver.`,
      }),
    };

    if (openAiHttpsAgent) {
      fetchOptions.agent = openAiHttpsAgent;
    }

    const response = await fetch('https://api.openai.com/v1/responses', fetchOptions);

    if (!response.ok) {
      console.error('OpenAI API hatası:', response.status, await response.text());
      return res.status(500).json({ error: 'Sunucu hatası' });
    }

    const data = await response.json();

    const reply = extractReplyFromResponse(data);

    if (!reply) {
      console.error('OpenAI yanıtı beklenen formatta değil:', data);
      return res.status(500).json({ error: 'Sunucu hatası' });
    }

    return res.json({ reply });
  } catch (error) {
    console.error('OpenAI API isteği başarısız:', error);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

function extractReplyFromResponse(data) {
  if (!data || typeof data !== 'object') {
    return '';
  }

  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }

  if (Array.isArray(data.output)) {
    const collectedText = data.output
      .flatMap((item) => item?.content ?? [])
      .filter((contentItem) => typeof contentItem?.text === 'string' && contentItem.text.trim())
      .map((contentItem) => contentItem.text.trim())
      .join('\n')
      .trim();

    if (collectedText) {
      return collectedText;
    }
  }

  if (Array.isArray(data.messages)) {
    const assistantMessages = data.messages.filter((msg) => msg?.role === 'assistant');
    const collectedText = assistantMessages
      .flatMap((msg) => msg?.content ?? [])
      .filter((contentItem) => typeof contentItem?.text === 'string' && contentItem.text.trim())
      .map((contentItem) => contentItem.text.trim())
      .join('\n')
      .trim();

    if (collectedText) {
      return collectedText;
    }
  }

  return '';
}

app.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor.`);
});
