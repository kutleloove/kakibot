const axios = require('axios');
const cloudscraper = require('cloudscraper'); // Cloudflare bypass eklendi
const cheerio = require('cheerio');
const ENChapters = require('./db/models/ENChapters');
const Novels = require('./db/models/Novels');

const baseURL = 'https://www.lightnovelworld.co';

// 🌟 Bölüm Listesini Çekme Fonksiyonu
async function fetchAllChapters(seriesURL) {
    let chapters = [];
    let page = 1;

    while (true) {
        const url = `${seriesURL}/chapters?page=${page}`;
        const data = await retryRequest(url, {
            headers: {
                "Referer": url,
                "User-Agent": "Mozilla/5.0"
            }
        });

        if (!data) break;

        const $ = cheerio.load(data);

        const newChapters = $('ul.chapter-list li a').map((_, element) => {
            const chapterTitle = $(element).find('.chapter-title').text().trim().replace(/\d+\n/g, '').trim();
            const chapterLink = $(element).attr('href');
            return { title: chapterTitle, link: chapterLink };
        }).get();

        if (newChapters.length === 0) {
            console.log(`✅ Tüm bölümler başarıyla tarandı. Toplam: ${chapters.length} bölüm.`);
            break;
        }

        chapters.push(...newChapters);
        console.log(`📄 Sayfa ${page} tamamlandı (${newChapters.length} bölüm eklendi).`);

        page++; // Sonraki sayfayı kontrol et
    }

    return chapters;
}

// 🌐 Cloudflare Korumasını Aşmak İçin Retry Fonksiyonu
async function retryRequest(url, options, retries = 5, delay = 1000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await cloudscraper.get(url, options);
            return response;  // Cloudscraper doğrudan string döndürür, JSON parse gerekebilir
        } catch (error) {
            console.warn(`⚠️ Deneme ${attempt}/${retries}: ${url} - Hata oluştu, ${delay / 1000} saniye bekleniyor...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    console.error(`❌ ${url} çekilemedi.`);
    return null;
}

// 📄 Bölüm İçeriğini Çekme Fonksiyonu
async function fetchChapterContent(chapterUrl) {
    const data = await retryRequest(chapterUrl, {
        headers: {
            "Referer": chapterUrl,
            "User-Agent": "Mozilla/5.0"
        }
    });

    if (!data) return null;

    const $ = cheerio.load(data);

    const content = $('.chapter-content p').map((_, el) => $(el).text().trim()).get().join('\n\n');

    return content.replace(/5 years ago/g, '').trim();
}

// 📚 Seriyi İşleme Fonksiyonu
async function processSeries(seriesURL, seriesTitle) {
    let novel = await Novels.findOne({ title: seriesTitle });

    if (!novel) {
        novel = await Novels.create({
            title: seriesTitle,
            summary: 'Özet bulunamadı.',
            source_url: seriesURL
        });

        console.log(`📖 Yeni roman eklendi: ${seriesTitle}`);
    }

    const allChapters = await fetchAllChapters(seriesURL);

    if (!allChapters.length) {
        console.log(`❗ Hiç bölüm bulunamadı. İşlem iptal edildi.`);
        return;
    }

    console.log(`📚 '${seriesTitle}' adlı seriden toplam ${allChapters.length} bölüm bulundu.`);

    // Veritabanındaki maksimum index değerini kontrol et
    const maxIndex = await ENChapters.findOne({ novel: novel._id }).sort('-index').exec();
    const startingIndex = maxIndex ? maxIndex.index + 1 : 1;

    // Yalnızca eksik bölümleri işle
    const chaptersToProcess = allChapters.slice(startingIndex - 1);

    console.log(`🔄 Toplam ${chaptersToProcess.length} bölüm işleniyor...`);

    for (let i = 0; i < chaptersToProcess.length; i++) {
        const content = await fetchChapterContent(`https://lightnovelworld.co${chaptersToProcess[i].link}`);

        if (content) {
            await ENChapters.create({
                title: chaptersToProcess[i].title,
                content: content,
                novel: novel._id,
                index: startingIndex + i,
                is_translated: false,
                source_url: `https://lightnovelworld.co${chaptersToProcess[i].link}`
            });

            console.log(`✅ Kayıt edildi: ${chaptersToProcess[i].title}`);
        }
    }

    console.log(`🎉 '${seriesTitle}' adlı seri başarıyla kaydedildi.`);
}

module.exports = { processSeries };
