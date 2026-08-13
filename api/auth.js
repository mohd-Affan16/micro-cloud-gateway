module.exports = function handler(req, res) {
  const client_id = "://googleusercontent.com"; 
  const redirect_uri = "https://micro-cloud-gateway.vercel.app/api/callback"; 
  
  const googleUrl = "https://google.com" + client_id + 
                    "&redirect_uri=" + encodeURIComponent(redirect_uri) + 
                    "&response_type=code&scope=openid%20email%20profile";
  
  res.writeHead(302, { Location: googleUrl });
  res.end();
};
