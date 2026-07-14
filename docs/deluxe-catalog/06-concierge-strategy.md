# AI Concierge Recommendation Strategy — Deluxe

How the catalogue's structured data powers an AI gifting concierge ("Help me choose") and automated recommendations, cross-sell, and upsell.

---

## 1. Concierge tag model

Every product carries a `custom.concierge_tags` string (pipe-separated) plus the tag taxonomy. The concierge reasons over these **eight dimensions**:

| Dimension | Values | Source |
|---|---|---|
| **occasion** | anniversary, birthday, romance, sympathy, congratulations, thank-you, get-well, new-baby, corporate, wedding, seasonal, everyday, mothers-day | `occasion:` |
| **recipient** | her, him, couple, family, new-parent, colleague, client, friend | `recipient:` |
| **sentiment** | romantic, celebratory, comforting, congratulatory, respectful, cheerful, professional, grateful | concierge_tags |
| **budget-tier** | standard, premium, luxury, signature | `tier:` |
| **palette** | red, blush, white, ivory, pastel, jewel, gold, bright, blue, pink, green, mixed | `palette:` |
| **urgency** | same-day / lead-time | `delivery:same-day` |
| **relationship** | partner, spouse, parent, friend, colleague, client, family | concierge_tags |
| **personality** | classic, modern, opulent, minimal, playful | concierge_tags |

## 2. Concierge conversation → query

The concierge asks at most 3–4 questions, maps answers to dimensions, and ranks:

```
Q1 "Who's it for & the occasion?"  → occasion + recipient + relationship
Q2 "What's the feeling?"           → sentiment + personality + palette
Q3 "Budget?"                       → budget-tier
Q4 "Need it today?"                → urgency (filter same-day)
```

Ranking = hard-filter (occasion, urgency, budget band) → score by (sentiment match ×3) + (palette match ×2) + (personality match ×2) + best-seller boost ×1.5 + tier-fit. Return top 3 with a one-line rationale drawn from the short description.

## 3. Recommendation surfaces

| Surface | Logic |
|---|---|
| **Concierge "Help me choose"** | Full 8-dimension ranking above |
| **PDP "You may also love"** | Same occasion, ± one tier, complementary palette; from `cross_sell` handles (field 23) + tag similarity |
| **PDP "Complete your gift"** | `addon` products (chocolates, teddy, card, balloon, vase) — always shown |
| **Cart upsell** | Size upgrade (field 24 upsell) + top 2 add-ons not already in cart |
| **Collection "Best paired with"** | Cross-occasion best-sellers, excluding sympathy |
| **Home "Perfect for…"** | Occasion tiles → occasion collections |

## 4. Cross-sell & upsell rules

- **Cross-sell** (fields 23): 2–3 handles, same occasion family, avoid recommending a *cheaper* item as the hero cross-sell; prefer lateral or aspirational.
- **Upsell** (field 24): size step-up (Classic→Grand→Opulent) first, then a fitting add-on.
- **Sympathy** cross-sells only within sympathy (never bright/celebratory items); add-on = sympathy card only.
- **Corporate** upsell = recurring/contract display; cross-sell = other corporate pieces.
- **Add-ons** never cross-sell to florals (they're the terminal upsell).

## 5. Data contract (what the concierge needs per product)

Minimum machine-readable fields (all already in the CSV/metafields):
`handle, name, occasion(+secondary), tier, price band, palette, flower, format, recipient, concierge_tags, short_description, image, same-day flag, cross_sell[], upsell`.

Keep this **in sync with the master CSV** — the CSV is the training/seed source for the concierge index; regenerate the index whenever the catalogue changes.

## 6. Guardrails

- Never recommend **out-of-occasion tone** (no birthday balloons for sympathy).
- Respect **budget**: never up-rank a Signature piece when the user said Standard; offer it only as an explicit "or go all out" option.
- Always include a **same-day** option when urgency = today.
- Recommendations are **suggestions**, not auto-adds; the customer confirms.
- Fall back gracefully: if no exact match, widen palette → then tier → then secondary occasion, and say so.

## 7. Future automation hooks

- Best-seller tag can be **auto-maintained** from sales data (nightly job re-tags top N).
- Seasonal collection membership can rotate via a scheduled tag swap.
- The concierge index rebuilds from the CSV/metafields on catalogue change — no code change needed to add products.
