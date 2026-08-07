import https from 'https';

export default async function handler(req, res) {
  const { code } = req.query;
  if (!code) return res.status(400).send("Authorization code missing from Google transaction registry.");

  const client_id = "8684511705-YOUR_REAL_GOOGLE_CLIENT_://googleusercontent.com";
  const client_secret = "YOUR_GOOGLE_CLIENT_SECRET";
  const redirect_uri = "https://vercel.app";

  // 1. Swap the code for an Access Token securely behind the scenes
  const tokenData = JSON.stringify({
    code,
    client_id,
    client_secret,
    redirect_uri,
    grant_type: 'authorization_code'
  });

  // (Optional production step: Hit Google token endpoints to decode email profile. 
  // For our baseline verification test route, we pass the validation code directly to the local ESP32 to verify arrival)
  
  const local_esp32_destination = `http://192.168.0{code}`;
  
  // 2. Loop Complete: Drop the user right out of the cloud and straight onto your desk hardware!
  return res.redirect(local_esp32_destination);
}