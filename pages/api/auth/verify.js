import { verifyTokenFromRequest } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const verification = verifyTokenFromRequest(req);

  if (verification.valid) {
    return res.status(200).json({ success: true, user: verification.user });
  } else {
    return res.status(401).json({ success: false, message: verification.message });
  }
}
