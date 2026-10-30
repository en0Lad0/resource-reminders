# Resource Reminders — Owlbear Rodeo Extension

ระบบจัดการ **Action Economy** และแจ้งเตือนทรัพยากร (Resources/Skills) ระหว่าง Combat ใน D&D
สำหรับ **Owlbear Rodeo** — เขียนด้วย HTML/CSS/Vanilla JS (Vite) โฮสต์บน GitHub Pages

## ฟีเจอร์ครบตามสเปก

### Play Mode
- **Top Bar ล็อกด้านบน**: ปุ่ม `SRest` / `LRest` และ `End Turn` เห็นตลอดเวลา
- **Skill Cards แบ่งหมวดหมู่**: Action, Bonus Action, Feature, Feat (+ เพิ่มหมวดคัสตอมได้)
- แสดงข้อมูลครบแบบกางออก: ชื่อ, สูตรเต๋า, `Current/Max` uses, คำอธิบาย — **ไม่ต้อง hover**
- **Fade Out + Collapse**: สกิลที่ใช้จนโควต้าเหลือ 0 (หรือ at-will ที่ใช้แล้วในเทิร์นนั้น) จะค่อยๆ จางแล้วพับหายไปอัตโนมัติ เหลือแต่สกิลที่ยังกดได้
- **End Turn**: นำการ์ดที่ถูกซ่อน (แต่ยังมีโควต้า / เป็น per-turn action) กลับมาแสดงผล
- **Dice Result Popup**: กดทอย → ป๊อปอัปแสดงผล มี Toggle `Normal / Advantage / Disadvantage`; ได้ Natural 20 → ตัวเลขสีเขียว, ได้ 1 → สีแดง

### Setup Mode
- **Card-based Builder**: ชื่อ, Category (พิมพ์เพิ่มเองได้), Custom Text, Max Uses, Recover On (SRest/LRest/None), Reset on End Turn, Dice Formula, Chain Trigger
- **Sorting**: ปุ่ม ▲ / ▲ จัดเรียงลำดับภายในหมวดหมู่
- **Export / Import JSON**

### ระบบหลัก
- **Resource & Recovery**: หัก uses ตอนกด; SRest เติมสกิล `Recover On: SRest`; LRest เติมทั้ง SRest และ LRest
- **Chain Action System**: ใช้ A → เด้งถามใช้ B ต่อได้ไหม (เช่น ตีโดน → Sneak Attack); **Anti-Loop: Max Depth 5** + ตรวจจับ cycle, บังคับหยุดแล้ว log เตือน
- **Dice Engine (Adapter Pattern)**: default เป็น Text-based (math roll); `ExternalDiceAdapter` สำหรับเชื่อมเต๋า 3D (dice+ / OBR built-in) ในอนาคต — แค่เขียน `roll()` แล้วตั้ง `supports() = true` ไม่ต้องแก้โค้ดหลัก
- **Undo / Redo**: ย้อนได้สูงสุด **3 ขั้น** เก็บใน Local Array (ไม่ขึ้นกับเน็ต)
- **Cloud Storage**: ใช้ `OBR.player.setMetadata` (fallback เป็น localStorage ตอน develop นอก Owlbear) — รีเฟรช/ปิดเบราว์เซอร์ข้อมูลไม่หาย

## เริ่มต้นพัฒนา

```bash
npm install
npm run dev       # เปิดทดสอบในเบราว์เซอร์ (จะใช้ localStorage แทน OBR)
npm run build     # build ออกมาที่โฟลเดอร์ dist/
npm run preview   # ดูตัว build จริง
```

## ขึ้น GitHub Pages (Auto Deploy)

1. สร้าง repo บน GitHub แล้ว push โฟลเดอร์ทั้งหมดขึ้นไป (branch `main`)
2. ไปที่ repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**
3. ทุกครั้งที่ push ไปที่ `main`, workflow `.github/workflows/deploy.yml` จะ build และ deploy อัตโนมัติ
4. URL จะเป็น `https://<username>.github.io/<repo>/`

## เพิ่ม Extension ลง Owlbear Rodeo

1. ใน Owlbear Rodeo เปิดห้อง → กดไอคอน Extension (🧩) → **Add an extension**
2. ใส่ URL: `https://<username>.github.io/<repo>/extension.json`
3. กด Add แล้วเปิด panel ของ Resource Reminders ได้เลย

> `extension.json`, `icon.svg` และ `_headers` อยู่ในโฟลเดอร์ `public/` — Vite จะคัดลอกไปที่ root ของ `dist/` อัตโนมัติ

## หัวข้อ CORS / Headers (สำคัญ)

ไฟล์ `public/_headers` ตั้งค่า `Access-Control-Allow-Origin: *` และ `Content-Security-Policy: frame-ancestors *` เพื่อให้ Owlbear ดึง `extension.json` และฝัง extension ใน iframe ได้

- **Netlify / Cloudflare Pages**: อ่าน `_headers` อัตโนมัติ — ใช้ได้เลย
- **GitHub Pages**: **ไม่สนใจไฟล์ `_headers`** แต่ปกติ GitHub Pages already ส่ง `Access-Control-Allow-Origin: *` ให้อยู่แล้ว ถ้าเจอปัญหา CORS ให้ย้ายไปโฮสต์ที่ Cloudflare Pages/Netlify (ฟรี) หรือใช้ `_headers` ตามนี้

## โครงสร้างไฟล์

```
resource-reminders/
├── index.html
├── package.json
├── vite.config.js
├── public/
│   ├── extension.json      # manifest ของ Owlbear Rodeo
│   └── icon.svg
├── .github/workflows/deploy.yml
└── src/
    ├── main.js             # entry point, wire ทุกอย่าง
    ├── style.css
    ├── state.js            # state + undo/redo (max 3)
    ├── storage.js          # OBR metadata + localStorage fallback
    ├── dice.js             # DiceEngine + TextDiceAdapter + ExternalDiceAdapter (stub)
    ├── chain.js            # Chain combo + anti-loop (max depth 5)
    ├── defaultData.js      # ตัวอย่างตัวละคร Rogue Lv3
    ├── playMode.js         # render skill cards + fade/collapse
    ├── setupMode.js        # builder form + sorting + list
    └── popup.js            # dice popup + chain prompt
```

## หมายเหตุการตัดสินใจดีไซน์

- **End Turn** จะรีเซ็ตเฉพาะสกิลที่ตั้ง `Reset on End Turn = Yes` (หรือ at-will `Max Uses = 0`) — สกิลที่ uses เหลือ 0 จะยังซ่อนอยู่จนกว่าจะกด SRest/LRest ตามปกติ
- **Dice button** บนการ์ด (สูตรเต๋า) จะทอยเต๋าโดย **ไม่หัก uses** — ส่วนการกดที่ตัวการ์ดจะหัก uses แล้วทอยเต๋าให้อัตโนมัติถ้ามีสูตร
- ข้อมูลเก็บที่ **player metadata** (แต่ละคนเก็บทรัพยากรตัวเอง) ถ้าต้องการ shared pool ให้เปลี่ยนใน `src/storage.js` เป็น `OBR.room.setMetadata`
