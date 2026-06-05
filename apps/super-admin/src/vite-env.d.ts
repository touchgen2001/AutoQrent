/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPER_ADMIN_PASSWORD?: string
  readonly VITE_PLATFORM_ADMIN_PASSWORD?: string
  readonly VITE_SUPPORT_AGENT_PASSWORD?: string
  readonly VITE_FINANCE_ADMIN_PASSWORD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
