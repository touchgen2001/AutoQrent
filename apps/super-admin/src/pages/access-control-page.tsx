import { Check, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { adminRoles, hasPermission, roleDescriptions, roleLabels, rolePermissions, type Permission } from '@/lib/rbac'

const permissions = Array.from(new Set(Object.values(rolePermissions).flat()))

function PermissionCell({ role, permission }: { role: (typeof adminRoles)[number]; permission: Permission }) {
  const allowed = hasPermission(role, permission)

  return (
    <td className="border-b border-border/70 px-3 py-3 text-center">
      {allowed ? (
        <span className="mx-auto flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check />
        </span>
      ) : (
        <span className="mx-auto flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <X />
        </span>
      )}
    </td>
  )
}

export function AccessControlPage() {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Rol İzin Matrisi</CardTitle>
          <CardDescription>
            Yönetim ekranı açık izin anahtarları kullanır. Düzenleme ve kalıcı kayıt Faz 1 aşamasında bilinçli olarak kapalıdır.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[900px] border-collapse bg-card text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60">
                  <th className="sticky left-0 bg-muted/60 px-4 py-3 text-left font-bold">İzin</th>
                  {adminRoles.map((role) => (
                    <th key={role} className="px-3 py-3 text-center font-bold">
                      {roleLabels[role]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissions.map((permission) => (
                  <tr key={permission}>
                    <td className="sticky left-0 border-b border-border/70 bg-card px-4 py-3 font-semibold">
                      {permission}
                    </td>
                    {adminRoles.map((role) => (
                      <PermissionCell key={`${role}-${permission}`} role={role} permission={permission} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {adminRoles.map((role) => (
          <Card key={role}>
            <CardHeader>
              <CardTitle className="text-lg">{roleLabels[role]}</CardTitle>
              <CardDescription>{roleDescriptions[role]}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {rolePermissions[role].map((permission) => (
                  <Badge key={permission} variant="outline">
                    {permission}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  )
}
