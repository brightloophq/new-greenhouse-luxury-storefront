# 06 — AI Receptionist

> **Status: NOT IMPLEMENTED — planning placeholder.**
>
> There is no AI receptionist / concierge / chat assistant in the codebase at the time of writing. Nothing in this file has been built. It exists to capture intent so a future agent does not assume it exists or fabricate its behaviour.

## Intent (to be confirmed by the owner)

A concierge-style assistant to help customers find flowers, answer delivery/occasion questions, and route wholesale enquiries — in the brand's unhurried, editorial voice.

## Open questions the owner must answer before build

- Channel: on-site chat widget, WhatsApp (the business uses WhatsApp — see `CONTACT` in `companyContent.ts`), or both?
- Scope: FAQ/delivery only, or product recommendations, or order-status lookups?
- Data access: read-only storefront data, or authenticated customer/order data (raises privacy + auth scope questions)?
- Model/provider and budget.
- Handoff to a human, and hours of availability.

## Constraints when it is built

- Must not expose secrets, tokens or customer PII in the client bundle.
- Must not fabricate stock, pricing, delivery promises or brand claims — answer only from grounded sources (`companyContent.ts`, live Storefront data).
- Must respect the same accessibility + reduced-motion standards as the rest of the store.
- Any send/booking/order action is side-effectful — gate behind explicit user confirmation.

## Next step

Do not implement until the owner confirms channel + scope. Then write a proper spec and replace this placeholder.
