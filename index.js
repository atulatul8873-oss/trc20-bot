const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

const TELEGRAM_TOKEN = '8825683546:AAHy5AaOjk5bo3YlFTJ-EYcaOrT2X-lLiJQ';
const MY_CHAT_ID = '924999061';

// CHANGE THIS: Put the wallet address you want to watch inside the single quotes
const WATCH_ADDRESS = 'TRddavA3419yiCR5m7fT5H7vbrRNzvXVdE'; 

let lastSeenTxId = '';

async function checkWalletTransactions() {
    try {
        // Fetch the latest TRC20 transfers for your address directly from TronGrid
        const response = await axios.get(`https://api.trongrid.io/v1/accounts/${WATCH_ADDRESS}/transactions/trc20`, {
            params: { limit: 1 }
        });

        const transfers = response.data.data;
        if (transfers && transfers.length > 0) {
            const latestTx = transfers[0];
            const currentTxId = latestTx.transaction_id;

            // If it's a new transaction we haven't processed yet
            if (lastSeenTxId && currentTxId !== lastSeenTxId) {
                const tokenName = latestTx.token_info.symbol || 'Tokens';
                const decimals = latestTx.token_info.decimals || 6;
                const rawAmount = latestTx.value;
                const amount = (rawAmount / Math.pow(10, decimals)).toFixed(2);
                const fromAddress = latestTx.from;
                const toAddress = latestTx.to;

                let type = '📥 Received';
                if (fromAddress.toLowerCase() === WATCH_ADDRESS.toLowerCase()) {
                    type = '📤 Sent';
                }

                const message = `🔔 *TRC20 Wallet Alert!*\n\n` +
                                `• *Type:* ${type}\n` +
                                `• *Amount:* ${amount} ${tokenName}\n` +
                                `• *From:* \`${fromAddress}\`\n` +
                                `• *To:* \`${toAddress}\`\n` +
                                `• [View on TronScan](https://tronscan.org/#/transaction/${currentTxId})`;

                // Send straight to Telegram
                await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                    chat_id: MY_CHAT_ID,
                    text: message,
                    parse_mode: 'Markdown'
                });
                
                console.log(`Notification sent for TX: ${currentTxId}`);
            }

            // Update our marker so we don't alert the same transaction twice
            lastSeenTxId = currentTxId;
        }
    } catch (error) {
        console.error('Error checking Tron network:', error.message);
    }
}

// Start watching the wallet every 15 seconds
setInterval(checkWalletTransactions, 15000);

// Keep server alive for Render
app.get('/', (req, res) => res.send('Direct Tracker is Active!'));

app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
        return res.status(400).json({ error: 'Request body is missing or empty' });
    }

    const { transaction_id, from, to, value, token_info } = body;

    const missing = [];
    if (!transaction_id) missing.push('transaction_id');
    if (!from) missing.push('from');
    if (!to) missing.push('to');
    if (value === undefined || value === null) missing.push('value');
    if (!token_info) missing.push('token_info');

    if (missing.length > 0) {
        return res.status(400).json({
            error: 'Missing required fields',
            missing_fields: missing
        });
    }

    if (typeof transaction_id !== 'string' || transaction_id.trim() === '') {
        return res.status(400).json({ error: '"transaction_id" must be a non-empty string' });
    }
    if (typeof from !== 'string' || from.trim() === '') {
        return res.status(400).json({ error: '"from" must be a non-empty string' });
    }
    if (typeof to !== 'string' || to.trim() === '') {
        return res.status(400).json({ error: '"to" must be a non-empty string' });
    }
    if (typeof value !== 'string' && typeof value !== 'number') {
        return res.status(400).json({ error: '"value" must be a string or number' });
    }
    if (typeof token_info !== 'object' || token_info === null) {
        return res.status(400).json({ error: '"token_info" must be an object' });
    }

    const tokenName = token_info.symbol || 'Tokens';
    const decimals = Number(token_info.decimals);
    if (isNaN(decimals) || decimals < 0) {
        return res.status(400).json({ error: '"token_info.decimals" must be a non-negative number' });
    }

    const rawAmount = Number(value);
    if (isNaN(rawAmount)) {
        return res.status(400).json({ error: '"value" is not a valid number' });
    }

    const amount = (rawAmount / Math.pow(10, decimals)).toFixed(2);

    let type = '\u{1F4E5} Received';
    if (from.toLowerCase() === WATCH_ADDRESS.toLowerCase()) {
        type = '\u{1F4E4} Sent';
    }

    const message = `\u{1F514} *TRC20 Wallet Alert!*\n\n` +
                    `\u2022 *Type:* ${type}\n` +
                    `\u2022 *Amount:* ${amount} ${tokenName}\n` +
                    `\u2022 *From:* \`${from}\`\n` +
                    `\u2022 *To:* \`${to}\`\n` +
                    `\u2022 [View on TronScan](https://tronscan.org/#/transaction/${transaction_id})`;

    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            chat_id: MY_CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
        });
        console.log(`Webhook notification sent for TX: ${transaction_id}`);
        return res.status(200).json({ success: true, transaction_id });
    } catch (error) {
        console.error('Failed to send Telegram notification:', error.message);
        return res.status(500).json({ error: 'Failed to send notification' });
    }
});

app.listen(process.env.PORT || 3000, () => {
    console.log('Direct Blockchain Tracker Started...');
    // Do an initial run to lock the last transaction ID
    checkWalletTransactions();
});
