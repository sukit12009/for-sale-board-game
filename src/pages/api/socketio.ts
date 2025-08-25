import { NextApiRequest } from 'next';
import { NextApiResponseServerIO, initializeSocket } from '../../lib/socket';

export default function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  initializeSocket(req, res);
}

export const config = {
  api: {
    bodyParser: false,
  },
}; 