export type FaqItem = {
  question: string
  answer: string
}

export const faqItems: FaqItem[] = [
  {
    question: 'Kurulum ne kadar sürer?',
    answer:
      'Standart kurulumda galeri hesabı, temel profil ayarları ve ilk araç kartlarının yayına alınması ortalama 5-15 dakika sürer.',
  },
  {
    question: 'QR kodları nasıl kullanıyoruz?',
    answer:
      'Her araç için otomatik üretilen QR kodları panelden tek tıkla indirip etiket olarak yazdırabilirsiniz. Müşteri kodu okuttuğunda araç sayfası direkt açılır.',
  },
  {
    question: 'WhatsApp ve telefon talepleri takip ediliyor mu?',
    answer:
      'Evet. Araç bazında WhatsApp ve arama aksiyonları takip edilir, lead akışında hangi aracın ne kadar ilgi aldığı açık şekilde görüntülenir.',
  },
  {
    question: 'Mobil uyumluluk nasıl?',
    answer:
      'Vitrin ve araç sayfaları mobil öncelikli tasarlanır. Yüksek trafikte bile hızlı açılan bir deneyim için görsel ve içerik blokları optimize edilir.',
  },
  {
    question: 'Birden fazla kullanıcı ile yönetebilir miyiz?',
    answer:
      'Planınıza göre farklı ekip üyeleri ekleyebilir, operasyonu birlikte yönetebilirsiniz. Rol tabanlı erişim ile yetki kontrolü yapılır.',
  },
  {
    question: 'Canlı destek alabiliyor muyuz?',
    answer:
      'Evet. Onboarding, tema düzeni, veri aktarımı ve satış akışı iyileştirmeleri için ekibimizle iletişim sayfasından doğrudan destek talebi oluşturabilirsiniz.',
  },
]
