export default function handler(req, res) {
  const client_id = "8684511705-YOUR_REAL_GOOGLE_CLIENT_://googleusercontent.com"; 
  const redirect_uri = "https://vercel.app"; // Your Vercel Domain Callback
  
  const googleUrl = `https://google.com{client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&response_type=code&scope=openid%20email`;
  
  // Shift the browser seamlessly to Google's authentication cloud
  return res.redirect(googleUrl);
}