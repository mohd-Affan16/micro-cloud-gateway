module.exports = function handler(req, res) {
  const client_id = process.env.GOOGLE_CLIENT_ID; // or hardcode your real Client ID
  const redirect_uri = "https://micro-cloud-gateway.vercel.app/api/callback";
  
  const googleUrl = "https://accounts.google.com/o/oauth2/v2/auth" +
      "?client_id=" + encodeURIComponent(client_id) +
      "&redirect_uri=" + encodeURIComponent(redirect_uri) +
      "&response_type=code" +
      "&scope=openid%20email%20profile";
  
  res.writeHead(302, { Location: googleUrl });
  res.end();
};