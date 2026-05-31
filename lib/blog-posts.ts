export type BlogPost = {
  slug: string
  title: string
  excerpt: string
  date: string
  category: string
  readingTime: string
  content: string[]
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'qr-kod-ile-arac-satis-suresini-kisaltma',
    title: 'QR Kod ile Araç Satış Süresi Nasıl Kısalır?',
    excerpt:
      'Araç camındaki QR etiketinin müşteri karar süresine etkisini; doğru içerik, hızlı iletişim ve mobil deneyim üzerinden adım adım inceliyoruz.',
    date: '28 Mayıs 2026',
    category: 'İpucu',
    readingTime: '6 dk',
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
    category: 'Rehber',
    readingTime: '8 dk',
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
    category: 'Operasyon',
    readingTime: '7 dk',
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
    category: 'Analitik',
    readingTime: '5 dk',
    content: [
      'Haftalık analitik incelemesinde yalnızca toplam görüntüleme değil, araç başı etkileşim farkları izlenmelidir.',
      'Yüksek görüntüleme ama düşük iletişim alan araçlar, genellikle içerik, fiyat pozisyonu veya güven unsuru eksikliği taşır.',
      'Zaman dilimi bazlı performans analizi, reklam ve paylaşım zamanlarını optimize eder; ekip planlaması daha verimli hale gelir.',
      'Kapanış oranı düşük haftalarda ilk bakılacak alanlar: yanıt süresi, teklif standardı ve araç kartı güncelliğidir.',
    ],
  },
]
