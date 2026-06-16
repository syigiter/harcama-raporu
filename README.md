# Harcama Raporu

React + TypeScript + Vite ile hazirlanan ilk surum harcama takip uygulamasi.

## Ozellikler

- Gelir ve gider kaydi
- Kategori, odeme tipi ve sube alanlari
- Arama ve filtreleme
- Ozet metrikler
- Kategori bazli gider dagilimi
- Son 6 ay gelir/gider akisi
- CSV disari aktarma
- Tarayici localStorage uzerinde kalici veri

## Komutlar

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Deploy

GitHub Actions workflow'u `main` branch'e push edilince `dist/` klasorunu rsync ile sunucuya gonderir.
