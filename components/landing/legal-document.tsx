import { MarketingPageHero, MarketingPageLayout, MarketingPageSection } from '@/components/landing/marketing-page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type LegalSection = {
  title: string
  paragraphs?: string[]
  bullets?: string[]
}

type LegalDocumentProps = {
  badge: string
  title: string
  subtitle: string
  lastUpdated: string
  sections: LegalSection[]
  contactText: string
}

export function LegalDocument({ badge, title, subtitle, lastUpdated, sections, contactText }: LegalDocumentProps) {
  return (
    <MarketingPageLayout>
      <MarketingPageHero badge={badge} title={title} description={subtitle} />

      <MarketingPageSection className="max-w-4xl">
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Son Güncelleme:</span> {lastUpdated}
            </p>
          </CardHeader>
          <CardContent className="space-y-8">
            {sections.map((section) => (
              <section key={section.title} className="space-y-3">
                <CardTitle className="text-lg">{section.title}</CardTitle>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-relaxed text-muted-foreground">
                    {paragraph}
                  </p>
                ))}
                {section.bullets ? (
                  <ul className="space-y-2 pl-5 text-sm text-muted-foreground">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="list-disc">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}

            <div className="rounded-xl border border-border/70 bg-muted/40 p-4">
              <p className="text-sm leading-relaxed text-muted-foreground">{contactText}</p>
            </div>
          </CardContent>
        </Card>
      </MarketingPageSection>
    </MarketingPageLayout>
  )
}
