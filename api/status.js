export default function handler(req, res) {
  const { reqId } = req.query;
  const requests = globalThis.pendingRequests || new Map();
  
  if (!reqId || !requests.has(reqId)) {
    return res.status(404).json({ status: 'not_found' });
  }
  
  const request = requests.get(reqId);
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.json({ 
    status: request.status, 
    email: request.email, 
    name: request.name 
  });
}