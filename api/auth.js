export default function handler(req, res) {
  // Hardcode the public tracking app ID directly into the string engine to avoid Vercel variable delays
  const client_id = "://googleusercontent.com"; 
  const redirect_uri = "https://https://micro-cloud-gateway.vercel.app"; 
  
  const googleUrl = `https://google.com{client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&response_type=code&scope=openid%20email%20profile`;
  
  return res.redirect(googleUrl);
}
