const http = require('http');
const https = require('https');

const FEISHU_WEBHOOK = 'https://open.feishu.cn/open-apis/bot/v2/hook/c17122bb-3337-41cc-91da-43b8bcd2adf5';

const stocks = [
    { code: '301000', name: '肇民科技', market: 'sz', threshold: 2.0 },
    { code: '300035', name: '中科电气', market: 'sz', threshold: 2.0 },
    { code: '600438', name: '通威股份', market: 'sh', threshold: 2.0 }
];

// 记录上一次推送的价格，避免重复推送
let lastPrices = {};

function sendFeishuAlert(content) {
    const data = JSON.stringify({
        msg_type: "text",
        content: { text: `🔔 投资预警：\n${content}` }
    });

    const url = new URL(FEISHU_WEBHOOK);
    const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const req = https.request(options);
    req.write(data);
    req.end();
}

function fetchStockData(stock) {
    return new Promise((resolve) => {
        const fullCode = stock.market + stock.code;
        https.get(`https://hq.sinajs.cn/list=${fullCode}`, { headers: { 'Referer': 'https://finance.sina.com.cn' } }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const params = data.split('"')[1].split(',');
                    if (params.length > 3) {
                        const price = parseFloat(params[3]);
                        const open = parseFloat(params[2]);
                        const percent = ((price - open) / open * 100).toFixed(2);
                        
                        // 预警逻辑：如果波动超过阈值且价格有变化
                        if (Math.abs(percent) >= stock.threshold && lastPrices[stock.code] !== price) {
                            sendFeishuAlert(`${stock.name}(${stock.code}) 当前涨跌幅 ${percent}%，价格 ${price.toFixed(2)}。请关注！`);
                            lastPrices[stock.code] = price;
                        }

                        resolve({
                            price: price.toFixed(2),
                            change: (price - open).toFixed(2),
                            percent: percent
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

// 每 1 分钟自动检查一次预警
setInterval(async () => {
    for (const stock of stocks) {
        await fetchStockData(stock);
    }
}, 60000);

const server = http.createServer(async (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    
    const stockResults = await Promise.all(stocks.map(async s => {
        const data = await fetchStockData(s);
        return { ...s, ...data };
    }));

    let html = `
    <html>
        <head>
            <title>主人 - 实时投资预警看板</title>
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
                    <h1>📈 实时投资预警看板</h1>
                    <span>推送状态: 飞书在线</span>
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
                    阈值提示：涨跌幅超 2.0% 将触发飞书推送 | 数据刷新: 30s<br>
                    OpenClaw AI 驱动开发
                </div>
            </div>
        </body>
    </html>`;
    res.end(html);
});

server.listen(8080, () => {
    console.log('Dashboard with Feishu Alerts is running.');
});
