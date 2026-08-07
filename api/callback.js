import https from 'https';

export default async function handler(req, res) {
  const { code } = req.query;
  if (!code) return res.status(400).send("Authorization code missing from Google transaction registry.");

  // 🔐 Pull keys securely from Vercel's environment vault instead of rewriting them!
  const client_id = process.env.GOOGLE_CLIENT_ID;
  const client_secret = process.env.GOOGLE_CLIENT_SECRET;
  
  // Your exact public Vercel production domain destination
  const redirect_uri = "https://micro-cloud-gateway.vercel.app";

  // Swap the code for an Access Token securely behind the scenes
  const tokenData = JSON.stringify({
    code,
    client_id,
    client_secret,
    redirect_uri,
    grant_type: 'authorization_code'
  });

  // Loop Complete: Route user browser back down to your home desk hardware IP layout
  const local_esp32_destination = `http://192.168.0{code}`;
  
  return res.redirect(local_esp32_destination);
}
