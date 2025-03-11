require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const axiosRetry = require('axios-retry').default;

// DeepL API bilgileri
const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate';
const API_KEY = process.env.DEEPL_API_KEY;

// Dosya yolları
const inputFilePath = 'data/Omniscient_Reader_s_Viewpoint.json';
const outputFilePath = 'data/Omniscient_Reader_s_Viewpoint_tr.json';

// Delay fonksiyonu (Rate Limit için)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Axios Retry yapılandırması (429 hatasında otomatik tekrar)
axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

// Metni çevirme fonksiyonu
async function translateText(text) {
    try {
        await delay(1000); // 1 saniye bekleme (Rate Limit koruması)
        const response = await axios.post(DEEPL_API_URL, null, {
            params: {
                auth_key: API_KEY,
                text: text,
                target_lang: 'TR'
            }
        });
        return response.data.translations[0].text;
    } catch (error) {
        console.error(`❌ Çeviri hatası: ${error.message} - Metin: "${text.slice(0, 30)}..."`);
        return text; // Çeviri başarısızsa orijinal metni döndür
    }
}

// Çeviri işlemi
async function translateChapters() {
    const jsonData = JSON.parse(fs.readFileSync(inputFilePath, 'utf8'));
    const translatedChapters = [];

    // Eğer daha önce çevrilen bölümler varsa yükle
    if (fs.existsSync(outputFilePath)) {
        const existingData = JSON.parse(fs.readFileSync(outputFilePath, 'utf8'));
        translatedChapters.push(...existingData.Chapters);
    }

    // Kalan bölümleri çevir
    for (let i = translatedChapters.length; i < jsonData.Chapters.length; i++) {
        const chapter = jsonData.Chapters[i];
        const translatedTitle = await translateText(chapter.title);
        const translatedContent = await translateText(chapter.content);

        translatedChapters.push({
            title: translatedTitle,
            content: translatedContent
        });

        // JSON dosyasını her çevrilen bölümde güncelle
        const translatedData = {
            ...jsonData,
            Chapters: translatedChapters
        };

        fs.writeFileSync(outputFilePath, JSON.stringify(translatedData, null, 2), 'utf8');
        console.log(`✅ [${i + 1}/${jsonData.Chapters.length}] "${chapter.title}" başarıyla çevrildi.`);
    }

    console.log(`🎉 Tüm bölümler çevrildi ve kaydedildi: ${outputFilePath}`);
}

// Çeviri işlemini başlat
translateChapters().catch(console.error);
