import type { Metadata } from "next"
import Link from "next/link"
import {
  Activity,
  ArrowRight,
  DatabaseBackup,
  Eye,
  FileCheck2,
  ImageUp,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react"

import { MarketingPageHero, MarketingPageLayout, MarketingPageSection } from "@/components/landing/marketing-page-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { absoluteUrl, createPageMetadata } from "@/lib/seo"

const controls = [
  {
    icon: LockKeyhole,
    title: "Korumalı panel oturumu",
    description: "Panel ve yönetim alanlarına erişim oturum doğrulamasıyla korunur; yetkisiz istekler giriş ekranına yönlendirilir.",
  },
  {
    icon: KeyRound,
    title: "Sunucu taraflı yetki sınırı",
    description: "Kritik veri erişimi ve servis anahtarları tarayıcıya açılmaz; korumalı sunucu katmanında kullanılır.",
  },
  {
    icon: ImageUp,
    title: "Güvenli görsel yükleme",
    description: "Araç fotoğrafları dosya türü, boyut, içerik ve kota kontrollerinden geçirilerek kabul edilir.",
  },
  {
    icon: FileCheck2,
    title: "İstek ve form koruması",
    description: "Formlarda kaynak kontrolü, hız sınırı, bot riski ve sahte alan kontrolleri birlikte uygulanır.",
  },
  {
    icon: Eye,
    title: "Denetim kayıtları",
    description: "Kritik araç, müşteri talebi, ayar ve yönetim işlemleri incelenebilir denetim kayıtlarına dönüştürülür.",
  },
  {
    icon: Activity,
    title: "Operasyon izleme",
    description: "API hataları, kritik operasyon olayları ve sağlık kontrolleri izlenerek sorunların görünür kalması sağlanır.",
  },
]

export const metadata: Metadata = createPageMetadata({
  title: "Güvenlik ve Altyapı",
  description:
    "Cebindegaleri güvenlik ve altyapı yaklaşımı: korumalı panel oturumu, güvenli görsel yükleme, denetim kayıtları, yedekleme ve KVKK süreçleri.",
  path: "/guvenlik",
  keywords: ["galeri yazılımı güvenliği", "kvkk uyumlu galeri yazılımı", "galeri verisi yedekleme", "güvenli araç görseli yükleme"],
})

const pageJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Cebindegaleri Güvenlik ve Altyapı",
  url: absoluteUrl("/guvenlik"),
  description: "Cebindegaleri platformunda uygulanan güvenlik, yedekleme ve operasyon izleme yaklaşımı.",
}).replace(/</g, "\\u003c")

export default function SecurityPage() {
  return (
    <MarketingPageLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: pageJsonLd }} />
      <MarketingPageHero
        badge="Güvenlik ve Altyapı"
        title="Galeri Operasyonunuz İçin Katmanlı Koruma"
        description="Cebindegaleri güvenliği tek bir özelliğe bırakmaz. Oturum, veri erişimi, dosya yükleme, istek koruması, kayıt ve operasyon izleme katmanları birlikte çalışır."
        actions={
          <>
            <Button asChild>
              <Link href="/kayit">
                14 Gün Ücretsiz Başla
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/kvkk">KVKK Metnini İncele</Link>
            </Button>
          </>
        }
      />

      <MarketingPageSection>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {controls.map((control) => (
            <Card key={control.title} className="border-border/70 bg-card/80">
              <CardContent className="py-6">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <control.icon className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-foreground">{control.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{control.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <Card className="border-border/70 bg-foreground text-background">
            <CardContent className="py-8">
              <DatabaseBackup className="h-7 w-7 text-amber-300" />
              <h2 className="mt-5 text-2xl font-semibold">Yedekleme ve geri dönüş hazırlığı</h2>
              <p className="mt-3 text-sm leading-relaxed text-background/75">
                Veritabanı ve yüklenen içerikler için yedekleme iş akışları, saklama kontrolleri ve geri yükleme doğrulama adımları bulunur.
                Yedeklerin varlığı kadar gerektiğinde kullanılabilir olması da operasyon sürecinin parçasıdır.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/80">
            <CardContent className="py-8">
              <ShieldCheck className="h-7 w-7 text-emerald-600" />
              <h2 className="mt-5 text-2xl font-semibold text-foreground">KVKK ve veri sorumluluğu</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Kişisel veriler amaçla sınırlı işlenir; ilgili kişi talepleri, saklama yaklaşımı ve başvuru kanalları yayınlanan KVKK ve gizlilik metinlerinde açıklanır.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button asChild size="sm" variant="outline">
                  <Link href="/kvkk">KVKK Aydınlatma Metni</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/gizlilik">Gizlilik Politikası</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 rounded-2xl border border-border/70 bg-muted/30 p-6 md:p-8">
          <h2 className="text-2xl font-semibold text-foreground">Güvenlik bildirimi ve destek</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Güvenlikle ilgili bir sorun veya şüpheli davranış fark ederseniz ayrıntıları paylaşmadan önce ekibimizle iletişime geçin.
            Bildirimler incelenir, kayıt altına alınır ve gerekli düzeltme süreci planlanır.
          </p>
          <Button asChild className="mt-5">
            <a href="mailto:destek@cebindegaleri.com?subject=Güvenlik%20Bildirimi">Güvenlik Bildirimi Gönder</a>
          </Button>
        </div>
      </MarketingPageSection>
    </MarketingPageLayout>
  )
}
