const express = require('express');
const { processSeries } = require('./scraper');

const app = express();
const PORT = 3001;
const cron = require('node-cron');
const ENChapters = require('./db/models/ENChapters');
const TRChapters = require('./db/models/TRChapters');
const translateText = require('./g-translate');  // GPT-3.5 ile çeviri fonksiyonun
const connectDB = require('./db/db');  // MongoDB bağlantısı

// MongoDB Bağlantısını Başlat
connectDB();
/*
cron.schedule('10 * * * *', async () => {  // Her 10 dakikada bir çalışır
    console.log("⏳ Çeviri cron'u başlatıldı...");

    const chaptersToTranslate = await ENChapters.find({ is_translated: false }).limit(10);

    for (const chapter of chaptersToTranslate) {
        const translatedTitle = await translateText(chapter.title);
        const translatedContent = await translateText(chapter.content);

        await TRChapters.create({
            title: translatedTitle,
            content: translatedContent,
            novel: chapter.novel,
            index: chapter.index
        });

        await ENChapters.updateOne({ _id: chapter._id }, { is_translated: true });

        console.log(`✅ Çevrildi: ${chapter.title}`);
    }

    console.log("✅ Çeviri cron'u tamamlandı.");
});

*/
app.use(express.json());

app.post('/api/scrape', async (req, res) => {
    const { seriesList } = req.body;

    if (!seriesList || !Array.isArray(seriesList) || seriesList.length === 0) {
        return res.status(400).json({ error: "Geçerli bir seri listesi gönderin." });
    }

    for (const series of seriesList) {
        const { url, title } = series;
        console.log(`🔍 İşleme başlandı: ${title}`);
        await processSeries(url, title);
    }

    res.json({ message: "Seriler başarıyla işlendi." });
});

app.listen(PORT, () => {
    console.log(`✅ Sunucu çalışıyor: http://localhost:${PORT}`);
});
