import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '../../lib/mongodb';
import Message from '../../models/Message';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      await connectDB();
      
      // ดึงข้อความล่าสุด 50 ข้อความ
      const messages = await Message.find({})
        .sort({ timestamp: -1 })
        .limit(50)
        .lean();
      
      // เรียงข้อความจากเก่าไปใหม่
      const sortedMessages = messages.reverse();
      
      res.status(200).json(sortedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      // ส่งกลับ array ว่างแทนที่จะ error ให้ app ยังทำงานได้
      res.status(200).json([]);
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 