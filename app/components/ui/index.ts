// The New Greenhouse — luxury component library (M2)
// Barrel export for the reusable design-system components.

// ---- utilities ----
export {cx} from './utils';

// ---- primitives (atoms) ----
export {Button, ButtonLink, IconButton} from './Button';
export type {ButtonProps, ButtonLinkProps, IconButtonProps} from './Button';
export {Card, CardBody} from './Card';
export type {CardProps} from './Card';
export {Container, Section, Stack, Cluster, Grid} from './Layout';
export type {ContainerProps, SectionProps, GridProps} from './Layout';
export {ImageFrame, IconFrame} from './Media';
export type {ImageFrameProps} from './Media';
export {Badge, Divider, LuxuryLink} from './Misc';
export {Heading, Label, Price, Text} from './Typography';
export type {HeadingProps, TextProps} from './Typography';
export {Icon, iconNames} from './Icon';
export type {IconName, IconProps} from './Icon';

// ---- forms ----
export {
  Input,
  Textarea,
  Select,
  Checkbox,
  Radio,
  CheckboxField,
  FormField,
  Fieldset,
} from './Form';
export type {
  InputProps,
  TextareaProps,
  SelectProps,
  CheckboxProps,
  RadioProps,
  CheckboxFieldProps,
  FormFieldProps,
  FieldsetProps,
} from './Form';

// ---- feedback / a11y ----
export {Spinner, Skeleton, VisuallyHidden, Alert} from './Feedback';
export type {
  SpinnerProps,
  SkeletonProps,
  VisuallyHiddenProps,
  AlertProps,
} from './Feedback';

// ---- navigation ----
export {
  NavBar,
  NavList,
  NavItem,
  NavLinkStyled,
  AnnouncementBar,
  Breadcrumbs,
} from './Navigation';
export type {
  NavBarProps,
  NavListProps,
  NavItemProps,
  NavLinkStyledProps,
  AnnouncementBarProps,
  BreadcrumbItem,
  BreadcrumbsProps,
} from './Navigation';

// ---- commerce (molecules) ----
export {PriceBlock} from './PriceBlock';
export type {PriceBlockProps} from './PriceBlock';
export {QuantityStepper} from './QuantityStepper';
export type {QuantityStepperProps} from './QuantityStepper';
export {Swatch, SwatchGroup} from './Swatch';
export type {SwatchProps, SwatchGroupProps} from './Swatch';
export {ProductCard} from './ProductCard';
export type {ProductCardProps} from './ProductCard';
export {CollectionCard} from './CollectionCard';
export type {CollectionCardProps} from './CollectionCard';

// ---- content / editorial ----
export {SectionHeading} from './SectionHeading';
export type {SectionHeadingProps} from './SectionHeading';
export {Banner} from './Banner';
export type {BannerProps} from './Banner';
export {CTA} from './CTA';
export type {CTAProps} from './CTA';
export {Testimonial, TestimonialGrid} from './Testimonial';
export type {TestimonialProps, TestimonialGridProps} from './Testimonial';
export {TrustItem, TrustGrid} from './Trust';
export type {TrustItemProps, TrustGridProps} from './Trust';
export {EditorialBlock} from './Editorial';
export type {EditorialBlockProps} from './Editorial';
export {Accordion, AccordionItem} from './Accordion';
export type {AccordionProps, AccordionItemProps} from './Accordion';
