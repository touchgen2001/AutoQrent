export type FaqCategory = "Kurulum" | "QR Kod" | "Panel" | "Lead Takibi" | "Fiyatlandırma" | "Destek"

export type FaqItem = {
  category: FaqCategory
  question: string
  answer: string
}

export const faqItems: FaqItem[] = [
  {
    category: "Kurulum",
    question: "Kurulum süreci nasıl ilerliyor?",
    answer:
      "Galeri hesabı, profil ayarları ve ilk araç kartlarının yayına alınması birlikte planlanır. Demo sonrası kurulum akışı operasyonunuza göre net takvime bağlanır.",
  },
  {
    category: "Kurulum",
    question: "Mevcut araç verilerimizi taşıyabilir miyiz?",
    answer:
      "Evet. Araç bilgileri ve medya içerikleri mevcut yapınıza göre aktarım planıyla taşınabilir; geçiş adımı destek ekibiyle birlikte yürütülür.",
  },
  {
    category: "QR Kod",
    question: "QR kodlar nasıl üretiliyor ve kullanılıyor?",
    answer:
      "Her araç için panelde QR kod üretilir. Kodlar indirilebilir ve etiket formatında yazdırılabilir; müşteri okuttuğunda ilgili araç sayfası açılır.",
  },
  {
    category: "QR Kod",
    question: "QR tarama sonrası neyi izleyebiliriz?",
    answer:
      "Tarama kaynağı, ilgili araç ve etkileşim akışı panel ekranlarında takip edilir. Böylece araç bazlı müşteri ilgisi net görünür.",
  },
  {
    category: "Panel",
    question: "Panelden hangi alanları yönetiyoruz?",
    answer:
      "Araç vitrini, galeri iletişim bilgileri, çalışma saatleri, lead süreçleri ve QR çıktıları panelden merkezi olarak yönetilir.",
  },
  {
    category: "Panel",
    question: "Ekip içinde birlikte kullanım mümkün mü?",
    answer:
      "Evet. Plan kapsamına göre ekip üyeleriyle birlikte yönetim yapılabilir; operasyon adımları ortak süreç üzerinden ilerler.",
  },
  {
    category: "Lead Takibi",
    question: "WhatsApp ve telefon talepleri nasıl toplanıyor?",
    answer:
      "Müşteri temasları lead akışında araç kaydıyla eşleşir. Not, takip tarihi ve durum güncellemesi tek kayıtta ilerler.",
  },
  {
    category: "Lead Takibi",
    question: "Lead durumları satış sürecinde nasıl kullanılıyor?",
    answer:
      "Yeni, görüşülüyor ve satışa döndü gibi durum adımlarıyla ekip aynı müşteri sürecini takip eder; aksiyonlar kayda bağlı kalır.",
  },
  {
    category: "Fiyatlandırma",
    question: "Sabit fiyat listesi yerine nasıl teklif alıyoruz?",
    answer:
      "Paket kapsamı galeri ölçeği, ekip sayısı ve operasyon ihtiyaçlarına göre şekillenir. Demo görüşmesi sonrası kapsam ve teklif netleştirilir.",
  },
  {
    category: "Fiyatlandırma",
    question: "Hangi plan bize uygun olduğunu nasıl belirleriz?",
    answer:
      "Araç hacmi, lead yoğunluğu ve ekip akışı birlikte değerlendirilir. Bu analizle en uygun plan seviyesi birlikte seçilir.",
  },
  {
    category: "Destek",
    question: "Canlı destek alabiliyor muyuz?",
    answer:
      "Evet. Onboarding, tema düzeni, veri aktarımı ve operasyon iyileştirme konularında destek ekibiyle doğrudan iletişim kurabilirsiniz.",
  },
  {
    category: "Destek",
    question: "Satış sonrası destek kapsamı nedir?",
    answer:
      "Plan seviyesine göre operasyon desteği, öncelik ve iletişim modeli değişir; süreçler başlangıçta net olarak paylaşılır.",
  },
]
