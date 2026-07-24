import {useEffect, useId, useRef, useState} from 'react';
import {
  data,
  redirect,
  useActionData,
  useNavigation,
  useSearchParams,
  Form,
  type MetaFunction,
} from 'react-router';
import type {Route} from './+types/preview';
import {CONTACT, COMPANY} from '~/lib/companyContent';
import {
  buildPreviewCookie,
  isPreviewMode,
  passwordMatches,
  readPreviewEnv,
  safePreviewNext,
} from '~/lib/previewGate';
import previewStyles from '~/styles/preview.css?url';

export const links: Route.LinksFunction = () => [
  {rel: 'stylesheet', href: previewStyles},
];

// The gate page is never indexed, whether or not preview mode is currently on.
export const meta: MetaFunction = () => [
  {title: 'The New Greenhouse — Coming Soon'},
  {name: 'robots', content: 'noindex, nofollow'},
];

export const headers: Route.HeadersFunction = () => ({
  'X-Robots-Tag': 'noindex, nofollow',
});

export async function loader({context}: Route.LoaderArgs) {
  // Expose only whether the gate is live — never the password.
  return {previewMode: isPreviewMode(context.env)};
}

export async function action({request, context}: Route.ActionArgs) {
  const form = await request.formData();
  const password = String(form.get('password') ?? '');
  const next = safePreviewNext(String(form.get('next') ?? '/'));

  const {PREVIEW_PASSWORD} = readPreviewEnv(context.env);
  if (!passwordMatches(password, PREVIEW_PASSWORD)) {
    return data(
      {error: 'That password wasn’t recognised. Please try again.'},
      {status: 401},
    );
  }

  return redirect(next, {headers: {'Set-Cookie': buildPreviewCookie()}});
}

export default function Preview() {
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') ?? '/';

  const [modalOpen, setModalOpen] = useState(false);
  const [notified, setNotified] = useState(false);

  // Open the modal automatically if a submit came back with an error.
  useEffect(() => {
    if (actionData?.error) setModalOpen(true);
  }, [actionData]);

  return (
    <main className="ng-preview">
      <div className="ng-preview-bg" aria-hidden="true" />
      <div className="ng-preview-veil" aria-hidden="true" />

      <div className="ng-preview-inner">
        <header className="ng-preview-top" data-preview-reveal>
          <p className="ng-preview-wordmark">{COMPANY.name}</p>
        </header>

        <section className="ng-preview-hero">
          <p className="ng-preview-eyebrow" data-preview-reveal>
            Private preview
          </p>
          <h1 className="ng-preview-title" data-preview-reveal>
            The New Greenhouse
          </h1>
          <p className="ng-preview-lede" data-preview-reveal>
            Our new online experience is blooming.
          </p>
          <p className="ng-preview-body" data-preview-reveal>
            We&apos;re putting the finishing touches on a completely new way to
            shop flowers in Jamaica. From premium bouquets to wholesale flowers
            and floral supplies, something beautiful is almost ready.
          </p>

          <p className="ng-preview-launch" data-preview-reveal>
            <span className="ng-preview-launch-label">Expected launch</span>
            <span className="ng-preview-launch-value">Coming soon</span>
          </p>

          <div className="ng-preview-actions" data-preview-reveal>
            <button
              type="button"
              className="ng-preview-btn ng-preview-btn--primary"
              onClick={() => setModalOpen(true)}
            >
              Enter private preview
            </button>

            {notified ? (
              <p className="ng-preview-notified" role="status">
                Thank you — we&apos;ll let you know the moment we open.
              </p>
            ) : (
              <form
                className="ng-preview-notify"
                onSubmit={(event) => {
                  event.preventDefault();
                  setNotified(true);
                }}
              >
                <label className="ng-visually-hidden" htmlFor="ng-preview-email">
                  Email address
                </label>
                <input
                  id="ng-preview-email"
                  className="ng-preview-notify-input"
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder="Email address"
                />
                <button
                  type="submit"
                  className="ng-preview-btn ng-preview-btn--ghost"
                >
                  Notify me
                </button>
              </form>
            )}
          </div>
        </section>

        <footer className="ng-preview-foot" data-preview-reveal>
          <nav className="ng-preview-social" aria-label="Social">
            <a href={CONTACT.social.instagram} target="_blank" rel="noreferrer">
              Instagram
            </a>
            <a href={CONTACT.social.facebook} target="_blank" rel="noreferrer">
              Facebook
            </a>
            <a href={CONTACT.whatsapp.href} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          </nav>
          <p className="ng-preview-copy">
            © {COMPANY.name}
          </p>
        </footer>
      </div>

      {modalOpen ? (
        <PreviewModal
          next={next}
          error={actionData?.error}
          onClose={() => setModalOpen(false)}
        />
      ) : null}
    </main>
  );
}

function PreviewModal({
  next,
  error,
  onClose,
}: {
  next: string;
  error?: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigation = useNavigation();
  const submitting = navigation.state !== 'idle';

  // Focus the field on open; trap focus + Escape to close while open.
  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="ng-preview-modal" role="presentation">
      <button
        type="button"
        className="ng-preview-scrim"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="ng-preview-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={panelRef}
      >
        <h2 id={titleId} className="ng-preview-panel-title">
          Private preview
        </h2>
        <p className="ng-preview-panel-text">
          This website is currently in private preview. If you&apos;ve been
          invited, enter your preview password below.
        </p>

        <Form method="post" className="ng-preview-form" replace>
          <input type="hidden" name="next" value={next} />
          <label className="ng-visually-hidden" htmlFor="ng-preview-password">
            Preview password
          </label>
          <input
            id="ng-preview-password"
            ref={inputRef}
            className="ng-preview-input"
            type="password"
            name="password"
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'ng-preview-error' : undefined}
            placeholder="Preview password"
            required
          />

          {error ? (
            <p id="ng-preview-error" className="ng-preview-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="ng-preview-panel-actions">
            <button
              type="submit"
              className="ng-preview-btn ng-preview-btn--primary"
              disabled={submitting}
            >
              {submitting ? 'Checking…' : 'Continue'}
            </button>
            <button
              type="button"
              className="ng-preview-btn ng-preview-btn--text"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}
