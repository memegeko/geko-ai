# Third-party notices

geko.ai is original application code maintained by memegeko, built on the Sites
Vinext starter. The project's MIT license does not remove third-party license
conditions or grant rights in other organizations' trademarks.

- The vendored Sites Vite plugin retains its OpenAI MIT notice in
  [`build/sites-vite-plugin.LICENSE`](build/sites-vite-plugin.LICENSE).
- The vendored shadcn Tailwind stylesheet retains its original notice in
  [`vendor/shadcn-tailwind-4.13.0.LICENSE.md`](vendor/shadcn-tailwind-4.13.0.LICENSE.md).
- React, Vinext, Vite, Drizzle, Lucide, Zod, Cloudflare tooling, and all other
  installed packages retain their respective upstream licenses. Dependencies
  are declared in `package.json` and pinned by `pnpm-lock.yaml`; they are not
  relicensed by this repository.
- The gecko chat mark in `public/brand/geko-mark.svg` is original vector artwork.
  The character portrait atlas in `public/characters.png` is original
  AI-generated artwork created for this project. Its characters are not
  adaptations of Character.AI characters or assets.
- DM Sans and Manrope are requested from Google Fonts at runtime. Their font
  binaries are not redistributed in this repository.

Character.AI's proprietary code, models, branding, character datasets, and
conversation exports are not included. Character.AI, Ollama, Google, Microsoft,
and other names remain the property of their respective owners. No affiliation
or endorsement is implied.

## Standalone authentication and QR codes

Better Auth provides authentication and its TOTP plugin (MIT). QRCode provides
QR-code rendering (MIT). Nodemailer provides optional SMTP delivery (MIT-0).
Dependencies and their transitive licenses remain with their upstream authors.
