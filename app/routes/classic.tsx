import type {Route} from './+types/classic';
import {enterExperience} from '~/lib/experienceEntry';

/**
 * Classic entry point. `/classic` (optionally `/classic?to=/collections/...`)
 * sets the experience cookie and 302s into the Classic wholesale experience.
 * See docs/FOCUSED_DUAL_STORE_AUDIT.md.
 */
export async function loader({request}: Route.LoaderArgs) {
  return enterExperience(request, 'classic');
}
