import {useId} from 'react';
import {cx} from './utils';

export type QuantityStepperProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onChange'
> & {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  /** Accessible label for the numeric input (e.g. "Bunch quantity"). */
  'aria-label'?: string;
};

function clamp(n: number, min: number, max?: number) {
  const low = Math.max(n, min);
  return typeof max === 'number' ? Math.min(low, max) : low;
}

export function QuantityStepper({
  className,
  value,
  onChange,
  min = 1,
  max,
  step = 1,
  disabled = false,
  'aria-label': ariaLabel = 'Quantity',
  ...props
}: QuantityStepperProps) {
  const inputId = useId();

  const atMin = value <= min;
  const atMax = typeof max === 'number' && value >= max;

  const commit = (next: number) => {
    const clamped = clamp(next, min, max);
    if (clamped !== value) onChange(clamped);
  };

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = Number.parseInt(event.currentTarget.value, 10);
    if (Number.isNaN(parsed)) return;
    commit(parsed);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      commit(value + step);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      commit(value - step);
    }
  };

  return (
    <div className={cx('ng-qty-stepper', className)} {...props}>
      <button
        type="button"
        className="ng-qty-button ng-qty-decrement"
        onClick={() => commit(value - step)}
        disabled={disabled || atMin}
        aria-label={`Decrease ${ariaLabel.toLowerCase()}`}
        aria-controls={inputId}
      >
        <span aria-hidden="true">&minus;</span>
      </button>
      <input
        id={inputId}
        type="number"
        inputMode="numeric"
        className="ng-qty-input"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
      />
      <button
        type="button"
        className="ng-qty-button ng-qty-increment"
        onClick={() => commit(value + step)}
        disabled={disabled || atMax}
        aria-label={`Increase ${ariaLabel.toLowerCase()}`}
        aria-controls={inputId}
      >
        <span aria-hidden="true">+</span>
      </button>
    </div>
  );
}
