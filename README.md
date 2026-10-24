# Whereabouts

An app that helps you remember where you put what: in a drawer, under the bed, or with a friend.

Whereabouts is designed like an old library. Every thing gets a catalog card, places are shelves, lending something out gets a date-due stamp, and every move is kept on the card's circulation record.

## What it does

- **Quick add.** Name it, tap a recently used shelf (or type a path like `Garage > Blue box`), done. "Save and add another" keeps the shelf, for unpacking a whole box.
- **Instant fuzzy search.** Results as you type, tolerant of typos and missing letters (`pasport`, `chrstms`). Matches names, subjects (tags), places, borrowers and notes.
- **Nested places.** Any depth: House › Garage › Tool shelf. Missing parts of a path are created on save. Deleting a place moves its contents up a level, so nothing is lost.
- **Lent out.** Who has what, grouped by borrower, with optional due dates and overdue warnings. One tap when it comes back.
- **Moved it.** One tap on a recent shelf re-shelves an item; every move is recorded.

## Privacy and security

- Everything stays on the device. No account, no analytics, no network calls.
- The database is encrypted with SQLCipher. A random 256-bit key is generated on first launch and kept only in the iOS Keychain / Android Keystore (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`, so it is never synced or backed up). Release builds refuse to start without SQLCipher.
- Optional app lock with Face ID, fingerprint or device passcode. It re-locks after 30 seconds in the background, and the app-switcher snapshot is covered.
- Android backups are disabled.

## Stack

Expo SDK 58, React Native 0.88, TypeScript, Expo Router, expo-sqlite (SQLCipher), expo-secure-store, expo-local-authentication. Fonts: Fraunces, Courier Prime, Special Elite (bundled, no network). Icons are hand-drawn SVGs in `src/ui/icons.tsx`.

## Running it

The app uses native modules (SQLCipher, secure storage, biometrics), so it needs a development build, not Expo Go.

```bash
npm install
npx expo run:ios       # or: npx expo run:android
```

Or build in the cloud with EAS: `npx eas-cli@latest build --profile development`.

`npx expo start --web` serves a design preview in the browser with sample data. It is unencrypted, in-memory, and not a supported target.

```bash
npm test            # data layer and search tests (real SQL via better-sqlite3)
npm run typecheck
npm run lint
```

## Layout

```
src/app/          screens (Expo Router)
src/components/   screen-level components (place picker, cabinet tab bar, ...)
src/db/           schema/migrations, repository, encrypted open
src/search/       fuzzy matcher and catalog index
src/security/     app lock
src/ui/           theme, icons, library UI primitives
```

## Ready for later stages

The schema already has room for what comes next, so those features won't need a data migration rewrite:

- `photos` table for item, box and label photos
- `locations.fingerprint` for recognising a box from a photo of the box or its handwritten label
- `items.embedding` for on-device semantic search
- `item_tags.source` to tell user tags from approved AI-suggested ones
