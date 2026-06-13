export type CityLanding = {
  slug: string
  name: string
  title: string
  description: string
  districts: string[]
  operatingContext: string
  focus: string[]
  playbook: Array<{ title: string; description: string }>
}

export const cityLandings: CityLanding[] = [
  {
    slug: "istanbul",
    name: "İstanbul",
    title: "İstanbul Oto Galerileri İçin QR Kodlu Galeri Yazılımı",
    description: "İstanbul'da yoğun araç trafiğini, farklı lokasyonlardan gelen müşteri taleplerini ve hızlı değişen stokları tek panelden yönetin.",
    districts: ["Maslak", "İkitelli", "Bağcılar", "Kadıköy", "Pendik", "Ümraniye"],
    operatingContext:
      "İstanbul galerilerinde müşteri aynı gün içinde birden fazla ilçede araç karşılaştırabilir. Araç başındaki QR kodun güncel fiyat, fotoğraf ve iletişim bilgisine bağlanması; satış ekibinin hangi lokasyondaki aracın ilgi gördüğünü izlemesini kolaylaştırır.",
    focus: ["Şube ve lokasyonlar arasında tutarlı araç bilgisi", "Yoğun QR trafiğinde araç bazlı ilgi takibi", "WhatsApp ve telefon taleplerinin ortak kaydı"],
    playbook: [
      { title: "Lokasyon bilgisini net gösterin", description: "Araç sayfasında galeri konumu ve tek dokunuşla yol tarifi aksiyonunu görünür tutun." },
      { title: "Yoğun stokta QR standardı kullanın", description: "Her araç için tek QR kod kullanarak fiyat ve ilan değişikliklerinde etiketi yeniden üretme ihtiyacını azaltın." },
      { title: "Talep kaynağını ayırın", description: "QR, showroom ve WhatsApp temaslarını araçla eşleştirerek ekip içi tekrar aramaları azaltın." },
    ],
  },
  {
    slug: "ankara",
    name: "Ankara",
    title: "Ankara Oto Galerileri İçin Dijital Vitrin ve Müşteri Takibi",
    description: "Ankara'daki galeri bölgelerinde araç vitrini, QR yönlendirme ve müşteri takip sürecini düzenli bir satış akışına dönüştürün.",
    districts: ["Akyurt", "Şaşmaz", "Etimesgut", "Çankaya", "Keçiören", "Yenimahalle"],
    operatingContext:
      "Ankara'da galeri bölgelerine planlı gelen alıcılar kısa sürede çok sayıda araç inceler. Cam üzerindeki QR kod, satış temsilcisi meşgulken bile müşterinin doğru araç detayına ve iletişim seçeneklerine ulaşmasını sağlar.",
    focus: ["Araç başında temsilci beklemeden bilgi erişimi", "Planlı geri arama ve test sürüşü takibi", "Stok değişikliklerinin dijital vitrinde hızlı güncellenmesi"],
    playbook: [
      { title: "Test sürüşünü kayıt altına alın", description: "İlgilenen müşteriye takip tarihi ekleyerek test sürüşü sonrası geri dönüşü unutmayın." },
      { title: "Araç detayını standartlaştırın", description: "Kilometre, yakıt, vites ve fiyat bilgilerinin her araç sayfasında aynı düzende görünmesini sağlayın." },
      { title: "Haftalık ilgi kontrolü yapın", description: "QR taraması yüksek fakat talebi düşük araçları inceleyerek fiyat ve sunum kararlarını gözden geçirin." },
    ],
  },
  {
    slug: "izmir",
    name: "İzmir",
    title: "İzmir Oto Galerileri İçin Mobil Uyumlu QR Araç Vitrini",
    description: "İzmir'de showroom ziyaretini mobil araç sayfası, konum ve WhatsApp iletişimiyle kesintisiz bir müşteri deneyimine dönüştürün.",
    districts: ["Bornova", "Gaziemir", "Karşıyaka", "Buca", "Çiğli", "Torbalı"],
    operatingContext:
      "İzmir'de farklı ilçelerden ve çevre illerden gelen müşteriler çoğu zaman araçları telefondan önceden inceler. Mobil uyumlu galeri sayfası ve araç QR kodu, çevrim içi araştırmayla showroom ziyaretini aynı bilgi üzerinden birleştirir.",
    focus: ["Mobil öncelikli araç sunumu", "Konum ve WhatsApp aksiyonlarının görünürlüğü", "Çevre illerden gelen taleplerin düzenli takibi"],
    playbook: [
      { title: "Mobil fotoğraf sırasını düzenleyin", description: "İlk görselde aracın güçlü açısını, sonraki görsellerde iç mekân ve detayları gösterin." },
      { title: "Konum erişimini kolaylaştırın", description: "Galeri sayfasında yol tarifi ve iletişim butonlarını müşterinin kolay ulaşacağı yerde tutun." },
      { title: "Uzak müşteriye araç linki gönderin", description: "Dağınık fotoğraflar yerine güncel araç sayfasını WhatsApp üzerinden paylaşın." },
    ],
  },
  {
    slug: "bursa",
    name: "Bursa",
    title: "Bursa Oto Galerileri İçin Stok ve QR Kod Yönetimi",
    description: "Bursa otomotiv pazarında araç stoklarını güncel tutun, QR ilgisini ölçün ve müşteri taleplerini satış sürecine bağlayın.",
    districts: ["Nilüfer", "Osmangazi", "Yıldırım", "İnegöl", "Gemlik", "Mudanya"],
    operatingContext:
      "Bursa'nın güçlü otomotiv ekosisteminde alıcılar teknik araç bilgilerine ve güncel stok durumuna önem verir. Tek panelden güncellenen araç sayfası, yanlış fiyat veya satılmış araç bilgisinin paylaşılma riskini azaltır.",
    focus: ["Güncel stok ve durum bilgisinin korunması", "Teknik özelliklerin standart sunumu", "Satıldı ve rezerve durumlarının hızlı yönetimi"],
    playbook: [
      { title: "Stok durumunu günlük kontrol edin", description: "Satıldı veya rezerve edilen araçları panelde güncelleyerek müşteri beklentisini doğru yönetin." },
      { title: "Teknik bilgiyi eksiksiz girin", description: "Yakıt, vites, kilometre ve donanım detaylarıyla gereksiz soru trafiğini azaltın." },
      { title: "İlgi gören aracı belirleyin", description: "Araç bazlı QR taramalarını izleyerek showroom içindeki ilgi dağılımını görün." },
    ],
  },
  {
    slug: "antalya",
    name: "Antalya",
    title: "Antalya Oto Galerileri İçin QR Kodlu Dijital Showroom",
    description: "Antalya'da yerel ve şehir dışı müşterilere güncel araç sayfaları sunun; WhatsApp, arama ve konum taleplerini tek panelde takip edin.",
    districts: ["Kepez", "Muratpaşa", "Konyaaltı", "Alanya", "Manavgat", "Serik"],
    operatingContext:
      "Antalya'da geniş ilçe dağılımı ve şehir dışından gelen talep, müşterinin showrooma gelmeden önce güvenilir araç bilgisine ulaşmasını önemli hale getirir. Dijital showroom, araç fotoğrafları ve iletişim aksiyonlarını tek bağlantıda toplar.",
    focus: ["Şehir dışı müşteriye güvenilir araç linki", "Geniş ilçe dağılımında konum görünürlüğü", "WhatsApp taleplerinin araçla eşleştirilmesi"],
    playbook: [
      { title: "Güncel araç linkini paylaşın", description: "Şehir dışı müşteriye fiyat ve fotoğrafları ayrı ayrı göndermek yerine tek araç sayfası iletin." },
      { title: "Geri dönüş saatini planlayın", description: "İlgilenen müşteriye takip tarihi ekleyerek yoğun satış günlerinde talebi kaybetmeyin." },
      { title: "Showroom sayfasını marka vitrini yapın", description: "Logo, iletişim ve aktif stokları aynı sayfada tutarak ilk temasta güven oluşturun." },
    ],
  },
]

export function getCityLanding(slug: string) {
  return cityLandings.find((city) => city.slug === slug)
}
