import type {MetaFunction} from 'react-router';
import {COMPANY, CONTACT} from '~/lib/companyContent';

export const meta: MetaFunction = () => [
  {title: 'About Us | The New Greenhouse'},
  {
    name: 'description',
    content:
      'The New Greenhouse — a Kingston florist supplying fresh flowers, arrangements and florist supplies.',
  },
];

/** Concise business profile. No heritage essay, no repeated claims. */
export default function About() {
  return (
    <div className="home--general">
      <section className="ng-page">
        <p className="ng-page-eyebrow">About</p>
        <h1 className="ng-page-title">{COMPANY.name}</h1>
        <p className="ng-page-lead">
          A Kingston florist supplying fresh flowers, hand-crafted arrangements
          and professional florist supplies.
        </p>
        <dl className="ng-page-facts">
          <div>
            <dt>Address</dt>
            <dd>{CONTACT.address.full}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>{CONTACT.phones[0].display}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{CONTACT.email}</dd>
          </div>
          <div>
            <dt>Established</dt>
            <dd>{COMPANY.establishedYear}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
