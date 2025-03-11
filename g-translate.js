require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

// OpenAI API bilgileri
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const API_KEY = process.env.OPENAI_API_KEY;

// Dosya yolları
const inputFilePath = 'data/Omniscient_Reader_s_Viewpoint.json';
const outputFilePath = 'data/Omniscient_Reader_s_Viewpoint_tr.json';

// Chunking Limiti (Kaç bölüm birleştirilecek)
const CHUNK_SIZE = 4;

// Delay fonksiyonu (Rate Limit için)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// GPT-3.5 Turbo ile metin çeviri fonksiyonu
async function translateText(text) {
    try {
        await delay(1000); // 1 saniye bekleme (Rate Limit koruması)
        const response = await axios.post(OPENAI_API_URL, {
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "Bu metni İngilizceden Türkçeye çevir. Her bölümün başlığı 'Başlık:' ile, içeriği ise 'İçerik:' ile başlamalıdır."
                },
                {
                    role: "user",
                    content: text
                }
            ],
            max_tokens: 4000,
            temperature: 0.5
        }, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error(`❌ Çeviri hatası: ${error.message}`);
        return text; // Çeviri başarısızsa orijinal metni döndür
    }
}

// Veriyi chunk'lara (parçalara) ayırma fonksiyonu
function chunkArray(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

// Tüm bölümleri tek seferde çevirme fonksiyonu
async function translateChapters() {
    const jsonData = JSON.parse(fs.readFileSync(inputFilePath, 'utf8'));
    const translatedChapters = [];

    // Eğer daha önce çevrilen bölümler varsa yükle
    if (fs.existsSync(outputFilePath)) {
        const existingData = JSON.parse(fs.readFileSync(outputFilePath, 'utf8'));
        translatedChapters.push(...existingData.Chapters);
    }

    const remainingChapters = jsonData.Chapters.slice(translatedChapters.length);

    // Bölümleri parçalara ayır
    const chapterChunks = chunkArray(remainingChapters, CHUNK_SIZE);

    console.log(`🔄 Toplam ${jsonData.Chapters.length} bölüm, ${CHUNK_SIZE}'şer olarak çevrilecek.`);

    for (let i = 0; i < chapterChunks.length; i++) {
        const chunk = chapterChunks[i];

        const chunkText = chunk.map(chapter =>
            `Başlık: ${chapter.title}\nİçerik: ${chapter.content}`
        ).join('\n\n===\n\n');

        console.log(`🌍 [${i + 1}/${chapterChunks.length}] Blok çevriliyor...`);

        // GPT ile çeviri
        const translatedText = await translateText(chunkText);

        // Çeviriyi başlık ve içerik olarak ayır
        const translatedChunk = translatedText.split('\n\n===\n\n').map(chapter => {
            const [titleLine, ...contentLines] = chapter.split('\n');
            const title = titleLine.replace('Başlık: ', '').trim();
            const content = contentLines.join('\n').replace('İçerik: ', '').trim();
            return { title, content };
        });

        translatedChapters.push(...translatedChunk);

        // Her bloktan sonra JSON'u kaydet
        const translatedData = {
            ...jsonData,
            Chapters: translatedChapters
        };

        fs.writeFileSync(outputFilePath, JSON.stringify(translatedData, null, 2), 'utf8');
        console.log(`✅ [${(i + 1) * CHUNK_SIZE}/${jsonData.Chapters.length}] bölüm başarıyla çevrildi.`);
    }

    console.log(`🎉 Tüm bölümler çevrildi ve kaydedildi: ${outputFilePath}`);
}

// Çeviri işlemini başlat
translateChapters().catch(console.error);
