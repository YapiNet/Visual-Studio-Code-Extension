# Yapi.Extension — Geliştirme

Node.js 22+ ve VS Code 1.106+ gerekir.

```sh
npm ci
npm run build
npm test
npm run package
```

VS Code'da doğrudan bu depo klasörünü açıp **F5** ile Extension
Development Host başlatın. `yapi.vsix` dosyası Extensions görünümündeki
**Install from VSIX...** seçeneğiyle yerelde kurulabilir.

## Yerelleştirme

- `package.nls.json` ve `package.nls.<locale>.json`: VS Code komut başlıkları, ayarlar, açıklamalar ve görünüm başlıkları. VS Code görüntüleme dilini izler.
- `l10n/bundle.l10n*.json`: panel ve çalışma anındaki mesajlar. Otomatik mod editör dilini izler; `yapi.language` ile 15 dil arasından bağımsız seçim yapılabilir.
- `src/localization.ts`: ürün dili listesi, bölge kodu çözümleme ve RTL yönü. Çince için hem `zh` hem de VS Code'un `zh-cn` kodu sağlanır.
- Bir metin eklediğinizde tüm dil kaynaklarını güncelleyin. Test, kaynakların `test/expected-locales.json` içindeki ürün dili listesiyle ve varsayılan İngilizce anahtarlarla uyumunu denetler.

VS Code'un kendi arayüz metinleri ve Komut Paleti başlıkları editörün
görüntüleme dilini izlemeye devam eder; Yapi'nin panel dili bunlardan bağımsız seçilebilir.
Yapi görünümü varsayılan olarak sağdaki ikincil kenar çubuğundadır. VS Code’un View: Toggle Secondary Side Bar komutuyla bu alanı açabilir, isterseniz görünümü başka bir kenar çubuğuna taşıyabilirsiniz.

Kimlik doğrulama veya API entegrasyonu henüz eklenmemiştir. Marketplace
yayını yapılmamıştır; manifestteki yayıncı kimliği yerel geliştirme içindir.
