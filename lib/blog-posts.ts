export type BlogInternalLink = {
  label: string
  href: string
}

export type BlogPost = {
  slug: string
  title: string
  excerpt: string
  date: string
  publishedAt: string
  updatedAt: string
  category: string
  readingTime: string
  keywords: string[]
  relatedSlugs: string[]
  internalLinks: BlogInternalLink[]
  content: string[]
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'qr-kod-ile-arac-satis-suresini-kisaltma',
    title: 'QR Kod ile Araç Satış Süresi Nasıl Kısalır?',
    excerpt:
      'Araç camındaki QR etiketinin müşteri karar süresine etkisini; doğru içerik, hızlı iletişim ve mobil deneyim üzerinden adım adım inceliyoruz.',
    date: '28 Mayıs 2026',
    publishedAt: '2026-05-28T09:00:00+03:00',
    updatedAt: '2026-05-28T09:00:00+03:00',
    category: 'İpucu',
    readingTime: '6 dk',
    keywords: ['qr kodlu araç vitrini', 'galeri dönüşüm optimizasyonu', 'mobil vitrin'],
    relatedSlugs: [
      'lead-takibinde-whatsapp-ve-telefon-akislarini-birlestirme',
      'galeri-ekipleri-icin-haftalik-analitik-kontrol-listesi',
      'dijital-vitrin-yonetiminde-7-kritik-hata',
    ],
    internalLinks: [
      { label: 'Demo akışını inceleyin', href: '/demo' },
      { label: 'Fiyat paketlerini karşılaştırın', href: '/fiyatlar' },
      { label: 'Ekibimizle iletişime geçin', href: '/iletisim' },
    ],
    content: [
      'QR kodun etkisi yalnızca bir teknoloji yeniliği olmasından gelmez; asıl etki, müşterinin bilgiye ulaşma süresini saniyelere indirmesidir.',
      'Müşteri aracı incelerken teknik detay, ekspertiz notu ve fiyat güncelliğini aynı ekranda görürse satış temsilcisiyle konuşmaya daha hazır hale gelir.',
      'İlk ekranda model, fiyat ve güven unsurları; ikinci blokta donanım ve geçmiş bilgileri; son blokta ise güçlü bir WhatsApp/arama çağrısı sunulmalıdır.',
      'Galeriler için en kritik metrik, QR tarama sayısı kadar tarama sonrası iletişim dönüşüm oranıdır. Bu oranı haftalık takip edip düşük kalan araç kartlarında içerik ve görsel düzeni revize etmek gerekir.',
    ],
  },
  {
    slug: 'dijital-vitrin-yonetiminde-7-kritik-hata',
    title: 'Dijital Vitrin Yönetiminde En Sık Yapılan 7 Hata',
    excerpt:
      'Eksik fotoğraf, gecikmiş fiyat güncellemesi ve yanıt süresi gibi satışa doğrudan etki eden hataları tespit edip hızlı düzeltme önerileri sunuyoruz.',
    date: '21 Mayıs 2026',
    publishedAt: '2026-05-21T09:00:00+03:00',
    updatedAt: '2026-05-21T09:00:00+03:00',
    category: 'Rehber',
    readingTime: '8 dk',
    keywords: ['dijital vitrin yönetimi', 'oto galeri içerik kalitesi', 'lead hız optimizasyonu'],
    relatedSlugs: [
      'qr-kod-ile-arac-satis-suresini-kisaltma',
      'galeri-ekipleri-icin-haftalik-analitik-kontrol-listesi',
      'lead-takibinde-whatsapp-ve-telefon-akislarini-birlestirme',
    ],
    internalLinks: [
      { label: 'SSS bölümünü görüntüleyin', href: '/sss' },
      { label: 'Hakkımızda sayfasını ziyaret edin', href: '/hakkimizda' },
      { label: 'Canlı demo talep edin', href: '/demo' },
    ],
    content: [
      'En sık hata, araç kartlarının yarım bırakılmasıdır. Yetersiz fotoğraf ve eksik donanım verisi müşteriyi başka ilana yönlendirir.',
      'İkinci önemli hata, fiyat ve stok güncellemesinin gecikmesidir. Müşterinin gördüğü bilgiyle satış temsilcisinin verdiği bilgi farklıysa güven kaybı oluşur.',
      'Üçüncü hata ise iletişimde yavaş dönüş. QR tarama sonrası ilk 10-15 dakika kritik penceredir; bu sürede yanıt verilen leadlerin kapanma ihtimali belirgin biçimde artar.',
      'Çözüm için standart araç kartı şablonu, günlük fiyat-stok kontrol listesi ve lead yanıt SLA hedefi birlikte uygulanmalıdır.',
    ],
  },
  {
    slug: 'lead-takibinde-whatsapp-ve-telefon-akislarini-birlestirme',
    title: 'Lead Takibinde WhatsApp ve Telefon Akışları Nasıl Birleşir?',
    excerpt:
      'Müşteri iletişimini kanal bazlı parçalamak yerine tek kayıt altında toplamanın ekip performansına etkisini gerçek örneklerle aktarıyoruz.',
    date: '16 Mayıs 2026',
    publishedAt: '2026-05-16T09:00:00+03:00',
    updatedAt: '2026-05-16T09:00:00+03:00',
    category: 'Operasyon',
    readingTime: '7 dk',
    keywords: ['whatsapp lead takibi', 'telefon entegrasyonu', 'crm akışı'],
    relatedSlugs: [
      'qr-kod-ile-arac-satis-suresini-kisaltma',
      'dijital-vitrin-yonetiminde-7-kritik-hata',
      'galeri-ekipleri-icin-haftalik-analitik-kontrol-listesi',
    ],
    internalLinks: [
      { label: 'İletişim formu entegrasyonunu görün', href: '/iletisim' },
      { label: 'Operasyon paketlerini karşılaştırın', href: '/fiyatlar' },
      { label: 'Kariyer sayfası ile ekip büyütün', href: '/kariyer' },
    ],
    content: [
      'WhatsApp ve telefon kayıtları farklı yerlerde tutulduğunda aynı müşteriye birden fazla temsilcinin tekrar ulaşması sık görülür.',
      'Tekil lead kaydı yaklaşımıyla müşteri geçmişi, araç ilgisi ve son görüşme notu aynı ekranda görülür; ekip içi koordinasyon güçlenir.',
      'Satış ekiplerinde kanal ayrımını kaldırmak için asıl ihtiyaç yeni bir iletişim aracı değil, mevcut temasların doğru etiketlenmesi ve sıraya alınmasıdır.',
      'Her lead için durum adımları (yeni, iletişime geçildi, teklif verildi, kapanış) tanımlandığında yöneticiler darboğazı anlık tespit edebilir.',
    ],
  },
  {
    slug: 'galeri-ekipleri-icin-haftalik-analitik-kontrol-listesi',
    title: 'Galeri Ekipleri İçin Haftalık Analitik Kontrol Listesi',
    excerpt:
      'Hangi araçların görüntülendiğini, hangi kampanyaların lead ürettiğini ve hangi saatlerde dönüşüm geldiğini haftalık bazda takip etmek için pratik şablon.',
    date: '10 Mayıs 2026',
    publishedAt: '2026-05-10T09:00:00+03:00',
    updatedAt: '2026-05-10T09:00:00+03:00',
    category: 'Analitik',
    readingTime: '5 dk',
    keywords: ['galeri analitiği', 'haftalık kontrol listesi', 'lead metriği'],
    relatedSlugs: [
      'qr-kod-ile-arac-satis-suresini-kisaltma',
      'dijital-vitrin-yonetiminde-7-kritik-hata',
      'lead-takibinde-whatsapp-ve-telefon-akislarini-birlestirme',
    ],
    internalLinks: [
      { label: 'Analitik panel demosunu açın', href: '/demo' },
      { label: 'Ürün özelliklerini inceleyin', href: '/ozellikler' },
      { label: 'Canlı destek ekibine bağlanın', href: '/iletisim' },
    ],
    content: [
      'Haftalık analitik incelemesinde yalnızca toplam görüntüleme değil, araç başı etkileşim farkları izlenmelidir.',
      'Yüksek görüntüleme ama düşük iletişim alan araçlar, genellikle içerik, fiyat pozisyonu veya güven unsuru eksikliği taşır.',
      'Zaman dilimi bazlı performans analizi, reklam ve paylaşım zamanlarını optimize eder; ekip planlaması daha verimli hale gelir.',
      'Kapanış oranı düşük haftalarda ilk bakılacak alanlar: yanıt süresi, teklif standardı ve araç kartı güncelliğidir.',
    ],
  },
]

export function getBlogPostBySlug(slug: string) {
  return blogPosts.find((post) => post.slug === slug)
}

export function getRelatedPosts(slug: string, limit = 3) {
  const post = getBlogPostBySlug(slug)
  if (!post) return []

  const relatedByExplicit = post.relatedSlugs
    .map((relatedSlug) => getBlogPostBySlug(relatedSlug))
    .filter((item): item is BlogPost => Boolean(item))

  if (relatedByExplicit.length >= limit) {
    return relatedByExplicit.slice(0, limit)
  }

  const fallback = blogPosts.filter((item) => item.slug !== slug && item.category === post.category)
  return [...relatedByExplicit, ...fallback].slice(0, limit)
}
