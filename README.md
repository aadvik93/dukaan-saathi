# Dukaan Saathi

**Voice Udhaar Closeout** is a local-first prototype for a narrow daily task at an independent kirana shop: record a customer's credit or repayment, hear the details back, confirm before saving, and ask for a balance or today's totals.

The interface supports Hindi and Hinglish speech. It deliberately does not attempt inventory, tax, full point-of-sale, payments, or cloud accounts. The sample ledger is illustrative, not research or customer data.

## Run it

### Docker Compose (no secrets or `.env` required)

```sh
docker compose up --build
```

Open [http://localhost:8080](http://localhost:8080). The container health endpoint is [http://localhost:8080/health](http://localhost:8080/health). The port can be changed by copying `.env.example` to `.env` and changing `HOST_PORT`; the default works without either file.

### Local Node.js

Requires Node.js 20 or newer. No npm packages or API keys are needed.

```sh
npm start
```

Open [http://localhost:8080](http://localhost:8080).

### Tests

```sh
npm test
```

The focused tests cover Hindi/Hinglish amount and intent parsing, clarification for missing or mixed details, balances, daily totals, valid ledger writes, duplicate customer names, and overpayment protection.

## Try the flow

1. Select **हिंदी** or **Hinglish**, then tap the microphone and allow microphone access. If browser speech recognition is unavailable or blocked, the microphone control is removed and the command box remains usable; you can type or use your device's keyboard dictation.
2. Say a customer name, amount, and transaction type, for example: “Raju ko 500 udhaar likho” or “राजू को पाँच सौ उधार लिखो”.
3. Check the visible transcript and read-back. Say “haan” / “हाँ” or tap **Save entry** to save. Say “nahi” / “नहीं” or tap **Cancel** to discard. While confirmation is open, say the corrected full entry or “actually 450” to revise it.
4. Ask “Raju ka balance kitna hai?” or “Aaj ka hisaab batao”.
5. **Reset demo** restores the illustrative starting ledger in the current browser.

New customers can be added from **Customer book**. Speak the exact name shown there. The **SAMPLE COMMANDS** chips fill the command box so you can test the complete ledger flow without pretending speech recognition worked.

## Speech, storage, and limits

- The ledger is stored in this browser's `localStorage`; there is no app account, app backend database, cloud sync, or payment processing. Clearing browser site data removes it. Do not treat this demo as the only copy of a real shop ledger.
- Speech uses the browser's Web Speech APIs. Recognition support varies by browser, language, and device; some browsers use a remote recognition service and require internet. Audio handling is therefore subject to the selected browser/provider's behavior and privacy terms. This app does not upload or persist microphone audio itself.
- Speech synthesis is also browser-provided and voice availability varies. A browser without `SpeechRecognition` shows a clear limitation instead of pretending voice input worked.
- Customer and amount parsing is intentionally conservative and limited to the supported names and Hindi/Hinglish terms. It asks for missing or mixed details and blocks repayments above the recorded balance. Always verify the read-back before confirming; a demo parser is not an accounting system.
- The default sample ledger exists to make the screen and queries understandable on first launch. Reset it before any genuine field test.

## Pilot and claims

No shopkeeper interviews or unaided field tests have been completed for this prototype. The main assumptions to test are whether a shopkeeper can use the flow without coaching, whether Hindi/Hinglish recognition is accurate enough in a real shop, and whether confirming each entry is acceptable during a busy day. See [RECORDING_CHECKLIST.md](RECORDING_CHECKLIST.md) for a truthful demo sequence and a small field-test checklist.

The accompanying [pitch deck](pitch-deck.pdf) treats the reachable market as a small, testable local pilot rather than claiming an unsupported national TAM. Its public references offer market context; they do not prove demand for this product.

## Project layout

- `public/` — app screen, voice interaction, and local ledger logic
- `test/` — Node's built-in test runner
- `server.js` — dependency-free static server and health endpoint
- `Dockerfile` / `docker-compose.yml` — no-secret local container setup
- `scripts/make_pitch_deck.py` — standard-library PDF deck generator
