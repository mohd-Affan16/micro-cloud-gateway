export default async function handler(req, res) {
  const { reqId, email, action } = req.query;
  const requests = globalThis.pendingRequests || new Map();

  if (!reqId || !requests.has(reqId)) {
    return res.send(`<html style="background:#0d0e15;color:#fff;font-family:sans-serif;text-align:center;padding-top:100px;">
      <h1 style="color:#dc3545;">❌ Link Expired</h1><p>This request is no longer valid.</p></html>`);
  }

  const request = requests.get(reqId);

  if (action === 'approve') {
    request.status = 'approved';
    const newEmail = (email || request.email).toLowerCase();

    try {
      const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
      const REPO = 'mohd-Affan16/micro-cloud-gateway';
      const FILE_PATH = 'approved_users.json';

      // 1. Get current file
      const getRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`, {
        headers: { Authorization: `token ${GITHUB_TOKEN}`, 'User-Agent': 'micro-cloud' }
      });
      const fileData = await getRes.json();
      const sha = fileData.sha;

      // 2. Decode
      const current = JSON.parse(Buffer.from(fileData.content, 'base64').toString());

      // 3. Add user (prevent duplicates, keep admin separate)
      if (!current.users.includes(newEmail) && current.admin.toLowerCase() !== newEmail) {
        current.users.push(newEmail);
      }

      // 4. Commit back
      const newContent = Buffer.from(JSON.stringify(current, null, 2)).toString('base64');

      await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`, {
        method: 'PUT',
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          'User-Agent': 'micro-cloud',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Approve user: ${newEmail}`,
          content: newContent,
          sha: sha
        })
      });

      // 5. Tell ESP32 to add user too
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `/adduser ${newEmail}`
        })
      });

    } catch (e) {
      console.error("GitHub update failed:", e);
      return res.send(`<html style="background:#0d0e15;color:#fff;font-family:sans-serif;text-align:center;padding-top:100px;">
        <h1 style="color:#ffc107;">⚠️ Partial Success</h1>
        <p>User approved in memory but GitHub sync failed. Add manually.</p></html>`);
    }

    return res.send(`<html style="background:#0d0e15;color:#fff;font-family:sans-serif;text-align:center;padding-top:100px;">
      <h1 style="color:#28a745;">✅ APPROVED</h1>
      <p>${request.name} (${newEmail}) is now a family member.</p>
      <p style="color:#94a3b8;">They can login and upload immediately.</p></html>`);

  } else {
    request.status = 'denied';
    return res.send(`<html style="background:#0d0e15;color:#fff;font-family:sans-serif;text-align:center;padding-top:100px;">
      <h1 style="color:#dc3545;">❌ DENIED</h1><p>${request.name} has been blocked.</p></html>`);
  }
}