# Express AI Backend

Project ini adalah backend Express.js yang berfungsi sebagai proxy terpadu untuk berbagai API model bahasa besar (LLM), termasuk OpenAI, Anthropic, dan Google Gemini. Server ini meniru struktur API OpenAI, memungkinkan klien untuk berinteraksi dengan berbagai model melalui satu set endpoint yang konsisten.

## Fitur

- **Proxy Terpadu**: Gunakan satu API untuk mengakses model dari OpenAI, Anthropic, dan Gemini.
- **Kompatibilitas OpenAI**: Endpoint `chat-completion` dirancang agar kompatibel dengan SDK OpenAI dan permintaan API.
- **Deteksi Penyedia Otomatis**: Server secara otomatis mendeteksi penyedia API yang sesuai (OpenAI, Gemini, dll.) berdasarkan nama model yang diminta.
- **Dukungan Streaming**: Mendukung respons streaming dari model yang kompatibel (saat ini diimplementasikan untuk Gemini).
- **Konfigurasi Mudah**: Konfigurasi sederhana menggunakan variabel lingkungan.

## Prasyarat

- [Node.js](https://nodejs.org/) (versi 16.0.0 atau lebih tinggi)
- [npm](https://www.npmjs.com/) (biasanya terinstal bersama Node.js)

## Instalasi

1.  **Clone repositori ini:**
    ```bash
    git clone <URL_REPOSITORI_ANDA>
    cd express-ai-backend
    ```

2.  **Instal dependensi:**
    ```bash
    npm install
    ```

## Konfigurasi

1.  **Buat file `.env`** di direktori root proyek dengan menyalin dari contoh:
    ```bash
    cp .env.example .env
    ```
    Jika `.env.example` tidak ada, buat file `.env` secara manual.

2.  **Edit file `.env`** dan tambahkan kunci API Anda:
    ```plaintext
    # Kunci API
    OPENAI_API_KEY="kunci_api_openai_anda"
    ANTHROPIC_API_KEY="kunci_api_anthropic_anda"
    GEMINI_API_KEY="kunci_api_gemini_anda"

    # Konfigurasi Server
    PORT=3000
    ```

## Menjalankan Server

-   **Untuk pengembangan (dengan hot-reload):**
    Gunakan `nodemon` untuk memulai server. Server akan secara otomatis restart jika ada perubahan file.
    ```bash
    npm run dev
    ```
    *(Catatan: Skrip `dev` di `package.json` mungkin perlu disesuaikan dari `server.js` ke `app.js` jika nama file utama Anda adalah `app.js`)*

-   **Untuk produksi:**
    ```bash
    npm start
    ```
    *(Catatan: Sama seperti di atas, pastikan skrip `start` menunjuk ke file yang benar, yaitu `app.js`)*

Server akan berjalan di `http://localhost:3000`.

## API Endpoints

### 1. `POST /chat-completion`

Endpoint universal yang dapat menangani permintaan untuk semua penyedia yang didukung.

-   **Body Permintaan** (JSON):
    -   `model` (string): Nama model yang akan digunakan (misalnya, `gpt-4o-mini`, `gemini-1.5-pro`).
    -   `messages` (array): Array objek pesan, mirip dengan format OpenAI.
    -   `stream` (boolean, opsional): Atur ke `true` untuk respons streaming (saat ini didukung untuk Gemini).
    -   Parameter tambahan (misalnya, `temperature`, `max_tokens`) akan diteruskan ke API penyedia.

-   **Contoh Permintaan (non-streaming):**
    ```bash
    curl -X POST http://localhost:3000/chat-completion \
         -H "Content-Type: application/json" \
         -d '{ \
             "model": "gpt-4o-mini", \
             "messages": [{"role": "user", "content": "Apa ibu kota Indonesia?"}] \
           }'
    ```

-   **Contoh Respons (non-streaming):**
    ```json
    {
        "id": "chatcmpl-xxxxxxxxxxxxxxxxxxxxxx",
        "object": "chat.completion",
        "created": 1677652288,
        "model": "gpt-4o-mini",
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": "Ibu kota Indonesia adalah Jakarta."
                },
                "finish_reason": "stop"
            }
        ],
        "usage": {
            "prompt_tokens": 15,
            "completion_tokens": 7,
            "total_tokens": 22
        }
    }
    ```

-   **Contoh Permintaan (streaming dengan Gemini):**
    ```bash
    curl -X POST http://localhost:3000/chat-completion \
         -H "Content-Type: application/json" \
         -d '{ \
             "model": "gemini-1.5-flash", \
             "messages": [{"role": "user", "content": "Ceritakan sebuah cerita pendek." }], \
             "stream": true \
           }'
    ```

-   **Contoh Respons (streaming):**
    ```text
data: {"id":"gemini-1694081529123","object":"chat.completion.chunk","created":1694081529,"model":"gemini-1.5-flash","choices":[{"index":0,"delta":{"content":"Pada "},"finish_reason":null}]}

data: {"id":"gemini-1694081529124","object":"chat.completion.chunk","created":1694081529,"model":"gemini-1.5-flash","choices":[{"index":0,"delta":{"content":"zaman "},"finish_reason":null}]}

data: {"id":"gemini-1694081529125","object":"chat.completion.chunk","created":1694081529,"model":"gemini-1.5-flash","choices":[{"index":0,"delta":{"content":"dahulu..."},"finish_reason":null}]}

data: {"id":"gemini-1694081529126","object":"chat.completion.chunk","created":1694081529,"model":"gemini-1.5-flash","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
    ```

### 2. `POST /openai-chat-completion`

Endpoint yang secara spesifik mengikuti format API Chat Completion OpenAI.

-   **Contoh Permintaan:**
    ```bash
    curl -X POST http://localhost:3000/openai-chat-completion \
         -H "Content-Type: application/json" \
         -d '{ \
             "model": "gpt-4o-mini", \
             "messages": [{"role": "user", "content": "Model apa yang sedang kamu gunakan?"}] \
           }'
    ```

-   **Contoh Respons:**
    ```json
    {
        "id": "chatcmpl-xxxxxxxxxxxxxxxxxxxxxx",
        "object": "chat.completion",
        "created": 1677652288,
        "model": "gpt-4o-mini",
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": "Saya adalah model bahasa besar, yang dilatih oleh Google."
                },
                "finish_reason": "stop"
            }
        ],
        "usage": {
            "prompt_tokens": 12,
            "completion_tokens": 10,
            "total_tokens": 22
        }
    }
    ```

### 3. `POST /gemini-stream`

Endpoint khusus untuk menerima respons streaming dari model Gemini.

-   **Contoh Permintaan:**
    ```bash
    curl -X POST http://localhost:3000/gemini-stream \
         -H "Content-Type: application/json" \
         -d '{ \
             "model": "gemini-1.5-flash", \
             "messages": [{"role": "user", "content": "Jelaskan komputasi kuantum secara sederhana."}] \
           }'
    ```

-   **Contoh Respons (streaming):**
    ```text
data: {"id":"gemini-1694081530123","object":"chat.completion.chunk","created":1694081530,"model":"gemini-1.5-flash","choices":[{"index":0,"delta":{"content":"Komputasi "},"finish_reason":null}]}

data: {"id":"gemini-1694081530124","object":"chat.completion.chunk","created":1694081530,"model":"gemini-1.5-flash","choices":[{"index":0,"delta":{"content":"kuantum adalah..."},"finish_reason":null}]}

data: {"id":"gemini-1694081530125","object":"chat.completion.chunk","created":1694081530,"model":"gemini-1.5-flash","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
    ```

### 4. `GET /health`

Endpoint untuk memeriksa status server.

-   **Respons Sukses** (JSON):
    ```json
    {
      "status": "healthy",
      "timestamp": "2025-09-07T10:00:00.000Z",
      "version": "1.0.0"
    }
    ```


## Menjalankan Klien Uji

Proyek ini menyertakan file `client.js` dengan contoh-contoh untuk menguji semua endpoint. Anda dapat menjalankannya dari terminal:

```bash
node client.js
```
