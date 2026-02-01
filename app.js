const http = require('http');
const https = require('https');

const stocks = [
    { code: '301000', name: '肇民科技', market: 'sz' },
    { code: '300035', name: '中科电气', market: 'sz' },
    { code: '600438', name: '通威股份', market: 'sh' }
];

function fetchStockData(stock) {
    return new Promise((resolve) => {
        const fullCode = stock.market + stock.code;
        // 使用新浪财经简易接口 (仅作演示，实际生产建议用专业API)
        https.get(`https://hq.sinajs.cn/list=${fullCode}`, { headers: { 'Referer': 'https://finance.sina.com.cn' } }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const params = data.split('"')[1].split(',');
                    if (params.length > 3) {
                        resolve({
                            price: parseFloat(params[3]).toFixed(2),
                            change: (parseFloat(params[3]) - parseFloat(params[2])).toFixed(2),
                            percent: (((parseFloat(params[3]) - parseFloat(params[2])) / parseFloat(params[2])) * 100).toFixed(2)
                        });
                    } else {
                        resolve({ price: '---', change: '0', percent: '0' });
                    }
                } catch (e) {
                    resolve({ price: '读取中', change: '0', percent: '0' });
                }
            });
        }).on('error', () => resolve({ price: '接口异常', change: '0', percent: '0' }));
    });
}

const server = http.createServer(async (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    
    const stockResults = await Promise.all(stocks.map(async s => {
        const data = await fetchStockData(s);
        return { ...s, ...data };
    }));

    let html = `
    <html>
        <head>
            <title>主人 - 实时投资看板</title>
            <meta http-equiv="refresh" content="30">
            <style>
                body { font-family: 'PingFang SC', sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; }
                .container { max-width: 800px; margin: 0 auto; }
                .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 20px; margin-bottom: 30px; }
                .card { background: #1e293b; padding: 25px; border-radius: 12px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; transition: 0.3s; }
                .card:hover { background: #334155; }
                .info .name { font-size: 24px; color: #f1f5f9; }
                .info .code { color: #94a3b8; font-size: 14px; margin-left: 10px; }
                .price-box { text-align: right; }
                .price { font-size: 28px; font-weight: bold; font-family: 'Courier New'; }
                .up { color: #ef4444; }
                .down { color: #22c55e; }
                .footer { margin-top: 40px; font-size: 12px; color: #64748b; text-align: center; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📈 实时投资看板</h1>
                    <span>自动刷新: 30s</span>
                </div>
                ${stockResults.map(s => {
                    const colorClass = parseFloat(s.change) >= 0 ? 'up' : 'down';
                    const sign = parseFloat(s.change) >= 0 ? '+' : '';
                    return `
                    <div class="card">
                        <div class="info">
                            <span class="name">${s.name}</span>
                            <span class="code">${s.code}</span>
                        </div>
                        <div class="price-box">
                            <div class="price ${colorClass}">${s.price}</div>
                            <div class="${colorClass}">${sign}${s.percent}% (${sign}${s.change})</div>
                        </div>
                    </div>`;
                }).join('')}
                <div class="footer">
                    数据来源：实时行情接口 | 生成时间: ${new Date().toLocaleString()}<br>
                    OpenClaw AI 驱动开发
                </div>
            </div>
        </body>
    </html>`;
    res.end(html);
});

server.listen(8080, () => {
    console.log('Dashboard updated and running.');
});
