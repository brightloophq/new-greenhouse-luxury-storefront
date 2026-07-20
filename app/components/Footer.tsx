import {Suspense} from 'react';
import {Await, NavLink} from 'react-router';
import type {FooterQuery, HeaderQuery} from 'storefrontapi.generated';
import {
  Container,
  cx,
  Grid,
  Icon,
  NavLinkStyled,
  Stack,
  Text,
  TrustGrid,
  TrustItem,
} from '~/components/ui';
import {navFor} from '~/lib/navigation';
import {useExperience} from '~/components/ExperienceProvider';
import {CONTACT, DELIVERY_CUTOFF_SHORT} from '~/lib/companyContent';

interface FooterProps {
  footer: Promise<FooterQuery | null>;
  header: HeaderQuery;
  publicStoreDomain: string;
}

const COMPANY_LINKS = [
  {to: '/about', label: 'About Us'},
  {to: '/contact', label: 'Contact Us'},
  {to: '/reviews', label: 'Reviews'},
];

const SOCIAL_LINKS = [
  {
    name: 'instagram' as const,
    label: 'Instagram',
    href: 'https://www.instagram.com/newgreenhouse',
  },
  {
    name: 'facebook' as const,
    label: 'Facebook',
    href: 'https://www.facebook.com/TheNewGreenhouse/',
  },
  {
    name: 'whatsapp' as const,
    label: 'WhatsApp',
    href: 'https://wa.me/18768438964',
  },
];

export function Footer({
  footer: footerPromise,
  header,
  publicStoreDomain,
}: FooterProps) {
  const {experience} = useExperience();
  const nav = navFor(experience);
  return (
    <Suspense>
      <Await resolve={footerPromise}>
        {(footer) => (
          <footer className="ng-shell-footer">
            <Container size="xl" className="ng-shell-footer-inner">
              <Stack className="ng-shell-footer-stack">
                {/* a. Contact strip */}
                <ContactStrip />

                {/* c. Editorial footer columns */}
                {/* Shop + Company only. "Services" listed the same three links
                    as Company (About/Contact/Reviews) — one duplicated column
                    on every page. A minimal footer says each thing once. */}
                <Grid cols={3} className="ng-shell-footer-columns">
                  <BrandColumn />
                  <FooterColumn title="Shop" links={nav.footerShop} />
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
          <span className="ng-shell-contact-phones">
            {CONTACT.phones.map((phone) => (
              <a key={phone.href} className="ng-shell-contact-link" href={phone.href}>
                {phone.display}
              </a>
            ))}
          </span>
        }
      />
      <TrustItem
        className="ng-shell-contact-item"
        icon={<Icon name="mail" size="sm" />}
        label={
          <a
            className="ng-shell-contact-link"
            href={`mailto:${CONTACT.email}`}
          >
            {CONTACT.email}
          </a>
        }
      />
      <TrustItem
        className="ng-shell-contact-item"
        icon={<Icon name="map-pin" size="sm" />}
        label={CONTACT.address.full}
      />
      <TrustItem
        className="ng-shell-contact-item"
        icon={<Icon name="clock" size="sm" />}
        label={`Same-day delivery before ${DELIVERY_CUTOFF_SHORT}`}
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
        Fresh flowers, arrangements and florist supplies — Kingston, Jamaica.
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
  // Hide any Shopify-managed footer link to wedding/event pages — the business
  // does not currently offer those services (see About corrections / removed
  // wedding-events route). Flag the CMS menu item for deletion (final report).
  const HIDDEN_FOOTER_LINK = /wedding|event florist|ceremony|reception styling/i;
  return (
    <nav className="ng-shell-footer-legal" aria-label="Legal and policies">
      {(menu || FALLBACK_FOOTER_MENU).items
        .filter(
          (item) =>
            !HIDDEN_FOOTER_LINK.test(item.title ?? '') &&
            !/wedding-events|weddings|corporate-flowers/i.test(item.url ?? ''),
        )
        .map((item) => {
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
