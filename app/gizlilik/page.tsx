import type { Metadata } from 'next'
import { LegalDocument } from '@/components/landing/legal-document'
import { createPageMetadata } from '@/lib/seo'

const sections = [
  {
    title: '1. Toplanan Veri Kategorileri',
    bullets: [
      'Hesap verileri: ad-soyad, e-posta, telefon, rol bilgileri',
      'Galeri verileri: araç envanteri, fiyat, medya dosyaları, açıklamalar',
      'Kullanım verileri: tarama sayıları, ziyaret kaynakları, cihaz ve tarayıcı bilgileri',
      'İletişim verileri: form veya iletişim aksiyonları üzerinden paylaşılan müşteri bilgileri',
    ],
  },
  {
    title: '2. Verilerin İşlenme Amaçları',
    bullets: [
      'Hizmetin sunulması ve ürün performansının geliştirilmesi',
      'Müşteri destek süreçlerinin yürütülmesi',
      'Raporlama, analitik ve operasyonel içgörü sağlanması',
      'Yasal yükümlülüklerin yerine getirilmesi',
    ],
  },
  {
    title: '3. Saklama Süresi ve Güvenlik',
    paragraphs: [
      'Veriler; işleme amacı, sözleşmesel gereklilikler ve ilgili mevzuat kapsamında gerekli süre boyunca saklanır.',
      'Erişim kontrolü, şifreleme, yedekleme ve log takibi gibi teknik ve idari önlemler uygulanır.',
    ],
  },
  {
    title: '4. Üçüncü Taraf Altyapı Sağlayıcıları',
    paragraphs: [
      'Platform performansı, barındırma, analitik ve iletişim operasyonları için güvenilir üçüncü taraf servisler kullanılabilir.',
      'Bu paylaşımlar yalnızca hizmetin sağlanması için gerekli kapsamda ve sözleşmesel güvenlik yükümlülükleri altında yapılır.',
    ],
  },
  {
    title: '5. Kullanıcı Hakları',
    bullets: [
      'Kişisel verilerin işlenip işlenmediğini öğrenme',
      'Verilere erişim ve düzeltme talebi oluşturma',
      'Silme, anonimleştirme veya işlemeyi kısıtlama talep etme',
      'Mevzuata uygun diğer başvuru haklarını kullanma',
    ],
  },
]

export const metadata: Metadata = createPageMetadata({
  title: 'Gizlilik Politikası',
  description:
    'Cebindegaleri gizlilik politikası: kişisel verilerin toplanması, işlenmesi, saklanması ve kullanıcı hakları hakkında detaylar.',
  path: '/gizlilik',
  keywords: ['gizlilik politikası', 'kişisel veri', 'kvkk uyum'],
})

export default function GizlilikPage() {
  return (
    <LegalDocument
      badge="Gizlilik Politikası"
      title="Kişisel Verilerin Gizliliği"
      subtitle="Cebindegaleri platformunda işlenen verilerin hangi amaçlarla toplandığı, korunduğu ve yönetildiğine dair bilgilendirme metni."
      lastUpdated="31 Mayıs 2026"
      sections={sections}
      contactText="Gizlilik ve veri işleme süreçleri hakkında taleplerinizi destek@cebindegaleri.com adresi üzerinden iletebilirsiniz."
    />
  )
}
