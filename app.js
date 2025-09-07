const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Logging utilities
const logRequest = (endpoint, model, message) => {
    console.log(`[${new Date().toISOString()}] REQUEST ${endpoint} - Model: ${model} - ${message}`);
};

const logResponse = (endpoint, status, message) => {
    console.log(`[${new Date().toISOString()}] RESPONSE ${endpoint} - Status: ${status} - ${message}`);
};

const logError = (endpoint, error) => {
    console.error(`[${new Date().toISOString()}] ERROR ${endpoint} - ${error}`);
};

const logMessage = (message) => {
    console.log(`[${new Date().toISOString()}] INFO - ${message}`);
};

// Get API key based on provider
const getApiKey = (provider) => {
    switch (provider) {
        case 'openai':
            return process.env.OPENAI_API_KEY;
        case 'anthropic':
            return process.env.ANTHROPIC_API_KEY;
        case 'gemini':
            return process.env.GEMINI_API_KEY;
        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
};

// Determine provider based on model name
const getProvider = (model) => {
    if (['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4-turbo-preview', 'gpt-4', 'gpt-4-32k',
         'gpt-3.5-turbo', 'gpt-3.5-turbo-16k', 'gpt-3.5-turbo-instruct',
         'text-davinci-003', 'code-davinci-002',
         'text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'].includes(model)) {
        return 'openai';
    }
    
    if (['claude-3-5-sonnet-20241022', 'claude-3-5-sonnet-20240620',
         'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307',
         'claude-2.1', 'claude-2.0', 'claude-instant-1.2'].includes(model)) {
        return 'anthropic';
    }
    
    if (['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro', 'gemini-pro-vision',
         'gemini-ultra', 'gemini-1.0-ultra', 'text-bison', 'chat-bison', 'codechat-bison'].includes(model)) {
        return 'gemini';
    }
    
    return 'openai'; // Default to OpenAI
};

// Parse messages from request
const parseMessages = (messagesInput) => {
    if (Array.isArray(messagesInput)) {
        return messagesInput.map(msg => ({
            role: msg.role || 'user',
            content: msg.content || ''
        }));
    }
    
    if (typeof messagesInput === 'object' && messagesInput !== null) {
        return [{
            role: 'user',
            content: JSON.stringify(messagesInput)
        }];
    }
    
    if (typeof messagesInput === 'string') {
        try {
            const parsed = JSON.parse(messagesInput);
            if (Array.isArray(parsed)) {
                return parsed.map(msg => ({
                    role: msg.role || 'user',
                    content: msg.content || ''
                }));
            } else {
                return [{
                    role: 'user',
                    content: messagesInput
                }];
            }
        } catch (e) {
            return [{
                role: 'user',
                content: messagesInput
            }];
        }
    }
    
    return [{
        role: 'user',
        content: ''
    }];
};

// OpenAI Chat Completions
const callOpenAIChatCompletions = async (apiKey, request) => {
    logRequest('ChatCompletions', request.model, 'Calling OpenAI Chat Completions API');
    
    console.log('req from client:', request);
    
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: request.model,
                messages: request.messages,
                ...request.extra_params
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }
            }
        );
        
        logResponse('ChatCompletions', response.status, 'Received response from OpenAI');
        return response.data;
    } catch (error) {
        if (error.response) {
            const errorMsg = `API Error: ${error.response.data?.error?.message || error.response.statusText}`;
            logError('ChatCompletions', errorMsg);
            throw new Error(errorMsg);
        } else {
            const errorMsg = `Network error: ${error.message}`;
            logError('ChatCompletions', errorMsg);
            throw new Error(errorMsg);
        }
    }
};

// Gemini Text Generation (Non-streaming)
const callGeminiTextGeneration = async (apiKey, request) => {
    logRequest('GeminiTextGeneration', request.model, 'Calling Gemini Text Generation API');
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: request.model });
    
    try {
        // Convert messages to Gemini format
        const prompt = request.messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        logResponse('GeminiTextGeneration', '200', 'Received response from Gemini');
        
        // Return in OpenAI-compatible format
        return {
            id: `gemini-${Date.now()}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: request.model,
            choices: [{
                index: 0,
                message: {
                    role: 'assistant',
                    content: text
                },
                finish_reason: 'stop'
            }],
            usage: {
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0
            }
        };
    } catch (error) {
        const errorMsg = `Gemini API Error: ${error.message}`;
        logError('GeminiTextGeneration', errorMsg);
        throw new Error(errorMsg);
    }
};

// Gemini Text Generation Stream
const callGeminiTextGenerationStream = async (apiKey, request, res) => {
    logRequest('GeminiTextGenerationStream', request.model, 'Calling Gemini Text Generation Stream API');
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: request.model });
    
    try {
        // Set up SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        
        // Convert messages to Gemini format
        const prompt = request.messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
        
        const result = await model.generateContentStream(prompt);
        
        let fullContent = '';
        
        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            fullContent += chunkText;
            
            // Send chunk in OpenAI-compatible format
            const sseData = {
                id: `gemini-${Date.now()}`,
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: request.model,
                choices: [{
                    index: 0,
                    delta: {
                        content: chunkText
                    },
                    finish_reason: null
                }]
            };
            
            res.write(`data: ${JSON.stringify(sseData)}\n\n`);
        }
        
        // Send final chunk
        const finalData = {
            id: `gemini-${Date.now()}`,
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: request.model,
            choices: [{
                index: 0,
                delta: {},
                finish_reason: 'stop'
            }]
        };
        
        res.write(`data: ${JSON.stringify(finalData)}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
        
        logResponse('GeminiTextGenerationStream', '200', 'Completed Gemini stream');
        
    } catch (error) {
        const errorMsg = `Gemini Stream API Error: ${error.message}`;
        logError('GeminiTextGenerationStream', errorMsg);
        
        const errorData = {
            error: {
                message: errorMsg,
                type: 'gemini_error'
            }
        };
        
        res.write(`data: ${JSON.stringify(errorData)}\n\n`);
        res.end();
    }
};

// Routes

// OpenAI Chat Completion Endpoint
app.post('/openai-chat-completion', async (req, res) => {
    try {
        logMessage('Received request on /openai-chat-completion endpoint');
        logMessage(`Request payload: ${JSON.stringify(req.body)}`);
        console.log('get payload from client:', req.body);
        
        const { model = 'gpt-4o-mini', messages, ...extraParams } = req.body;
        
        const provider = getProvider(model);
        const apiKey = getApiKey(provider);
        
        if (!apiKey) {
            return res.status(500).json({ error: `API key not found for provider: ${provider}` });
        }
        
        const parsedMessages = parseMessages(messages);
        
        const openaiRequest = {
            model,
            messages: parsedMessages,
            extra_params: extraParams
        };
        
        console.log('===>request to openai:', openaiRequest);
        
        logMessage('Calling OpenAI Chat Completions API from /openai-chat-completion endpoint');
        
        let response;
        if (provider === 'gemini') {
            response = await callGeminiTextGeneration(apiKey, openaiRequest);
        } else {
            response = await callOpenAIChatCompletions(apiKey, openaiRequest);
        }
        
        logMessage('Successfully completed /openai-chat-completion endpoint');
        res.json(response);
        
    } catch (error) {
        logError('openai-chat-completion', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Gemini Text Generation Stream Endpoint
app.post('/gemini-stream', async (req, res) => {
    try {
        console.log(req.body)
        logMessage('Received request on /gemini-stream endpoint');
        logMessage(`Request payload: ${JSON.stringify(req.body)}`);
        
        const { model, messages , ...extraParams } = req.body;    
        
        const apiKey = getApiKey('gemini');
        
        if (!apiKey) {
            return res.status(500).json({ error: 'Gemini API key not found' });
        }
        
        const parsedMessages = parseMessages(messages);
        
        const geminiRequest = {
            model,
            messages: parsedMessages,
            extra_params: extraParams
        };
        
        console.log('===>request to gemini stream:', geminiRequest);
        
        await callGeminiTextGenerationStream(apiKey, geminiRequest, res);
        
    } catch (error) {
        logError('gemini-stream', error.message);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        }
    }
}); 

// Generic Chat Completion Endpoint (supports all providers)
app.post('/chat-completion', async (req, res) => {
    try {
        logMessage('Received request on /chat-completion endpoint');
        logMessage(`Request payload: ${JSON.stringify(req.body)}`);
        
        const { model = 'gpt-4o-mini', messages, stream = false, ...extraParams } = req.body;
        
        const provider = getProvider(model);
        const apiKey = getApiKey(provider);
        
        if (!apiKey) {
            return res.status(500).json({ error: `API key not found for provider: ${provider}` });
        }
        
        const parsedMessages = parseMessages(messages);
        
        const request = {
            model,
            messages: parsedMessages,
            extra_params: extraParams
        };
        
        console.log('===>request to provider:', provider, request);
        
        if (stream && provider === 'gemini') {
            await callGeminiTextGenerationStream(apiKey, request, res);
        } else if (provider === 'gemini') {
            const response = await callGeminiTextGeneration(apiKey, request);
            res.json(response);
        } else {
            // For OpenAI and other providers
            const response = await callOpenAIChatCompletions(apiKey, request);
            res.json(response);
        }
        
        logMessage('Successfully completed /chat-completion endpoint');
        
    } catch (error) {
        logError('chat-completion', error.message);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        }
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    logError('global', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    logMessage(`Server running on port ${PORT}`);
    logMessage('Available endpoints:');
    logMessage('  POST /openai-chat-completion - OpenAI compatible chat completion');
    logMessage('  POST /gemini-stream - Gemini streaming text generation');
    logMessage('  POST /chat-completion - Universal chat completion (supports streaming)');
    logMessage('  GET /health - Health check');
});

module.exports = app;