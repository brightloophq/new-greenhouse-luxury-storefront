import {redirect} from 'react-router';
import type {Route} from './+types/collections.all';
import {getExperienceFromRequest} from '~/lib/experience';

/**
 * `/collections/all` was a generic all-products catalog that mixed every
 * experience (retail + wholesale + supplies + plants) — cross-experience
 * leakage (Phase 2/6). It is now an experience-aware redirect: no generic
 * all-products listing exists in either storefront.
 *   Classic → Wholesale Flowers hub
 *   Deluxe  → the occasion-first collections index
 */
export async function loader({request}: Route.LoaderArgs) {
  const experience = getExperienceFromRequest(request);
  throw redirect(experience === 'deluxe' ? '/collections' : '/classic/wholesale');
}

export default function CollectionsAll() {
  return null;
}
