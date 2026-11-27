#!/usr/bin/env python3
"""Build a compact, selectable-text pitch deck without third-party packages."""

from pathlib import Path
import textwrap

OUT = Path(__file__).resolve().parents[1] / "pitch-deck.pdf"
WIDTH, HEIGHT = 595, 842
GREEN = (0.09, 0.31, 0.22)
INK = (0.12, 0.17, 0.14)
MUTED = (0.39, 0.46, 0.41)
PALE = (0.91, 0.96, 0.91)
GOLD = (0.82, 0.61, 0.25)
WHITE = (1, 1, 1)


def color(value):
    return " ".join(f"{part:.3f}" for part in value)


def escape(value):
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def text(x, y, value, size=11, bold=False, fill=INK):
    font = "F2" if bold else "F1"
    return f"BT /{font} {size} Tf {color(fill)} rg {x} {y} Td ({escape(value)}) Tj ET\n"


def rect(x, y, width, height, fill):
    return f"{color(fill)} rg {x} {y} {width} {height} re f\n"


def lines(values, width=82):
    output = []
    for value in values:
        output.extend(textwrap.wrap(value, width=width) or [""])
    return output


def page_base(number, title, subtitle):
    stream = rect(0, 0, WIDTH, HEIGHT, WHITE)
    stream += rect(0, HEIGHT - 7, WIDTH, 7, GREEN)
    stream += text(48, 804, "DUKAAN SAATHI  /  VOICE UDHAAR CLOSEOUT", 8, True, GREEN)
    stream += text(48, 753, title, 26, True, INK)
    stream += text(48, 729, subtitle, 10, False, MUTED)
    stream += rect(48, 713, 499, 1, PALE)
    stream += text(48, 26, "PROTOTYPE  |  NO FIELD VALIDATION CLAIMED", 7, True, MUTED)
    stream += text(520, 26, f"{number:02d}", 8, True, GREEN)
    return stream


def section(stream, y, heading, content, fill=PALE, width=78):
    wrapped = lines(content, width)
    height = 28 + len(wrapped) * 15 + 13
    stream += rect(48, y - height, 499, height, fill)
    stream += text(63, y - 22, heading, 12, True, GREEN)
    line_y = y - 43
    for line in wrapped:
        stream += text(63, line_y, line, 9.5, False, INK)
        line_y -= 15
    return stream, y - height - 14


def cover_page():
    stream = rect(0, 0, WIDTH, HEIGHT, (0.965, 0.972, 0.945))
    stream += rect(0, HEIGHT - 7, WIDTH, 7, GREEN)
    stream += text(48, 804, "DUKAAN SAATHI  /  HACKATHON PROTOTYPE", 8, True, GREEN)
    stream += text(48, 712, "Close the udhaar", 34, True, INK)
    stream += text(48, 670, "book by voice.", 34, True, GREEN)
    stream += text(50, 628, "A focused, local-first assistant for the daily kirana ledger.", 13, False, MUTED)
    stream += rect(48, 443, 499, 143, WHITE)
    stream += text(68, 551, "SAY", 8, True, GOLD)
    stream += text(68, 525, "(Raju ko 500 udhaar likho)", 16, True, INK)
    stream += text(68, 496, "HEAR IT BACK  ->  CONFIRM  ->  SAVE LOCALLY", 9, True, GREEN)
    stream += rect(68, 474, 5, 5, GOLD)
    stream += text(82, 471, "Then ask: (Raju ka balance kitna hai?)", 10, False, MUTED)
    stream += text(48, 393, "ONE EVERYDAY JOB, DONE CAREFULLY", 9, True, GREEN)
    stream += text(48, 365, "Log a credit or repayment, verify it, and get a balance", 13, False, INK)
    stream += text(48, 345, "or today's total without opening a spreadsheet or typing.", 13, False, INK)
    stream += rect(48, 274, 499, 1, (0.84, 0.88, 0.83))
    stream += text(48, 247, "BUILT FOR", 8, True, MUTED)
    stream += text(48, 225, "Independent neighborhood kirana shops", 12, True, INK)
    stream += text(48, 189, "WHAT IT IS NOT", 8, True, MUTED)
    stream += text(48, 167, "Not a POS, payment rail, tax tool, or full business suite.", 10, False, INK)
    stream += text(48, 26, "PROTOTYPE  |  NO FIELD VALIDATION CLAIMED", 7, True, MUTED)
    stream += text(520, 26, "01", 8, True, GREEN)
    return stream


def build_pages():
    pages = [cover_page()]

    stream = page_base(2, "The moment we are designing for", "A tiny interaction with real consequences: a spoken amount becomes a record.")
    stream, y = section(stream, 685, "The problem hypothesis", [
        "Independent shopkeepers often manage familiar customers and informal credit",
        "during a busy day. Writing every small tab can interrupt serving a customer;",
        "memory-only tracking can make a later balance conversation harder.",
        "These are product hypotheses to validate locally, not measured findings.",
    ])
    stream, y = section(stream, y, "Who feels it first", [
        "A shopkeeper who already keeps a customer-wise udhaar notebook and prefers",
        "Hindi or Hinglish. Customers are the indirect beneficiaries of a clearer",
        "conversation about what is owed and what has been repaid.",
    ], fill=(0.98, 0.96, 0.91))
    stream, y = section(stream, y, "What must be true", [
        "They must be able to complete a credit, repayment, and balance check unaided;",
        "speech recognition must work in their real shop environment; and the spoken",
        "read-back must feel useful rather than like extra work.",
    ])
    pages.append(stream)

    stream = page_base(3, "A narrow voice loop, with a pause to verify", "Voice is the main input. A visible transcript and explicit confirmation protect the ledger.")
    steps = [
        ("01  SPEAK", "(Name + amount + type: Raju ko 500 udhaar likho.)"),
        ("02  CHECK", "Show the transcript. Ask if name, amount, or type is missing."),
        ("03  READ BACK", "Say the proposed entry and wait. Do not write yet."),
        ("04  CONFIRM", "Save only after haan or the visible save button."),
        ("05  ASK", "Answer customer balance and today's credit/repayment totals."),
    ]
    y = 677
    for title, description in steps:
        stream += rect(48, y - 45, 499, 56, PALE if title.startswith(("01", "03", "05")) else (0.98, 0.96, 0.91))
        stream += text(63, y - 13, title, 10, True, GREEN)
        stream += text(185, y - 13, description, 10, False, INK)
        y -= 70
    stream, _ = section(stream, 314, "Guardrails in this prototype", [
        "Missing or mixed details trigger a clarification, not a guessed write.",
        "Repayments above the recorded balance are blocked for review.",
        "Spoken confirmation is required; cancel leaves the ledger unchanged.",
        "No inventory, tax, payments, cloud accounts, or multi-device sync.",
    ], fill=(0.98, 0.96, 0.91))
    pages.append(stream)

    stream = page_base(4, "A reachable market before a made-up TAM", "Start with a small, specific customer group; earn the right to expand.")
    stream, y = section(stream, 685, "Who we serve", [
        "India-based independent neighborhood kirana shops that already track",
        "customer credit informally and have a smartphone available at the counter.",
        "The first user is the owner/shopkeeper, not a finance department or chain.",
    ])
    stream, y = section(stream, y, "Addressable first market", [
        "Beachhead: 3-5 reachable shops in one local area for an opt-in pilot.",
        "Next segment: similar independent shops only after unaided repeat use and",
        "reliable speech performance are demonstrated.",
        "No national TAM/SAM figure is claimed: shop count, reach, willingness to pay,",
        "and retention have not been researched for this product.",
    ], fill=(0.98, 0.96, 0.91))
    stream, y = section(stream, y, "Public context, not proof of demand", [
        "World Bank Global Findex tracks formal and informal financial access and",
        "use across economies. It provides context for financial behavior; it does",
        "not measure kirana udhaar workflows or validate this app.",
        "Source: worldbank.org/en/publication/globalfindex/report",
    ])
    pages.append(stream)

    stream = page_base(5, "What it depends on - and what could fail", "Prototype costs are intentionally small; the hard costs are trust, access, and reliability.")
    stream, y = section(stream, 685, "Core components and availability", [
        "Browser: current Chrome/Edge-style Web Speech API implementation; support",
        "varies by browser, OS, locale, and device. No speech API key or app server",
        "account is required. Source: MDN SpeechRecognition documentation.",
        "App: dependency-free HTML/CSS/JavaScript and Node static server.",
        "Ledger: browser localStorage on this device. Docker Compose is optional.",
    ])
    stream, y = section(stream, y, "Cost and privacy risks", [
        "Direct prototype API cost: none. Hosting, connectivity, a suitable device,",
        "and any future managed speech service can cost money; provider pricing and",
        "terms must be checked before production.",
        "Some browser recognition services send audio to a provider for processing.",
        "This app itself stores ledger data locally, but does not control that audio",
        "path. Network interruptions can stop recognition; the ledger remains local.",
    ], fill=(0.98, 0.96, 0.91))
    stream, y = section(stream, y, "Trust and accounting risks", [
        "Misheard names/amounts, shared-device access, cleared site data, and a small",
        "Hindi/Hinglish vocabulary are material limits. Confirm every entry; keep a",
        "paper backup during pilot. Do not use the demo as the sole legal record.",
    ])
    pages.append(stream)

    stream = page_base(6, "Launch with evidence, not a big promise", "A practical next month is a learning plan - not a claim that the prototype is production-ready.")
    stream, y = section(stream, 685, "1. Validate the counter workflow", [
        "Invite a few nearby shopkeepers; obtain consent; ask them to try an entry,",
        "repayment, balance, summary, correction, and cancellation without coaching.",
        "Record task completion, time, correction rate, language/device, and failures.",
        "Do not collect identifiable audio or customer data without explicit consent.",
    ])
    stream, y = section(stream, y, "2. Improve only what blocks repeat use", [
        "Review recognition errors with participants. Expand names/phrases only after",
        "testing; consider on-device speech or a privacy-reviewed provider only if",
        "it materially improves reliability and its costs/terms are acceptable.",
    ], fill=(0.98, 0.96, 0.91))
    stream, y = section(stream, y, "3. Explore a sustainable rollout", [
        "Try a short, opt-in assisted pilot through local shopkeeper networks. Track",
        "weekly repeat usage and correction burden. Test willingness to pay before",
        "choosing a model; do not assume ads, lending, or transaction fees.",
    ])
    stream += text(48, 143, "SOURCES & LIMITATIONS", 8, True, GREEN)
    stream += text(48, 125, "MDN, SpeechRecognition: developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition", 7.5, False, MUTED)
    stream += text(48, 110, "World Bank, Global Findex 2025 report: worldbank.org/en/publication/globalfindex/report", 7.5, False, MUTED)
    stream += text(48, 92, "No user interviews, field tests, customer counts, market sizing, or production reliability", 8, True, INK)
    stream += text(48, 78, "are claimed in this deck. Validate before expanding.", 8, True, INK)
    pages.append(stream)
    return pages


def make_pdf(pages):
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [" + b" ".join(f"{5 + i * 2} 0 R".encode() for i in range(len(pages))) + b"] /Count " + str(len(pages)).encode() + b" >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    ]
    for index, page in enumerate(pages):
        page_id = 5 + index * 2
        content_id = page_id + 1
        encoded = page.encode("ascii")
        objects.append(
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {WIDTH} {HEIGHT}] "
            f"/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents {content_id} 0 R >>".encode()
        )
        objects.append(f"<< /Length {len(encoded)} >>\nstream\n".encode() + encoded + b"\nendstream")

    output = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for number, item in enumerate(objects, start=1):
        offsets.append(len(output))
        output += f"{number} 0 obj\n".encode() + item + b"\nendobj\n"
    xref_offset = len(output)
    output += f"xref\n0 {len(objects) + 1}\n".encode()
    output += b"0000000000 65535 f \n"
    for offset in offsets[1:]:
        output += f"{offset:010d} 00000 n \n".encode()
    output += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n".encode()
    OUT.write_bytes(output)


if __name__ == "__main__":
    make_pdf(build_pages())
    print(f"Wrote {OUT}")
