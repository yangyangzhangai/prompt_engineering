const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const OPENAI_API = 'api.openai.com';
const DEEPSEEK_API = 'api.deepseek.com';

function proxyJsonRequest({ req, res, hostname, path: targetPath, method }) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': req.headers['authorization'] || ''
        };

        if (method === 'GET') {
            delete headers['Content-Type'];
        }

        const options = {
            hostname,
            path: targetPath,
            method,
            headers
        };

        const proxyReq = https.request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
            proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
            console.error('Proxy error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { message: err.message } }));
        });

        if (method !== 'GET' && body) {
            proxyReq.write(body);
        }
        proxyReq.end();
    });
}

const server = http.createServer(async (req, res) => {
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // OpenAI 代理
    if ((req.url === '/v1/chat/completions' || req.url === '/v1/chat/completions/') && req.method === 'POST') {
        proxyJsonRequest({ req, res, hostname: OPENAI_API, path: '/v1/chat/completions', method: 'POST' });
        return;
    }

    if ((req.url === '/v1/models' || req.url === '/v1/models/') && req.method === 'GET') {
        proxyJsonRequest({ req, res, hostname: OPENAI_API, path: '/v1/models', method: 'GET' });
        return;
    }

    // DeepSeek 代理
    if ((req.url === '/deepseek/v1/chat/completions' || req.url === '/deepseek/v1/chat/completions/') && req.method === 'POST') {
        proxyJsonRequest({ req, res, hostname: DEEPSEEK_API, path: '/v1/chat/completions', method: 'POST' });
        return;
    }

    if ((req.url === '/deepseek/v1/models' || req.url === '/deepseek/v1/models/') && req.method === 'GET') {
        proxyJsonRequest({ req, res, hostname: DEEPSEEK_API, path: '/v1/models', method: 'GET' });
        return;
    }
    
    // 静态文件服务
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(__dirname, filePath);
    
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css'
    };
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
        res.end(content);
    });
});

server.listen(PORT, () => {
    console.log(`
🚀 服务器已启动！

📍 本地访问: http://localhost:${PORT}

请刷新浏览器页面后重试。
    `);
});
