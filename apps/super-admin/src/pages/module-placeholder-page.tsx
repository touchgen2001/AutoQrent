import { Construction, LockKeyhole } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Permission } from '@/lib/rbac'

type ModulePlaceholderPageProps = {
  moduleName: string
  requiredPermission: Permission
}

export function ModulePlaceholderPage({ moduleName, requiredPermission }: ModulePlaceholderPageProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
      <Card className="min-h-[420px] justify-center border-dashed">
        <CardHeader className="items-center text-center">
          <div className="flex size-16 items-center justify-center rounded-3xl bg-muted text-muted-foreground">
            <Construction />
          </div>
          <CardTitle className="text-3xl font-black tracking-tight">{moduleName}</CardTitle>
          <CardDescription className="max-w-lg">
            İş modülü Faz 1 aşamasında bilinçli olarak oluşturulmadı. Sayfa yolu, yerleşim ve izin koruması hazır.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Badge variant="secondary" className="rounded-full px-3 py-1.5">
            Modül henüz aktif değil
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LockKeyhole />
            Koruma Durumu
          </CardTitle>
          <CardDescription>Bu sayfa modül eklenmeden önce rol yetkisiyle korunur.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>Gerekli izin: {requiredPermission}</p>
          <p>Oturumsuz kullanıcılar oturum ekranına yönlendirilir.</p>
          <p>İzni olmayan oturumlu kullanıcılar yetki reddi ekranını görür.</p>
          <p>Sahte operasyon tablosu, toplam veya müşteri verisi gösterilmez.</p>
        </CardContent>
      </Card>
    </div>
  )
}
