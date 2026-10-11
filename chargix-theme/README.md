# ChargiX Pulse

A Shopify Online Store 2.0 theme for ChargiX: dark, electric, and built around one idea, charge flowing from page to page.

## Install and preview (without publishing)

1. Download `chargix-pulse-theme.zip`.
2. In Shopify admin go to **Online Store → Themes**.
3. Under **Theme library**, choose **Add theme → Upload zip file** and pick the zip.
4. On the uploaded theme click **⋯ → Preview**. Your live theme is unchanged until you click **Publish**.

The home page is pre-wired to your real collections and products by handle (`best-sellers`, `all`, and the category collections). Anything that doesn't match on your store simply shows a placeholder you can reassign in the theme editor.

## What's in it

**Home**
- **3D charge core hero** (Three.js, custom shaders): a living energy core with coils, a particle current spiralling inward, and your best-sellers orbiting as cards. Scrolling charges it from 0 to 100%. Falls back to a still gradient when WebGL or motion is off.
- **Trust bar** ticker, **category coverflow deck** (drag or arrow through categories, each with its own hue), **best-seller rail**, a **sticky scroll story** (Charge → Mount → Shoot), a **product spotlight**, and a full **product grid**.

**Moving between pages**
- Cross-document **View Transitions**: the product image you click morphs into the product page's main image; other navigations crossfade. Browsers without support get a soft fade.

**Product page**
- Gallery with thumbs, variant pills, quantity, dynamic checkout, perks, related products, and a sticky mobile buy bar.

**Collections**
- Each category gets its own aurora colour (override with a `custom.hue` metafield), a split-letter title, category chips, sorting, filters and pagination.

**Everywhere**
- Pointer 3D tilt with glare on cards, magnetic buttons, cursor glow, reveal-on-scroll.
- AJAX cart drawer: products fly into the cart with a spark burst, plus a free-shipping charge meter.
- Search dialog, mega menu, mobile drawer, 404 ("This page ran out of battery"), cart, search, blog, article, contact and info pages.
- Respects `prefers-reduced-motion`. English and Spanish locales.

**Theme settings**: colours, corner radius, page transitions on/off, cursor glow on/off, free-shipping threshold, favicon.

## Higgsfield media (optional)

Higgsfield is connected, but the account had only 0.2 credits, so no media was generated. Once credits are topped up, these prompts fit the theme. Upload the results in the theme editor.

| Slot | Where to upload | Prompt |
| --- | --- | --- |
| Hero background loop (video, 16:9, 6–8s, seamless) | Home → 3D hero → *Background video* | "Macro shot of a glowing electric-lime energy core suspended in darkness, thin copper coils orbiting it, soft particles drifting inward like a current, deep black background, cinematic, slow seamless loop, no text" |
| Category tiles (image, 4:5) | Home → Category deck → each card's *Image* | "Studio product shot of [a fast USB-C charger / a phone tripod / an RGB camera grip / a magnetic phone mount], floating on a black surface, rim light in [category hue], faint electric arcs, premium tech advertising, no text" |
| Story scene: Charge | Home → Story → block 1 | "Close-up of a compact 18W wall charger plugged in, a phone lighting up beside it, electric-lime glow tracing the cable, dark moody desk" |
| Story scene: Mount | Home → Story → block 2 | "Phone on a floor-standing tripod in a creator's studio at night, ring light glow, cinematic depth of field" |
| Story scene: Shoot | Home → Story → block 3 | "Hand holding a phone with an RGB camera grip, colourful light spilling onto the face of a creator filming, neon dark background" |

## Files

Standard Shopify theme layout: `layout/`, `templates/` (JSON), `sections/`, `snippets/`, `assets/`, `config/`, `locales/`. Three.js r169 is vendored in `assets/three.module.min.js`.
