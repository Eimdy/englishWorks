# TranslateGate AI

TranslateGate AI adalah simulator ujian terjemahan Bahasa Inggris tingkat lanjut dengan fitur *Gatekeeper AI*. Aplikasi ini dirancang untuk melatih kemampuan translasi dari Bahasa Indonesia ke Bahasa Inggris dengan sistem level (CEFR A1 - C2), *strict retry loop*, pelacakan token penggunaan, dan dukungan **Dual-Engine AI** (Gemini & SumoPod).

Aplikasi ini menggunakan arsitektur *lightweight* tanpa Docker: Vanilla JavaScript, Tailwind CSS (via CDN), Node.js (Express), dan database SQLite statis.

---

## 🚀 1. Persiapan & Instalasi (Lokal)

Pastikan Anda telah menginstal **Node.js** (v16 atau lebih baru) di komputer Anda.

1. Buka terminal dan arahkan ke direktori backend:
   ```bash
   cd translategate-app/backend
   ```
2. Instal semua dependensi (*Express, SQLite3, Axios, OpenAI*):
   ```bash
   npm install
   ```
3. Konfigurasi Kunci API AI:
   Secara default, kunci API Google Gemini dan SumoPod sudah ter-hardcode di `backend/ai-engine.js`. Jika Anda memiliki kunci sendiri, Anda dapat menggantinya pada variabel berikut di file tersebut:
   - `GEMINI_API_KEY` (Untuk model Google Gemini)
   - `openai.apiKey` (Untuk Kimi/GLM via SumoPod)

---

## 👤 2. Manajemen Pengguna (Via CLI)

Aplikasi ini tidak menyediakan fitur registrasi di antarmuka web demi keamanan. Manajemen pengguna dilakukan secara manual melalui Command Line Interface (CLI) di direktori `backend`.

**A. Menambahkan Pengguna Baru:**
```bash
node cli.js add <username> <password>
```
*Contoh: `node cli.js add admin admin123`*

**B. Menghapus Pengguna (dan Riwayatnya):**
```bash
node cli.js delete <username>
```
*Contoh: `node cli.js delete admin`*

---

## 💻 3. Menjalankan Server (Lokal)

Untuk menjalankan dan menguji aplikasi secara lokal:

1. Di dalam direktori `backend`, jalankan server:
   ```bash
   node server.js
   ```
2. Buka browser dan akses: **http://localhost:9000**
3. Anda akan disambut oleh Modal Login. Masukkan kredensial yang Anda buat melalui CLI.
4. Anda dapat memilih AI Engine (Gemini Flash Lite/Gemini Flash/SumoPod) di menu Sidebar.

---

## 🌐 4. Panduan Deployment Server (VPS Ubuntu/Debian)

Aplikasi ini dirancang untuk berjalan secara _native_ menggunakan PM2 agar terisolasi dengan aman dari *service* lainnya.

### A. Persiapan VPS
1. Masuk ke VPS Anda melalui SSH.
2. Unggah seluruh folder `translategate-app` ke VPS Anda (disarankan di `/var/www/translategate-app`).
3. Instal Node.js dan PM2 (secara global):
   ```bash
   sudo apt update
   sudo apt install nodejs npm
   sudo npm install -g pm2
   ```

### B. Menjalankan Aplikasi di Latar Belakang
1. Masuk ke direktori backend:
   ```bash
   cd /var/www/translategate-app/backend
   ```
2. Instal dependensi (*Pastikan openai dan axios terinstal*):
   ```bash
   npm install
   ```
3. Jalankan server dengan PM2:
   ```bash
   pm2 start server.js --name "translategate-engine"
   pm2 save
   pm2 startup
   ```
*Aplikasi kini berjalan di background pada port `9000`.*

### C. Ekspos ke Internet via Cloudflare Tunnel (Disarankan)
Karena Anda menggunakan Cloudflare Tunneling, Anda tidak perlu repot melakukan instalasi Nginx, Certbot, atau membuka port VPS Anda. Proses ini jauh lebih aman karena menggunakan skema *Zero Trust*.

1. Masuk ke **Cloudflare Zero Trust Dashboard** (one.dash.cloudflare.com).
2. Navigasi ke **Networks > Tunnels**.
3. Klik **Create a tunnel** (Pilih koneksi *Cloudflared*).
4. Beri nama tunnel Anda (misal: `translategate-tunnel`).
5. Pada bagian **Install and run a connector**, salin perintah instalasi *cloudflared* untuk mesin Linux Anda (Debian/Ubuntu 64-bit) dan jalankan di terminal VPS Anda.
   *(Biasanya berupa perintah `curl ...` dilanjutkan dengan `sudo cloudflared service install ...`)*
6. Setelah status konektor *Connected* di *dashboard*, klik **Next**.
7. Pada bagian **Route Traffic**, isi kolom berikut:
   - **Public Hostname**: `translate` (atau *subdomain* pilihan Anda).
   - **Domain**: Pilih domain utama Anda yang ada di Cloudflare.
   - **Service Type**: `HTTP`
   - **URL**: `localhost:9000` *(Ini adalah port tempat aplikasi kita berjalan)*
8. Klik **Save hostname**.

Selesai! Aplikasi Anda sekarang dapat diakses secara global melalui `https://translate.domainmu.com` dengan sertifikat SSL (*HTTPS*) otomatis dari Cloudflare. Tidak ada celah *port* terbuka di VPS Anda.
---

## 📁 Struktur Direktori
*   **`frontend/`**: File statis untuk antarmuka pengguna (`index.html`, `app.js`). Tema yang digunakan adalah *Bright Sky Blue*.
*   **`backend/`**: Logika server (`server.js`), integrasi database (`database.js`), skrip CLI registrasi (`cli.js`), dan penghubung API Dual-Engine (`ai-engine.js`).
*   **`backend/data.db`**: File database SQLite. Menyimpan history chat, status pass/fail, dan kalkulasi token per pengguna. Otomatis dibuat saat pertama kali server dijalankan.
