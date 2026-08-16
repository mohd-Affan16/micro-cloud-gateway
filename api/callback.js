export default async function handler(req, res) {
  const { code } = req.query;
  if (!code) return res.status(400).send("Missing code.");

  const client_id = process.env.GOOGLE_CLIENT_ID;
  const client_secret = process.env.GOOGLE_CLIENT_SECRET;
  const redirect_uri = "https://micro-cloud-gateway.vercel.app/api/callback";

  try {
    // Get Google token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id, client_secret, redirect_uri, grant_type: 'authorization_code' })
    });
    const tokenData = await tokenRes.json();

    // Get profile
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const profile = await profileRes.json();
    const userEmail = (profile.email || "").toLowerCase();
    const userName = profile.name || "User";

    // Fetch single source of truth from GitHub
    const listRes = await fetch('https://raw.githubusercontent.com/mohd-Affan16/micro-cloud-gateway/main/approved_users.json');
    const listData = await listRes.json();
    const adminEmail = (listData.admin || "").toLowerCase();
    const approvedUsers = (listData.users || []).map(u => u.toLowerCase());

    // Gate 2: Admin or approved family member
    const isAdmin = userEmail === adminEmail;
    const isFamily = approvedUsers.includes(userEmail);

    if (isAdmin || isFamily) {
      return res.redirect(
        `https://micro-cloud-gateway.vercel.app/bridge.html?email=${encodeURIComponent(userEmail)}&name=${encodeURIComponent(userName)}`
      );
    }

    // Stranger: waiting room + Telegram approval
    const reqId = Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
    if (!globalThis.pendingRequests) globalThis.pendingRequests = new Map();
    globalThis.pendingRequests.set(reqId, { status: 'pending', email: userEmail, name: userName });

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🔐 NEW LOGIN REQUEST\n\n👤 ${userName}\n📧 ${userEmail}`,
        reply_markup: {
          inline_keyboard: [[
            { text: "✅ APPROVE", url: `https://micro-cloud-gateway.vercel.app/api/approve?reqId=${reqId}&email=${encodeURIComponent(userEmail)}&action=approve` },
            { text: "❌ DENY", url: `https://micro-cloud-gateway.vercel.app/api/approve?reqId=${reqId}&action=deny` }
          ]]
        }
      })
    });

    return res.redirect(`https://micro-cloud-gateway.vercel.app/waiting.html?reqId=${reqId}`);

  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal error");
  }
}