import type {Route} from './+types/classic.$';
import {enterExperienceDeepLink} from '~/lib/experienceEntry';

/**
 * Classic deep-link splat. `/classic/wholesale`, `/classic/supplies`,
 * `/classic/collections/<handle>` etc. set the experience cookie and 302 to the
 * canonical store path. See docs/FOCUSED_DUAL_STORE_AUDIT.md.
 */
export async function loader({request, params}: Route.LoaderArgs) {
  return enterExperienceDeepLink(request, 'classic', params['*']);
}
