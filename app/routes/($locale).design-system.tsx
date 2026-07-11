import {useState} from 'react';
import type {MetaFunction} from 'react-router';
import heroEditorial from '~/assets/greenhouse-hero-editorial-1920.jpg';
import occasionBanner from '~/assets/greenhouse-occasion-banner-1600.jpg';
import botanicalBanner from '~/assets/greenhouse-botanical-banner-1600.jpg';
import {
  Accordion,
  AccordionItem,
  Alert,
  AnnouncementBar,
  Badge,
  Banner,
  Breadcrumbs,
  Button,
  ButtonLink,
  Card,
  CardBody,
  CheckboxField,
  CollectionCard,
  Cluster,
  Container,
  CTA,
  Divider,
  EditorialBlock,
  FormField,
  Fieldset,
  Grid,
  Heading,
  Icon,
  iconNames,
  IconButton,
  ImageFrame,
  Input,
  Label,
  LuxuryLink,
  NavList,
  NavItem,
  NavLinkStyled,
  PriceBlock,
  Price,
  ProductCard,
  QuantityStepper,
  Section,
  SectionHeading,
  Select,
  Skeleton,
  Spinner,
  Stack,
  Swatch,
  SwatchGroup,
  Testimonial,
  TestimonialGrid,
  Text,
  Textarea,
  TrustGrid,
  TrustItem,
} from '~/components/ui';

export const meta: MetaFunction = () => [
  {title: 'Design System · The New Greenhouse (internal)'},
  {name: 'robots', content: 'noindex'},
];

function Demo({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <div style={{marginBottom: 'var(--ng-space-12)'}}>
      <Heading as={2} size="h3" style={{marginBottom: 'var(--ng-space-5)'}}>
        {title}
      </Heading>
      {children}
    </div>
  );
}

function QuantityDemo() {
  const [qty, setQty] = useState(1);
  return <QuantityStepper value={qty} onChange={setQty} min={1} max={99} aria-label="Quantity" />;
}

export default function DesignSystem() {
  return (
    <Section spacing="standard">
      <Container size="lg">
        <Label>Internal · component library</Label>
        <Heading as={1} size="display-l" style={{margin: 'var(--ng-space-3) 0 var(--ng-space-10)'}}>
          The New Greenhouse Design System
        </Heading>

        <Demo title="Typography">
          <Stack>
            <Heading as={2} size="display-xl">Display XL</Heading>
            <Heading as={2} size="h1">Heading H1</Heading>
            <Heading as={2} size="h2">Heading H2</Heading>
            <Heading as={2} size="h3">Heading H3</Heading>
            <Text size="large">Large body — handcrafted floral arrangements for meaningful moments.</Text>
            <Text>Body — luxury flowers, gifts, weddings, and corporate design from Kingston.</Text>
            <Text size="small" tone="secondary">Small secondary text.</Text>
            <Text size="caption" tone="muted">CAPTION / MUTED</Text>
            <div><Label>Eyebrow label</Label></div>
            <Price>JMD 18,500</Price>
          </Stack>
        </Demo>

        <Demo title="Buttons">
          <Cluster>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="text">Text</Button>
            <Button variant="primary" disabled>Disabled</Button>
          </Cluster>
          <div style={{height: 'var(--ng-space-4)'}} />
          <Cluster>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <ButtonLink to="/collections" variant="secondary">Button Link</ButtonLink>
            <IconButton aria-label="Add to cart"><Icon name="cart" /></IconButton>
          </Cluster>
        </Demo>

        <Demo title={`Icons (${iconNames.length})`}>
          <Cluster>
            {iconNames.map((n) => (
              <span key={n} title={n} style={{display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 64}}>
                <Icon name={n} label={n} size="md" />
                <Text size="caption" tone="muted" style={{fontSize: '0.6rem'}}>{n}</Text>
              </span>
            ))}
          </Cluster>
        </Demo>

        <Demo title="Badges · Divider · Link">
          <Cluster>
            <Badge>New</Badge>
            <Badge>Best seller</Badge>
            <Badge>Wholesale</Badge>
            <LuxuryLink href="#">Animated underline link →</LuxuryLink>
          </Cluster>
          <Divider />
        </Demo>

        <Demo title="Section heading">
          <SectionHeading
            eyebrow="Best sellers"
            title="Arrangements made to be remembered."
            description="A curated selection of our most-loved luxury florals."
            action={<LuxuryLink href="#">Shop all →</LuxuryLink>}
          />
        </Demo>

        <Demo title="Product & collection cards">
          <Grid cols={3}>
            <ProductCard
              href="#"
              eyebrow="The Greenhouse Edit"
              title="Ivory Orchid Gesture"
              media={<img src={heroEditorial} alt="" />}
              badge={<Badge>New</Badge>}
              price={<PriceBlock price={<Price>JMD 18,500</Price>} compareAt={<Price>JMD 22,000</Price>} discountPercent={16} />}
            />
            <ProductCard
              href="#"
              title="Blush Garden Arrangement"
              media={<img src={occasionBanner} alt="" />}
              price={<PriceBlock price={<Price>JMD 15,000</Price>} unit="/ arrangement" />}
            />
            <CollectionCard
              href="#"
              eyebrow="Ceremonies in bloom"
              title="Weddings & Events"
              description="Bespoke floral design for your day."
              media={<img src={botanicalBanner} alt="" />}
            />
          </Grid>
        </Demo>

        <Demo title="Pricing · Quantity · Swatches">
          <Cluster style={{alignItems: 'flex-start', gap: 'var(--ng-space-10)'}}>
            <Stack>
              <PriceBlock size="lg" price={<Price>JMD 21,000</Price>} compareAt={<Price>JMD 25,000</Price>} discountPercent={16} />
              <PriceBlock price={<Price>JMD 950</Price>} unit="/ stem" />
            </Stack>
            <QuantityDemo />
            <SwatchGroup label="Palette" selection="Ivory">
              <Swatch label="Ivory" color="#FAF8F4" selected available />
              <Swatch label="Blush" color="#EAD3CB" available />
              <Swatch label="Gold" color="#C8A96A" available />
              <Swatch label="Green" color="#4D6A50" available={false} />
            </SwatchGroup>
          </Cluster>
        </Demo>

        <Demo title="Forms">
          <div style={{maxWidth: 480}}>
            <Stack>
              <FormField label="Full name" hint="As it should appear on the card.">
                <Input placeholder="Jane Doe" />
              </FormField>
              <FormField label="Email" error="Please enter a valid email address.">
                <Input type="email" defaultValue="not-an-email" />
              </FormField>
              <FormField label="Occasion">
                <Select>
                  <option>Birthday</option>
                  <option>Anniversary</option>
                  <option>Sympathy</option>
                </Select>
              </FormField>
              <FormField label="Gift message">
                <Textarea rows={3} placeholder="Add a note for the recipient" />
              </FormField>
              <Fieldset legend="Delivery">
                <CheckboxField label="Same-day delivery (before 2PM)" />
                <CheckboxField label="Leave at door" />
              </Fieldset>
              <Alert tone="success" title="Saved">Your details were updated.</Alert>
              <Alert tone="error" title="Error">Something went wrong.</Alert>
            </Stack>
          </div>
        </Demo>

        <Demo title="Trust signals">
          <TrustGrid>
            <TrustItem icon={<Icon name="truck" />} label="Same-day delivery" detail="Kingston & St. Andrew" />
            <TrustItem icon={<Icon name="leaf" />} label="Handcrafted in Kingston" />
            <TrustItem icon={<Icon name="check" />} label="Secure checkout" />
            <TrustItem icon={<Icon name="heart" />} label="40+ years of care" />
          </TrustGrid>
        </Demo>

        <Demo title="Editorial block">
          <EditorialBlock
            eyebrow="Wedding atelier"
            title="Your wedding, imagined in bloom."
            media={<ImageFrame ratio="editorial"><img src={occasionBanner} alt="" /></ImageFrame>}
            actions={<Button>Book a consultation</Button>}
          >
            <Text>From ceremony arches to tablescapes, our floral team composes the atmosphere around your vows.</Text>
          </EditorialBlock>
        </Demo>

        <Demo title="Banner">
          <Banner
            height="md"
            eyebrow="The New Greenhouse"
            title="Luxury flowers for life's meaningful moments."
            description="Kingston's trusted floral house."
            media={<img src={heroEditorial} alt="" />}
            actions={<Button variant="secondary">Shop arrangements</Button>}
          />
        </Demo>

        <Demo title="Testimonials">
          <TestimonialGrid>
            <Testimonial quote="Every arrangement arrived with the polish of a luxury gift." author="Marsha L." context="Kingston" rating={5} />
            <Testimonial quote="Their wedding florals transformed the space without ever feeling overdone." author="Danielle R." context="Wedding client" rating={5} />
            <Testimonial quote="Reliable, elegant, and beautifully presented." author="Corporate client" context="Hospitality" rating={5} />
          </TestimonialGrid>
        </Demo>

        <Demo title="Accordion">
          <Accordion>
            <AccordionItem title="Flower care" defaultOpen>
              <Text>Refresh water daily, keep blooms away from direct sunlight.</Text>
            </AccordionItem>
            <AccordionItem title="Delivery estimate">
              <Text>Our team confirms timing after purchase.</Text>
            </AccordionItem>
            <AccordionItem title="Returns">
              <Text>Contact us within 24 hours of delivery.</Text>
            </AccordionItem>
          </Accordion>
        </Demo>

        <Demo title="CTA">
          <CTA
            tone="dark"
            title="Join the floral circle."
            description="Seasonal arrivals and gifting inspiration."
            actions={<Button variant="secondary">Join the list</Button>}
          />
        </Demo>

        <Demo title="Navigation">
          <Stack>
            <Breadcrumbs items={[{label: 'Home', to: '/'}, {label: 'Collections', to: '/collections'}, {label: 'Luxury Bouquets'}]} />
            <NavList>
              <NavItem><NavLinkStyled to="/collections">Shop</NavLinkStyled></NavItem>
              <NavItem><NavLinkStyled to="/collections/all">New arrivals</NavLinkStyled></NavItem>
              <NavItem><NavLinkStyled to="/search">Search</NavLinkStyled></NavItem>
            </NavList>
            <AnnouncementBar>Same-day delivery across Kingston &amp; St. Andrew before 2PM.</AnnouncementBar>
          </Stack>
        </Demo>

        <Demo title="Feedback">
          <Cluster style={{alignItems: 'center', gap: 'var(--ng-space-8)'}}>
            <Spinner />
            <div style={{width: 200}}><Skeleton ratio="product" /></div>
            <Card variant="base"><CardBody><Text>Card + CardBody</Text></CardBody></Card>
          </Cluster>
        </Demo>
      </Container>
    </Section>
  );
}
