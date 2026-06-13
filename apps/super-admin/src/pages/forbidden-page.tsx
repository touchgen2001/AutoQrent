import { ShieldX } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth'
import { roleLabels, type Permission } from '@/lib/rbac'

type ForbiddenPageProps = {
  requiredPermission: Permission
  onNavigate: (path: string) => void
}

export function ForbiddenPage({ requiredPermission, onNavigate }: ForbiddenPageProps) {
  const { session } = useAuth()

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-xl text-center">
        <CardHeader>
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive text-destructive-foreground">
            <ShieldX />
          </div>
          <CardTitle className="text-3xl font-black tracking-tight">Yetki Reddedildi</CardTitle>
          <CardDescription>Bu rolün istenen sayfayı açma yetkisi yok.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div className="flex flex-wrap justify-center gap-2">
            <Badge variant="outline">Mevcut rol: {session ? roleLabels[session.user.role] : 'Oturum yok'}</Badge>
            <Badge variant="secondary">Gerekli izin: {requiredPermission}</Badge>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <Button className="flex-1" onClick={() => onNavigate('/dashboard')}>
              Genel bakışa dön
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => onNavigate('/login')}>
              Oturumu değiştir
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
