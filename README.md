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

1. Select **हिंदी** or **Hinglish**, tap the microphone, and allow microphone access. On first use, repeat the sentence shown on screen; this is a recognition check, not voice enrollment.
2. Speak a customer name, amount, and action. For example: “Raju ko paanch sau ka udhaar likho”, “राजू को पाँच सौ उधार लिखो”, or “Seema ne do sau rupaye diye”.
3. Check the transcript and read-back. Say “haan” / “हाँ” or tap **Save** to confirm. Say “nahi” / “नहीं” or tap **Cancel** to discard. While confirmation is open, speak the corrected full entry.
4. Ask “Raju ka kitna baaki hai?” or “Aaj ka hisaab batao”. Add someone by saying “Naya grahak Meena jodo” or “नया ग्राहक मीना जोड़ो”, then confirm by voice.
5. **Reset demo** restores the illustrative starting ledger in the current browser.

## Speech, storage, and limits

- The ledger is stored in this browser's `localStorage`; there is no app account, app backend database, cloud sync, or payment processing. Clearing browser site data removes it. Do not treat this demo as the only copy of a real shop ledger.
- Speech uses the browser's Web Speech APIs. Recognition support varies by browser, language, and device; some browsers use a remote recognition service and require internet. The app does not upload or retain microphone recordings itself. Its first-use voice check stores only a completion flag in local storage; it does not create or save a voiceprint.
- Where implemented by the browser, contextual phrase biasing prioritizes customer names and shop vocabulary. It is not model training and is not supported by every browser. The local parser covers common Hindi/Hinglish number words, udhaar, repayments, balance questions, daily summaries, and spoken customer creation; unfamiliar or conflicting phrases should be clarified rather than guessed.
- Speech synthesis is also browser-provided and voice availability varies. A browser without usable `SpeechRecognition` shows an explicit voice-unavailable message; there is no typed-command fallback.
- Noise handling depends on the device and browser. This app cannot guarantee recognition in arbitrary shop noise or identify a particular speaker, and it cannot apply custom noise cancellation to the browser's recognition stream. Keep the microphone close, reduce noise where practical, and verify every transcript and read-back before confirming.
- The prototype is not an accounting system. It blocks repayments above the recorded balance, but always verify records independently.
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
