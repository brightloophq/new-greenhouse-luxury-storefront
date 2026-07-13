import type {Route} from './+types/deluxe.$';
import {enterExperienceDeepLink} from '~/lib/experienceEntry';

/**
 * Deluxe deep-link splat. `/deluxe/signature`, `/deluxe/gifts`,
 * `/deluxe/collections/<handle>` etc. set the experience cookie and 302 to the
 * canonical store path. See docs/FOCUSED_DUAL_STORE_AUDIT.md.
 */
export async function loader({request, params}: Route.LoaderArgs) {
  return enterExperienceDeepLink(request, 'deluxe', params['*']);
}
