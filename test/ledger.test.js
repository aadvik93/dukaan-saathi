const test = require("node:test");
const assert = require("node:assert/strict");
const Ledger = require("../public/ledger.js");

test("parses numeric and spoken Hinglish rupee amounts", () => {
  assert.equal(Ledger.parseAmount("Raju ko ₹1,250 udhaar"), 1250);
  assert.equal(Ledger.parseAmount("paanch sau rupaye"), 500);
  assert.equal(Ledger.parseAmount("do hazaar"), 2000);
  assert.equal(Ledger.parseAmount("ek lakh"), 100000);
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
  assert.throws(() => Ledger.addCustomer(ledger, "<script>"), /valid name/);
  assert.equal(Ledger.addCustomer(ledger, "Meena").name, "Meena");
});
