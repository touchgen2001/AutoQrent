import type { Metadata } from 'next'
import { LegalDocument } from '@/components/landing/legal-document'
import { createPageMetadata } from '@/lib/seo'

const sections = [
  {
    title: '1. Çerez Nedir?',
    paragraphs: [
      'Çerezler, web sitemizi ziyaret ettiğinizde tarayıcınız aracılığıyla cihazınıza kaydedilen küçük metin dosyalarıdır.',
      'Bu dosyalar; oturum yönetimi, kullanıcı tercihleri ve performans ölçümü için kullanılır.',
    ],
  },
  {
    title: '2. Kullandığımız Çerez Türleri',
    bullets: [
      'Zorunlu çerezler: güvenli oturum ve temel platform fonksiyonları için',
      'Analitik çerezler: trafik, kullanım ve performans analizleri için',
      'Tercih çerezleri: dil, görünüm ve kullanım tercihlerinin hatırlanması için',
      'Pazarlama çerezleri: kullanıcıya uygun kampanya/mesaj deneyimi için (varsa)',
    ],
  },
  {
    title: '3. Çerezlerin Kontrolü',
    paragraphs: [
      'Tarayıcı ayarlarınızdan çerezleri silebilir veya engelleyebilirsiniz.',
      'Çerezleri devre dışı bırakmanız halinde platformun bazı özelliklerinde işlev kaybı yaşanabilir.',
    ],
  },
  {
    title: '4. Üçüncü Taraf Çerezler',
    paragraphs: [
      'Platformda analitik ve performans ölçümü amacıyla üçüncü taraf araçlar kullanılabilir.',
      'Bu servisler kendi gizlilik politikaları kapsamında çerez yerleştirebilir ve işleyebilir.',
    ],
  },
]

export const metadata: Metadata = createPageMetadata({
  title: 'Çerez Politikası',
  description:
    'Cebindegaleri çerez politikası: kullanılan çerez türleri, kullanım amaçları ve tarayıcı üzerinden çerez kontrol seçenekleri.',
  path: '/cerez-politikasi',
  keywords: ['çerez politikası', 'cookie yönetimi', 'site çerezleri'],
})

export default function CerezPolitikasiPage() {
  return (
    <LegalDocument
      badge="Çerez Politikası"
      title="Çerez Kullanım Politikası"
      subtitle="Web deneyimini iyileştirmek ve performansı ölçmek için kullanılan çerez türleri ve kullanıcı kontrol seçenekleri."
      lastUpdated="31 Mayıs 2026"
      sections={sections}
      contactText="Çerez politikasıyla ilgili sorularınızı destek@cebindegaleri.com adresine iletebilirsiniz."
    />
  )
}
