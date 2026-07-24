import {CONTACT, DELIVERY_CUTOFF} from '~/lib/companyContent';

/**
 * NOT CURRENTLY RENDERED. Wired into the homepage, then unwired: the band
 * landed at top:677 — inside the hero/bays region — instead of after the
 * gallery. `.home--general` places it wrongly and the cause was not found.
 * The component and its CSS are correct in isolation; only the placement is
 * unresolved. Re-wire once that is understood.
 *
 * Service band — the three facts a flower buyer checks before ordering:
 * can it arrive today, where do you deliver, and how do I reach a human.
 *
 * Deliberately three short facts on one hairline rule, not a benefits section.
 * Florists live or die on same-day cutoff, so it earns its place; it does NOT
 * earn icons, cards, headings or a paragraph each.
 *
 * All values come from `companyContent`, so the cutoff is stated once in the
 * codebase and cannot drift between here, /contact and the footer.
 */
const FACTS = [
  {label: 'Same-day', value: `Order before ${DELIVERY_CUTOFF}`},
  {label: 'Delivery', value: 'Kingston & St. Andrew, island-wide by arrangement'},
  {label: 'Speak to us', value: CONTACT.phones[0].display, href: CONTACT.phones[0].href},
];

export function ServiceBand() {
  return (
    <aside className="ng-band" aria-label="Delivery and contact">
      <dl className="ng-band-list">
        {FACTS.map((fact) => (
          <div className="ng-band-item" key={fact.label}>
            <dt className="ng-band-label">{fact.label}</dt>
            <dd className="ng-band-value">
              {fact.href ? (
                <a className="ng-band-link" href={fact.href}>
                  {fact.value}
                </a>
              ) : (
                fact.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
