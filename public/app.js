(function () {
  "use strict";

  const { DukaanLedger: Ledger } = window;
  const $ = (selector) => document.querySelector(selector);
  const micButton = $("#mic-button");
  const voiceStatus = $("#voice-status");
  const voiceNotice = $("#voice-notice");
  const transcript = $("#transcript");
  const confirmationPanel = $("#confirmation-panel");
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognitionAvailable = Boolean(SpeechRecognition);
  const VOICE_SETUP_KEY = "dukaan-saathi-voice-setup-v1";

  let ledger;
  let startupError = null;
  try {
    ledger = Ledger.loadLedger();
  } catch (error) {
    ledger = Ledger.freshLedger();
    startupError = `Couldn't read the saved ledger: ${error.message}`;
  }
  let recognition = null;
  let isListening = false;
  let isVoiceSetup = false;
  let pendingTransaction = null;
  let pendingCustomerName = null;
  let showAllEntries = false;
  let needsVoiceSetup = true;
  try {
    needsVoiceSetup = window.localStorage.getItem(VOICE_SETUP_KEY) !== "complete";
  } catch {
    needsVoiceSetup = true;
  }

  const currency = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

  function rupees(amount) {
    return currency.format(amount);
  }

  function localDate(date) {
    return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(date));
  }

  function localTime(date) {
    return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(new Date(date));
  }

  function safeText(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]);
  }

  function customerFor(id) {
    return ledger.customers.find((customer) => customer.id === id);
  }

  function announce(message, { speak = false, spokenMessage, error = false } = {}) {
    voiceStatus.textContent = error ? "Please check the notice below." : message;
    voiceNotice.hidden = !error;
    voiceNotice.textContent = error ? message : "";
    if (speak) say(spokenMessage || message);
  }

  function persist() {
    try {
      Ledger.saveLedger(ledger);
      render();
      return true;
    } catch (error) {
      announce(`Couldn't save on this device: ${error.message}`, { error: true });
      return false;
    }
  }

  function render() {
    const balances = Ledger.customerBalances(ledger);
    const summary = Ledger.dailySummary(ledger);
    const outstanding = balances.reduce((sum, customer) => sum + Math.max(0, customer.balance), 0);
    $("#total-outstanding").textContent = rupees(outstanding);
    $("#customer-count").textContent = `${ledger.customers.length} customer${ledger.customers.length === 1 ? "" : "s"}`;
    $("#given-today").textContent = rupees(summary.given);
    $("#collected-today").textContent = rupees(summary.collected);
    $("#given-count").textContent = `${summary.givenCount} entr${summary.givenCount === 1 ? "y" : "ies"}`;
    $("#collected-count").textContent = `${summary.collectedCount} repayment${summary.collectedCount === 1 ? "" : "s"}`;

    const transactions = [...ledger.transactions]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const visibleTransactions = showAllEntries ? transactions : transactions.slice(0, 4);
    $("#entry-list").innerHTML = visibleTransactions.length
      ? visibleTransactions.map(renderTransaction).join("")
      : '<p class="empty-state">No entries yet. Tap the microphone to speak your first entry.</p>';
    $("#view-all").hidden = transactions.length <= 4;
    $("#view-all").innerHTML = showAllEntries ? 'Show less <span aria-hidden="true">↑</span>' : 'View all <span aria-hidden="true">→</span>';

    const topCustomers = [...balances].sort((a, b) => b.balance - a.balance).slice(0, 4);
    $("#customer-list").innerHTML = topCustomers.map(renderCustomer).join("");
    $("#all-customer-list").innerHTML = [...balances]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(renderCustomer).join("") || '<p class="empty-state">Add a customer to get started.</p>';
  }

  function renderTransaction(transaction) {
    const customer = customerFor(transaction.customerId);
    if (!customer) return "";
    const isCredit = transaction.type === "credit";
    const initials = customer.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
    return `<article class="entry-row">
      <span class="person-avatar ${safeText(customer.color)}">${safeText(initials)}</span>
      <div class="entry-main"><strong>${safeText(customer.name)}</strong><span>${isCredit ? "Udhaar given" : "Repayment received"} · ${localDate(transaction.createdAt)}</span></div>
      <div class="entry-amount"><strong class="${isCredit ? "amount-out" : "amount-in"}">${isCredit ? "+" : "−"}${rupees(transaction.amount)}</strong><span>${localTime(transaction.createdAt)}</span></div>
    </article>`;
  }

  function renderCustomer(customer) {
    const initials = customer.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
    return `<article class="customer-row">
      <span class="person-avatar ${safeText(customer.color)}">${safeText(initials)}</span>
      <div class="customer-main"><strong>${safeText(customer.name)}</strong><span>${customer.balance > 0 ? "Owes you" : customer.balance < 0 ? "Please review" : "All clear"}</span></div>
      <strong class="customer-balance ${customer.balance < 0 ? "negative" : ""}">${rupees(Math.abs(customer.balance))}</strong>
    </article>`;
  }

  function setListening(listening) {
    isListening = listening;
    micButton.classList.toggle("is-listening", listening);
    micButton.setAttribute("aria-label", listening ? "Stop listening" : "Start speaking");
    $("#mic-hint").textContent = listening ? "LISTENING · TAP TO STOP" : "TAP TO SPEAK";
    $("#status-pulse").classList.toggle("active", listening);
  }

  function say(message) {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      voiceStatus.textContent = `${voiceStatus.textContent} Spoken playback isn't available here; the answer is shown above.`;
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = $("#voice-language").value;
    utterance.rate = 0.94;
    utterance.onerror = () => {
      voiceStatus.textContent = `${voiceStatus.textContent} Spoken playback failed; the answer is shown above.`;
    };
    window.speechSynthesis.speak(utterance);
  }

  function hindiSelected() {
    return $("#voice-language").value === "hi-IN";
  }

  function listen() {
    if (!SpeechRecognition) {
      showSpeechFallback("This browser doesn't provide speech recognition. Open Dukaan Saathi in a supported browser with microphone access to use voice input.");
      return;
    }
    if (isListening) {
      recognition?.stop();
      setListening(false);
      announce("Stopped listening.");
      return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = $("#voice-language").value;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.continuous = false;
    isVoiceSetup = needsVoiceSetup;
    if ("phrases" in recognition && typeof window.SpeechRecognitionPhrase === "function") {
      const vocabulary = [
        "udhaar", "udhar", "jama", "baaki", "hisaab", "hisab", "rupaye", "rupya", "rupees",
        "khata", "chadha do", "laga do", "likh do", "jod do", "baki kitna hai",
        "Raju ko paanch sau ka udhaar likho", "Seema ne do sau rupaye diye",
        "aaj ka hisaab batao", "naya grahak jodo", "add customer", "new customer",
        "do sau", "paanch sau", "dedh sau", "sawa sau", "pachhattar rupaye",
        "पाँच सौ रुपये", "दो सौ रुपये", "ढाई सौ रुपये", "डेढ़ सौ रुपये",
        "लिखो", "उधार", "जमा", "बाकी", "हिसाब", "रुपये", "खाता", "चढ़ा दो",
        "लिख दो", "ग्राहक", "जोड़ो", "आज का हिसाब बताओ", "नया ग्राहक जोड़ो",
        "दो सौ", "पाँच सौ", "पचहत्तर रुपये",
        "haan", "nahi", "हाँ", "नहीं",
        ...ledger.customers.flatMap((customer) => [customer.name, ...(customer.aliases || [])]),
      ];
      try {
        recognition.phrases = [...new Set(vocabulary)].map((phrase) => new window.SpeechRecognitionPhrase(phrase, 3));
      } catch {
        // Contextual phrase biasing is experimental and optional.
      }
    }
    recognition.onstart = () => {
      setListening(true);
      voiceNotice.hidden = true;
      if (isVoiceSetup) {
        const prompt = $("#voice-language").value === "hi-IN"
          ? "मेरी दुकान का हिसाब सही लिखो"
          : "Meri dukaan ka hisaab sahi likho";
        $("#setup-prompt").textContent = prompt;
        $("#voice-setup").hidden = false;
        announce("First-time voice check: repeat the sentence shown on screen. Your voice is not saved.");
      } else {
        announce("Listening… speak naturally.");
      }
    };
    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const alternatives = Array.from(result)
        .map((alternative, index) => ({
          phrase: alternative.transcript.trim(),
          confidence: Number.isFinite(alternative.confidence) ? alternative.confidence : 0,
          index,
        }))
        .filter((alternative) => alternative.phrase)
        .sort((a, b) => b.confidence - a.confidence || a.index - b.index);
      const best = alternatives[0];
      $("#transcript-label").textContent = "WHAT I HEARD";
      transcript.textContent = best?.phrase || "Listening…";
      if (!result.isFinal || !best) return;
      $("#confidence-label").textContent = best.confidence > 0
        ? `${Math.round(best.confidence * 100)}% heard`
        : "";
      if (isVoiceSetup) {
        finishVoiceSetup(best.phrase);
        return;
      }
      if (best.confidence > 0 && best.confidence < 0.6) {
        announce("I may have misheard that. Move closer to the microphone, reduce background noise if possible, and try again.", { speak: true, error: true });
        return;
      }
      const parsed = alternatives.map((alternative) => ({
        ...alternative,
        command: Ledger.parseCommand(alternative.phrase, ledger.customers),
      }));
      const bestSignature = commandSignature(parsed[0].command);
      const competing = parsed.find((alternative) =>
        alternative.confidence >= best.confidence - 0.12
        && commandSignature(alternative.command) !== bestSignature);
      if (competing) {
        announce("I heard more than one possible name or amount. Please repeat the full sentence clearly.", { speak: true, error: true });
        return;
      }
      processCommand(best.phrase);
    };
    recognition.onerror = (event) => {
      setListening(false);
      if (event.error === "aborted") {
        announce("Stopped listening.");
        return;
      }
      const messages = {
        "not-allowed": "Microphone access is blocked. Allow microphone access in browser settings, then try again.",
        "service-not-allowed": "This browser blocks its speech service. Voice input is unavailable here; open the app in a supported browser.",
        "network": "Speech recognition needs an internet connection. Your ledger stays on this device; reconnect and tap the microphone again.",
        "no-speech": "I didn't hear speech clearly. Move the phone closer and try again.",
        "audio-capture": "No microphone was found. Connect or enable a microphone, then try again.",
      };
      if (event.error === "service-not-allowed") {
        showSpeechFallback(messages[event.error]);
        return;
      }
      announce(messages[event.error] || `Speech recognition stopped: ${event.error}. Please try again.`, { error: true });
    };
    recognition.onend = () => {
      setListening(false);
    };
    try {
      recognition.start();
    } catch (error) {
      setListening(false);
      announce(`Couldn't start the microphone: ${error.message}. Check microphone permissions and try again.`, { error: true });
    }
  }

  function showSpeechFallback(message) {
    micButton.hidden = true;
    $(".voice-stage").classList.add("voice-stage-fallback");
    $("#mic-hint").textContent = "VOICE INPUT UNAVAILABLE";
    announce(message, { error: true });
  }

  function commandSignature(command) {
    if (command.intent === "transaction") {
      return `transaction:${command.customer.id}:${command.amount}:${command.type}`;
    }
    if (command.intent === "balance") return `balance:${command.customer.id}`;
    if (command.intent === "add_customer") return `add_customer:${Ledger.normalize(command.name)}`;
    return `${command.intent}:${command.reason || ""}`;
  }

  function finishVoiceSetup(phrase) {
    const normalized = Ledger.normalize(phrase);
    const groups = [
      ["meri", "mera", "मेरी"], ["dukaan", "dukan", "दुकान"], ["hisaab", "hisab", "हिसाब"],
      ["sahi", "theek", "thik", "सही"], ["likho", "likhna", "लिखो", "लिखना"],
    ];
    const matched = groups.filter((group) => group.some((word) => ` ${normalized} `.includes(` ${word} `))).length;
    if (matched < 3) {
      announce("I didn't catch the setup sentence. Read the line on screen once more; no audio is saved.", { speak: true, error: true });
      return;
    }
    needsVoiceSetup = false;
    $("#voice-setup").hidden = true;
    try {
      window.localStorage.setItem(VOICE_SETUP_KEY, "complete");
      announce("Voice check complete. No recording or voiceprint was saved. Tap the microphone again to speak a command.");
    } catch (error) {
      announce(`Voice check passed, but this browser could not save the setup preference: ${error.message}. Tap the microphone again to continue.`, { error: true });
    }
  }

  function updateConfirmation() {
    if (pendingCustomerName) {
      $("#confirmation-summary").textContent = `Add ${pendingCustomerName} to the customer book?`;
      $("#confirmation-help").textContent = "Say “haan” to add, or “nahi” to cancel.";
      $("#confirm-transaction").innerHTML = "<span>✓</span> Add customer";
      confirmationPanel.hidden = false;
      return;
    }
    const action = pendingTransaction.type === "credit" ? "udhaar for" : "repayment from";
    $("#confirmation-summary").textContent = `${rupees(pendingTransaction.amount)} ${action} ${pendingTransaction.customer.name}.`;
    $("#confirmation-help").textContent = "Say “haan” to save, or “nahi” to cancel.";
    $("#confirm-transaction").innerHTML = "<span>✓</span> Save entry";
    confirmationPanel.hidden = false;
  }

  function containsAny(text, words) {
    return words.some((word) => ` ${text} `.includes(` ${word} `));
  }

  function processCommand(phrase) {
    const normalized = Ledger.normalize(phrase);
    if (pendingCustomerName) {
      if (containsAny(normalized, ["haan", "ha", "yes", "confirm", "save", "theek", "हाँ", "हां"])) {
        commitTransaction();
      } else if (containsAny(normalized, ["nahi", "nahin", "no", "cancel", "ruko", "नहीं", "नही"])) {
        cancelTransaction();
      } else {
        const revised = Ledger.parseCommand(phrase, ledger.customers);
        if (revised.intent === "add_customer") {
          pendingCustomerName = revised.name;
          updateConfirmation();
          announce(`Updated: add ${pendingCustomerName}? Say “haan” to add or “nahi” to cancel.`, { speak: true });
        } else {
          announce(`Say “haan” to add ${pendingCustomerName}, “nahi” to cancel, or say “naya grahak” followed by the corrected name.`, { speak: true });
        }
      }
      return;
    }
    if (pendingTransaction) {
      if (containsAny(normalized, ["haan", "ha", "yes", "confirm", "save", "theek", "हाँ", "हां"])) {
        commitTransaction();
      } else if (containsAny(normalized, ["nahi", "nahin", "no", "cancel", "ruko", "नहीं", "नही"])) {
        cancelTransaction();
      } else {
        const revised = Ledger.parseCommand(phrase, ledger.customers);
        const correction = containsAny(normalized, ["actually", "instead", "correct", "change", "amount", "customer", "name", "type", "रकम", "बदल", "सही", "ग्राहक", "नाम", "जगह"]);
        let changed = false;
        if (revised.intent === "transaction") {
          pendingTransaction = revised;
          changed = true;
        } else if (correction) {
          const amount = Ledger.parseAmount(phrase);
          const customer = Ledger.matchCustomer(phrase, ledger.customers);
          if (amount) {
            pendingTransaction = { ...pendingTransaction, amount };
            changed = true;
          }
          if (customer) {
            pendingTransaction = { ...pendingTransaction, customer };
            changed = true;
          }
          const repayment = containsAny(normalized, ["repayment", "jama", "जमा", "भुगतान"]);
          const credit = containsAny(normalized, ["udhaar", "credit", "उधार", "खाता"]);
          if (repayment !== credit && (repayment || credit)) {
            pendingTransaction = { ...pendingTransaction, type: repayment ? "repayment" : "credit" };
            changed = true;
          }
        }
        if (changed) {
          const balance = Ledger.customerBalances(ledger).find((customer) => customer.id === pendingTransaction.customer.id).balance;
          if (pendingTransaction.type === "repayment" && pendingTransaction.amount > balance) {
            announce(`That repayment is above ${pendingTransaction.customer.name}'s recorded balance of ${rupees(Math.max(0, balance))}. Correct it or cancel.`, { speak: true, error: true });
            return;
          }
          updateConfirmation();
          announce(`Updated: ${rupees(pendingTransaction.amount)} ${pendingTransaction.type === "credit" ? "udhaar for" : "repayment from"} ${pendingTransaction.customer.name}. Confirm or cancel.`, { speak: true });
        } else {
          announce("Say “haan” to save, “nahi” to cancel, or speak the corrected entry again.", { speak: true });
        }
      }
      return;
    }

    const command = Ledger.parseCommand(phrase, ledger.customers);
    if (command.intent === "add_customer") {
      if (Ledger.matchCustomer(command.name, ledger.customers)) {
        announce(`${command.name} is already in your customer book.`, {
          speak: true,
          spokenMessage: hindiSelected() ? `${command.name} पहले से ग्राहक सूची में हैं।` : undefined,
          error: true,
        });
        return;
      }
      pendingCustomerName = command.name;
      updateConfirmation();
      announce(`Add ${command.name} to the customer book? Say “haan” to add or “nahi” to cancel.`, {
        speak: true,
        spokenMessage: hindiSelected() ? `${command.name} को ग्राहक सूची में जोड़ें? जोड़ने के लिए हाँ बोलें, या रद्द करने के लिए नहीं।` : undefined,
      });
      return;
    }
    if (command.intent === "transaction") {
      const balance = Ledger.customerBalances(ledger).find((customer) => customer.id === command.customer.id).balance;
      if (command.type === "repayment" && command.amount > balance) {
        const message = `${command.customer.name}'s recorded balance is ${rupees(Math.max(0, balance))}, which is less than ${rupees(command.amount)}. Please check the amount before trying again.`;
        announce(message, { speak: true, error: true });
        return;
      }
      pendingTransaction = command;
      const action = command.type === "credit" ? "udhaar for" : "repayment from";
      const confirmation = `${rupees(command.amount)} ${action} ${command.customer.name}.`;
      updateConfirmation();
      announce(`I heard ${confirmation} Say “haan” to save, or tap cancel.`, {
        speak: true,
        spokenMessage: hindiSelected()
          ? `मैंने सुना, ${command.customer.name} के लिए ${command.amount} रुपये का ${command.type === "credit" ? "उधार" : "भुगतान"}. सेव करने के लिए हाँ बोलें, या रद्द करने के लिए नहीं।`
          : undefined,
      });
      return;
    }
    if (command.intent === "balance") {
      const balance = Ledger.customerBalances(ledger).find((customer) => customer.id === command.customer.id).balance;
      const message = balance > 0
        ? `${command.customer.name}'s outstanding udhaar is ${rupees(balance)}.`
        : balance < 0
          ? `${command.customer.name}'s book has an overpayment of ${rupees(Math.abs(balance))}. Please review the entries.`
          : `${command.customer.name} has no outstanding udhaar.`;
      announce(message, {
        speak: true,
        spokenMessage: hindiSelected()
          ? balance > 0
            ? `${command.customer.name} का बाकी उधार ${balance} रुपये है।`
            : `${command.customer.name} का कोई बाकी उधार नहीं है।`
          : undefined,
      });
      return;
    }
    if (command.intent === "daily_summary") {
      const summary = Ledger.dailySummary(ledger);
      const message = `Today you gave ${rupees(summary.given)} in udhaar across ${summary.givenCount} entries and collected ${rupees(summary.collected)} in ${summary.collectedCount} repayments.`;
      announce(message, {
        speak: true,
        spokenMessage: hindiSelected()
          ? `आज ${summary.given} रुपये का उधार ${summary.givenCount} बार दिया, और ${summary.collected} रुपये का भुगतान ${summary.collectedCount} बार मिला।`
          : undefined,
      });
      return;
    }
    const clarifySpeech = hindiSelected()
      ? command.reason === "customer"
        ? "किस ग्राहक का नाम? अपनी ग्राहक सूची में दिया हुआ नाम बोलें।"
        : command.reason === "amount"
          ? "कितने रुपये? रकम साफ़-साफ़ बोलें।"
          : command.reason === "customer_name"
            ? "नए ग्राहक का नाम बताइए।"
            : "यह उधार है या जमा? कृपया एक बार फिर बताएं।"
      : undefined;
    announce(command.question || "I didn't quite get that. Try saying a name, amount, and “udhaar” or “jama”.", {
      speak: true,
      spokenMessage: clarifySpeech,
      error: true,
    });
  }

  function commitTransaction() {
    if (pendingCustomerName) {
      const name = pendingCustomerName;
      try {
        const customer = Ledger.addCustomer(ledger, name);
        pendingCustomerName = null;
        confirmationPanel.hidden = true;
        if (!persist()) return;
        announce(`${customer.name} added to your customer book.`, {
          speak: true,
          spokenMessage: hindiSelected() ? `${customer.name} को ग्राहक सूची में जोड़ दिया गया।` : undefined,
        });
      } catch (error) {
        announce(error.message, { speak: true, error: true });
      }
      return;
    }
    if (!pendingTransaction) return;
    try {
      Ledger.addTransaction(ledger, {
        customerId: pendingTransaction.customer.id,
        amount: pendingTransaction.amount,
        type: pendingTransaction.type,
      });
      const saved = pendingTransaction;
      pendingTransaction = null;
      confirmationPanel.hidden = true;
      $("#confidence-label").textContent = "";
      if (!persist()) return;
      const message = `${rupees(saved.amount)} ${saved.type === "credit" ? "udhaar" : "repayment"} saved for ${saved.customer.name}.`;
      announce(message, {
        speak: true,
        spokenMessage: hindiSelected()
          ? `${saved.customer.name} के लिए ${saved.amount} रुपये का ${saved.type === "credit" ? "उधार" : "भुगतान"} दर्ज हो गया।`
          : undefined,
      });
    } catch (error) {
      announce(error.message, { speak: true, error: true });
    }
  }

  function cancelTransaction() {
    pendingTransaction = null;
    pendingCustomerName = null;
    confirmationPanel.hidden = true;
    announce("Entry cancelled. Nothing was saved.", { speak: true });
  }

  micButton.addEventListener("click", listen);
  $("#confirm-transaction").addEventListener("click", commitTransaction);
  $("#cancel-confirmation").addEventListener("click", cancelTransaction);
  $("#view-all").addEventListener("click", () => {
    showAllEntries = !showAllEntries;
    render();
  });
  $("#reset-demo").addEventListener("click", () => {
    if (!window.confirm("Restore the sample ledger? This replaces the ledger saved in this browser.")) return;
    ledger = Ledger.freshLedger();
    pendingTransaction = null;
    pendingCustomerName = null;
    showAllEntries = false;
    confirmationPanel.hidden = true;
    $("#transcript-label").textContent = "WHAT I HEARD";
    transcript.textContent = "Your speech will appear here.";
    $("#confidence-label").textContent = "";
    persist();
    announce("The sample ledger has been restored.");
  });
  $("#show-customers").addEventListener("click", () => $("#customers-dialog").showModal());
  $("#close-customers").addEventListener("click", () => $("#customers-dialog").close());
  $("#customers-dialog").addEventListener("click", (event) => {
    if (event.target === $("#customers-dialog")) $("#customers-dialog").close();
  });

  $("#today-label").textContent = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(new Date()).toUpperCase();
  $("#voice-setup").hidden = !needsVoiceSetup;
  if (!recognitionAvailable) {
    showSpeechFallback("Microphone recognition isn't supported in this browser. Open Dukaan Saathi in a supported browser to use voice input.");
  }
  render();
  if (startupError) announce(startupError, { error: true });
})();
