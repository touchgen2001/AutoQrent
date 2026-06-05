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
      "Kayıt sonrası galeri hesabı ve 14 günlük deneme otomatik açılır. İlk adımda galeri bilgilerinizi, logo/tema ayarlarınızı ve iletişim kanallarınızı tamamlarsınız; ardından araç ekleyip QR kodlarınızı panelden üretirsiniz.",
  },
  {
    category: "Kurulum",
    question: "Mevcut araç verilerimizi taşıyabilir miyiz?",
    answer:
      "Evet. Araç listesi, görseller ve temel ilan bilgileri mevcut yapınıza göre aktarım planıyla taşınabilir. Büyük veri taşıma veya özel format ihtiyacı varsa Pro/Premium ya da Kurumsal görüşmede kapsam netleştirilir.",
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
      "Araç vitrini, galeri iletişim bilgileri, çalışma saatleri, public galeri sayfası teması, lead süreçleri, QR çıktıları ve abonelik bilgileri panelden merkezi olarak yönetilir.",
  },
  {
    category: "Panel",
    question: "Paketler tek kullanıcı hesabı ile mi çalışıyor?",
    answer:
      "Evet. Paketler tek galeri hesabı ve tek kullanıcı hesabı modeliyle çalışır. Pro ve üst planlar ek kullanıcı değil, daha geniş araç limiti, analitik ve destek kapsamı sağlar.",
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
      "Yeni, görüşülüyor ve satışa döndü gibi durum adımlarıyla her müşteri süreci tek panel kaydında takip edilir; aksiyonlar kayda bağlı kalır.",
  },
  {
    category: "Fiyatlandırma",
    question: "Paket fiyatları nedir?",
    answer:
      "Başlangıç aylık 999 TL, Pro aylık 2.500 TL, Premium aylık 4.990 TL olarak listelenir. Kurumsal paket özel araç limiti, API ve geçiş danışmanlığı gerektirdiği için teklif ile netleşir.",
  },
  {
    category: "Fiyatlandırma",
    question: "14 günlük ücretsiz deneme nasıl çalışır?",
    answer:
      "Kayıt olduğunuzda seçtiğiniz planla 14 günlük deneme başlar ve kredi kartı istenmez. Deneme süresince galeri, araç, QR ve panel akışını test edebilirsiniz; abonelik ekranında planınızı görebilir veya değiştirebilirsiniz.",
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
