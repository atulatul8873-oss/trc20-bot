const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = '8825683546:AAHy5AaOjk5bo3YlFTJ-EYcaOrT2X-lLiJQ';
const MY_CHAT_ID = '924999061';

app.post('/webhook', async (req, res) => {
    try {
        const payload = req.body;
        console.log("Received a payload from QuickNode!");

        // Handle case where QuickNode sends a direct block/tx array or a wrapped object
        const txs = Array.isArray(payload) ? payload : (payload.data || payload.transactions || []);

        if (txs.length > 0) {
            for (let tx of txs) {
                // Get the transaction hash/ID depending on format
                const txId = tx.txID || tx.hash || tx.id || 'N/A';
                
                const message = `🔔 *New TRC20 Activity Detected!*\n\n` +
                                `• *TxID:* \`${txId}\`\n` +
                                `• *View Details:* [TronScan Link](https://tronscan.org/#/transaction/${txId})`;

                await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                    chat_id: MY_CHAT_ID,
                    text: message,
                    parse_mode: 'Markdown'
                });
            }
        } else {
            // If it's a test ping or single notification item
            const singleId = payload.txID || (payload[0] && payload[0].txID);
            if (singleId) {
                const message = `🔔 *New TRC20 Activity Detected!*\n\n• *TxID:* \`${singleId}\`\n• [TronScan Link](https://tronscan.org/#/transaction/${singleId})`;
                await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                    chat_id: MY_CHAT_ID,
                    text: message,
                    parse_mode: 'Markdown'
                });
            }
        }
        
        res.status(200).send('OK');
    } catch (error) {
        console.error('Error processing webhook:', error.message);
        res.status(500).send('Error');
    }
});

app.listen(process.env.PORT || 3000, () => console.log('Bot is listening...'));
