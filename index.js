const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// Put your Telegram info here inside the single quotes
const TELEGRAM_TOKEN = '8825683546:AAHy5AaOjk5bo3YlFTJ-EYcaOrT2X-lLiJQ';
const MY_CHAT_ID = '924999061';

app.post('/webhook', async (req, res) => {
    try {
        const payload = req.body;
        
        // QuickNode sends an array of transactions in the payload
        if (payload && payload.length > 0) {
            for (let tx of payload) {
                const txId = tx.txID || 'N/A';
                const message = `🔔 *New TRC20 Activity Detected!*\n\n` +
                                `• *TxID:* \`${txId}\`\n` +
                                `• *View Details:* [TronScan Link](https://tronscan.org/#/transaction/${txId})`;

                // Send to your Telegram
                await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                    chat_id: MY_CHAT_ID,
                    text: message,
                    parse_mode: 'Markdown'
                });
            }
        }
        res.status(200).send('OK');
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error');
    }
});

app.listen(process.env.PORT || 3000, () => console.log('Bot is listening...'));
