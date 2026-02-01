const http = require('http');

const stocks = [
    { code: '301000', name: '肇民科技' },
    { code: '300035', name: '中科电气' },
    { code: '600438', name: '通威股份' }
];

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    let html = `
    <html>
        <head>
            <title>主人 - 投资监控仪表盘</title>
            <style>
                body { font-family: sans-serif; background: #f4f7f6; padding: 20px; }
                .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 10px; }
                .name { font-size: 20px; font-weight: bold; }
                .code { color: #666; }
                .status { color: #27ae60; font-weight: bold; }
            </style>
        </head>
        <body>
            <h1>📊 投资监控仪表盘</h1>
            <p>更新时间: ${new Date().toLocaleString()}</p>
            ${stocks.map(s => `
                <div class="card">
                    <span class="name">${s.name}</span> 
                    <span class="code">(${s.code})</span>
                    <p class="status">实时监控中...</p>
                </div>
            `).join('')}
            <hr>
            <p>Powered by OpenClaw & Docker</p>
        </body>
    </html>`;
    res.end(html);
});

server.listen(8080, () => {
    console.log('Dashboard running at http://localhost:8080');
});
