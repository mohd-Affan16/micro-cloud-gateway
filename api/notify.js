export default async function handler(req, res) {
  // Pull the hidden tokens securely from the Vercel server environment
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const timestamp = new Date().toLocaleTimeString();
  const alertMessage = `🚨 [MICRO-CLOUD EMERGENCY] A user tried to log into your cluster at ${timestamp}, but your desk ESP32 is completely out of power! Plug the battery in, you idiot!`;

  // Build the secure HTTPS endpoint out-of-sight from the user
  const url = `https://telegram.org{token}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(alertMessage)}`;

  try {
    // Fixed: Added explicit method and header contexts to satisfy the Node.js serverless engine
    const telegramResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (telegramResponse.ok) {
      return res.status(200).json({ success: true, message: "Administrator notified successfully!" });
    } else {
      // Print detailed internal codes inside Vercel log tracking panels if it drops
      console.error("Telegram API Error Status:", telegramResponse.status);
      return res.status(500).json({ success: false, message: "Telegram API rejected the payload." });
    }
  } catch (error) {
    console.error("Serverless Catch Error:", error);
    return res.status(500).json({ success: false, message: "Serverless transit connection error." });
  }
}
