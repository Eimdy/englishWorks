#!/bin/bash

echo "======================================================"
echo "🚀 TranslateGate AI - VPS Deployment & Update Script"
echo "======================================================"

# 1. Pastikan script dijalankan di direktori root aplikasi
if [ ! -d "backend" ]; then
    echo "❌ Error: Direktori 'backend' tidak ditemukan!"
    echo "Pastikan Anda menjalankan script ini dari dalam folder translategate-app."
    exit 1
fi

# 2. Cek apakah PM2 sudah terinstal
if ! command -v pm2 &> /dev/null
then
    echo "📦 PM2 belum terinstal. Sedang menginstal PM2 secara global..."
    sudo npm install -g pm2
else
    echo "✅ PM2 sudah terinstal."
fi

# 3. Masuk ke folder backend dan instal dependensi
echo "📂 Masuk ke direktori backend..."
cd backend

echo "📦 Menginstal/Memperbarui dependensi NPM..."
npm install

# 4. Menjalankan atau Merestart PM2
echo "🔄 Mengatur PM2..."

# Cek apakah service sudah berjalan di PM2
if pm2 id translategate-engine > /dev/null 2>&1; then
    echo "♻️  Mendeteksi proses lama. Me-restart translategate-engine..."
    pm2 restart translategate-engine
else
    echo "▶️  Menjalankan translategate-engine untuk pertama kalinya..."
    pm2 start server.js --name "translategate-engine"
fi

# 5. Menyimpan konfigurasi agar berjalan otomatis saat VPS reboot
echo "💾 Menyimpan konfigurasi PM2 startup..."
pm2 save
# Perintah startup otomatis (abaikan error jika sudah pernah diset)
pm2 startup | grep "sudo" | bash > /dev/null 2>&1

echo "======================================================"
echo "✨ Selesai! Aplikasi berhasil di-deploy / di-update."
echo "🌐 Status: Berjalan di background pada port 9000."
echo "======================================================"
