/**
 * SINGLE SOURCE OF TRUTH for company, contact and delivery facts.
 *
 * Every component that shows an address, phone, email, delivery cutoff, delivery
 * area or fee band must import from here rather than hard-coding a string — this
 * is what keeps the "before 12 PM" cutoff, the two phone numbers, the Kingston 5
 * address and the J$ fee bands consistent across Classic, Deluxe, Wholesale,
 * the footer, product pages, the cart and the delivery page.
 *
 * All values below are merchant-approved. Do NOT invent fees, times, guarantees,
 * neighbourhood boundaries or services. Flagged gaps are marked TODO(merchant).
 */

/* -------------------------------------------------------------------------- */
/* Company                                                                    */
/* -------------------------------------------------------------------------- */
export const COMPANY = {
  name: 'The New Greenhouse',
  establishedYear: 1984,
  /** Approved heritage phrasing — decades of floral experience, no superlatives. */
  experienceBlurb: 'More than four decades of floral experience in Kingston, Jamaica.',
  /** Factual company story shared by Classic + Deluxe (styling differs, facts don't). */
  story:
    'The New Greenhouse is a family florist in Kingston, Jamaica, with more than four decades of floral experience. We arrange fresh flowers for everyday moments and life’s milestones, and supply florists and businesses through our wholesale trade — with the same care and local knowledge on every order.',
} as const;

/* -------------------------------------------------------------------------- */
/* Contact                                                                    */
/* -------------------------------------------------------------------------- */
export const CONTACT = {
  address: {
    line1: '10 Easton Avenue',
    line2: 'Kingston 5, Jamaica',
    full: '10 Easton Avenue, Kingston 5, Jamaica',
  },
  /** Primary first. Display + tel-href pairs. */
  phones: [
    {display: '(876) 843-8964', href: 'tel:+18768438964'},
    {display: '(876) 978-2288', href: 'tel:+18769782288'},
  ],
  email: 'info@thenewgreenhouseja.com',
  /** WhatsApp uses the primary line. */
  whatsapp: {number: '18768438964', href: 'https://wa.me/18768438964'},
  social: {
    instagram: 'https://www.instagram.com/newgreenhouse',
    facebook: 'https://www.facebook.com/TheNewGreenhouse/',
  },
} as const;

/* -------------------------------------------------------------------------- */
/* Delivery — approved policy                                                 */
/* -------------------------------------------------------------------------- */

/** Same-day cutoff, expressed once. Change here → changes everywhere. */
export const DELIVERY_CUTOFF = '12:00 PM';
/** Short form for tight spaces (announcement bar, footer strip). */
export const DELIVERY_CUTOFF_SHORT = '12 PM';

/** J$ delivery fee bands shown on the price map (guide only; no boundaries implied). */
export const DELIVERY_FEE_BANDS_JMD = [800, 900, 1000, 1500, 2500, 3500] as const;

/** Format a JMD amount as "J$1,000" (never US dollars). */
export function formatJMD(amount: number): string {
  return `J$${amount.toLocaleString('en-US')}`;
}

export const DELIVERY = {
  intro:
    'We want your flowers to arrive fresh, on time, and exactly as expected. This policy explains where we deliver, how quickly, and what to expect on delivery day.',

  areas: {
    heading: 'Delivery areas',
    points: [
      'Regular delivery across Kingston and St. Andrew.',
      'Island-wide delivery is available — contact us to confirm, as timing and logistics vary.',
    ],
  },

  times: {
    heading: 'Delivery times',
    points: [
      `Same-day delivery within Kingston for orders placed before ${DELIVERY_CUTOFF}, Monday through Saturday.`,
      `Orders placed after ${DELIVERY_CUTOFF} are scheduled for the next available delivery day.`,
      'Sunday delivery is available by prior appointment only.',
    ],
  },

  fees: {
    heading: 'Delivery fees',
    note: 'Delivery fees depend on your delivery location. The applicable fee is confirmed during ordering or before your order is finalised. Island-wide delivery requires direct confirmation. Wholesale and trade accounts may follow agreed delivery schedules.',
    bandsLabel: 'Current delivery fee bands',
    // TODO(merchant): supply the legible, licensed delivery price-map image to
    // drop into the reserved slot on the delivery page. Until then the fee-band
    // list below is the primary way pricing is communicated.
    mapAsset: null as string | null,
    mapAlt:
      'The New Greenhouse delivery fee map for Kingston & St. Andrew, showing fee bands from J$800 to J$3,500 by area.',
  },

  recipient: {
    heading: 'If the recipient is unavailable',
    intro:
      'We make every reasonable effort to deliver directly to the recipient. If they are unavailable, delivery may be left with a neighbour, a front desk or reception, or another safe location at the driver’s discretion. Alternatively, redelivery may be arranged and additional fees may apply.',
    askFor: [
      'Correct delivery address',
      'A working phone number',
      'Apartment or office details',
      'Gate code and access instructions',
      'Recipient information',
    ],
  },

  delays: {
    heading: 'Delivery delays',
    text: 'Weather, traffic and high seasonal demand — for example around Valentine’s Day and Mother’s Day — may affect delivery times. We keep you informed and do our best to deliver as scheduled.',
  },

  confirmation: {
    heading: 'Order confirmation',
    points: [
      'You’ll receive an order confirmation after placing your order.',
      'Delivery confirmation can be requested.',
      'We may use phone or WhatsApp for delivery-day questions — WhatsApp is our preferred fast-contact channel.',
    ],
  },
} as const;
