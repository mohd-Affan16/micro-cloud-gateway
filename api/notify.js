import https from 'https';

export default function handler(req, res) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  const customMsg = req.query.message;
  const timestamp = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' });
  
  const alertMessage = customMsg || 
    `🚨 [MICRO-CLOUD EMERGENCY] A user tried to log into your cluster at ${timestamp}, but your desk ESP32 is completely out of power! Plug the battery in, you idiot!`;

  const payloadData = JSON.stringify({ chat_id: chatId, text: alertMessage });

  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${token}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payloadData)
    }
  };

  const telegramRequest = https.request(options, (telegramResponse) => {
    let responseBody = '';
    telegramResponse.on('data', (chunk) => { responseBody += chunk; });
    telegramResponse.on('end', () => {
      if (telegramResponse.statusCode === 200) {
        return res.status(200).json({ success: true, message: "Administrator notified!" });
      } else {
        console.error("Telegram error:", responseBody);
        return res.status(500).json({ success: false, message: "API error." });
      }
    });
  });

  telegramRequest.on('error', (error) => {
    console.error("Network error:", error);
    return res.status(500).json({ success: false, message: "Network error." });
  });

  telegramRequest.write(payloadData);
  telegramRequest.end();
}