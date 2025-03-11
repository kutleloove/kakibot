const mongoose = require('mongoose');

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log(`✅ MongoDB bağlantısı başarılı: ${mongoose.connection.host}`);
    } catch (error) {
        console.error(`❌ MongoDB bağlantı hatası: ${error.message}`);
        process.exit(1);  // Hata durumunda uygulama kapatılır
    }
}

module.exports = connectDB;
