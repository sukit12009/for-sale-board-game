# การติดตั้งและเริ่มใช้งาน Real-time Chat Application

## 📋 Prerequisites

1. **Node.js และ npm:**
   - ติดตั้ง Node.js เวอร์ชัน 18 หรือใหม่กว่า
   - ตรวจสอบการติดตั้ง: `node --version` และ `npm --version`

2. **MongoDB:**
   - **ตัวเลือกที่ 1:** ติดตั้ง MongoDB บนเครื่องของคุณ
   - **ตัวเลือกที่ 2:** ใช้ MongoDB Atlas (Cloud Database)

## 🚀 วิธีการติดตั้ง

### ขั้นตอนที่ 1: ติดตั้ง Dependencies

```bash
npm install
```

### ขั้นตอนที่ 2: ตั้งค่า Database

#### ตัวเลือกที่ 1: ใช้ Local MongoDB

1. **ติดตั้ง MongoDB Community Server:**
   - Windows: [ดาวน์โหลดจาก MongoDB](https://www.mongodb.com/try/download/community)
   - macOS: `brew install mongodb-community`
   - Linux: ติดตาม [คู่มือการติดตั้ง](https://docs.mongodb.com/manual/installation/)

2. **เริ่ม MongoDB Service:**
   - Windows: MongoDB จะเริ่มอัตโนมัติหลังติดตั้ง
   - macOS/Linux: `brew services start mongodb-community` หรือ `sudo systemctl start mongod`

3. **สร้างไฟล์ .env.local:**
   ```bash
   # สร้างไฟล์ .env.local ในโฟลเดอร์ root ของโปรเจค
   MONGODB_URI=mongodb://localhost:27017/websocket-chat
   ```

#### ตัวเลือกที่ 2: ใช้ MongoDB Atlas (แนะนำ)

1. **สมัครและสร้าง Cluster:**
   - ไปที่ [MongoDB Atlas](https://www.mongodb.com/atlas)
   - สมัครบัญชีฟรี
   - สร้าง Free Cluster

2. **ตั้งค่าการเข้าถึง:**
   - เพิ่ม Database User (username/password)
   - เพิ่ม IP Address ในส่วน Network Access (ใส่ 0.0.0.0/0 สำหรับทดสอบ)

3. **ได้ Connection String:**
   - คลิก "Connect" ใน Cluster
   - เลือก "Connect your application"
   - คัดลอก Connection String

4. **สร้างไฟล์ .env.local:**
   ```bash
   # แทนที่ <username>, <password> และ <cluster-url> ด้วยข้อมูลจริง
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/websocket-chat?retryWrites=true&w=majority
   ```

### ขั้นตอนที่ 3: เริ่มใช้งาน

```bash
npm run dev
```

เปิดเบราว์เซอร์ไปที่: `http://localhost:3000`

## 🧪 การทดสอบ

1. **ทดสอบพื้นฐาน:**
   - เปิดเบราว์เซอร์ไปที่ `http://localhost:3000`
   - ใส่ชื่อผู้ใช้
   - พิมพ์ข้อความและส่ง

2. **ทดสอบ Real-time:**
   - เปิดแท็บใหม่หรือหน้าต่างใหม่
   - ใส่ชื่อผู้ใช้อื่น
   - ส่งข้อความจากทั้งสองแท็บ
   - ข้อความควรปรากฏแบบ real-time

3. **ทดสอบ Database:**
   - ส่งข้อความหลายข้อความ
   - รีเฟรชหน้าเว็บ
   - ข้อความเก่าควรยังคงอยู่

## 🐛 แก้ปัญหา

### ปัญหา MongoDB Connection

**Error: "MongooseError: Operation failed"**

```bash
# ตรวจสอบว่า MongoDB ทำงานอยู่ (Local)
# Windows
net start MongoDB

# macOS/Linux
brew services list | grep mongodb
sudo systemctl status mongod
```

**Error: "Authentication failed"** (MongoDB Atlas)
- ตรวจสอบ username/password ใน connection string
- ตรวจสอบว่า Database User ถูกสร้างแล้ว

### ปัญหา Socket.IO Connection

**Error: "WebSocket connection failed"**
- ตรวจสอบว่า development server ทำงานอยู่
- ลองรีเฟรชหน้าเว็บ
- ตรวจสอบ browser console สำหรับข้อผิดพลาด

### ปัญหา Port

**Error: "Port 3000 is already in use"**
```bash
# หยุด process ที่ใช้ port 3000
npx kill-port 3000

# หรือใช้ port อื่น
npm run dev -- --port 3001
```

## 📁 โครงสร้างไฟล์สำคัญ

```
├── .env.local              # ⚠️  สร้างไฟล์นี้เอง - ข้อมูล Database
├── src/
│   ├── pages/api/
│   │   ├── socketio.ts     # Socket.IO endpoint
│   │   └── messages.ts     # API ดึงข้อความ
│   ├── lib/
│   │   ├── mongodb.ts      # การเชื่อมต่อ MongoDB
│   │   └── socket.ts       # การตั้งค่า Socket.IO
│   └── components/
│       ├── Chat.tsx        # หน้าแชท
│       └── Login.tsx       # หน้า Login
```

## 📊 การตรวจสอบการทำงาน

1. **ตรวจสอบ MongoDB:**
   ```bash
   # เชื่อมต่อ MongoDB (Local)
   mongosh
   use websocket-chat
   db.messages.find()
   ```

2. **ตรวจสอบ Socket.IO:**
   - เปิด Browser Developer Tools (F12)
   - ไปที่แท็บ Network
   - มองหา WebSocket connections

3. **ตรวจสอบ Server Logs:**
   - ดู terminal ที่รัน `npm run dev`
   - ควรเห็น message เมื่อ user เชื่อมต่อและส่งข้อความ

## 🔧 การแก้ไขขั้นสูง

### เปลี่ยน Database Name
ในไฟล์ `.env.local` เปลี่ยน `websocket-chat` เป็นชื่อที่ต้องการ:
```
MONGODB_URI=mongodb://localhost:27017/ชื่อ-database-ใหม่
```

### เปลี่ยน Port
```bash
npm run dev -- --port 8080
```

### Production Build
```bash
npm run build
npm start
```

---

🎉 **ยินดีด้วย!** คุณได้ติดตั้ง Real-time Chat Application เรียบร้อยแล้ว! 