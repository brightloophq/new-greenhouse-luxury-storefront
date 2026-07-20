import type {MetaFunction} from 'react-router';
import {CONTACT} from '~/lib/companyContent';

export const meta: MetaFunction = () => [
  {title: 'Contact Us | The New Greenhouse'},
  {name: 'description', content: 'Contact The New Greenhouse — Kingston, Jamaica.'},
];

/** Practical contact details only. */
export default function Contact() {
  return (
    <div className="home--general">
      <section className="ng-page">
        <p className="ng-page-eyebrow">Contact</p>
        <h1 className="ng-page-title">Contact us</h1>
        <dl className="ng-page-facts">
          <div>
            <dt>Visit</dt>
            <dd>{CONTACT.address.full}</dd>
          </div>
          <div>
            <dt>Call</dt>
            <dd>
              {CONTACT.phones.map((p) => (
                <a key={p.href} href={p.href} style={{marginRight: '1rem'}}>
                  {p.display}
                </a>
              ))}
            </dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>
              <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
