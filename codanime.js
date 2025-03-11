const axios = require('axios');
const cheerio = require('cheerio');
const fs = require("fs");

const baseURL = 'https://www.lightnovelworld.co/novel/orv-wn-16091308/chapters';
const totalPages = 6; // Sayfa sayısını burada belirtin

// Serinin ana bilgileri
const novelInfo = {
  Title: "Omniscient Reader's Viewpoint",
  Tags: [],
  Summary: "Overview, summary etc.",
  Chapters: []
};

// Tüm bölümleri alma fonksiyonu
async function fetchChapters() {
  let chapters = [];

  for (let page = 1; page <= totalPages; page++) {
    const url = `${baseURL}?page=${page}`;
    try {
      const { data } = await axios.get(url, {
        headers: {
          "Referer": url,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
      });

      const $ = cheerio.load(data);

      $('ul.chapter-list li a').each((i, element) => {
        const chapterTitle = $(element).text().trim();
        const chapterLink = $(element).attr('href');
        chapters.push({ title: chapterTitle, link: chapterLink });
      });
    } catch (error) {
      console.error(`Sayfa ${page} çekilirken hata oluştu:`, error);
    }
  }

  return chapters;
}

// Bölüm içeriğini çekme fonksiyonu
async function fetchChapterContent(chapterUrl) {
  try {
    const { data } = await axios.get(chapterUrl, {
      headers: {
        "Referer": chapterUrl,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });

    const $ = cheerio.load(data);
    const content = $('.chapter-content').html();

    // HTML etiketlerini temizleme
    const cleanContent = content.replace(/<[^>]*>/g, ' ').trim();
    return cleanContent;
  } catch (error) {
    console.error(`Bölüm içeriği çekilirken hata oluştu:`, error);
    return null;
  }
}

// Ana süreç
fetchChapters().then(async chapters => {
  console.log('Toplam bölüm sayısı:', chapters.length);

  for (let i = 0; i < chapters.length; i++) {
    const content = await fetchChapterContent(`https://lightnovelworld.co${chapters[i].link}`);

    if (content) {
      console.log(`İşleniyor: ${chapters[i].title}`); // 👈 Konsola bölüm başlığını yazdırma
      novelInfo.Chapters.push({
        title: chapters[i].title,
        content: content
      });
    }
  }

  // JSON dosyasına kaydetme
  await fs.writeFileSync("omniscient-readers-viewpoint.json", JSON.stringify(novelInfo, null, 2), "utf8");

  console.log("Dosya başarıyla kaydedildi: omniscient-readers-viewpoint.json");
});
