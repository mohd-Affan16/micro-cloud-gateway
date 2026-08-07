export default function handler(req, res) {
  // Pulls your credentials securely behind the scenes from Vercel's internal memory
  const client_id = process.env.GOOGLE_CLIENT_ID; 
  const redirect_uri = "https://micro-cloud-gateway.vercel.app"; 
  
  const googleUrl = `https://google.com{client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&response_type=code&scope=openid%20email%20profile`;
  
  return res.redirect(googleUrl);
}
