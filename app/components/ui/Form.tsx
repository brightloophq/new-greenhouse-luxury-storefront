import React, {cloneElement, forwardRef, useId} from 'react';
import {cx} from './utils';

/**
 * Convert a convenience `invalid` boolean into the `aria-invalid` attribute,
 * while still honouring an explicitly-passed `aria-invalid`.
 */
function ariaInvalid(
  invalid: boolean | undefined,
  explicit: React.AriaAttributes['aria-invalid'],
): React.AriaAttributes['aria-invalid'] {
  if (explicit !== undefined) return explicit;
  return invalid ? true : undefined;
}

/* -------------------------------------------------------------------------- */
/* Controls                                                                   */
/* -------------------------------------------------------------------------- */

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({className, invalid, 'aria-invalid': aria, type = 'text', ...props}, ref) {
    return (
      <input
        ref={ref}
        className={cx('ng-input', className)}
        type={type}
        aria-invalid={ariaInvalid(invalid, aria)}
        {...props}
      />
    );
  },
);

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({className, invalid, 'aria-invalid': aria, ...props}, ref) {
    return (
      <textarea
        ref={ref}
        className={cx('ng-textarea', className)}
        aria-invalid={ariaInvalid(invalid, aria)}
        {...props}
      />
    );
  },
);

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({className, invalid, 'aria-invalid': aria, children, ...props}, ref) {
    return (
      <select
        ref={ref}
        className={cx('ng-select', className)}
        aria-invalid={ariaInvalid(invalid, aria)}
        {...props}
      >
        {children}
      </select>
    );
  },
);

export type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  invalid?: boolean;
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({className, invalid, 'aria-invalid': aria, ...props}, ref) {
    return (
      <input
        ref={ref}
        type="checkbox"
        className={cx('ng-checkbox', className)}
        aria-invalid={ariaInvalid(invalid, aria)}
        {...props}
      />
    );
  },
);

export type RadioProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  invalid?: boolean;
};

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  // `invalid` is destructured (not spread to the DOM); ARIA validity for a set of
  // radios belongs on the surrounding radiogroup/fieldset, not the individual input.
  function Radio({className, invalid: _invalid, ...props}, ref) {
    return <input ref={ref} type="radio" className={cx('ng-radio', className)} {...props} />;
  },
);

/* -------------------------------------------------------------------------- */
/* Inline checkbox / radio with adjacent label                               */
/* -------------------------------------------------------------------------- */

export type CheckboxFieldProps = CheckboxProps & {
  /** Visible label rendered alongside the control. */
  label: React.ReactNode;
  /** Optional class for the wrapping <label>. */
  labelClassName?: string;
  /** Render as a radio input instead of a checkbox. */
  as?: 'checkbox' | 'radio';
};

export const CheckboxField = forwardRef<HTMLInputElement, CheckboxFieldProps>(
  function CheckboxField(
    {className, labelClassName, label, as = 'checkbox', id, ...props},
    ref,
  ) {
    const generatedId = useId();
    const controlId = id ?? generatedId;
    const controlClass = as === 'radio' ? 'ng-radio' : 'ng-checkbox';
    return (
      <label htmlFor={controlId} className={cx('ng-checkbox-field', labelClassName)}>
        <input
          ref={ref}
          id={controlId}
          type={as}
          className={cx(controlClass, className)}
          {...props}
        />
        <span className="ng-checkbox-field-label">{label}</span>
      </label>
    );
  },
);

/* -------------------------------------------------------------------------- */
/* FormField — label + control + hint + error molecule                       */
/* -------------------------------------------------------------------------- */

type FieldRenderProps = {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  required?: boolean;
};

export type FormFieldProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> & {
  /** Visible field label. */
  label: React.ReactNode;
  /** The control. A single element (auto-wired) or a render function. */
  children: React.ReactElement | ((field: FieldRenderProps) => React.ReactNode);
  /** Helper text describing the field. */
  hint?: React.ReactNode;
  /** Error message; when present the field is marked invalid. */
  error?: React.ReactNode;
  /** Marks the control required and shows a required indicator. */
  required?: boolean;
  /** Override the auto-generated control id. */
  htmlFor?: string;
  /** Hide the label visually while keeping it for screen readers. */
  hideLabel?: boolean;
};

export function FormField({
  label,
  children,
  hint,
  error,
  required,
  htmlFor,
  hideLabel,
  className,
  ...props
}: FormFieldProps) {
  const reactId = useId();
  const controlId = htmlFor ?? `${reactId}-control`;
  const hintId = `${reactId}-hint`;
  const errorId = `${reactId}-error`;
  const invalid = Boolean(error);

  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  const fieldProps: FieldRenderProps = {
    id: controlId,
    'aria-describedby': describedBy,
    'aria-invalid': invalid || undefined,
    required,
  };

  let control: React.ReactNode;
  if (typeof children === 'function') {
    control = children(fieldProps);
  } else {
    const child = children;
    const childDescribedBy = (child.props as {['aria-describedby']?: string})[
      'aria-describedby'
    ];
    const mergedDescribedBy =
      [childDescribedBy, describedBy].filter(Boolean).join(' ') || undefined;
    control = cloneElement(child, {
      id: (child.props as {id?: string}).id ?? controlId,
      'aria-describedby': mergedDescribedBy,
      'aria-invalid':
        (child.props as {['aria-invalid']?: unknown})['aria-invalid'] ??
        (invalid || undefined),
      required: (child.props as {required?: boolean}).required ?? required,
    } as React.Attributes);
  }

  return (
    <div className={cx('ng-field', className)} {...props}>
      <label
        htmlFor={controlId}
        className={cx('ng-field-label', hideLabel && 'ng-sr-only')}
      >
        {label}
        {required ? (
          <span className="ng-field-required" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {control}
      {hint ? (
        <span id={hintId} className="ng-field-hint">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} className="ng-error-text" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Fieldset                                                                   */
/* -------------------------------------------------------------------------- */

export type FieldsetProps = React.FieldsetHTMLAttributes<HTMLFieldSetElement> & {
  /** Group label rendered as the <legend>. */
  legend: React.ReactNode;
  /** Optional class for the <legend>. */
  legendClassName?: string;
};

export function Fieldset({
  legend,
  legendClassName,
  className,
  children,
  ...props
}: FieldsetProps) {
  return (
    <fieldset className={cx('ng-fieldset', className)} {...props}>
      <legend className={cx('ng-fieldset-legend', legendClassName)}>{legend}</legend>
      {children}
    </fieldset>
  );
}
