export type BlogInternalLink = {
  label: string
  href: string
}

export type BlogSourceLink = {
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
  sourceLinks?: BlogSourceLink[]
  content: string[]
}

export const blogPosts: BlogPost[] = [
  {
    slug: '2026-elektrikli-arac-pazari-galeri-stratejisi',
    title: '2026 Elektrikli Araç Pazarı: Galeriler Stok ve Vitrini Nasıl Hazırlamalı?',
    excerpt:
      'IEA Global EV Outlook 2026 verilerine göre elektrikli araç satışları büyümeye devam ediyor. Galeriler için stok, ilan ve müşteri sorusu hazırlığını yorumluyoruz.',
    date: '5 Haziran 2026',
    publishedAt: '2026-06-05T10:00:00+03:00',
    updatedAt: '2026-06-05T10:00:00+03:00',
    category: 'Otomobil Haberleri',
    readingTime: '7 dk',
    keywords: ['elektrikli araç pazarı 2026', 'ev satış trendi', 'galeri stok stratejisi', 'ikinci el elektrikli araç'],
    relatedSlugs: [
      'elektrikli-arac-satisinda-musteri-sorulari',
      'galeri-web-sitesinde-arac-listeleme-seo',
      'qr-kod-ile-arac-satis-suresini-kisaltma',
    ],
    internalLinks: [
      { label: 'Demo araç QR akışını deneyin', href: '/demo' },
      { label: 'Galeri web sitesi özelliklerini görün', href: '/ozellikler' },
      { label: '14 gün ücretsiz başlayın', href: '/kayit?plan=starter&utm_source=blog&utm_content=ev-2026' },
    ],
    sourceLinks: [
      { label: 'IEA Global EV Outlook 2026 - Executive Summary', href: 'https://www.iea.org/reports/global-ev-outlook-2026/executive-summary' },
      { label: 'IEA Global EV Outlook 2026 - Trends in electric cars', href: 'https://www.iea.org/reports/global-ev-outlook-2026/trends-in-electric-cars' },
    ],
    content: [
      'IEA Global EV Outlook 2026, küresel elektrikli otomobil satışlarının 2025 yılında %20 büyüyerek 20 milyonu geçtiğini ve satılan her dört yeni otomobilden birinin elektrikli olduğunu bildiriyor. Bu veri, galeri vitrinlerinde elektrikli ve hibrit araç bilgisinin artık niş değil ana akış konu olduğunu gösteriyor.',
      'Galeri tarafında ilk hazırlık, araç kartlarında batarya kapasitesi, tahmini menzil, şarj tipi, garanti durumu ve servis geçmişinin eksiksiz gösterilmesidir. Müşteri elektrikli araçta yalnızca fiyatı değil, kullanım senaryosunu ve şarj kolaylığını da karşılaştırır.',
      'İkinci hazırlık, satış temsilcisi notlarının standartlaşmasıdır. Aynı araç için bir temsilci batarya sağlığına, diğeri şarj maliyetine odaklanıyorsa müşteri tutarsız bilgi alır. Panelde araç bazlı açıklama ve hızlı cevap şablonu tutulmalıdır.',
      'Üçüncü hazırlık, QR ile araç başında doğru bilgiye geçiştir. Müşteri showroomda aracı incelerken telefonundan batarya, donanım, fotoğraf ve iletişim aksiyonlarına ulaşırsa satış görüşmesi daha bilinçli başlar.',
    ],
  },
  {
    slug: 'euro-7-takvimi-ikinci-el-galeri-icin-ne-anlama-geliyor',
    title: 'Euro 7 Takvimi: İkinci El Galeriler İçin Ne Anlama Geliyor?',
    excerpt:
      'Euro 7 düzenlemesinin takvimi, fren-lastik parçacıkları ve batarya dayanıklılığı gibi başlıkları galeri diline çeviriyoruz.',
    date: '4 Haziran 2026',
    publishedAt: '2026-06-04T09:30:00+03:00',
    updatedAt: '2026-06-04T09:30:00+03:00',
    category: 'Regülasyon',
    readingTime: '6 dk',
    keywords: ['Euro 7', 'otomobil emisyon standardı', 'ikinci el araç açıklaması', 'galeri mevzuat'],
    relatedSlugs: [
      '2026-elektrikli-arac-pazari-galeri-stratejisi',
      'euro-ncap-2026-guvenlik-protokolleri',
      'dijital-vitrin-yonetiminde-7-kritik-hata',
    ],
    internalLinks: [
      { label: 'SSS bölümünü inceleyin', href: '/sss' },
      { label: 'Araç vitrin modüllerini görün', href: '/ozellikler' },
      { label: 'Demo galeri web sitesini açın', href: '/demo' },
    ],
    sourceLinks: [
      { label: 'EUR-Lex Regulation (EU) 2024/1257 summary', href: 'https://eur-lex.europa.eu/legal-content/en/LSU/?uri=CELEX%3A32024R1257' },
    ],
    content: [
      'EUR-Lex özetine göre Euro 7, M1 ve N1 kategorisindeki yeni araç tipleri için 29 Kasım 2026, yeni araçlar için 29 Kasım 2027 itibarıyla uygulanacak. Bu takvim doğrudan her ikinci el aracı değiştirmez; fakat müşteri sorularında emisyon, fren partikülü, lastik aşınması ve batarya dayanıklılığı daha görünür hale gelir.',
      'Galeri açıklamalarında en güvenli yaklaşım, iddialı teknik vaatler yerine doğrulanabilir bilgi vermektir. Araç kartında motor tipi, yakıt, emisyon standardı biliniyorsa yazılmalı; bilinmiyorsa boş iddia eklenmemelidir.',
      'Elektrikli ve hibrit araçlarda batarya garantisi, servis kayıtları ve şarj geçmişi müşterinin güven kararını etkiler. Bu alanlar panelde ayrı not olarak tutulursa satış temsilcisi aynı bilgiyi her kanalda tutarlı verir.',
      'Regülasyon başlıkları satış metnine sade çevrilmelidir: aracın yakıt tipi, bakım durumu, belge bulunurluğu ve kullanım maliyeti. Müşteri için değer yaratan bilgi budur.',
    ],
  },
  {
    slug: 'euro-ncap-2026-guvenlik-protokolleri',
    title: 'Euro NCAP 2026 Güvenlik Protokolleri: Araç İlanlarında Ne Değişmeli?',
    excerpt:
      'Euro NCAP 2026 yaklaşımı güvenliği dört aşamada ele alıyor. Galeriler için güvenlik donanımı anlatımını nasıl netleştirmek gerektiğini özetliyoruz.',
    date: '3 Haziran 2026',
    publishedAt: '2026-06-03T09:00:00+03:00',
    updatedAt: '2026-06-03T09:00:00+03:00',
    category: 'Güvenlik',
    readingTime: '6 dk',
    keywords: ['Euro NCAP 2026', 'araç güvenlik donanımı', 'ikinci el güvenlik açıklaması', 'ADAS'],
    relatedSlugs: [
      'euro-7-takvimi-ikinci-el-galeri-icin-ne-anlama-geliyor',
      'ikinci-el-arac-fotograf-rehberi',
      'galeri-web-sitesinde-arac-listeleme-seo',
    ],
    internalLinks: [
      { label: 'Demo araç sayfasını görün', href: '/demo' },
      { label: 'Araç vitrini özelliklerini inceleyin', href: '/ozellikler' },
      { label: 'Galeriye özel plan isteyin', href: '/iletisim' },
    ],
    sourceLinks: [
      { label: 'Euro NCAP 2026 protocol announcement', href: 'https://www.euroncap.com/press-media/euro-ncap-announces-2026-protocol-changes-to-tackle-modern-driving-risks/' },
      { label: 'Euro NCAP - How cars are tested', href: 'https://www.euroncap.com/en/about-euro-ncap/the-car-selection-explained/' },
    ],
    content: [
      'Euro NCAP, 2026 protokollerinde güvenliği Safe Driving, Crash Avoidance, Crash Protection ve Post-Crash Safety aşamalarıyla ele alacağını duyurdu. Bu yaklaşım, araç ilanında güvenliği yalnızca hava yastığı sayısı olarak anlatmanın yetersiz kalacağını gösteriyor.',
      'İlan dilinde sürüş destek sistemleri ayrı başlık olmalıdır: adaptif hız sabitleyici, şerit takip, kör nokta uyarısı, otomatik acil frenleme ve sürücü takip sistemi varsa net yazılmalıdır. Yoksa tahminle eklenmemelidir.',
      'Kaza sonrası güvenlik de müşteri için önemlidir. eCall, yüksek voltaj batarya bilgisi, servis dokümanı ve ekspertiz notları gibi başlıklar güven hissini artırır.',
      'Galeri panelinde güvenlik donanımı standart alanlara ayrıldığında hem public araç sayfası daha profesyonel görünür hem de satış temsilcisi aynı bilgiyi WhatsApp, telefon ve yüz yüze görüşmede tekrar kullanır.',
    ],
  },
  {
    slug: 'elektrikli-arac-satisinda-musteri-sorulari',
    title: 'Elektrikli Araç Satışında Müşterinin İlk Sorduğu 12 Soru',
    excerpt:
      'Menzil, batarya sağlığı, şarj süresi ve garanti gibi kritik soruları araç kartına nasıl yerleştirmek gerektiğini anlatıyoruz.',
    date: '1 Haziran 2026',
    publishedAt: '2026-06-01T09:00:00+03:00',
    updatedAt: '2026-06-01T09:00:00+03:00',
    category: 'Araç Rehberi',
    readingTime: '8 dk',
    keywords: ['elektrikli araç satış soruları', 'batarya sağlığı', 'şarj süresi', 'ikinci el elektrikli araç rehberi'],
    relatedSlugs: [
      '2026-elektrikli-arac-pazari-galeri-stratejisi',
      'qr-kod-ile-arac-satis-suresini-kisaltma',
      'lead-takibinde-whatsapp-ve-telefon-akislarini-birlestirme',
    ],
    internalLinks: [
      { label: 'Demo QR deneyimini açın', href: '/demo' },
      { label: 'Panel özelliklerini inceleyin', href: '/ozellikler' },
      { label: 'Başlangıç paketini görün', href: '/fiyatlar' },
    ],
    content: [
      'Elektrikli araç müşterisi genellikle menzil, batarya sağlığı, şarj süresi, garanti, evde şarj imkanı, hızlı şarj desteği, servis ağı, lastik durumu, yaz-kış tüketim farkı, ikinci el değeri, yazılım güncellemesi ve takas seçeneklerini sorar.',
      'Bu soruların tamamını satış temsilcisinin hafızasına bırakmak doğru değildir. Araç kartında batarya ve şarj bilgileri ayrı bir bölümde görünürse müşteri ilk ekranda daha az belirsizlik yaşar.',
      'Fotoğraflarda yalnızca dış görünüş değil, şarj portu, gösterge ekranı, batarya/menzil ekranı ve varsa şarj kablosu da yer almalıdır. Bu görseller müşteri sorularını azaltır.',
      'Lead formunda araç başlığı otomatik taşındığında müşteri hangi araç için bilgi istediğini tekrar anlatmak zorunda kalmaz. Satış ekibi de talebi araç bazlı takip eder.',
    ],
  },
  {
    slug: 'ikinci-el-arac-fotograf-rehberi',
    title: 'İkinci El Araç Fotoğraf Rehberi: Hangi Açı Satışı Hızlandırır?',
    excerpt:
      'Araç fotoğraflarını sadece güzel göstermek için değil, müşteri güvenini artırmak ve gereksiz soru sayısını azaltmak için nasıl sıralamalı?',
    date: '31 Mayıs 2026',
    publishedAt: '2026-05-31T09:00:00+03:00',
    updatedAt: '2026-05-31T09:00:00+03:00',
    category: 'Araç Rehberi',
    readingTime: '7 dk',
    keywords: ['ikinci el araç fotoğrafı', 'oto galeri fotoğraf rehberi', 'araç ilan fotoğraf sırası'],
    relatedSlugs: [
      'dijital-vitrin-yonetiminde-7-kritik-hata',
      'galeri-web-sitesinde-arac-listeleme-seo',
      'qr-kod-ile-arac-satis-suresini-kisaltma',
    ],
    internalLinks: [
      { label: 'Demo araç fotoğraflarını görün', href: '/demo' },
      { label: 'Araç yönetimi özelliklerini inceleyin', href: '/ozellikler' },
      { label: 'Galeri hesabı oluşturun', href: '/kayit' },
    ],
    content: [
      'İlk fotoğraf aracın en temiz üç çeyrek ön görünümü olmalıdır. Müşteri liste ekranında ilk görsele göre karar verir; karanlık, eğik veya kalabalık arka planlı fotoğraf tıklama oranını düşürür.',
      'İkinci ve üçüncü fotoğraf yan profil ve arka üç çeyrek görünüm olmalıdır. Bu sıra aracın genel formunu hızlı anlatır ve kullanıcıyı detay fotoğraflarına hazırlar.',
      'İç mekanda direksiyon, gösterge, multimedya ekranı, koltuklar ve bagaj ayrı ayrı çekilmelidir. Hasar, çizik veya kullanım izi varsa saklamak yerine net fotoğrafla göstermek güveni artırır.',
      'Fotoğraf yükleme güvenliği de önemlidir. Dosya türü ve boyutu kontrol edilmeli; araç görseli temizse tekrar yükleme ya da minimum fotoğraf sınırı gibi satış akışını yavaşlatan kurallar kullanılmamalıdır.',
    ],
  },
  {
    slug: 'galeri-web-sitesinde-arac-listeleme-seo',
    title: 'Galeri Web Sitesinde Araç Listeleme SEO’su Nasıl Kurulur?',
    excerpt:
      'Her galerinin kendi public sayfasında araçların görünmesi, Google ve müşteri deneyimi açısından nasıl değer üretir?',
    date: '29 Mayıs 2026',
    publishedAt: '2026-05-29T09:00:00+03:00',
    updatedAt: '2026-05-29T09:00:00+03:00',
    category: 'SEO',
    readingTime: '6 dk',
    keywords: ['galeri web sitesi seo', 'araç listeleme seo', 'public showroom', 'oto galeri sitesi'],
    relatedSlugs: [
      'ikinci-el-arac-fotograf-rehberi',
      'qr-kod-ile-arac-satis-suresini-kisaltma',
      'galeri-ekipleri-icin-haftalik-analitik-kontrol-listesi',
    ],
    internalLinks: [
      { label: 'Demo galeri web sitesini görün', href: '/demo' },
      { label: 'SEO ve FAQ sayfasını inceleyin', href: '/sss' },
      { label: '14 Gün Ücretsiz Başla', href: '/kayit' },
    ],
    content: [
      'Galeri web sitesinde araçlar ayrı kartlarla ve her araç kendi detay sayfasıyla yayınlanmalıdır. Tek sayfada görsel yığmak yerine marka, model, yıl, kilometre, fiyat ve iletişim aksiyonları yapılandırılmış şekilde görünmelidir.',
      'SEO açısından başlık ve açıklama gerçek araç bilgisinden üretilmelidir. Örneğin marka, model, yıl ve lokasyon birleşimi hem kullanıcıya hem arama motoruna sayfanın ne anlattığını açıklar.',
      'Araç yayından kalktığında kartın da public vitrinden kalkması gerekir. Stokta olmayan aracı göstermeye devam etmek kısa vadede trafik getirse bile güven kaybı oluşturur.',
      'QR ile gelen kullanıcı ve Google’dan gelen kullanıcı aynı araç detay sayfasına bağlanırsa analitik daha temiz okunur. Hangi araç görüntülendi, hangi araç lead aldı ve hangi kanal daha iyi dönüştü netleşir.',
    ],
  },
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
