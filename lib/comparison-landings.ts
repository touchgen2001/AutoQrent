export type ComparisonLanding = {
  slug: string
  title: string
  description: string
  heading: string
  intro: string
  alternativeLabel: string
  rows: Array<{
    criterion: string
    cebindegaleri: string
    alternative: string
  }>
  decisionPoints: string[]
  faq: Array<{ question: string; answer: string }>
}

export const comparisonLandings: ComparisonLanding[] = [
  {
    slug: 'galeri-yazilimi-mi-excel-mi',
    title: 'Galeri Yazılımı mı Excel mi?',
    description:
      'Araç stoklarını Excel ile takip etmek ile QR kodlu galeri yazılımı kullanmak arasındaki operasyonel farkları dürüstçe karşılaştırın.',
    heading: 'Araç Galerisi İçin Yazılım mı, Excel mi?',
    intro:
      'Excel düşük hacimli ve tek kullanıcıyla yürütülen temel stok listeleri için yeterli olabilir. Araç vitrini, QR kod, müşteri talebi ve ekip erişimi tek akışta yönetilecekse özel galeri yazılımı daha uygulanabilir hale gelir.',
    alternativeLabel: 'Excel / tablo',
    rows: [
      { criterion: 'Temel stok listesi', cebindegaleri: 'Araç alanlarına göre yapılandırılmış kayıt', alternative: 'Esnek, manuel tablo düzeni' },
      { criterion: 'Müşteriye açık vitrin', cebindegaleri: 'Mobil public showroom ve araç sayfaları', alternative: 'Ek web sitesi veya paylaşım gerekir' },
      { criterion: 'QR kod akışı', cebindegaleri: 'Araç bağlantısına bağlı QR akışı', alternative: 'Harici araçlarla manuel hazırlanır' },
      { criterion: 'Müşteri talepleri', cebindegaleri: 'Form, WhatsApp ve telefon temasları panelde izlenir', alternative: 'Ayrı notlar ve dosyalarla takip edilir' },
      { criterion: 'Yetki ve erişim', cebindegaleri: 'Panel oturumu ve merkezi kayıt', alternative: 'Dosya paylaşım ayarlarına bağlıdır' },
      { criterion: 'Başlangıç kolaylığı', cebindegaleri: 'Kurulum ve veri girişi gerekir', alternative: 'Hızlıca boş tablo açılabilir' },
    ],
    decisionPoints: [
      'Yalnızca az sayıda aracı iç kullanım için listeleyecekseniz Excel yeterli olabilir.',
      'Araç detayını müşteriye QR ile göstermek istiyorsanız özel galeri yazılımı daha doğrudan bir akış sunar.',
      'Birden fazla temas kanalından gelen talepleri tek yerde görmek istiyorsanız merkezi panel tercih edilmelidir.',
    ],
    faq: [
      { question: 'Excel kullanmayı tamamen bırakmak gerekir mi?', answer: 'Hayır. Finansal veya özel raporlar için tablo kullanmaya devam edebilir, günlük stok ve müşteri akışını galeri yazılımında yönetebilirsiniz.' },
      { question: 'Galeri yazılımına geçiş için kaç araç gerekir?', answer: 'Sabit bir eşik yoktur. Kararı araç sayısından çok QR vitrin, müşteri talebi takibi ve ekip kullanımı ihtiyacı belirler.' },
    ],
  },
  {
    slug: 'qr-kodlu-galeri-sistemi',
    title: 'QR Kodlu Galeri Sistemi Nasıl Seçilir?',
    description:
      'QR kodlu araç vitrini seçerken dinamik bağlantı, mobil deneyim, iletişim akışı ve analitik özelliklerini karşılaştırın.',
    heading: 'QR Kodlu Galeri Sistemi Seçim Rehberi',
    intro:
      'Bir QR kodun yalnızca bağlantı açması yeterli değildir. Müşterinin ulaştığı mobil araç sayfası, güncel stok bilgisi, iletişim seçenekleri ve galeri vitrini birlikte değerlendirilmelidir.',
    alternativeLabel: 'Basit QR bağlantısı',
    rows: [
      { criterion: 'QR hedefi', cebindegaleri: 'Yapılandırılmış araç detay sayfası', alternative: 'Seçilen herhangi bir bağlantı' },
      { criterion: 'Araç bilgisi güncelleme', cebindegaleri: 'Paneldeki araç kaydı üzerinden yönetilir', alternative: 'Hedef sayfanın ayrıca güncellenmesi gerekir' },
      { criterion: 'Mobil deneyim', cebindegaleri: 'Araç ve iletişim akışına göre tasarlanmış sayfa', alternative: 'Hedef sitenin mobil uyumuna bağlıdır' },
      { criterion: 'Galeri vitrini bağlantısı', cebindegaleri: 'Aynı galerinin diğer araçlarına geçiş', alternative: 'Ek bağlantı kurulmazsa bulunmaz' },
      { criterion: 'Etkileşim analitiği', cebindegaleri: 'Kayıtlı QR ve müşteri temas verileri', alternative: 'Kullanılan QR hizmetine göre değişir' },
      { criterion: 'Kurulum', cebindegaleri: 'Galeri ve araç bilgilerinin tanımlanması gerekir', alternative: 'Tek bağlantıyla daha hızlı başlayabilir' },
    ],
    decisionPoints: [
      'Tek seferlik bir afiş bağlantısı için basit QR üretici yeterli olabilir.',
      'Her araç için güncel ve markalı mobil sayfa gerekiyorsa galeri odaklı sistem seçin.',
      'QR sonrası WhatsApp, telefon ve form davranışlarını ölçmek istiyorsanız analitik desteğini doğrulayın.',
    ],
    faq: [
      { question: 'QR kod değişmeden araç bilgisi güncellenebilir mi?', answer: 'QR kod sabit bir araç sayfasına yönleniyorsa sayfa içeriği panelden güncellenebilir. QR hedefini değiştiren sistemlerde davranış sağlayıcıya göre değişir.' },
      { question: 'QR kod internet olmadan çalışır mı?', answer: 'Telefon QR kodu okuyabilir ancak bağlı araç sayfasını açmak için internet bağlantısı gerekir.' },
    ],
  },
  {
    slug: 'galeri-yazilimi-mi-ilan-platformu-mu',
    title: 'Galeri Yazılımı mı İlan Platformu mu?',
    description:
      'Kendi dijital showroom’unuz ile ilan platformlarını amaç, marka kontrolü, müşteri iletişimi ve stok yönetimi açısından karşılaştırın.',
    heading: 'Kendi Dijital Showroom’unuz mu, İlan Platformu mu?',
    intro:
      'İlan platformları yeni alıcılara erişim sağlayabilir; kendi galeri siteniz ise marka, müşteri yolculuğu ve doğrudan iletişim üzerinde daha fazla kontrol sunar. Çoğu galeri için bu iki kanal birbirinin yerine değil, birlikte çalışır.',
    alternativeLabel: 'İlan platformu',
    rows: [
      { criterion: 'Ana amaç', cebindegaleri: 'Galerinin kendi markalı vitrini ve operasyonu', alternative: 'Platform içindeki alıcı kitlesine ilan gösterimi' },
      { criterion: 'Marka görünürlüğü', cebindegaleri: 'Galeri adı, logo ve iletişim yapısı önde', alternative: 'Platform tasarımı ve kuralları önde' },
      { criterion: 'Müşteri iletişimi', cebindegaleri: 'Galeriye ait WhatsApp, telefon ve form akışı', alternative: 'Platformun sunduğu iletişim seçeneklerine bağlı' },
      { criterion: 'Fiziksel araç QR kodu', cebindegaleri: 'Araç detayına ve galeri vitrinine bağlı', alternative: 'Platform bağlantısı paylaşılabilir; özel akış değişir' },
      { criterion: 'Kanal bağımsızlığı', cebindegaleri: 'Kendi public bağlantınız kullanılır', alternative: 'Platform hesabı ve yayın kurallarına bağlı' },
      { criterion: 'Yeni alıcı erişimi', cebindegaleri: 'Galerinin kendi trafik kaynaklarına bağlı', alternative: 'Platformun mevcut kullanıcı kitlesinden yararlanabilir' },
    ],
    decisionPoints: [
      'Yeni alıcı keşfi için ilan platformları değerli bir dağıtım kanalı olabilir.',
      'Fiziksel galerideki QR kodları ve kendi marka deneyiminizi yönetmek için dijital showroom kullanın.',
      'En dengeli yaklaşım, ilan kanallarını koruyup müşteriyi kendi güncel vitrin ve iletişim akışınızla da buluşturmaktır.',
    ],
    faq: [
      { question: 'Dijital showroom ilan platformunun yerine geçer mi?', answer: 'Her zaman değil. Dijital showroom kendi marka ve müşteri akışınızı yönetir; ilan platformu ise farklı bir keşif kanalı olarak kullanılabilir.' },
      { question: 'Aynı araç iki kanalda yayınlanabilir mi?', answer: 'Evet. Ancak fiyat, durum ve araç bilgilerinin kanallar arasında güncel tutulması gerekir.' },
    ],
  },
]

export function getComparisonLanding(slug: string) {
  return comparisonLandings.find((landing) => landing.slug === slug) || null
}
