import Link from 'next/link';
import { InternalLink } from '@/components/InternalLink';
import { absoluteUrl } from '@/lib/site';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  // Generar JSON-LD Schema.org BreadcrumbList
  const breadcrumbListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Inicio',
        item: absoluteUrl('/')
      },
      ...items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 2,
        name: item.name,
        item: item.url.startsWith('http') ? item.url : absoluteUrl(item.url)
      }))
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbListJsonLd) }}
      />
      <nav aria-label="Migas de pan" className="flex items-center text-xs text-[var(--text-muted)] py-3 overflow-x-auto whitespace-nowrap">
        <Link href="/" className="flex items-center gap-1 hover:text-accent transition-colors">
          <Home className="h-3.5 w-3.5" />
          <span>Inicio</span>
        </Link>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <div key={item.url} className="flex items-center">
              <ChevronRight className="h-3 w-3 mx-1.5 text-[var(--text-muted)] opacity-60" />
              {isLast ? (
                <span className="font-semibold text-[var(--text-primary)] truncate max-w-xs sm:max-w-md">
                  {item.name}
                </span>
              ) : (
                <InternalLink href={item.url} className="hover:text-accent transition-colors">
                  {item.name}
                </InternalLink>
              )}
            </div>
          );
        })}
      </nav>
    </>
  );
}
