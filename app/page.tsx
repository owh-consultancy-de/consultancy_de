import { GAEBConverter } from '@/components/gaeb-converter'

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">GAEB to OpusFlow</h1>
            <p className="text-sm text-muted-foreground">Convert GAEB files to OpusFlow CSV format</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-5xl px-4 py-8">
        <GAEBConverter />
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t py-6">
        <div className="mx-auto max-w-5xl px-4 text-center text-sm text-muted-foreground">
          <p>
            Supports GAEB DA XML, GAEB 90/2000, X83, D83, and Excel formats. Maximum file size: 50MB.
          </p>
        </div>
      </footer>
    </main>
  )
}
