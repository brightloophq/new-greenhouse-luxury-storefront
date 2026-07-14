# Product Naming & URL Standards — Deluxe

Consistent, evocative, scalable naming. These rules govern every Deluxe product name and handle so the catalogue reads like a luxury boutique and stays machine-clean.

---

## 1. Product naming standards

### Voice
Evocative + descriptive. A name should hint at **emotion** and state **what it is**. Luxury, never wholesale.

### Pattern
```
[Theme / Emotion]  +  [Signature Flower or Form]  +  [Bouquet | Arrangement | Collection | Roses]
```
Examples:
- **Midnight Elegance Bouquet**
- **Grand Red Rose Arrangement**
- **Eternal White Sympathy Wreath**
- **The Greenhouse Signature 100 Roses**

### Rules
1. **Title Case.** 2–5 words (add-ons may be 2–3).
2. Lead with the **emotive/theme word** where possible (Midnight, Blush, Eternal, Golden, Serene, Sunshine).
3. Name the **form** at the end (Bouquet / Arrangement / Wreath / Centerpiece / Posy / Roses / Add-on).
4. **Never** use trade language: no "bunch", "stem", "by the box", "wholesale", "grower", "pack".
5. **No colour hex, no SKU codes, no sizes** in the name (size lives in variants).
6. Occasion may be implied by theme, not stapled on ("Sunshine Birthday Bouquet" is fine; "Birthday Flowers #3" is not).
7. Signature/house pieces may use the brand prefix **"The Greenhouse Signature …"** — reserve for `tier:signature`.
8. Sympathy names stay **dignified and serene** (Peaceful, Serene, Eternal, Classic White) — never playful.
9. Corporate names stay **professional** (Executive, Reception, Lobby) — never cute.
10. Uniqueness: no two products share a name; disambiguate by theme, not by number.

### Do / Don't
| ✅ Do | ❌ Don't |
|---|---|
| Blush Romance Bouquet | Pink Roses Bunch |
| Executive Desk Arrangement | Corporate Flowers Small |
| New Baby Boy Blue Bouquet | Baby Bouquet (Blue) v2 |
| Serene Sympathy Vase | Funeral Vase Cheap |

---

## 2. URL handle standards

### Pattern
```
handle = kebab-case(Product Name), stopwords trimmed, ≤ 5 words
```
Examples:
| Name | Handle |
|---|---|
| Midnight Elegance Bouquet | `midnight-elegance-bouquet` |
| Grand Red Rose Arrangement | `grand-red-rose-arrangement` |
| The Greenhouse Signature 100 Roses | `signature-100-roses` |
| Belgian Chocolates (add-on) | `belgian-chocolates-add-on` |

### Rules
1. **Lowercase, hyphen-separated**, ASCII only.
2. **≤ 5 words** — drop filler ("the", "of", "&", "a") unless part of the brand mark.
3. Derived from the name, but may be shortened for length (keep the distinctive words).
4. **Immutable once published.** If a name changes, keep the handle or create a **301 redirect** (`urlRedirectCreate`) — never orphan a live URL.
5. **Unique** across the whole store (Classic + Deluxe share the domain).
6. Add-ons end in `-add-on` for instant recognition.
7. No dates, no years, no "new"/"sale"/"final" — handles are permanent.
8. Avoid collisions with existing wholesale handles (e.g. wholesale `roses-red` vs Deluxe `grand-red-rose-arrangement`).

### Handle reservation
Before assigning, check the master CSV `handle` column for duplicates and check live Shopify. The blueprint's handles are pre-deduplicated against the existing 19 Deluxe products.

---

## 3. Collection handle standards

- Occasion handles are **plain nouns**: `birthday`, `anniversary`, `sympathy-and-funeral`, `corporate-gifting`.
- Curated handles describe the edit: `signature-collection`, `luxury-bouquets`, `seasonal-deluxe`, `best-sellers`.
- Functional: `same-day-delivery`, `gift-add-ons`.
- Never rename a live collection handle without a redirect.

---

## 4. Size / variant naming

Fixed vocabulary so filters and copy stay consistent:

| Variant | Meaning | Typical multiplier |
|---|---|---|
| **Classic** | The signature size (baseline) | 1.0× |
| **Grand** | Fuller, more stems | ~1.4× |
| **Opulent** | Statement size | ~1.9× |

Add-ons: single variant named **"One size"**. Weddings may use **"Per piece"** / **"Consultation"**.
