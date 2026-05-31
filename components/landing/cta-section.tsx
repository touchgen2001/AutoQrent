import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function CtaSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
          Galerinizi Bugün Dijitale Taşıyın
        </h2>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          14 gün ücretsiz deneyin. Kredi kartı gerektirmez. 
          Binlerce galeri gibi siz de dijital dönüşümün parçası olun.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground h-12 px-8 text-base">
            <Link href="/kayit">
              Ücretsiz Başla
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="h-12 px-8 text-base">
            <Link href="/giris">
              Demo İncele
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
