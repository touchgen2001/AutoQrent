# CebindeGaleri — Marka Kılavuzu

Logonun tutarlı kullanılması için kısa rehber. Tüm görseller gönderilen ana logo
dosyasından (`scripts/brand/cebindegaleri-master.jpg`) üretilir; değişiklik gerekince:

```bash
node scripts/brand/generate-logo.mjs
```

komutu favicon'dan sosyal medya görsellerine kadar her şeyi yeniden üretir.

---

## Logo

Otomobil siluetiyle birleşen **CG** monogramı: **altın C**, **gümüş G** ve
merkezinde QR işareti. Altında **CEBİNDEGALERİ** yazısı ve **KAREKODLU GALERİ**
alt satırı bulunur. Logo **koyu zemin** için tasarlandı.

## Renkler

| Renk | Kod | Kullanım |
|------|-----|----------|
| Altın (parlak) | `#f6e7a8` → `#d8b757` → `#7c5f1f` | "C" harfi, "CEBİNDE", aksanlar |
| Gümüş | `#ffffff` → `#c0c6cc` → `#71777d` | "G" harfi, "GALERİ" |
| Koyu zemin | `#0a0a0a` (degrade: `#2c2c2f` → `#0a0a0a`) | Tüm arka planlar, ikon karosu |
| Aksan altın | `#c5a96a` | Alt satır / ince çizgiler |

> Altın ve gümüş **degrade**dir (düz renk değil) — metalik görünüm bundan gelir.
> Açık zeminde "G" zor okunur; bu yüzden logo daima koyu/foto zemine konur.

## Hangi dosya nerede

### Site (otomatik kullanılıyor)
| Dosya | Yer |
|-------|-----|
| `public/icon.svg`, `icon-light/dark-32x32.png` | Tarayıcı sekme ikonu |
| `app/favicon.ico` | Klasik favicon (eski tarayıcı / Google) |
| `public/apple-icon.png` | iPhone ana ekran ikonu |
| `public/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | PWA / Android "ana ekrana ekle" |
| `app/og/logo.png` | Link paylaşım kartlarındaki amblem |

### Sosyal medya (elle yüklenir)
| Dosya | Yer |
|-------|-----|
| `public/brand/social/cebindegaleri-profil.png` (1080×1080) | Instagram / WhatsApp / Facebook **profil** fotoğrafı |
| `public/brand/social/cebindegaleri-kapak.png` (1640×624) | Facebook / WhatsApp Business **kapak** görseli |

### Genel logo dosyaları
| Dosya | Açıklama |
|-------|----------|
| `cebindegaleri-logo.png` | Tam logo, koyu zemin (kare) |
| `cebindegaleri-logo-transparent.png` | Tam logonun uyumluluk kopyası |
| `cebindegaleri-logo-horizontal.png` | **Yatay** kullanım için koyu zeminli kilit |
| `cebindegaleri-mark.png` | QR işaretli **CG amblemi**, koyu zemin |
| `cebindegaleri-mark-transparent.png` | Site başlığı için şeffaf, yatay **CG amblemi** |

## Kullanım kuralları

- **Koyu/foto zemin tercih et.** Beyaz zemin gerekiyorsa amblem yerine yatay
  veya tam logoyu kullan; çok küçükse `cebindegaleri-mark.png`.
- **Etrafında boşluk bırak.** En az "C" harfinin yarısı kadar boş alan.
- **Oranı bozma, döndürme, gölge/renk ekleme.** Degradeler olduğu gibi kalmalı.
- **Yeniden renklendirme yok** — altın/gümüş kimliğin parçası.
- Profil fotoğrafı daireye kırpılır; bu yüzden profilde **sadece CG amblemi** vardır.

---
_Bu kılavuz ve tüm görseller `scripts/brand/generate-logo.mjs` ile üretildi._
