import type { Metadata } from 'next'
import { LegalDocument } from '@/components/landing/legal-document'
import { createPageMetadata } from '@/lib/seo'

const sections = [
  {
    title: '1. Veri Sorumlusu',
    paragraphs: [
      'Cebindegaleri, 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında veri sorumlusu olarak hareket eder.',
      'Veri sorumlusu iletişim: kvkk@cebindegaleri.com',
    ],
  },
  {
    title: '2. İşlenen Kişisel Veriler',
    bullets: [
      'Kimlik ve iletişim verileri (ad, soyad, e-posta, telefon)',
      'Araç ve galeri operasyon verileri (ilan içerikleri, fiyat, stok hareketleri)',
      'Müşteri etkileşim verileri (form kayıtları, iletişim aksiyonları)',
      'Teknik veriler (IP, cihaz/tarayıcı bilgisi, erişim logları)',
    ],
  },
  {
    title: '3. İşleme Amaçları ve Hukuki Sebepler',
    paragraphs: [
      'Veriler; hizmet sunumu, sözleşmenin ifası, müşteri ilişkileri yönetimi, analitik değerlendirme ve yasal yükümlülüklerin yerine getirilmesi amacıyla işlenir.',
      'İşleme faaliyetleri KVKK madde 5 ve madde 6 kapsamında açık rıza, sözleşmenin ifası veya kanuni zorunluluk gerekçelerine dayanabilir.',
    ],
  },
  {
    title: '4. Verilerin Aktarılması',
    paragraphs: [
      'Yasal zorunluluklar veya hizmetin ifası için gerekli olduğu durumlarda yetkili kurumlara veya sözleşmeli hizmet sağlayıcılarına veri aktarımı yapılabilir.',
      'Aktarımlar asgari veri ilkesi ve güvenlik yükümlülükleri çerçevesinde gerçekleştirilir.',
    ],
  },
  {
    title: '5. Saklama Süresi ve İmha',
    paragraphs: [
      'Kişisel veriler işleme amacı sona erdiğinde veya yasal saklama süreleri dolduğunda silinir, yok edilir veya anonim hale getirilir.',
    ],
  },
  {
    title: '6. İlgili Kişi Hakları (KVKK Madde 11)',
    bullets: [
      'Kişisel verilerin işlenip işlenmediğini öğrenme',
      'İşlenmişse buna ilişkin bilgi talep etme',
      'Amaca uygun kullanım denetimi talep etme',
      'Veri düzeltme, silme veya anonimleştirme talep etme',
      'İşlemeye itiraz etme ve zararın giderilmesini talep etme',
    ],
  },
]

export const metadata: Metadata = createPageMetadata({
  title: 'KVKK Aydınlatma Metni',
  description:
    'Cebindegaleri KVKK aydınlatma metni: veri sorumlusu, veri işleme amaçları, aktarım süreçleri ve ilgili kişi hakları.',
  path: '/kvkk',
  keywords: ['kvkk', 'aydınlatma metni', 'kişisel verilerin korunması'],
})

export default function KVKKPage() {
  return (
    <LegalDocument
      badge="KVKK"
      title="KVKK Aydınlatma Metni"
      subtitle="6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında veri işleme süreçlerimize ilişkin bilgilendirme metni."
      lastUpdated="31 Mayıs 2026"
      sections={sections}
      contactText="KVKK başvurularınızı kvkk@cebindegaleri.com adresine iletebilirsiniz. Talepleriniz mevzuattaki süreler içinde değerlendirilir."
    />
  )
}
