export type WebsiteRoute =
  | '/'
  | '/product'
  | '/solutions'
  | '/pricing'
  | '/resources'
  | '/contact'
  | '/privacy'
  | '/terms'
  | '/login'
  | '/register'
  | '/app';

export interface NavDropdownItem {
  title: string;
  description: string;
  href: string;
  icon?: string;
  badge?: string;
}
