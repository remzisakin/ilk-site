# Bülten + LLM Sohbet (Fullstack Demo)

Bu proje tek sayfalık bir Express uygulamasıyla bülten aboneliği ve OpenAI Responses API tabanlı sohbet kutusunu bir araya getirir.

## Özellikler
- Express ile API uç noktaları ve statik dosya servis edilmesi
- CSV dosyasında bülten aboneliği kayıtları
- OpenAI `gpt-4o-mini` modeliyle sohbet entegrasyonu
- Basit ve erişilebilir bir HTML/CSS/JS arayüzü

## Çevresel Değişkenler
`.env` dosyasına `OPENAI_API_KEY` anahtarınızı girmeniz gerekir. Dosya repoya dahil edilmez; `.env.example` dosyasını kopyalayıp güncelleyebilirsiniz.

```bash
cp .env.example .env
# Ardından .env dosyasında OPENAI_API_KEY= satırını anahtarınızla doldurun
```

## Çalıştırma
```bash
npm install
npm start
```
Sunucu varsayılan olarak `http://localhost:3000` adresinde çalışır.

## CSV Hakkında
`data/subscribers.csv` dosyası başlık satırından sonra yeni abonelikleri `email,created_at` formatında saklar.
