# Wizard Portrait Avatar — Component Specification

## Decision

Replace neither the game nor its earned wardrobe. Build a new, original
**front-facing chest-up portrait renderer** alongside the existing canvas
sprite. A player chooses one of six identities once; the identity persists
while the currently equipped form supplies the robe, trim, hat, staff, and
magic.

The approved concept sheet is art direction only. It is not shipped as an
asset and must not be traced or rasterised into the app. The implementation is
made from original code-native SVG components.

## Player data

Add one stable identity field to `appearance`. Existing records get `sage`, so
no profile migration can create a broken avatar.

```js
appearance: {
  portrait: 'sage', // sage | river | ember | meadow | comet | riddle
  skin: 1,
  hairColor: 1,
  hairStyle: 1,
  eyes: 1,
  eyeColor: 1,
  brows: 0,
  nose: 0,
  mouth: 1,
  beard: 0,
}
```

`portrait` describes geometry and neutral expression; the other fields remain
independent choices. The configuration stays deterministic, tiny, and safe to
include in the existing local profile / Wizard Scroll export.

## Six portrait templates

| id | face silhouette | feature character | neutral expression |
| --- | --- | --- | --- |
| `sage` | narrow temples, gently angular jaw, small pointed chin | almond eyes, defined brows, straight nose | calm / capable |
| `river` | soft oval, rounded jaw | relaxed lids, soft brow, small nose | warm / open |
| `ember` | broad cheekbones, shorter lower face | friendly wider-set eyes, fuller cheeks | confident smile |
| `meadow` | longer vertical face, tapered chin | quieter hooded eyes, higher nose bridge | thoughtful |
| `comet` | youthful rounded cheeks with a modest chin | bright eyes, small nose, lively brows | playful |
| `riddle` | asymmetrical oval, one cheek fractionally fuller | one brow slightly raised, subtly crooked smile | curious / mischievous |

These are deliberately unisex. Hair, beard, color choices, and the wardrobe
form determine presentation; no template is gendered or tied to a rank.

## Render layers and anchors

Use a 200 × 240 SVG viewBox. All geometry is authored against these anchors so
it scales cleanly in a 64 px wardrobe tile, 120 px choice card, and 190 px hub
portrait.

| layer (back to front) | anchor / responsibility | recolorable |
| --- | --- | --- |
| `shoulders` | `neckBase` at (100, 165); chest and shoulder silhouette | robe |
| `robe` | shoulder line (100, 158); collar opening around neck | robe, trim |
| `neck` | from jaw base to collar opening | skin |
| `hairBack` | head crown and ear anchors; may fall onto shoulders | hair |
| `ears` + `face` | face path from crown to chin | skin |
| `facePlanes` | clipped cheek, temple, nose, and jaw shadows | derived skin shades |
| `eyes`, `brows`, `nose`, `mouth` | derived from each template's feature anchors | eye, hair, skin/lip shades |
| `beard` + `hairFront` | jaw and forehead / side-lock anchors | hair |
| `hat` / `hood` | brow line and outer shoulder silhouette | robe, trim |
| `accessory` | collar clasp / optional gem only | trim, magic accent |

Every layer uses locally defined gradients derived from a base color. Avoid
texture images, filters that require external assets, and raster masks.

## Wardrobe adapter

The existing `FORMS` entries in `src/game/skins.js` already contain the
portable wardrobe inputs. The new portrait renderer receives the active form
unchanged:

```js
<WizardPortrait
  appearance={profile.appearance}
  form={formById(profile.equippedSkin)}
  size={190}
/>
```

| existing form property | portrait result |
| --- | --- |
| `robe` | shoulder garment and hood/hat base color |
| `trim` | collar edge, hat band, clasp, small highlights |
| `hat` | `pointed`, `wide`, `hood`, `horned`, or `crown` SVG layer |
| `staff` | omitted from compact chest-up portraits; retained in the maze sprite |
| `aura` | optional compact halo/sparkle layer only on larger hub portrait |

This means all 25 existing earned forms work on every one of the six characters
without making six separate costume libraries.

## Screen behavior

1. New player enters name and passcode as today.
2. A one-time **Choose your wizard** screen presents six starter portraits in
   the Apprentice outfit.
3. Selecting a card stores `appearance.portrait`; current skin, hair, and eye
   controls remain available in **My Wizard**.
4. The hub and wardrobe use the new portrait renderer. The in-maze renderer
   keeps its existing rear-view sprite for this first release.

Changing the base portrait later belongs in **My Wizard**, with a confirmation
only if the product wants the choice to feel permanent. It should not be tied
to point rewards.

## Implementation sequence

1. Add `portrait` defaults and migration protection in
   `src/game/appearance.js` and `src/store/storage.js`.
2. Create `src/ui/WizardPortrait.jsx` with six template geometry definitions
   and the layers above.
3. Build `PortraitChoice.jsx` as a visual-only selection screen; test all six
   at the Apprentice form.
4. Switch hub, login cards, wardrobe tiles, and rank-choice previews to the
   portrait renderer where front-facing artwork is useful.
5. Create a developer sheet that renders every template × hat type × a small
   form sample, checking at 64 px and 190 px.
6. Only after those pass, decide whether the maze's existing rear-view canvas
   sprite should gain a simplified matching portrait silhouette.

## Acceptance checks

- Six cards read as different people in grayscale and at 120 px.
- Every portrait has a visible neck and shoulders; no circular face appears
  pasted onto a robe.
- Any `FORMS` entry changes clothing but never the player's face identity.
- All skin, hair, eye, robe, and trim colors remain legible.
- Existing saved profiles still load, export, import, and render.
- No generated raster artwork is needed at runtime.
