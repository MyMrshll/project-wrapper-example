const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Example 1: OpenAI Chat Completion
async function testOpenAICompletion() {
    console.log('\n=== Testing OpenAI Chat Completion ===');
    
    try {
        const response = await axios.post(`${BASE_URL}/openai-chat-completion`, {
            model: 'gpt-4o-mini',
            messages: [
                { role: 'user', content: 'What model are you?' }
            ],
            temperature: 0.7,
            max_tokens: 100
        });
        
        console.log('Response:', response.data);
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

// Example 2: Gemini Text Generation (Non-streaming)
async function testGeminiCompletion() {
    console.log('\n=== Testing Gemini Chat Completion ===');
    
    try {
        const response = await axios.post(`${BASE_URL}/chat-completion`, {
            model: 'gemini-1.5-pro',
            messages: [
                { role: 'user', content: 'What model are you and what can you do?' }
            ],
            temperature: 0.7
        });
        
        console.log('Response:', response.data);
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

// Example 3: Gemini Streaming
async function testGeminiStreaming() {
    console.log('\n=== Testing Gemini Streaming ===');
    
    try {
        const response = await axios.post(`${BASE_URL}/gemini-stream`, {
            model: 'gemini-1.5-flash',
            messages: [
                { role: 'user', content: 'Tell me a short story about a robot learning to paint.' }
            ]
        }, {
            responseType: 'stream'
        });
        
        console.log('Streaming response:');
        
        response.data.on('data', (chunk) => {
            const lines = chunk.toString().split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const data = JSON.parse(line.substring(6));
                        if (data.choices && data.choices[0].delta.content) {
                            process.stdout.write(data.choices[0].delta.content);
                        }
                    } catch (e) {
                        // Ignore parsing errors for SSE
                    }
                }
            }
        });
        
        response.data.on('end', () => {
            console.log('\n--- Stream ended ---');
        });
        
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

// Example 4: Universal Chat Completion with Streaming
async function testUniversalStreaming() {
    console.log('\n=== Testing Universal Chat Completion with Streaming ===');
    
    try {
        const response = await axios.post(`${BASE_URL}/chat-completion`, {
            model: 'gemini-1.5-pro',
            messages: [
                { role: 'user', content: 'Explain quantum computing in simple terms.' }
            ],
            stream: true
        }, {
            responseType: 'stream'
        });
        
        console.log('Universal streaming response:');
        
        response.data.on('data', (chunk) => {
            const lines = chunk.toString().split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const data = JSON.parse(line.substring(6));
                        if (data.choices && data.choices[0].delta.content) {
                            process.stdout.write(data.choices[0].delta.content);
                        }
                    } catch (e) {
                        // Ignore parsing errors for SSE
                    }
                }
            }
        });
        
        response.data.on('end', () => {
            console.log('\n--- Stream ended ---');
        });
        
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

// Example 5: Health Check
async function testHealthCheck() {
    console.log('\n=== Testing Health Check ===');
    
    try {
        const response = await axios.get(`${BASE_URL}/health`);
        console.log('Health check response:', response.data);
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

// Run all tests
async function runTests() {
    console.log('Starting API tests...');
    
    await testHealthCheck();
    await testOpenAICompletion();
    await testGeminiCompletion();
    
    // Note: Streaming tests will run asynchronously
    setTimeout(async () => {
        await testGeminiStreaming();
    }, 1000);
    
    setTimeout(async () => {
        await testUniversalStreaming();
    }, 3000);
}

// Python-style request example (matching your original format)
async function testPythonStyleRequest() {
    console.log('\n=== Testing Python-style Request Format ===');
    
    try {
        const response = await axios.post(`${BASE_URL}/openai-chat-completion`, {
            model: 'gpt-4o-mini',
            messages: '[{"role": "user", "content": "what model are you ?"}]',
            temperature: 0.7,
            max_tokens: 100
        });
        
        console.log('Python-style response:', response.data);
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

if (require.main === module) {
    runTests();
    
    setTimeout(async () => {
        await testPythonStyleRequest();
    }, 5000);
}

module.exports = {
    testOpenAICompletion,
    testGeminiCompletion,
    testGeminiStreaming,
    testUniversalStreaming,
    testHealthCheck,
    testPythonStyleRequest
};