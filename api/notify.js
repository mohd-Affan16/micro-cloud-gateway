// Import the native, built-in HTTPS routing package
import https from 'https';

export default function handler(req, res) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const timestamp = new Date().toLocaleTimeString();
  const alertMessage = `🚨 [MICRO-CLOUD EMERGENCY] A user tried to log into your cluster at ${timestamp}, but your desk ESP32 is completely out of power! Plug the battery in, you idiot!`;

  // Explicit parameters required for Telegram's secure backend handshake payload
  const payloadData = JSON.stringify({
    chat_id: chatId,
    text: alertMessage
  });

  // Construct raw corporate HTTPS request options block
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

  // Open direct, unblockable network socket to Telegram servers
  const telegramRequest = https.request(options, (telegramResponse) => {
    let responseBody = '';
    telegramResponse.on('data', (chunk) => { responseBody += chunk; });
    
    telegramResponse.on('end', () => {
      if (telegramResponse.statusCode === 200) {
        return res.status(200).json({ success: true, message: "Administrator notified!" });
      } else {
        console.error("Telegram Server Refusal Details:", responseBody);
        return res.status(500).json({ success: false, message: "API credentials mismatch or rejection." });
      }
    });
  });

  telegramRequest.on('error', (error) => {
    console.error("Network Stream Connection Error:", error);
    return res.status(500).json({ success: false, message: "Local transit error." });
  });

  // Push the data payload down the wire and seal the socket session
  telegramRequest.write(payloadData);
  telegramRequest.end();
}
