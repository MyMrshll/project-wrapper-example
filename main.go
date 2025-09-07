package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

const baseURL = "http://localhost:3000"

// --- Structs untuk Request & Response ---

// Message mendefinisikan format pesan tunggal
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ChatRequest adalah body untuk permintaan non-streaming
type ChatRequest struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
	Stream   bool      `json:"stream,omitempty"`
}

// --- Klien Pengujian ---

// testHealthCheck menguji endpoint GET /health
func testHealthCheck() {
	fmt.Println("\n=== Menguji Health Check ===")

	resp, err := http.Get(baseURL + "/health")
	if err != nil {
		log.Printf("Error: Gagal membuat permintaan: %v", err)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Error: Gagal membaca respons: %v", err)
		return
	}

	fmt.Printf("Status: %s\n", resp.Status)
	fmt.Printf("Respons: %s\n", string(body))
}

// testChatCompletion menguji endpoint POST /chat-completion (non-streaming)
func testChatCompletion() {
	fmt.Println("\n=== Menguji Chat Completion (Non-Streaming) ===")

	reqPayload := ChatRequest{
		Model: "gpt-4o-mini",
		Messages: []Message{
			{Role: "user", Content: "Model apa yang kamu gunakan?"},
		},
	}

	jsonData, err := json.Marshal(reqPayload)
	if err != nil {
		log.Printf("Error: Gagal encode JSON: %v", err)
		return
	}

	resp, err := http.Post(baseURL+"/chat-completion", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		log.Printf("Error: Gagal mengirim permintaan POST: %v", err)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Error: Gagal membaca respons: %v", err)
		return
	}

	fmt.Printf("Status: %s\n", resp.Status)
	fmt.Printf("Respons: %s\n", string(body))
}

// testGeminiStream menguji endpoint POST /gemini-stream (streaming)
func testGeminiStream() {
	fmt.Println("\n=== Menguji Gemini Stream Endpoint (Raw) ===")

	reqPayload := ChatRequest{
		Model: "gemini-1.5-flash",
		Messages: []Message{
			{Role: "user", Content: "Ceritakan sebuah lelucon singkat tentang pemrograman."},
		},
	}

	jsonData, err := json.Marshal(reqPayload)
	if err != nil {
		log.Printf("Error: Gagal encode JSON: %v", err)
		return
	}

	resp, err := http.Post(baseURL+"/gemini-stream", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		log.Printf("Error: Gagal mengirim permintaan POST: %v", err)
		return
	}
	defer resp.Body.Close()

	fmt.Printf("Status: %s\n", resp.Status)
	fmt.Println("Respons Streaming (Raw): ")

	// Gunakan scanner untuk membaca dan mencetak setiap baris mentah dari respons
	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		fmt.Println(scanner.Text())
	}

	if err := scanner.Err(); err != nil {
		log.Printf("\nError: Gagal membaca stream: %v", err)
	}

	fmt.Println("--- Stream Selesai ---")
}

func main() {
	// Pastikan server sudah berjalan sebelum menjalankan klien ini
	log.Println("Menjalankan pengujian klien Go...")

	testHealthCheck()
	time.Sleep(1 * time.Second) // Jeda singkat antar pengujian

	testChatCompletion()
	time.Sleep(1 * time.Second)

	testGeminiStream()

	log.Println("\nPengujian selesai.")
}

