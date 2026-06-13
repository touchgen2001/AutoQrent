import { Car, Users, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function EmptyVehicles() {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
        <Car className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">Henüz Araç Yok</h3>
      <p className="text-muted-foreground mb-4">İlk aracınızı ekleyerek başlayın.</p>
      <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
        <Link href="/panel/araclar/ekle">Araç Ekle</Link>
      </Button>
    </div>
  )
}

export function EmptyLeads() {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
        <Users className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">Henüz Müşteri Talebi Yok</h3>
      <p className="text-muted-foreground">Müşteriler araçlarınızla ilgilenmeye başladığında burada görünecek.</p>
    </div>
  )
}

export function EmptySearch() {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
        <Car className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">Sonuç Bulunamadı</h3>
      <p className="text-muted-foreground">Arama kriterlerinize uygun araç bulunamadı.</p>
    </div>
  )
}

export function EmptyQRCodes() {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
        <QrCode className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">QR Kod Bulunamadı</h3>
      <p className="text-muted-foreground mb-4">Araç ekleyerek otomatik QR kodları oluşturun.</p>
      <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
        <Link href="/panel/araclar/ekle">Araç Ekle</Link>
      </Button>
    </div>
  )
}
