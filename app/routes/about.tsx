import {useRef} from 'react';
import type {MetaFunction} from 'react-router';
import {COMPANY, CONTACT} from '~/lib/companyContent';
import {cardImage} from '~/lib/catalogues';
import {focalStyle} from '~/lib/focalPoint';
import {useReveal} from '~/lib/useReveal';
import {GlasshouseDivider} from '~/components/GlasshouseDivider';
import {EditorialCrossSell} from '~/components/editorial/EditorialCrossSell';

export const meta: MetaFunction = () => [
  {title: 'About Us | The New Greenhouse'},
  {
    name: 'description',
    content:
      'The New Greenhouse — a Kingston florist supplying fresh flowers, arrangements and florist supplies.',
  },
];

const STORY_IMG = '/images/homepage/arrangements';

/**
 * About — the brand story, in the editorial page language. All copy is the
 * merchant-approved content from companyContent (name, lead, experience blurb,
 * story) and the same four business facts the page already carried. Nothing is
 * invented — no history, people or accolades that the approved content lacks.
 */
export default function About() {
  const scope = useRef<HTMLElement>(null);
  useReveal(scope);
  const media = cardImage(STORY_IMG);

  return (
    <section ref={scope} className="ng-info" aria-labelledby="ng-about-title">
      <div className="ng-info-inner">
        <div className="ng-info-head" data-reveal-heading>
          <p className="ng-info-eyebrow">About</p>
          <h1 id="ng-about-title" className="ng-info-title ng-editorial-title">
            {COMPANY.name}
          </h1>
          <p className="ng-info-lede">
            A Kingston florist supplying fresh flowers, hand-crafted arrangements
            and professional florist supplies.
          </p>
        </div>

        <GlasshouseDivider className="ng-info-seam" />

        <div className="ng-about-body">
          <div className="ng-about-story" data-reveal-item>
            <p className="ng-about-experience">{COMPANY.experienceBlurb}</p>
            <p>{COMPANY.story}</p>
          </div>
          <figure className="ng-about-media" data-reveal-item>
            <img
              src={media.src}
              srcSet={media.srcSet}
              sizes="(min-width: 60em) 38vw, 92vw"
              alt="A hand-crafted arrangement from The New Greenhouse"
              loading="lazy"
              decoding="async"
              width={800}
              height={1000}
              style={focalStyle(STORY_IMG)}
            />
          </figure>
        </div>

        <dl className="ng-about-facts" data-reveal-item>
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

        <EditorialCrossSell
          className="ng-info-cta"
          to="/arrangements"
          linkLabel={
            <>
              See the arrangements <span aria-hidden="true">→</span>
            </>
          }
        >
          <b>Ready to send flowers?</b> Explore our arrangements, or reach us
          directly on the contact page.
        </EditorialCrossSell>
      </div>
    </section>
  );
}
