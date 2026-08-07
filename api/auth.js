export default function handler(req, res) {
  const client_id = process.env.GOOGLE_CLIENT_ID; 
  const redirect_uri = "https://micro-cloud-gateway.vercel.app"; // Your Vercel Domain Callback
  
  const googleUrl = `https://google.com{client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&response_type=code&scope=openid%20email`;
  
  // Shift the browser seamlessly to Google's authentication cloud
  return res.redirect(googleUrl);
}