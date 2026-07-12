import {Suspense} from 'react';
import {Await, NavLink} from 'react-router';
import type {FooterQuery, HeaderQuery} from 'storefrontapi.generated';
import {
  Button,
  Container,
  cx,
  FormField,
  Grid,
  Heading,
  Icon,
  Input,
  NavLinkStyled,
  Stack,
  Text,
  TrustGrid,
  TrustItem,
} from '~/components/ui';

interface FooterProps {
  footer: Promise<FooterQuery | null>;
  header: HeaderQuery;
  publicStoreDomain: string;
}

// Static footer link data — editorial columns. Internal routes only.
const SHOP_LINKS = [
  {to: '/collections/all-flowers', label: 'All flowers'},
  {to: '/collections/all-flowers?flower=roses-in-stock', label: 'Roses - In Stock'},
  {to: '/collections/birthday', label: 'Birthday flowers'},
  {to: '/collections/sympathy-and-funeral', label: 'Sympathy'},
  {to: '/pages/wedding-events', label: 'Wedding flowers'},
  {to: '/collections/all', label: 'Shop all'},
];

const SERVICE_LINKS = [
  {to: '/pages/wedding-events', label: 'Weddings'},
  {to: '/collections/corporate-gifting', label: 'Corporate'},
  {to: '/pages/delivery-information', label: 'Same-day delivery'},
  {to: '/collections/bulk-flowers', label: 'Wholesale'},
];

const COMPANY_LINKS = [
  {to: '/pages/about-us', label: 'About'},
  {to: '/pages/contact', label: 'Contact'},
  {to: '/pages/delivery-information', label: 'Delivery'},
  {to: '/pages/faq', label: 'FAQ'},
];

// TODO: real social URLs
const SOCIAL_LINKS = [
  {name: 'instagram' as const, label: 'Instagram', href: '#'},
  {name: 'facebook' as const, label: 'Facebook', href: '#'},
  {name: 'whatsapp' as const, label: 'WhatsApp', href: '#'},
];

export function Footer({
  footer: footerPromise,
  header,
  publicStoreDomain,
}: FooterProps) {
  return (
    <Suspense>
      <Await resolve={footerPromise}>
        {(footer) => (
          <footer className="ng-shell-footer">
            <Container size="xl" className="ng-shell-footer-inner">
              <Stack className="ng-shell-footer-stack">
                {/* a. Newsletter — editorial capture band */}
                <NewsletterBand />

                {/* b. Contact strip */}
                <ContactStrip />

                {/* c. Editorial footer columns */}
                <Grid cols={4} className="ng-shell-footer-columns">
                  <BrandColumn />
                  <FooterColumn title="Shop" links={SHOP_LINKS} />
                  <FooterColumn title="Services" links={SERVICE_LINKS} />
                  <FooterColumn title="Company" links={COMPANY_LINKS} />
                </Grid>

                {/* d. Bottom bar */}
                <div className="ng-shell-footer-bottom">
                  <p className="ng-shell-footer-copyright">
                    &copy; 2026 The New Greenhouse. Kingston, Jamaica.
                  </p>
                  {footer?.menu && header.shop.primaryDomain?.url ? (
                    <FooterMenu
                      menu={footer.menu}
                      primaryDomainUrl={header.shop.primaryDomain.url}
                      publicStoreDomain={publicStoreDomain}
                    />
                  ) : null}
                </div>
              </Stack>
            </Container>
          </footer>
        )}
      </Await>
    </Suspense>
  );
}

/* -------------------------------------------------------------------------- */
/* a. Newsletter band                                                         */
/* -------------------------------------------------------------------------- */

function NewsletterBand() {
  return (
    <section
      className="ng-shell-newsletter"
      aria-labelledby="ng-shell-newsletter-heading"
    >
      <div className="ng-shell-newsletter-copy">
        <span className="ng-shell-newsletter-eyebrow">The floral circle</span>
        <Heading
          as={2}
          size="h2"
          id="ng-shell-newsletter-heading"
          className="ng-shell-newsletter-heading"
        >
          Join the floral circle.
        </Heading>
        <Text size="body" className="ng-shell-newsletter-text">
          Seasonal arrangements, private previews, and quiet notes on the art of
          flowers — delivered to your inbox.
        </Text>
      </div>
      {/* TODO: wire to email provider (M9) — placeholder action, no fake success. */}
      <form
        method="post"
        action="#newsletter"
        className="ng-shell-newsletter-form"
      >
        <FormField
          label="Email address"
          hideLabel
          htmlFor="ng-shell-newsletter-email"
          className="ng-shell-newsletter-field"
        >
          <Input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </FormField>
        <Button type="submit" variant="secondary">
          Join the list
        </Button>
      </form>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* b. Contact strip                                                           */
/* -------------------------------------------------------------------------- */

function ContactStrip() {
  return (
    <TrustGrid
      className="ng-shell-contact"
      aria-label="Contact and delivery information"
    >
      <TrustItem
        className="ng-shell-contact-item"
        icon={<Icon name="phone" size="sm" />}
        label={
          <a className="ng-shell-contact-link" href="tel:+18760000000">
            +1 (876) 000-0000
          </a>
        }
      />
      <TrustItem
        className="ng-shell-contact-item"
        icon={<Icon name="mail" size="sm" />}
        label={
          <a
            className="ng-shell-contact-link"
            href="mailto:info@thenewgreenhouseja.com"
          >
            info@thenewgreenhouseja.com
          </a>
        }
      />
      <TrustItem
        className="ng-shell-contact-item"
        icon={<Icon name="map-pin" size="sm" />}
        label="Kingston, Jamaica"
      />
      <TrustItem
        className="ng-shell-contact-item"
        icon={<Icon name="clock" size="sm" />}
        label="Same-day delivery before 2PM"
      />
    </TrustGrid>
  );
}

/* -------------------------------------------------------------------------- */
/* c. Editorial columns                                                       */
/* -------------------------------------------------------------------------- */

function BrandColumn() {
  return (
    <div className="ng-shell-footer-brand">
      <p className="ng-shell-footer-wordmark">The New Greenhouse</p>
      <Text size="small" className="ng-shell-footer-blurb">
        Luxury florals, botanical gifts, and composed moments — designed and
        delivered with quiet intention in Kingston, Jamaica.
      </Text>
      <ul className="ng-shell-footer-social" aria-label="Social media">
        {SOCIAL_LINKS.map((social) => (
          <li key={social.name}>
            {/* TODO: real social URLs */}
            <a
              className="ng-shell-footer-social-link"
              href={social.href}
              aria-label={social.label}
              rel="noopener noreferrer"
              target="_blank"
            >
              <Icon name={social.name} size="sm" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: {to: string; label: string}[];
}) {
  return (
    <div className="ng-shell-footer-col">
      <h2 className="ng-shell-footer-col-title">{title}</h2>
      <nav className="ng-shell-footer-nav" aria-label={title}>
        <ul className="ng-shell-footer-nav-list">
          {links.map((link) => (
            <li key={link.to}>
              <NavLinkStyled to={link.to} className="ng-shell-footer-link">
                {link.label}
              </NavLinkStyled>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* d. Bottom bar — Shopify policy menu                                        */
/* -------------------------------------------------------------------------- */

function FooterMenu({
  menu,
  primaryDomainUrl,
  publicStoreDomain,
}: {
  menu: FooterQuery['menu'];
  primaryDomainUrl: FooterProps['header']['shop']['primaryDomain']['url'];
  publicStoreDomain: string;
}) {
  return (
    <nav className="ng-shell-footer-legal" aria-label="Legal and policies">
      {(menu || FALLBACK_FOOTER_MENU).items.map((item) => {
        if (!item.url) return null;
        // if the url is internal, we strip the domain
        const url =
          item.url.includes('myshopify.com') ||
          item.url.includes(publicStoreDomain) ||
          item.url.includes(primaryDomainUrl)
            ? new URL(item.url).pathname
            : item.url;
        const isExternal = !url.startsWith('/');
        return isExternal ? (
          <a href={url} key={item.id} rel="noopener noreferrer" target="_blank">
            {item.title}
          </a>
        ) : (
          <NavLink
            end
            key={item.id}
            prefetch="intent"
            className={navLinkClass}
            to={url}
          >
            {item.title}
          </NavLink>
        );
      })}
    </nav>
  );
}

const FALLBACK_FOOTER_MENU = {
  id: 'gid://shopify/Menu/199655620664',
  items: [
    {
      id: 'gid://shopify/MenuItem/461633060920',
      resourceId: 'gid://shopify/ShopPolicy/23358046264',
      tags: [],
      title: 'Privacy Policy',
      type: 'SHOP_POLICY',
      url: '/policies/privacy-policy',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461633093688',
      resourceId: 'gid://shopify/ShopPolicy/23358013496',
      tags: [],
      title: 'Refund Policy',
      type: 'SHOP_POLICY',
      url: '/policies/refund-policy',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461633126456',
      resourceId: 'gid://shopify/ShopPolicy/23358111800',
      tags: [],
      title: 'Shipping Policy',
      type: 'SHOP_POLICY',
      url: '/policies/shipping-policy',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461633159224',
      resourceId: 'gid://shopify/ShopPolicy/23358079032',
      tags: [],
      title: 'Terms of Service',
      type: 'SHOP_POLICY',
      url: '/policies/terms-of-service',
      items: [],
    },
  ],
};

function navLinkClass({
  isActive,
  isPending,
}: {
  isActive: boolean;
  isPending: boolean;
}) {
  return cx(isActive && 'is-active', isPending && 'is-pending');
}
