export default async function handler(req, res) {
  // 1. Pull the hidden tokens securely from the Vercel server environment
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const timestamp = new Date().toLocaleTimeString();
  const alertMessage = `🚨 [MICRO-CLOUD EMERGENCY] A user tried to log into your cluster at ${timestamp}, but your desk ESP32 is completely out of power! Plug the battery in, you idiot!`;

  // 2. Build the secure HTTPS endpoint out-of-sight from the user
  const url = `https://telegram.org{token}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(alertMessage)}`;

  try {
    const telegramResponse = await fetch(url);
    if (telegramResponse.ok) {
      return res.status(200).json({ success: true, message: "Administrator notified successfully!" });
    } else {
      return res.status(500).json({ success: false, message: "Telegram API rejected the payload." });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: "Serverless transit connection error." });
  }
}
