export default async function handler(req, res) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const timestamp = new Date().toLocaleTimeString();
  const alertMessage = `🚨 [MICRO-CLOUD EMERGENCY] A user tried to log into your cluster at ${timestamp}, but your desk ESP32 is completely out of power! Plug the battery in, you idiot!`;

  // Clean, dedicated Telegram endpoint URL without string parameters
  const url = `https://telegram.org{token}/sendMessage`;

  try {
    // Pack the variables directly inside the body structure to satisfy Telegram's POST protocol
    const telegramResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: alertMessage
      })
    });
    
    if (telegramResponse.ok) {
      return res.status(200).json({ success: true, message: "Administrator notified successfully!" });
    } else {
      console.error("Telegram API Refusal Status Code:", telegramResponse.status);
      return res.status(500).json({ success: false, message: "Telegram API rejected the payload." });
    }
  } catch (error) {
    console.error("Serverless Catch Error:", error);
    return res.status(500).json({ success: false, message: "Serverless transit connection error." });
  }
}
