export default async function handler(req, res) {
  const { token, action } = req.query;

  // =========================
  // Basic validation
  // =========================
  if (!token) {
    return sendPage(
      res,
      "❌ Invalid Link",
      "The approval link is missing its security token.",
      "#dc3545"
    );
  }

  if (action !== "approve" && action !== "deny") {
    return sendPage(
      res,
      "❌ Invalid Action",
      "This approval link contains an invalid action.",
      "#dc3545"
    );
  }

  // =========================
  // Get secret
  // =========================
  const secret = process.env.APPROVAL_SECRET;

  if (!secret) {
    console.error("APPROVAL_SECRET is missing.");

    return sendPage(
      res,
      "⚠️ Server Error",
      "APPROVAL_SECRET is not configured.",
      "#ffc107"
    );
  }

  try {
    // =========================
    // 1. Split token
    // =========================
    const parts = String(token).split(".");

    if (parts.length !== 2) {
      return sendPage(
        res,
        "❌ Invalid Link",
        "The approval token is malformed.",
        "#dc3545"
      );
    }

    const payloadBase64 = parts[0];
    const providedSignature = parts[1];

    // =========================
    // 2. Verify HMAC
    // =========================
    const crypto = await import("crypto");

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payloadBase64)
      .digest("base64url");

    const providedBuffer = Buffer.from(
      providedSignature
    );

    const expectedBuffer = Buffer.from(
      expectedSignature
    );

    if (
      providedBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(
        providedBuffer,
        expectedBuffer
      )
    ) {
      return sendPage(
        res,
        "❌ Invalid Link",
        "This approval link failed security verification.",
        "#dc3545"
      );
    }

    // =========================
    // 3. Decode payload
    // =========================
    let payload;

    try {
      payload = JSON.parse(
        Buffer.from(
          payloadBase64,
          "base64url"
        ).toString("utf8")
      );
    } catch (e) {
      return sendPage(
        res,
        "❌ Invalid Link",
        "The approval request could not be decoded.",
        "#dc3545"
      );
    }

    const email = String(
      payload.email || ""
    ).toLowerCase().trim();

    const name = String(
      payload.name || "User"
    );

    const createdAt = Number(
      payload.createdAt || 0
    );

    if (!email || !createdAt) {
      return sendPage(
        res,
        "❌ Invalid Request",
        "The approval request is incomplete.",
        "#dc3545"
      );
    }

    // =========================
    // 4. Expiration
    // =========================
    const MAX_AGE = 60 * 60 * 1000; // 1 hour

    if (Date.now() - createdAt > MAX_AGE) {
      return sendPage(
        res,
        "❌ Link Expired",
        "This approval request is older than one hour.",
        "#dc3545"
      );
    }

    // =========================
    // 5. DENY
    // =========================
    if (action === "deny") {
      return sendPage(
        res,
        "❌ DENIED",
        `${escapeHtml(name)} (${escapeHtml(email)}) has been denied access.`,
        "#dc3545"
      );
    }

    // =====================================================
    // 6. APPROVE -> GitHub
    // =====================================================

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

    const REPO =
      "mohd-Affan16/micro-cloud-gateway";

    const FILE_PATH =
      "approved_users.json";

    if (!GITHUB_TOKEN) {
      console.error("GITHUB_TOKEN is missing.");

      return sendPage(
        res,
        "⚠️ Server Error",
        "GitHub configuration is missing.",
        "#ffc107"
      );
    }

    // =========================
    // Get approved_users.json
    // =========================
    const getRes = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`,
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "micro-cloud-gateway"
        },
        cache: "no-store"
      }
    );

    if (!getRes.ok) {
      const errorText = await getRes.text();

      console.error(
        "GitHub GET failed:",
        getRes.status,
        errorText
      );

      return sendPage(
        res,
        "⚠️ GitHub Error",
        "Unable to read approved_users.json.",
        "#ffc107"
      );
    }

    const fileData = await getRes.json();

    const sha = fileData.sha;

    if (!sha || !fileData.content) {
      return sendPage(
        res,
        "⚠️ GitHub Error",
        "approved_users.json could not be read.",
        "#ffc107"
      );
    }

    // =========================
    // Decode existing JSON
    // =========================
    let current;

    try {
      current = JSON.parse(
        Buffer.from(
          fileData.content.replace(/\n/g, ""),
          "base64"
        ).toString("utf8")
      );
    } catch (e) {
      console.error(
        "approved_users.json parse error:",
        e
      );

      return sendPage(
        res,
        "⚠️ Data Error",
        "approved_users.json contains invalid JSON.",
        "#ffc107"
      );
    }

    if (!Array.isArray(current.users)) {
      current.users = [];
    }

    const adminEmail =
      String(current.admin || "")
        .toLowerCase()
        .trim();

    // =========================
    // Prevent duplicates
    // =========================
    const alreadyApproved =
      current.users
        .map(u => String(u).toLowerCase().trim())
        .includes(email);

    const isAdmin =
      adminEmail === email;

    if (!alreadyApproved && !isAdmin) {
      current.users.push(email);
    }

    // =========================
    // Commit GitHub update
    // =========================
    const newContent = Buffer.from(
      JSON.stringify(current, null, 2)
    ).toString("base64");

    const updateRes = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`,
      {
        method: "PUT",

        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "User-Agent": "micro-cloud-gateway"
        },

        body: JSON.stringify({
          message: `Approve user: ${email}`,
          content: newContent,
          sha: sha
        })
      }
    );

    const updateData = await updateRes.json();

    if (!updateRes.ok) {
      console.error(
        "GitHub update failed:",
        updateRes.status,
        updateData
      );

      return sendPage(
        res,
        "⚠️ GitHub Update Failed",
        "The user could not be added to the GitHub whitelist.",
        "#ffc107"
      );
    }

    // =====================================================
    // 7. Tell ESP32
    // =====================================================

    const botToken =
      process.env.TELEGRAM_BOT_TOKEN;

    const chatId =
      process.env.TELEGRAM_CHAT_ID;

    if (botToken && chatId) {
      try {
        const espRes = await fetch(
          `https://api.telegram.org/bot${botToken}/sendMessage`,
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json"
            },

            body: JSON.stringify({
              chat_id: chatId,
              text: `/adduser ${email}`
            })
          }
        );

        const espData = await espRes.json();

        if (!espRes.ok || !espData.ok) {
          console.error(
            "ESP32 Telegram sync failed:",
            espData
          );
        }
      } catch (espError) {
        console.error(
          "ESP32 sync exception:",
          espError
        );
      }
    }

    // =========================
    // 8. Success
    // =========================
    return sendPage(
      res,
      "✅ APPROVED",
      `${escapeHtml(name)} (${escapeHtml(email)}) is now an approved family member.<br><br>` +
      `<span style="color:#94a3b8;">GitHub whitelist updated successfully.</span>`,
      "#28a745"
    );

  } catch (err) {
    console.error(
      "Approval error:",
      err
    );

    return sendPage(
      res,
      "⚠️ Server Error",
      "An unexpected error occurred while processing the approval.",
      "#ffc107"
    );
  }
}


// =====================================================
// Helper: HTML response
// =====================================================

function sendPage(
  res,
  title,
  message,
  color
) {
  return res
    .status(200)
    .send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport"
      content="width=device-width,initial-scale=1.0">
<title>Micro-Cloud Approval</title>

<style>
body {
  background:#0d0e15;
  color:#fff;
  font-family:'Segoe UI',sans-serif;
  display:flex;
  align-items:center;
  justify-content:center;
  min-height:100vh;
  margin:0;
  padding:20px;
  box-sizing:border-box;
}

.card {
  background:#252836;
  border:1px solid rgba(255,255,255,0.1);
  border-radius:16px;
  padding:40px;
  text-align:center;
  max-width:500px;
  width:100%;
  box-sizing:border-box;
  box-shadow:0 25px 50px rgba(0,0,0,0.6);
}

h1 {
  color:${color};
  margin-top:0;
}

p {
  color:#cbd5e1;
  line-height:1.6;
}
</style>
</head>

<body>

<div class="card">

<h1>${title}</h1>

<p>${message}</p>

</div>

</body>
</html>
`);
}


// =====================================================
// Helper: HTML escaping
// =====================================================

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}