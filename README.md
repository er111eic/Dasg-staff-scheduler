# Dasg Staff Scheduler

React 活動人力排班系統，用於多日活動流程、活動欄位、人員職務安排與衝突檢查。

## Current Scope

- 多日 `schedules`
- 法會欄位固定在最左側
- 其他活動依日期與活動數量往右展開
- 以 `日期 + 時段 + 活動 + 職務` 安排人員
- 偵測同一天同時段同一人重複安排
- `localStorage` 自動儲存與讀取
- JSON 匯入
- 排班結果 JSON 匯出

## JSON Schema

See [docs/json-schema.md](docs/json-schema.md).

## Roadmap

1. React + JSON 匯入 + localStorage + GitHub Pages/Vercel
2. 圖片 OCR / AI 解析流程
3. Firebase 儲存活動、模板、人員名單、歷史排班

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy With Vercel

1. Import `er111eic/Dasg-staff-scheduler` in Vercel.
2. Framework preset: Vite.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Deploy from `main`.

The included `vercel.json` stores these defaults.

## Deploy With GitHub Pages

GitHub Pages is configured through GitHub Actions:

https://er111eic.github.io/Dasg-staff-scheduler/

## CI

GitHub Actions runs `npm install` and `npm run build` on pushes and pull requests to `main`.
