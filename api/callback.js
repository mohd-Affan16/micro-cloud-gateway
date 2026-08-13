export default async function handler(req, res) {
  const { code } = req.query;
  if (!code) return res.status(400).send("Authorization code missing.");

  const client_id = process.env.GOOGLE_CLIENT_ID;
  const client_secret = process.env.GOOGLE_CLIENT_SECRET;
  const redirect_uri = "https://micro-cloud-gateway.vercel.app/api/callback";

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id,
        client_secret,
        redirect_uri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) return res.status(400).send("Failed to retrieve access token.");

    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    
    const profileData = await profileResponse.json();
    const userEmail = profileData.email || "unknown@gmail.com";
    const userName = profileData.name || "User";

    const local_esp32_destination = `http://192.168.0.188/?email=${encodeURIComponent(userEmail)}&name=${encodeURIComponent(userName)}`;
    
    return res.redirect(local_esp32_destination);

  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal identity extraction error.");
  }
}