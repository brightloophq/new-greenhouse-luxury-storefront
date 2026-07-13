import type {Route} from './+types/deluxe';
import {enterExperience} from '~/lib/experienceEntry';

/**
 * Deluxe entry point. `/deluxe` (optionally `/deluxe?to=/collections/...`) sets
 * the experience cookie and 302s into the Deluxe luxury-gifting experience.
 * See docs/FOCUSED_DUAL_STORE_AUDIT.md.
 */
export async function loader({request}: Route.LoaderArgs) {
  return enterExperience(request, 'deluxe');
}
