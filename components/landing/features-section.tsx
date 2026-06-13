import {
  BarChart3,
  CheckCircle2,
  LockKeyhole,
  MessageCircle,
  QrCode,
  Settings2,
  Smartphone,
  SquareStack,
} from "lucide-react"

const modules = [
  {
    icon: QrCode,
    title: "QR Kod Yönetimi",
    summary: "Her araç için dijital vitrine yönlenen QR kimliği üretilir ve panelden yönetilir.",
    benefit: "Araç başındaki ilgiyi doğrudan ölçülebilir müşteri temasına dönüştürür.",
    workflow: "Araç eklenir -> QR kod üretilir -> Etiket yazdırılır -> Tarama panelde izlenir.",
  },
  {
    icon: Smartphone,
    title: "Mobil Araç Vitrini",
    summary: "Araç detayları mobil uyumlu sayfada, hızlı açılan ve aksiyon odaklı sunulur.",
    benefit: "Müşteri beklemeden iletişime geçer, araç bilgisi kaybolmadan aktarılır.",
    workflow: "Müşteri QR okutur -> Araç sayfasını görür -> Arama/WhatsApp aksiyonu başlatır.",
  },
  {
    icon: MessageCircle,
    title: "Müşteri Talebi Yönetimi",
    summary: "Telefon, WhatsApp ve form üzerinden gelen müşteri talepleri tek yerde toplanır.",
    benefit: "Tekrar arama ve takip kaybı azalır; tüm süreç aynı müşteri kaydı üzerinden ilerler.",
    workflow: "Talep gelir -> Durum seçilir -> Not ve takip tarihi eklenir -> Satış adımı güncellenir.",
  },
  {
    icon: BarChart3,
    title: "Operasyon Analitiği",
    summary: "Araç ilgisi, müşteri talepleri ve iletişim kanallarının performansı panelde izlenir.",
    benefit: "Hangi aracın ve hangi kanalın daha etkili olduğu net şekilde görülür.",
    workflow: "Tarama ve talep verisi toplanır -> Panel grafikleri güncellenir -> Sonraki adım belirlenir.",
  },
  {
    icon: Settings2,
    title: "Galeri Ayarları",
    summary: "Galeri profili, iletişim bilgileri, çalışma saatleri ve dijital kanallar yönetilir.",
    benefit: "Müşteriye her temas noktasında tutarlı marka bilgisi sunulur.",
    workflow: "Profil bilgisi girilir -> Değişiklik kaydedilir -> Vitrin sayfalarına yansıtılır.",
  },
  {
    icon: SquareStack,
    title: "Toplu QR Yazdırma",
    summary: "Araç listesi için toplu etiket çıktısı alınır ve format bazlı yazdırma yapılır.",
    benefit: "Saha hazırlık süresi kısalır, vitrin düzeni standart hale gelir.",
    workflow: "Araçlar seçilir -> Şablon seçilir -> Yazdırma çıktısı alınır.",
  },
  {
    icon: LockKeyhole,
    title: "Güvenlik ve Kayıt",
    summary: "Panel erişimi, olay kayıtları ve temel güvenlik kontrolleri birlikte yönetilir.",
    benefit: "Operasyon değişiklikleri izlenebilir olur, hesap güvenliği güçlenir.",
    workflow: "Kullanıcı oturum açar -> İşlem kaydı oluşur -> Yönetici denetimi yapılır.",
  },
]

export function FeaturesSection() {
  return (
    <section id="ozellikler" className="py-20 md:py-28 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Ürün modülleri ve galeriye etkisi</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Her modül yalnızca bir özellik listesi değil; doğrudan günlük operasyonu kolaylaştıran ve müşteri akışını hızlandıran bir çalışma düzeni sunar.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {modules.map((module) => (
            <article key={module.title} className="rounded-xl border border-border/70 bg-card p-6">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <module.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{module.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{module.summary}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">Galeriye faydası:</span> {module.benefit}
              </p>
              <div className="mt-3 rounded-lg border border-border/60 bg-muted/35 px-3 py-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Kısa iş akışı:</span> {module.workflow}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-border/70 bg-card p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              İçerikler, sahte başarı oranları yerine ürünün gerçek işleyişine odaklanır. Demo görüşmesinde mevcut sürecinizle eşleştirilecek operasyon modelini birlikte netleştirirsiniz.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
