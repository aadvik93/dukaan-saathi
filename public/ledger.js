(function (root) {
  "use strict";

  const STORAGE_KEY = "dukaan-saathi-ledger-v1";
  const SAMPLE = {
    customers: [
      { id: "raju", name: "Raju", aliases: ["राजू"], color: "coral" },
      { id: "seema", name: "Seema", aliases: ["सीमा"], color: "blue" },
      { id: "amit", name: "Amit", aliases: ["अमित"], color: "gold" },
      { id: "pooja", name: "Pooja", aliases: ["पूजा"], color: "green" },
    ],
    transactions: [
      { id: "seed-1", customerId: "raju", type: "credit", amount: 650, createdAt: todayAt(10, 15), note: "Monthly groceries" },
      { id: "seed-2", customerId: "seema", type: "repayment", amount: 300, createdAt: todayAt(9, 40), note: "Partial repayment" },
      { id: "seed-3", customerId: "amit", type: "credit", amount: 240, createdAt: todayAt(8, 55), note: "Milk & essentials" },
      { id: "seed-4", customerId: "pooja", type: "repayment", amount: 500, createdAt: yesterdayAt(18, 30), note: "Udhaar cleared" },
      { id: "seed-5", customerId: "raju", type: "credit", amount: 180, createdAt: yesterdayAt(11, 20), note: "Household items" },
      { id: "seed-6", customerId: "seema", type: "credit", amount: 780, createdAt: yesterdayAt(16, 10), note: "Groceries" },
      { id: "seed-7", customerId: "pooja", type: "credit", amount: 500, createdAt: yesterdayAt(10, 5), note: "Udhaar" },
    ],
  };

  const numberWords = {
    zero: 0, shunya: 0, ek: 1, one: 1, do: 2, two: 2, teen: 3, tin: 3,
    three: 3, char: 4, chaar: 4, four: 4, paanch: 5, panch: 5, five: 5,
    chhe: 6, cheh: 6, six: 6, saat: 7, sat: 7, seven: 7, aath: 8, eight: 8,
    nau: 9, nine: 9, das: 10, dus: 10, ten: 10, gyarah: 11, bara: 12,
    barah: 12, pandrah: 15, bis: 20, bees: 20, pachees: 25, pachis: 25,
    tees: 30, chalis: 40, pachaas: 50, pachhas: 50, saath: 60, sattar: 70,
    assi: 80, nabbe: 90, sau: 100, so: 100, hundred: 100, hazaar: 1000,
    hajar: 1000, thousand: 1000, lakh: 100000, lac: 100000,
    एक: 1, दो: 2, तीन: 3, चार: 4, पांच: 5, पाँच: 5, छः: 6, छह: 6,
    सात: 7, आठ: 8, नौ: 9, दस: 10, ग्यारह: 11, बारह: 12, तेरह: 13,
    चौदह: 14, पंद्रह: 15, सोलह: 16, सत्रह: 17, अठारह: 18, उन्नीस: 19,
    बीस: 20, तीस: 30, चालीस: 40, पचास: 50, साठ: 60, सत्तर: 70,
    अस्सी: 80, नब्बे: 90, सौ: 100, सैकड़ा: 100, हजार: 1000,
    हज़ार: 1000, लाख: 100000,
  };

  function todayAt(hour, minute) {
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
  }

  function yesterdayAt(hour, minute) {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function freshLedger() {
    return clone(SAMPLE);
  }

  function normalize(text) {
    return String(text || "")
      .toLocaleLowerCase("en-IN")
      .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function parseAmount(text) {
    const digits = String(text).replace(/[०-९]/g, (digit) => String("०१२३४५६७८९".indexOf(digit)));
    const numeric = digits.match(/(?:₹\s*)?(\d[\d,]*(?:\.\d{1,2})?)/);
    if (numeric) {
      const amount = Number(numeric[1].replace(/,/g, ""));
      return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
    }

    const tokens = normalize(text).match(/[\p{L}\p{M}\p{N}]+/gu);
    if (!tokens) return null;
    let total = 0;
    let current = 0;
    for (const token of tokens) {
      const value = numberWords[token.toLowerCase()];
      if (value === undefined) continue;
      if (value === 100) {
        current = Math.max(1, current) * 100;
      } else if (value >= 1000) {
        total += Math.max(1, current) * value;
        current = 0;
      } else {
        current += value;
      }
    }
    const amount = total + current;
    return Number.isSafeInteger(amount) && amount > 0 && amount <= 10000000 ? amount : null;
  }

  function matchCustomer(text, customers) {
    const normalized = normalize(text);
    const matches = customers
      .filter((customer) => {
        const names = [customer.name, ...(customer.aliases || [])].map(normalize);
        return names.some((name) => name && ` ${normalized} `.includes(` ${name} `));
      })
      .sort((a, b) => Math.max(normalize(b.name).length, ...(b.aliases || []).map((name) => normalize(name).length))
        - Math.max(normalize(a.name).length, ...(a.aliases || []).map((name) => normalize(name).length)));
    if (!matches.length) return null;
    if (matches.length > 1 && normalize(matches[0].name).length === normalize(matches[1].name).length) return null;
    return matches[0];
  }

  function hasWord(text, words) {
    const padded = ` ${text} `;
    return words.some((word) => padded.includes(` ${normalize(word)} `));
  }

  function parseCommand(text, customers) {
    const normalized = normalize(text);
    if (!normalized) return { intent: "clarify", reason: "empty" };

    if (hasWord(normalized, ["balance", "baki", "baaki", "बाकी", "बकाया", "कितना"])
      && hasWord(normalized, ["balance", "baki", "baaki", "बाकी", "बकाया", "कितना", "उधार", "udhaar"])) {
      const customer = matchCustomer(normalized, customers);
      return customer
        ? { intent: "balance", customer }
        : { intent: "clarify", reason: "customer", question: "Which customer's balance should I check? Please say a name from your customer book." };
    }
    if (hasWord(normalized, ["aaj", "today", "din", "daily", "hisaab", "hisab", "summary", "total", "आज", "हिसाब"])) {
      return { intent: "daily_summary" };
    }

    const repayment = hasWord(normalized, ["jama", "wapas", "chukaya", "chukaye", "chukayi", "lautaya", "lautaye", "bhugtan", "repay", "repaid", "collected", "received", "diye", "diya", "जमा", "वापस", "चुकाया", "चुकाए", "भुगतान", "दिए", "दिया"]);
    const credit = hasWord(normalized, ["udhaar", "khata", "likh", "likho", "credit", "given", "dena", "bhej", "उधार", "खाता", "लिखो", "लिख", "देना"]);
    if (!repayment && !credit) return { intent: "clarify", reason: "type", question: "Is this udhaar given or a repayment received? Please say “udhaar” or “jama”." };

    const customer = matchCustomer(normalized, customers);
    if (!customer) return { intent: "clarify", reason: "customer", question: "I couldn't match that name. Please add the customer to your book or say a name shown there." };
    const amount = parseAmount(normalized);
    if (!amount) return { intent: "clarify", reason: "amount", question: `How many rupees for ${customer.name}? Please say the amount clearly.` };
    if (repayment && credit) return { intent: "clarify", reason: "type", question: "I heard both udhaar and repayment words. Please say just one type: “udhaar” or “jama”." };
    return { intent: "transaction", customer, amount, type: repayment ? "repayment" : "credit" };
  }

  function customerBalances(ledger) {
    return ledger.customers.map((customer) => {
      const balance = ledger.transactions.reduce((sum, transaction) => {
        if (transaction.customerId !== customer.id) return sum;
        return sum + (transaction.type === "credit" ? transaction.amount : -transaction.amount);
      }, 0);
      return { ...customer, balance };
    });
  }

  function dailySummary(ledger, now = new Date()) {
    const today = now.toDateString();
    const transactions = ledger.transactions.filter((transaction) => new Date(transaction.createdAt).toDateString() === today);
    return transactions.reduce((summary, transaction) => {
      const key = transaction.type === "credit" ? "given" : "collected";
      summary[key] += transaction.amount;
      summary[`${key}Count`] += 1;
      return summary;
    }, { given: 0, collected: 0, givenCount: 0, collectedCount: 0 });
  }

  function addTransaction(ledger, { customerId, amount, type, createdAt = new Date().toISOString() }) {
    if (!ledger.customers.some((customer) => customer.id === customerId)) throw new Error("Choose a customer in this ledger.");
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 10000000) throw new Error("Enter a whole-rupee amount between ₹1 and ₹1,00,00,000.");
    if (type !== "credit" && type !== "repayment") throw new Error("Transaction type must be udhaar or repayment.");
    if (type === "repayment") {
      const balance = customerBalances(ledger).find((customer) => customer.id === customerId).balance;
      if (amount > balance) throw new Error("Repayment is higher than this customer's outstanding balance.");
    }
    const transaction = { id: createId(), customerId, amount, type, createdAt, note: type === "credit" ? "Voice entry" : "Voice repayment" };
    ledger.transactions.unshift(transaction);
    return transaction;
  }

  function addCustomer(ledger, name) {
    const cleanName = String(name || "").trim().replace(/\s+/g, " ");
    if (!cleanName || cleanName.length > 40 || !/^[\p{L}\p{M} .'-]+$/u.test(cleanName)) throw new Error("Enter a valid name up to 40 characters.");
    if (ledger.customers.some((customer) => normalize(customer.name) === normalize(cleanName))) throw new Error("That customer is already in your book.");
    const colors = ["coral", "blue", "gold", "green", "violet"];
    const customer = { id: createId(), name: cleanName, color: colors[ledger.customers.length % colors.length] };
    ledger.customers.push(customer);
    return customer;
  }

  function createId() {
    return globalThis.crypto?.randomUUID?.() || `entry-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function loadLedger(storage = globalThis.localStorage) {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return freshLedger();
    const value = JSON.parse(raw);
    if (!Array.isArray(value.customers) || !Array.isArray(value.transactions)) {
      throw new Error("Saved ledger has an unexpected format. Use Reset demo to restore sample data.");
    }
    return value;
  }

  function saveLedger(ledger, storage = globalThis.localStorage) {
    storage.setItem(STORAGE_KEY, JSON.stringify(ledger));
  }

  const api = { STORAGE_KEY, addCustomer, addTransaction, customerBalances, dailySummary, freshLedger, loadLedger, matchCustomer, normalize, parseAmount, parseCommand, saveLedger };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.DukaanLedger = api;
})(globalThis);
