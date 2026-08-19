export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send("Missing code.");
  }

  const client_id = process.env.GOOGLE_CLIENT_ID;
  const client_secret = process.env.GOOGLE_CLIENT_SECRET;
  const redirect_uri =
    "https://micro-cloud-gateway.vercel.app/api/callback";

  try {
    // =========================
    // 1. Exchange Google code
    // =========================
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        code,
        client_id,
        client_secret,
        redirect_uri,
        grant_type: "authorization_code"
      })
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Google token error:", tokenData);
      return res.status(401).send("Google authentication failed.");
    }

    // =========================
    // 2. Get Google profile
    // =========================
    const profileRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`
        }
      }
    );

    const profile = await profileRes.json();

    const userEmail = (profile.email || "").toLowerCase().trim();
    const userName = profile.name || "User";

    if (!userEmail) {
      return res.status(400).send("Google account email not available.");
    }

    // =========================
    // 3. Get approved users
    // =========================
    const listRes = await fetch(
      "https://raw.githubusercontent.com/mohd-Affan16/micro-cloud-gateway/main/approved_users.json",
      {
        cache: "no-store"
      }
    );

    if (!listRes.ok) {
      console.error("approved_users.json fetch failed:", listRes.status);
      return res.status(500).send("Unable to verify approved users.");
    }

    const listData = await listRes.json();

    const adminEmail = (listData.admin || "").toLowerCase().trim();

    const approvedUsers = (listData.users || [])
      .map(u => String(u).toLowerCase().trim());

    // =========================
    // 4. Check authorization
    // =========================
    const isAdmin = userEmail === adminEmail;
    const isFamily = approvedUsers.includes(userEmail);

    if (isAdmin || isFamily) {
      return res.redirect(
        `https://micro-cloud-gateway.vercel.app/bridge.html?email=${encodeURIComponent(
          userEmail
        )}&name=${encodeURIComponent(userName)}`
      );
    }

    // =====================================================
    // 5. Stranger -> create signed approval request
    // =====================================================

    /*
      IMPORTANT:

      We are NOT using:

          globalThis.pendingRequests

      because Vercel serverless functions are stateless.

      Instead, the approval information is encoded into a
      signed token.
    */

    const secret = process.env.APPROVAL_SECRET;

    if (!secret) {
      console.error("APPROVAL_SECRET is missing.");
      return res.status(500).send(
        "Server configuration error: APPROVAL_SECRET is missing."
      );
    }

    const payload = {
      email: userEmail,
      name: userName,
      createdAt: Date.now()
    };

    // Base64URL encode JSON payload
    const payloadBase64 = Buffer.from(
      JSON.stringify(payload)
    ).toString("base64url");

    // Create HMAC signature
    const crypto = await import("crypto");

    const signature = crypto
      .createHmac("sha256", secret)
      .update(payloadBase64)
      .digest("base64url");

    const approvalToken = `${payloadBase64}.${signature}`;

    // =========================
    // 6. Send Telegram request
    // =========================
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.error("Telegram configuration missing.");
      return res.status(500).send(
        "Server configuration error: Telegram credentials missing."
      );
    }

    const approveUrl =
      `https://micro-cloud-gateway.vercel.app/api/approve` +
      `?token=${encodeURIComponent(approvalToken)}` +
      `&action=approve`;

    const denyUrl =
      `https://micro-cloud-gateway.vercel.app/api/approve` +
      `?token=${encodeURIComponent(approvalToken)}` +
      `&action=deny`;

    const telegramRes = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: chatId,

          text:
            `🔐 NEW LOGIN REQUEST\n\n` +
            `👤 ${userName}\n` +
            `📧 ${userEmail}\n\n` +
            `Please choose an action:`,

          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "✅ APPROVE",
                  url: approveUrl
                },
                {
                  text: "❌ DENY",
                  url: denyUrl
                }
              ]
            ]
          }
        })
      }
    );

    const telegramData = await telegramRes.json();

    if (!telegramRes.ok || !telegramData.ok) {
      console.error("Telegram error:", telegramData);
      return res.status(500).send(
        "Unable to send approval request to Telegram."
      );
    }

    // =========================
    // 7. Send user to waiting page
    // =========================
    return res.redirect(
      `https://micro-cloud-gateway.vercel.app/waiting.html?email=${encodeURIComponent(
        userEmail
      )}&name=${encodeURIComponent(userName)}`
    );

  } catch (err) {
    console.error("Callback error:", err);

    return res.status(500).send(
      "Internal authentication error."
    );
  }
}