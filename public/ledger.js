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
    dedh: 1.5, dhai: 2.5, sava: 1.25, sawa: 1.25,
    three: 3, char: 4, chaar: 4, four: 4, paanch: 5, panch: 5, five: 5,
    chhe: 6, cheh: 6, six: 6, saat: 7, sat: 7, seven: 7, aath: 8, eight: 8,
    nau: 9, nine: 9, das: 10, dus: 10, ten: 10, gyarah: 11, bara: 12,
    barah: 12, pandrah: 15, bis: 20, bees: 20, chaubees: 24, chaubis: 24,
    pachees: 25, pachis: 25, chhabbis: 26, chabbis: 26, sattais: 27,
    athais: 28, untis: 29,
    tees: 30, chalis: 40, pachaas: 50, pachhas: 50, saath: 60, sattar: 70,
    assi: 80, nabbe: 90, sau: 100, so: 100, hundred: 100, hazaar: 1000,
    hajar: 1000, thousand: 1000, lakh: 100000, lac: 100000, crore: 10000000, karod: 10000000,
    एक: 1, दो: 2, तीन: 3, चार: 4, पांच: 5, पाँच: 5, छः: 6, छह: 6,
    सात: 7, आठ: 8, नौ: 9, दस: 10, ग्यारह: 11, बारह: 12, तेरह: 13,
    चौदह: 14, पंद्रह: 15, सोलह: 16, सत्रह: 17, अठारह: 18, उन्नीस: 19,
    बीस: 20, तीस: 30, चालीस: 40, पचास: 50, साठ: 60, सत्तर: 70,
    अस्सी: 80, नब्बे: 90, सौ: 100, सैकड़ा: 100, हजार: 1000,
    हज़ार: 1000, लाख: 100000, करोड़: 10000000,
    baraah: 12, terah: 13, chaudah: 14, solah: 16, satrah: 17,
    atharah: 18, unnis: 19, ikkis: 21, baees: 22, bais: 22,
    teis: 23, taintis: 33, chauntis: 34, paintis: 35, chhattis: 36,
    saintis: 37, adtis: 38, untalis: 39, iktalis: 41, bayalis: 42,
    tiralis: 43, chawalis: 44, paintalis: 45, chiyalis: 46, saintalis: 47,
    adtalis: 48, unchaas: 49, ikyavan: 51, bavan: 52, tirpan: 53,
    chauvan: 54, pachpan: 55, chhappan: 56, sattavan: 57, athavan: 58,
    unsath: 59, iksath: 61, basath: 62, tirsath: 63, chaunsath: 64,
    painsath: 65, chhiyasath: 66, sarsath: 67, adsath: 68, unhattar: 69,
    ikhattar: 71, bahattar: 72, tihattar: 73, chauhattar: 74, pachhattar: 75,
    chihattar: 76, satahattar: 77, athhattar: 78, unasi: 79, ikyasi: 81,
    bayasi: 82, tirasi: 83, chaurasi: 84, pachasi: 85, chhiyasi: 86,
    satasi: 87, athasi: 88, navasi: 89, ikyanve: 91, baanve: 92,
    tiranve: 93, chauranve: 94, pachanve: 95, chhiyanve: 96, sattanve: 97,
    athanve: 98, ninyanve: 99,
    ग्यारह: 11, बारह: 12, तेरह: 13, चौदह: 14, सोलह: 16, सत्रह: 17,
    अठारह: 18, उन्नीस: 19, इक्कीस: 21, बाईस: 22, बाइस: 22, तेईस: 23,
    चौबीस: 24, पच्चीस: 25, छब्बीस: 26, सत्ताईस: 27, अट्ठाईस: 28,
    उनतीस: 29, इकतीस: 31, बत्तीस: 32, तैंतीस: 33, चौंतीस: 34,
    पैंतीस: 35, छत्तीस: 36, सैंतीस: 37, अड़तीस: 38, उनतालीस: 39,
    इकतालीस: 41, बयालीस: 42, तैंतालीस: 43, चवालीस: 44, पैंतालीस: 45,
    छियालीस: 46, सैंतालीस: 47, अड़तालीस: 48, उनचास: 49, इक्यावन: 51,
    बावन: 52, तिरपन: 53, चौवन: 54, पचपन: 55, छप्पन: 56, सत्तावन: 57,
    अट्ठावन: 58, उनसठ: 59, इकसठ: 61, बासठ: 62, तिरसठ: 63, चौंसठ: 64,
    पैंसठ: 65, छियासठ: 66, सड़सठ: 67, अड़सठ: 68, उनहत्तर: 69,
    इकहत्तर: 71, बहत्तर: 72, तिहत्तर: 73, चौहत्तर: 74, पचहत्तर: 75,
    छिहत्तर: 76, सतहत्तर: 77, अठहत्तर: 78, उनासी: 79, इक्यासी: 81,
    बयासी: 82, तिरासी: 83, चौरासी: 84, पचासी: 85, छियासी: 86,
    सत्तासी: 87, अट्ठासी: 88, नवासी: 89, इक्यानवे: 91, बानवे: 92,
    तिरानवे: 93, चौरानवे: 94, पंचानवे: 95, छियानवे: 96, सत्तानवे: 97,
    अट्ठानवे: 98, निन्यानवे: 99,
    डेढ़: 1.5, ढाई: 2.5, सवा: 1.25,
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
    const numerics = [...digits.matchAll(/(?:₹\s*)?(\d[\d,]*(?:\.\d{1,2})?)/g)]
      .map((match) => Number(match[1].replace(/,/g, "")));
    if (numerics.length) {
      if (new Set(numerics).size > 1) return null;
      const amount = numerics[0];
      return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
    }

    const tokens = normalize(text).match(/[\p{L}\p{M}\p{N}]+/gu);
    if (!tokens) return null;
    const runs = [];
    let run = [];
    for (const token of tokens) {
      const value = numberWords[token.toLowerCase()];
      if (value !== undefined) {
        run.push(value);
      } else if ((token === "aur" || token === "and") && run.length) {
        continue;
      } else if (run.length) {
        runs.push(run);
        run = [];
      }
    }
    if (run.length) runs.push(run);
    if (!runs.length) return null;

    const parseRun = (values) => {
      let total = 0;
      let current = 0;
      for (const value of values) {
        if (value === 100) {
          current = Math.max(1, current) * 100;
        } else if (value >= 1000) {
          total += Math.max(1, current) * value;
          current = 0;
        } else {
          current += value;
        }
      }
      return total + current;
    };
    const longest = Math.max(...runs.map((candidate) => candidate.length));
    const candidates = [...new Set(runs.filter((candidate) => candidate.length === longest).map(parseRun))];
    if (candidates.length !== 1) return null;
    const amount = candidates[0];
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

  function hasPhrase(text, phrases) {
    const padded = ` ${text} `;
    return phrases.some((phrase) => padded.includes(` ${normalize(phrase)} `));
  }

  function parseNewCustomer(text) {
    const normalized = normalize(text);
    const prefix = /^(?:(?:please )?(?:add|new|naya|nayi|नया|नई|नए)\s+)?(?:customer|grahak|ग्राहक)(?:\s+(?:book|list|सूची|बही))?\s+(.+?)(?:\s+(?:please\s+)?(?:jodo|jod do|add|add karo|जोड़ो|जोड़ें|जोड़ दो|जोड़ दें))?$/u;
    const suffix = /^(.+?)\s+(?:(?:ko|को)\s+)?(?:customer|grahak|ग्राहक)(?:\s+(?:book|list|me|mein|सूची|सूची में|बही|में))?\s+(?:jodo|jod do|add|add karo|जोड़ो|जोड़ें|जोड़ दो|जोड़ दें)$/u;
    const match = normalized.match(prefix) || normalized.match(suffix);
    if (!match) return null;
    const normalizedName = match[1].trim().replace(/^(?:naam|name)\s+/u, "");
    if (["add", "jodo", "jod", "jod do", "जोड़ो", "जोड़ें", "जोड़ दो", "जोड़ दें"].includes(normalizedName)) return null;
    const nameStart = text.toLocaleLowerCase("en-IN").indexOf(normalizedName);
    const name = nameStart < 0 ? normalizedName : text.slice(nameStart, nameStart + normalizedName.length);
    if (!name || name.length > 40 || !/^[\p{L}\p{M} .'-]+$/u.test(name)) return null;
    return name;
  }

  function parseCommand(text, customers) {
    const normalized = normalize(text);
    if (!normalized) return { intent: "clarify", reason: "empty" };

    const addCustomerCue = hasPhrase(normalized, [
      "add customer", "new customer", "naya customer", "nayi customer", "customer jodo",
      "customer list", "customer book", "add grahak", "grahak list", "grahak suchi",
      "new grahak", "naya grahak", "nayi grahak", "grahak jodo", "नया ग्राहक",
      "नई ग्राहक", "ग्राहक जोड़ो", "ग्राहक जोड़ें", "ग्राहक सूची",
    ]);
    if (addCustomerCue) {
      const name = parseNewCustomer(text);
      return name
        ? { intent: "add_customer", name }
        : { intent: "clarify", reason: "customer_name", question: "Please say the new customer's name, for example: “naya grahak Meena jodo”." };
    }

    const customer = matchCustomer(normalized, customers);
    const amount = parseAmount(normalized);
    const repayment = hasPhrase(normalized, [
      "jama", "jama karo", "wapas", "wapas kiya", "chuka diya", "chukaya", "chukaye",
      "bhugtan", "payment mila", "paise mile", "paisa mila", "vasool hua", "pay kiya",
      "paise bheje", "bhej diya", "bhej diye", "aa gaya", "aa gaye",
      "received", "repaid", "collected", "paid back", "settled", "जमा", "वापस",
      "चुका दिया", "चुकाया", "चुकाए", "भुगतान", "मिल गया", "मिले", "मिली",
      "वसूल हुआ", "पैसे मिले", "भुगतान मिला", "भेजा", "भेजे", "आ गए", "आया",
    ]) || (hasWord(normalized, ["diya", "diye", "bheja", "bheje", "दिया", "दिए", "भेजा", "भेजे"])
      && hasWord(normalized, ["ne", "ने"]))
      || (hasWord(normalized, ["mila", "mile", "mili", "liya", "liye", "मिला", "मिले", "मिली", "लिए"])
        && hasWord(normalized, ["se", "से"]));
    const credit = hasPhrase(normalized, [
      "udhaar", "udhar", "khata", "credit", "likho", "likh do", "laga do",
      "chadha do", "jod do", "de do", "de diya", "udhaar diya", "उधार",
      "खाता", "लिखो", "लिख दो", "चढ़ा दो", "जोड़ दो", "उधार दिया",
    ]) || (hasWord(normalized, ["diya", "diye", "दिया", "दिए"]) && hasWord(normalized, ["ko", "को"]));
    const hasTransactionCue = repayment || credit;
    const balanceQuestion = hasPhrase(normalized, [
      "kitna baki", "kitna baaki", "kitna udhaar", "kitna dena", "ka balance",
      "ka baki", "ka baaki", "ka udhaar", "ka khata", "khata batao", "balance batao", "बाकी कितना",
      "कितना बाकी", "कितना बकाया", "कितना उधार", "का बाकी", "का उधार",
      "बैलेंस बताओ", "खाता बताओ", "खाते में कितना", "खाते का हिसाब",
    ]) || (hasWord(normalized, ["balance", "baki", "baaki", "बाकी", "बकाया"])
      && hasWord(normalized, ["kitna", "kya", "batao", "hai", "कितना", "क्या", "बताओ", "है"]))
      || (customer && hasPhrase(normalized, ["ka hisab", "ka hisaab", "का हिसाब"]));
    const dailyQuestion = hasWord(normalized, ["aaj", "today", "daily", "आज", "आजका"])
      && (hasWord(normalized, ["hisaab", "hisab", "summary", "total", "collection", "bikri", "credit", "repayment", "udhaar", "udhari", "हिसाब", "कुल", "उधार"])
        || hasPhrase(normalized, ["kitna udhaar", "udhaar kitna", "kitna jama", "jama kitna", "kitni udhaari", "kitna diya", "kitna mila", "कितना उधार", "कितना जमा", "जमा कितना", "आज का जमा", "आज का उधार"]));

    if (customer && amount && hasTransactionCue) {
      if (repayment && credit) {
        return { intent: "clarify", reason: "type", question: "I heard both udhaar and repayment words. Please say just one type: “udhaar” or “jama”." };
      }
      return { intent: "transaction", customer, amount, type: repayment ? "repayment" : "credit" };
    }

    if (dailyQuestion && !(customer && hasTransactionCue) && !(amount && hasTransactionCue)) {
      return { intent: "daily_summary" };
    }

    if (balanceQuestion) {
      const customer = matchCustomer(normalized, customers);
      return customer
        ? { intent: "balance", customer }
        : { intent: "clarify", reason: "customer", question: "Which customer's balance should I check? Please say a name from your customer book." };
    }
    if (hasTransactionCue || (customer && amount)) {
      if (repayment && credit) return { intent: "clarify", reason: "type", question: "I heard both udhaar and repayment words. Please say just one type: “udhaar” or “jama”." };
      if (!customer) return { intent: "clarify", reason: "customer", question: "I couldn't match that name. Say the name exactly as it appears in your customer book." };
      if (!amount) return { intent: "clarify", reason: "amount", question: `How many rupees for ${customer.name}? Please say the amount clearly.` };
      return { intent: "clarify", reason: "type", question: "Is this udhaar given or a repayment received? Please say “udhaar” or “jama”." };
    }

    if (dailyQuestion) return { intent: "daily_summary" };
    return { intent: "clarify", reason: "type", question: "I didn't quite get that. Say a customer name, amount, and “udhaar” or “jama”, or ask for today's hisaab." };
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
    if (matchCustomer(cleanName, ledger.customers)) throw new Error("That customer is already in your book.");
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
