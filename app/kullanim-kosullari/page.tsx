import type { Metadata } from 'next'
import { LegalDocument } from '@/components/landing/legal-document'
import { createPageMetadata } from '@/lib/seo'

const sections = [
  {
    title: '1. Hizmet Tanımı',
    paragraphs: [
      'Cebindegaleri; araç galerileri için QR kod destekli dijital showroom, stok yönetimi, lead takibi ve satış analitiği sunan bir SaaS platformudur.',
      'Platform; araç kartı oluşturma, QR etiket üretimi, müşteri etkileşim takibi ve paket limitine bağlı personel hesaplarıyla panel yönetimi gibi modüllerden oluşur.',
    ],
  },
  {
    title: '2. Hesap ve Güvenlik Sorumluluğu',
    bullets: [
      'Hesap giriş bilgilerinin korunmasından kullanıcı sorumludur.',
      'Şüpheli erişim tespit edildiğinde destek ekibine gecikmeden bildirim yapılmalıdır.',
      'Her kullanıcı kendi hesabıyla giriş yapmalıdır; hesap bilgilerinin üçüncü kişilerle paylaşılmaması gerekir.',
    ],
  },
  {
    title: '3. Kabul Edilebilir Kullanım',
    bullets: [
      'Yasa dışı içerik paylaşımı ve yanıltıcı araç bilgisi yayınlamak yasaktır.',
      'Sistem performansını bozacak otomasyon veya kötüye kullanım denemeleri yapılamaz.',
      'Diğer kullanıcıların deneyimini olumsuz etkileyecek davranışlar kabul edilmez.',
    ],
  },
  {
    title: '4. Abonelik ve Ücretlendirme',
    paragraphs: [
      'Ücretli planların kapsamı ve limitleri fiyatlandırma sayfasında ilan edilir.',
      'Abonelikler dönemsel olarak yenilenir. Kullanıcı, dönem sonuna kadar planını yükseltebilir veya iptal edebilir.',
    ],
  },
  {
    title: '5. Fikri Mülkiyet ve İçerik Hakları',
    paragraphs: [
      'Platformun tasarımı, yazılım bileşenleri ve marka unsurları Cebindegaleri mülkiyetindedir.',
      'Kullanıcı tarafından yüklenen içeriklerin doğruluğu ve lisans hakları kullanıcı sorumluluğundadır.',
    ],
  },
  {
    title: '6. Sorumluluk Sınırları',
    paragraphs: [
      'Hizmet sürekli erişilebilirlik hedefiyle sunulur; ancak bakım veya teknik nedenlerle planlı/plansız kesintiler yaşanabilir.',
      'Dolaylı gelir kaybı veya üçüncü taraf kaynaklı sorunlarda sorumluluk yürürlükteki mevzuat sınırları içindedir.',
    ],
  },
]

export const metadata: Metadata = createPageMetadata({
  title: 'Kullanım Koşulları',
  description:
    'Cebindegaleri kullanım koşulları: hizmet kapsamı, hesap güvenliği, abonelik şartları ve kullanıcı sorumlulukları.',
  path: '/kullanim-kosullari',
  keywords: ['kullanım koşulları', 'hizmet şartları', 'abonelik koşulları'],
})

export default function KullanimKosullariPage() {
  return (
    <LegalDocument
      badge="Kullanım Koşulları"
      title="Platform Kullanım Koşulları"
      subtitle="Cebindegaleri hizmetlerini kullanırken geçerli olan temel hak, yükümlülük ve sorumluluk kuralları."
      lastUpdated="31 Mayıs 2026"
      sections={sections}
      contactText="Kullanım koşulları ile ilgili sorularınız için destek@cebindegaleri.com adresine e-posta gönderebilirsiniz."
    />
  )
}
