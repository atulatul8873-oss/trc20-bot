const express = require('express');
const axios = require('axios');
const app = express();

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
app.listen(process.env.PORT || 3000, () => {
    console.log('Direct Blockchain Tracker Started...');
    // Do an initial run to lock the last transaction ID
    checkWalletTransactions();
});
