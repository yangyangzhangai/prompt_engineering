const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const CHUTES_API = 'llm.chutes.ai';

const server = http.createServer(async (req, res) => {
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // 代理 API 请求
    if ((req.url === '/v1/chat/completions' || req.url === '/v1/chat/completions/') && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const options = {
                hostname: CHUTES_API,
                path: '/v1/chat/completions',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': req.headers['authorization'] || '',
                    'X-API-Key': req.headers['x-api-key'] || ''
                }
            };
            
            const proxyReq = https.request(options, (proxyRes) => {
                res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
                proxyRes.pipe(res);
            });
            
            proxyReq.on('error', (err) => {
                console.error('Proxy error:', err);
                res.writeHead(500);
                res.end(JSON.stringify({ error: { message: err.message } }));
            });
            
            proxyReq.write(body);
            proxyReq.end();
        });
        return;
    }

    if ((req.url === '/v1/models' || req.url === '/v1/models/') && req.method === 'GET') {
        const options = {
            hostname: CHUTES_API,
            path: '/v1/models',
            method: 'GET',
            headers: {
                'Authorization': req.headers['authorization'] || '',
                'X-API-Key': req.headers['x-api-key'] || ''
            }
        };

        const proxyReq = https.request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
            proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
            console.error('Proxy error:', err);
            res.writeHead(500);
            res.end(JSON.stringify({ error: { message: err.message } }));
        });

        proxyReq.end();
        return;
    }
    
    // 静态文件服务
    let filePath = req.url === '/' ? '/prompt-debugger.html' : req.url;
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
