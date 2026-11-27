const test = require("node:test");
const assert = require("node:assert/strict");
const Ledger = require("../public/ledger.js");

test("parses numeric and spoken Hinglish rupee amounts", () => {
  assert.equal(Ledger.parseAmount("Raju ko ₹1,250 udhaar"), 1250);
  assert.equal(Ledger.parseAmount("paanch sau rupaye"), 500);
  assert.equal(Ledger.parseAmount("do hazaar"), 2000);
  assert.equal(Ledger.parseAmount("ek lakh"), 100000);
  assert.equal(Ledger.parseAmount("pachhattar rupaye"), 75);
  assert.equal(Ledger.parseAmount("chaubees rupaye"), 24);
  assert.equal(Ledger.parseAmount("सवा सौ"), 125);
  assert.equal(Ledger.parseAmount("ढाई सौ"), 250);
  assert.equal(Ledger.parseAmount("ek crore"), 10000000);
  assert.equal(Ledger.parseAmount("500 nahi 450"), null);
  assert.equal(Ledger.parseAmount("पाँच सौ रुपये"), 500);
  assert.equal(Ledger.parseAmount("राजू को ५०० रुपये"), 500);
  assert.equal(Ledger.parseAmount("amount missing"), null);
});

test("parses unambiguous udhaar and repayment commands against known names", () => {
  const customers = Ledger.freshLedger().customers;
  const given = Ledger.parseCommand("Raju ko 500 udhaar likho", customers);
  assert.deepEqual({ intent: given.intent, name: given.customer.name, amount: given.amount, type: given.type }, {
    intent: "transaction", name: "Raju", amount: 500, type: "credit",
  });
  const received = Ledger.parseCommand("Seema ne do sau rupaye diye", customers);
  assert.deepEqual({ intent: received.intent, name: received.customer.name, amount: received.amount, type: received.type }, {
    intent: "transaction", name: "Seema", amount: 200, type: "repayment",
  });
  const hindi = Ledger.parseCommand("राजू को पाँच सौ उधार लिखो", customers);
  assert.deepEqual({ intent: hindi.intent, name: hindi.customer.name, amount: hindi.amount, type: hindi.type }, {
    intent: "transaction", name: "Raju", amount: 500, type: "credit",
  });
  assert.equal(Ledger.parseCommand("सीमा का कितना बाकी है", customers).intent, "balance");
  assert.equal(Ledger.parseCommand("आज का हिसाब बताओ", customers).intent, "daily_summary");
});

test("understands common shop-floor sentence variations without confusing queries for entries", () => {
  const customers = Ledger.freshLedger().customers;
  const phrases = [
    ["आज Raju के खाते में 250 रुपये लिख दो", "Raju", 250, "credit"],
    ["राजू को दो सौ पचहत्तर का उधार चढ़ा दो", "Raju", 275, "credit"],
    ["सीमा ने दो सौ रुपये जमा किए", "Seema", 200, "repayment"],
    ["Seema se 150 rupaye wapas mile", "Seema", 150, "repayment"],
    ["Seema ne 200 rupaye bheje", "Seema", 200, "repayment"],
  ];
  for (const [phrase, name, amount, type] of phrases) {
    const parsed = Ledger.parseCommand(phrase, customers);
    assert.deepEqual(
      { intent: parsed.intent, name: parsed.customer?.name, amount: parsed.amount, type: parsed.type },
      { intent: "transaction", name, amount, type },
      phrase,
    );
  }
  assert.equal(Ledger.parseCommand("आज जमा कितना हुआ", customers).intent, "daily_summary");
  assert.equal(Ledger.parseCommand("Raju ka hisaab batao", customers).intent, "balance");
  assert.equal(Ledger.parseCommand("Seema ka khata batao", customers).intent, "balance");
  assert.equal(Ledger.parseCommand("Aaj 500 udhaar", customers).reason, "customer");
});

test("adds customers through a spoken Hindi or Hinglish phrase", () => {
  const customers = Ledger.freshLedger().customers;
  assert.deepEqual(Ledger.parseCommand("Naya grahak Meena jodo", customers), {
    intent: "add_customer",
    name: "Meena",
  });
  assert.deepEqual(Ledger.parseCommand("नया ग्राहक मीना जोड़ो", customers), {
    intent: "add_customer",
    name: "मीना",
  });
  assert.equal(Ledger.parseCommand("naya grahak jodo", customers).reason, "customer_name");
});

test("supports a new spoken customer through to a saved credit and balance", () => {
  const ledger = Ledger.freshLedger();
  const addCommand = Ledger.parseCommand("Naya grahak Meena jodo", ledger.customers);
  const customer = Ledger.addCustomer(ledger, addCommand.name);
  const entryCommand = Ledger.parseCommand("Meena ko paanch sau ka udhaar likh do", ledger.customers);
  Ledger.addTransaction(ledger, {
    customerId: entryCommand.customer.id,
    amount: entryCommand.amount,
    type: entryCommand.type,
  });
  assert.equal(Ledger.customerBalances(ledger).find((item) => item.id === customer.id).balance, 500);
});

test("asks for clarification instead of guessing missing customer, amount, or transaction type", () => {
  const customers = Ledger.freshLedger().customers;
  assert.equal(Ledger.parseCommand("500 udhaar likho", customers).reason, "customer");
  assert.equal(Ledger.parseCommand("Raju ko udhaar likho", customers).reason, "amount");
  assert.equal(Ledger.parseCommand("Raju ko 500", customers).reason, "type");
  assert.equal(Ledger.parseCommand("Raju ko 500 udhaar jama", customers).reason, "type");
});

test("computes today's totals and customer balances from the transaction book", () => {
  const ledger = Ledger.freshLedger();
  const totals = Ledger.dailySummary(ledger);
  assert.equal(totals.given, 890);
  assert.equal(totals.collected, 300);
  assert.equal(Ledger.customerBalances(ledger).find((customer) => customer.name === "Raju").balance, 830);
  assert.equal(Ledger.customerBalances(ledger).find((customer) => customer.name === "Seema").balance, 480);
});

test("saves only valid entries and blocks repayments above the recorded balance", () => {
  const ledger = Ledger.freshLedger();
  assert.throws(() => Ledger.addTransaction(ledger, { customerId: "raju", amount: -1, type: "credit" }), /whole-rupee/);
  assert.throws(() => Ledger.addTransaction(ledger, { customerId: "raju", amount: 831, type: "repayment" }), /higher than/);
  const entry = Ledger.addTransaction(ledger, { customerId: "raju", amount: 200, type: "repayment" });
  assert.equal(entry.amount, 200);
  assert.equal(Ledger.customerBalances(ledger).find((customer) => customer.id === "raju").balance, 630);
});

test("validates duplicate and malformed customer names", () => {
  const ledger = Ledger.freshLedger();
  assert.throws(() => Ledger.addCustomer(ledger, "raju"), /already/);
  assert.throws(() => Ledger.addCustomer(ledger, "राजू"), /already/);
  assert.throws(() => Ledger.addCustomer(ledger, "<script>"), /valid name/);
  assert.equal(Ledger.addCustomer(ledger, "Meena").name, "Meena");
});
