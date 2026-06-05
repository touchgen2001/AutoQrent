import { LayoutDashboard, LockKeyhole } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type UnauthorizedPageProps = {
  onNavigate: (path: string) => void
}

export function UnauthorizedPage({ onNavigate }: UnauthorizedPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <LockKeyhole />
          </div>
          <CardTitle className="text-3xl font-black tracking-tight">Oturum Gerekli</CardTitle>
          <CardDescription>Süper Admin paneli için aktif admin oturumu gerekir.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button onClick={() => onNavigate('/login')}>Giriş ekranına git</Button>
          <Button variant="outline" onClick={() => onNavigate('/dashboard')}>
            <LayoutDashboard />
            Genel bakışı tekrar dene
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
