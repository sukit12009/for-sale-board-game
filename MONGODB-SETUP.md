# การติดตั้ง MongoDB บน Windows

## ⚠️ ปัญหาที่เจอ: ส่งข้อความไม่ได้

หากคุณสามารถ login เข้ามาได้แต่ส่งข้อความไม่ได้ แสดงว่า **MongoDB ยังไม่ได้ติดตั้งหรือไม่ได้เริ่มทำงาน**

## 🛠️ วิธีแก้ไข (เลือก 1 ใน 3 วิธี)

### วิธีที่ 1: ใช้ MongoDB Atlas (แนะนำ - ง่ายที่สุด)

1. **สมัคร MongoDB Atlas:**
   - ไปที่ https://www.mongodb.com/atlas
   - สมัครบัญชีฟรี
   - สร้าง Free Cluster (512MB)

2. **ตั้งค่าการเข้าถึง:**
   - สร้าง Database User
   - เพิ่ม IP Address: `0.0.0.0/0` (สำหรับทดสอบ)

3. **ได้ Connection String:**
   - คลิก "Connect" → "Connect your application"
   - คัดลอก connection string

4. **อัพเดตไฟล์ .env.local:**
   ```bash
   MONGODB_URI=mongodb+srv://username:password@cluster.xxxxx.mongodb.net/websocket-chat?retryWrites=true&w=majority
   ```

### วิธีที่ 2: ติดตั้ง MongoDB Community Server

1. **ดาวน์โหลด MongoDB:**
   - ไปที่ https://www.mongodb.com/try/download/community
   - เลือก Version: 7.0 (current)
   - Platform: Windows
   - Package: msi

2. **ติดตั้ง:**
   - เปิดไฟล์ .msi ที่ดาวน์โหลด
   - เลือก "Complete" installation
   - ✅ เลือก "Install MongoDB as a Service"
   - ✅ เลือก "Run service as Network Service user"
   - ✅ เลือก "Install MongoDB Compass" (GUI tool)

3. **ตรวจสอบการติดตั้ง:**
   ```powershell
   # ตรวจสอบ service
   Get-Service -Name "MongoDB"
   
   # ควรเห็น status: Running
   ```

4. **ถ้า service ไม่ทำงาน:**
   ```powershell
   # เริ่ม service
   Start-Service -Name "MongoDB"
   ```

### วิธีที่ 3: ใช้ Docker (สำหรับผู้ที่มี Docker)

1. **ติดตั้ง Docker Desktop**

2. **รัน MongoDB Container:**
   ```bash
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

3. **ตรวจสอบ:**
   ```bash
   docker ps
   ```

## 🧪 ทดสอบการทำงาน

### ทดสอบ MongoDB Connection:

1. **เปิด PowerShell และรันคำสั่ง:**
   ```powershell
   # ทดสอบการเชื่อมต่อ (ถ้าติดตั้ง MongoDB local)
   mongosh --eval "db.adminCommand('ping')"
   ```

2. **ถ้าใช้ MongoDB Atlas:**
   ```powershell
   # ทดสอบ connection string
   mongosh "mongodb+srv://username:password@cluster.xxxxx.mongodb.net/" --eval "db.adminCommand('ping')"
   ```

### ทดสอบ Web Application:

1. **รีสตาร์ท development server:**
   ```bash
   # หยุด server (Ctrl+C)
   # เริ่มใหม่
   npm run dev
   ```

2. **เปิดเบราว์เซอร์:**
   - ไปที่ http://localhost:3000
   - Login ด้วยชื่อผู้ใช้
   - ทดสอบส่งข้อความ

3. **ตรวจสอบ Console:**
   ```javascript
   // ใน browser console (F12)
   // ควรเห็นข้อความนี้เมื่อส่งข้อความ
   "Message saved to database: [object_id]"
   ```

## 🔧 แก้ปัญหาเฉพาะกิจ

### ปัญหา: MongoDB service ไม่เริ่มทำงาน

```powershell
# ตรวจสอบ logs
Get-EventLog -LogName Application -Source "MongoDB" -Newest 10

# หรือตรวจสอบ MongoDB log files
Get-Content "C:\Program Files\MongoDB\Server\7.0\log\mongod.log" -Tail 20
```

### ปัญหา: Port 27017 ถูกใช้งาน

```powershell
# ตรวจสอบว่าใครใช้ port 27017
netstat -ano | findstr :27017

# ถ้ามี process อื่นใช้ ให้หยุดหรือใช้ port อื่น
# แก้ไขในไฟล์ .env.local:
MONGODB_URI=mongodb://localhost:27018/websocket-chat
```

### ปัญหา: Permission denied

```powershell
# เรียก PowerShell ในฐานะ Administrator
# แล้วลองเริ่ม service ใหม่
Start-Service -Name "MongoDB"
```

## ✅ การตรวจสอบว่าแก้ไขสำเร็จ

1. **MongoDB ทำงาน:**
   ```powershell
   Get-Service -Name "MongoDB"
   # Status should be: Running
   ```

2. **Application ส่งข้อความได้:**
   - เปิดหลายแท็บใน browser
   - Login ด้วยชื่อผู้ใช้ต่างกัน
   - ส่งข้อความ → ควรเห็นข้อความใน real-time

3. **Database บันทึกข้อความ:**
   ```powershell
   # เชื่อมต่อ MongoDB
   mongosh
   use websocket-chat
   db.messages.find()
   # ควรเห็นข้อความที่ส่ง
   ```

## 🚀 หลังจากแก้ไขแล้ว

1. รีสตาร์ท development server
2. ลองส่งข้อความใหม่
3. เปิดหลายแท็บทดสอบ real-time chat
4. ตรวจสอบว่าข้อความถูกบันทึกในฐานข้อมูล

---

🎉 **เมื่อทำตามขั้นตอนแล้ว ระบบแชทจะทำงานได้อย่างสมบูรณ์!** 