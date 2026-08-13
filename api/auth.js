export default function handler(req, res) {
  // Hardcode the public tracking app ID directly to guarantee it reads the perfect key format
  const client_id = "://googleusercontent.com"; 
  const redirect_uri = "https://micro-cloud-gateway.vercel.app/api/callback"; 
  
  const googleUrl = `https://google.com{client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&response_type=code&scope=openid%20email%20profile`;
  
  // Use native HTTP headers to force an un-crashable browser-level jump
  res.writeHead(302, { Location: googleUrl });
  return res.end();
}
