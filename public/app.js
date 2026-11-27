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
  let pendingTransaction = null;
  let showAllEntries = false;

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
    voiceStatus.textContent = message;
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
      : '<p class="empty-state">No entries yet. Tap the microphone to start your first one.</p>';
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
      showSpeechFallback("This browser can't listen. Use the command box below, or open this page in Chrome or Edge for microphone input.");
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
    recognition.maxAlternatives = 1;
    recognition.continuous = false;
    recognition.onstart = () => {
      setListening(true);
      voiceNotice.hidden = true;
      announce("Listening… speak naturally.");
    };
    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const phrase = result[0].transcript.trim();
      $("#transcript-label").textContent = "WHAT I HEARD";
      transcript.textContent = phrase || "Listening…";
      if (!result.isFinal) return;
      const confidence = result[0].confidence;
      $("#confidence-label").textContent = Number.isFinite(confidence) && confidence > 0
        ? `${Math.round(confidence * 100)}% heard`
        : "";
      if (Number.isFinite(confidence) && confidence > 0 && confidence < 0.55) {
        announce("I may have misheard that. Please try again a little slower.", { speak: true, error: true });
        return;
      }
      processCommand(phrase);
    };
    recognition.onerror = (event) => {
      setListening(false);
      const messages = {
        "not-allowed": "Microphone access is blocked. Allow it in browser settings, or enter your command below.",
        "service-not-allowed": "This browser blocks its speech service. Microphone input is hidden; use device dictation in the command box or try another browser.",
        "network": "Speech recognition needs internet. Microphone input is hidden; your ledger stays on this device, and you can enter your command below.",
        "no-speech": "I didn't hear anything. Try again, or enter your command below.",
        "audio-capture": "No microphone was found. Check your device or enter your command below.",
      };
      if (event.error === "service-not-allowed" || event.error === "network") {
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
      announce(`Couldn't start the microphone: ${error.message}. You can still enter a command below.`, { error: true });
    }
  }

  function showSpeechFallback(message) {
    micButton.hidden = true;
    $(".voice-stage").classList.add("voice-stage-fallback");
    $("#mic-hint").textContent = "USE THE COMMAND BOX BELOW";
    $("#transcript-label").textContent = "YOUR COMMAND";
    transcript.textContent = "Enter or dictate a command below.";
    announce(message, { error: true });
    $("#command-input").focus();
  }

  function updateConfirmation() {
    const action = pendingTransaction.type === "credit" ? "udhaar for" : "repayment from";
    $("#confirmation-summary").textContent = `${rupees(pendingTransaction.amount)} ${action} ${pendingTransaction.customer.name}.`;
    confirmationPanel.hidden = false;
  }

  function containsAny(text, words) {
    return words.some((word) => ` ${text} `.includes(` ${word} `));
  }

  function processCommand(phrase) {
    const normalized = Ledger.normalize(phrase);
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
          : "यह उधार है या जमा? कृपया एक बार फिर बताएं।"
      : undefined;
    announce(command.question || "I didn't quite get that. Try saying a name, amount, and “udhaar” or “jama”.", {
      speak: true,
      spokenMessage: clarifySpeech,
      error: true,
    });
  }

  function commitTransaction() {
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
    confirmationPanel.hidden = true;
    announce("Entry cancelled. Nothing was saved.", { speak: true });
  }

  micButton.addEventListener("click", listen);
  $("#command-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = $("#command-input");
    const phrase = input.value.trim();
    if (!phrase) {
      announce("Enter or dictate a name, amount, and transaction type.", { error: true });
      input.focus();
      return;
    }
    $("#transcript-label").textContent = "YOUR COMMAND";
    transcript.textContent = phrase;
    $("#confidence-label").textContent = "command";
    voiceNotice.hidden = true;
    processCommand(phrase);
    input.value = "";
  });
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
    showAllEntries = false;
    confirmationPanel.hidden = true;
    $("#command-input").value = "";
    $("#transcript-label").textContent = "WHAT I HEARD";
    transcript.textContent = "Your speech or command will appear here.";
    $("#confidence-label").textContent = "";
    persist();
    announce("The sample ledger has been restored.");
  });
  $("#add-customer").addEventListener("click", () => {
    $("#customer-name").value = "";
    $("#customer-dialog").showModal();
    $("#customer-name").focus();
  });
  $("#close-customer-dialog").addEventListener("click", () => $("#customer-dialog").close());
  $("#cancel-add-customer").addEventListener("click", () => $("#customer-dialog").close());
  $("#customer-form").addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const customer = Ledger.addCustomer(ledger, $("#customer-name").value);
      if (!persist()) return;
      $("#customer-dialog").close();
      announce(`${customer.name} added to your customer book.`);
    } catch (error) {
      announce(error.message, { error: true });
    }
  });
  $("#show-customers").addEventListener("click", () => $("#customers-dialog").showModal());
  $("#close-customers").addEventListener("click", () => $("#customers-dialog").close());
  $("#customer-dialog").addEventListener("click", (event) => {
    if (event.target === $("#customer-dialog")) $("#customer-dialog").close();
  });
  $("#customers-dialog").addEventListener("click", (event) => {
    if (event.target === $("#customers-dialog")) $("#customers-dialog").close();
  });
  document.querySelectorAll(".example-chip").forEach((button) => {
    button.addEventListener("click", () => {
      $("#command-input").value = button.dataset.example;
      $("#command-input").focus();
      $("#transcript-label").textContent = "YOUR COMMAND";
      transcript.textContent = button.dataset.example;
      $("#confidence-label").textContent = "sample";
      announce("Sample command ready. Send it to review the read-back before saving.");
    });
  });

  $("#today-label").textContent = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(new Date()).toUpperCase();
  if (!recognitionAvailable) {
    showSpeechFallback("Microphone recognition isn't supported in this browser. You can still use the command box, or open Dukaan Saathi in Chrome or Edge for speech input.");
  }
  render();
  if (startupError) announce(startupError, { error: true });
})();
