# Panda Camera 印相自助站

AI 照片編輯與即時列印自助服務站。

## 功能

- 📷 上傳照片（拖曳或點擊上傳）
- ✂️ **AI 去背** — 一鍵去除背景（使用 @imgly/background-removal 瀏覽器端 AI 引擎）
- ✨ **AI 修復** — 增亮、對比強化、銳利化、降噪
- 👔 **AI 形象照** — 置入專業工作室背景
- 🖼️ **AI 頭像** — 產生圓形大頭貼
- 🖨️ **列印設定** — 多種紙張規格、照片類型、紙面處理
- 📍 **門市取件** — 觀塘、銅鑼灣
- 🧾 **取件單** — 附 QR Code，可列印或出示手機

## 部署

靜態網站，部署於 GitHub Pages。

### 本地開發

```bash
npx serve .
```

## 技術

- 純前端 (HTML / CSS / JS)
- AI 去背使用 @imgly/background-removal (WASM/ONNX 瀏覽器引擎)
- QR Code 生成使用 qrcode-generator
- 字型：Google Fonts (Noto Sans TC, ZCOOL QingKe HuangYou, Noto Serif TC)