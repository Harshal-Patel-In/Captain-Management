"""Bill Service - Professional HTML/CSS invoice rendered to PDF via headless Chromium"""
import base64
import glob
import os
import subprocess
import tempfile
from datetime import datetime
from sqlalchemy.orm import Session


def _find_chromium() -> str:
    """Find Chromium binary installed by Playwright."""
    patterns = [
        os.path.expanduser("~/AppData/Local/ms-playwright/chromium-*/chrome-win64/chrome.exe"),
        os.path.expanduser("~/AppData/Local/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-win64/chrome-headless-shell.exe"),
    ]
    for pat in patterns:
        hits = glob.glob(pat)
        if hits:
            return hits[-1]
    raise FileNotFoundError("Chromium not found. Run: python -m playwright install chromium")


_CHROMIUM = _find_chromium()

# ── Logo as base64 data URI (3 levels up from backend/app/services/ → project root) ──
_LOGO_PATH = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "public", "image.png")
)
_LOGO_B64 = ""
if os.path.exists(_LOGO_PATH):
    with open(_LOGO_PATH, "rb") as f:
        _LOGO_B64 = base64.b64encode(f.read()).decode()


def _rs(amount) -> str:
    """Format as ₹ with Indian comma grouping."""
    amt = float(amount)
    sign = "-" if amt < 0 else ""
    amt = abs(amt)
    whole = int(amt)
    paise = f"{amt - whole:.2f}"[1:]
    s = str(whole)
    if len(s) > 3:
        last3 = s[-3:]
        rest = s[:-3]
        groups = []
        while rest:
            groups.insert(0, rest[-2:])
            rest = rest[:-2]
        s = ",".join(groups) + "," + last3
    return f"{sign}₹{s}{paise}"


def _amount_in_words(amount) -> str:
    """Convert a number to Indian English words for invoice."""
    ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
            "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
            "Seventeen", "Eighteen", "Nineteen"]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

    def _two_digits(n):
        if n < 20:
            return ones[n]
        return (tens[n // 10] + " " + ones[n % 10]).strip()

    def _three_digits(n):
        if n >= 100:
            return ones[n // 100] + " Hundred " + _two_digits(n % 100)
        return _two_digits(n)

    amt = float(amount)
    whole = int(amt)
    paise = round((amt - whole) * 100)

    if whole == 0:
        words = "Zero"
    else:
        # Indian system: last 3 digits, then groups of 2 (thousand, lakh, crore)
        parts = []
        # Crore
        if whole >= 10000000:
            parts.append(_two_digits(whole // 10000000) + " Crore")
            whole %= 10000000
        # Lakh
        if whole >= 100000:
            parts.append(_two_digits(whole // 100000) + " Lakh")
            whole %= 100000
        # Thousand
        if whole >= 1000:
            parts.append(_two_digits(whole // 1000) + " Thousand")
            whole %= 1000
        # Hundreds
        if whole > 0:
            parts.append(_three_digits(whole))
        words = " ".join(parts)

    result = words
    if paise > 0:
        result += " and " + _two_digits(paise) + " Paise"
    result += " Only"
    return result


def _build_html(order, db: Session) -> str:
    """Build HTML invoice matching real Captain Insecticide tax invoice layout."""
    user = order.user
    items = order.items
    pay_logs = sorted(order.payment_logs, key=lambda p: p.created_at)
    short = str(order.id)[:8].upper()
    now = datetime.now()
    bill_date = now.strftime("%d/%m/%Y")
    order_date = order.created_at.strftime("%d/%m/%Y") if order.created_at else bill_date
    total = float(order.total_amount)
    paid = float(order.amount_paid)
    balance = max(0, total - paid)

    # Customer address
    addr_line1 = user.address_line1 or ""
    addr_line2 = user.address_line2 or ""
    city_state = ", ".join(filter(None, [user.city, user.state]))
    postal = user.postal_code or ""

    # Order items rows
    items_rows = ""
    for i, item in enumerate(items, 1):
        prod = item.product
        pname = prod.name if prod else "Unknown"
        unit = (prod.unit_of_measure if prod else "") or ""
        qty = item.quantity
        rate = float(item.unit_price)
        amt = float(item.line_total)
        items_rows += f"""
                    <tr>
                        <td class="c bdr">{i}</td>
                        <td class="bdr">{pname}</td>
                        <td class="c bdr">{unit}</td>
                        <td class="c bdr">{qty}</td>
                        <td class="r bdr">{_rs(rate)}</td>
                        <td class="r">{_rs(amt)}</td>
                    </tr>"""

    # Payment rows for bottom section
    payment_rows = ""
    for i, pl in enumerate(pay_logs, 1):
        amt = float(pl.amount_paid)
        dt = pl.created_at.strftime("%d/%m/%Y") if pl.created_at else "-"
        method = (pl.payment_method or "").upper()
        payment_rows += f"""
                    <tr>
                        <td class="c bdr">{i}</td>
                        <td class="bdr">{dt}</td>
                        <td class="c bdr">{method}</td>
                        <td class="r">{_rs(amt)}</td>
                    </tr>"""

    # Words
    total_words = _amount_in_words(total)

    # Paid stamp
    paid_stamp = ""
    if balance <= 0:
        paid_stamp = """
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-25deg);
            border:4px solid rgba(4,120,87,0.5);color:rgba(4,120,87,0.5);
            padding:10px 40px;font-size:42px;font-weight:900;letter-spacing:8px;
            border-radius:8px;pointer-events:none;text-transform:uppercase;">PAID</div>"""

    logo_img = ""
    if _LOGO_B64:
        logo_img = f'<img src="data:image/png;base64,{_LOGO_B64}" alt="Captain Insecticide" style="height:60px;width:auto;">'

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
@page {{ size: A4; margin: 0; }}
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
body {{
    font-family: 'Segoe UI', Arial, sans-serif;
    color: #000;
    background: #fff;
    font-size: 11px;
    line-height: 1.4;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
}}
.page {{
    width: 210mm;
    min-height: 297mm;
    padding: 12mm 10mm 8mm;
    position: relative;
}}
.outer {{
    border: 2px solid #000;
    position: relative;
}}

/* ── HEADER ── */
.header-block {{
    text-align: center;
    padding: 10px 16px 4px;
    border-bottom: 2px solid #000;
}}
.company-logo {{
    margin-bottom: 4px;
}}
.company-name {{
    font-size: 22px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 3px;
    margin-bottom: 2px;
}}
.company-addr {{
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    color: #333;
    margin-bottom: 4px;
    line-height: 1.3;
}}

/* ── INVOICE TYPE BAR ── */
.inv-type-bar {{
    display: flex;
    border-bottom: 1px solid #000;
    font-size: 10px;
}}
.inv-type-bar > div {{
    padding: 3px 10px;
    border-right: 1px solid #000;
}}
.inv-type-bar > div:last-child {{
    border-right: none;
    margin-left: auto;
}}
.inv-type-bar .center-label {{
    flex: 1;
    text-align: center;
    font-weight: 900;
    font-size: 13px;
    letter-spacing: 3px;
}}

/* ── PARTY INFO ── */
.party-row {{
    display: flex;
    border-bottom: 1px solid #000;
}}
.party-col {{
    flex: 1;
    padding: 6px 10px;
    font-size: 11px;
    line-height: 1.5;
}}
.party-col:first-child {{
    border-right: 1px solid #000;
}}
.party-header {{
    font-weight: 700;
    font-size: 10px;
    text-align: center;
    border-bottom: 1px solid #999;
    padding-bottom: 3px;
    margin-bottom: 4px;
}}
.party-col b {{ font-weight: 700; }}
.field-row {{
    display: flex;
    gap: 4px;
    padding: 1px 0;
}}
.field-row .fl {{ color: #555; min-width: 85px; font-weight: 600; }}
.field-row .fv {{ font-weight: 600; }}

/* ── ITEMS TABLE ── */
.items-table {{
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
}}
.items-table th {{
    background: #f0f0f0;
    border-bottom: 2px solid #000;
    border-right: 1px solid #000;
    padding: 5px 6px;
    font-size: 10px;
    font-weight: 700;
    text-align: center;
}}
.items-table th:last-child {{ border-right: none; }}
.items-table td {{
    padding: 5px 6px;
    border-bottom: 1px solid #ccc;
    vertical-align: top;
}}
.items-table tbody tr:last-child td {{
    border-bottom: 1px solid #000;
}}
.bdr {{ border-right: 1px solid #ccc; }}
.c {{ text-align: center; }}
.r {{ text-align: right; }}
.l {{ text-align: left; }}

/* ── BOTTOM SECTION ── */
.bottom-row {{
    display: flex;
    border-top: 1px solid #000;
}}
.bottom-left {{
    flex: 1;
    border-right: 1px solid #000;
    padding: 0;
}}
.bottom-right {{
    width: 240px;
    padding: 0;
}}
.bottom-right .br-row {{
    display: flex;
    justify-content: space-between;
    padding: 4px 10px;
    border-bottom: 1px solid #ccc;
    font-size: 11px;
}}
.bottom-right .br-row:last-child {{
    border-bottom: none;
}}
.bottom-right .br-row .br-label {{ color: #333; }}
.bottom-right .br-row .br-value {{ font-weight: 700; text-align: right; }}
.bottom-right .br-grand {{
    background: #f0f0f0;
    border-top: 2px solid #000;
    font-size: 13px;
    font-weight: 900;
    padding: 6px 10px;
}}

.bl-section {{
    padding: 4px 10px;
    border-bottom: 1px solid #ccc;
    font-size: 10px;
    line-height: 1.4;
}}
.bl-section:last-child {{ border-bottom: none; }}
.bl-section b {{ font-weight: 700; }}

/* ── FOOTER ── */
.footer-row {{
    display: flex;
    border-top: 2px solid #000;
}}
.footer-left {{
    flex: 1;
    padding: 6px 10px;
    font-size: 9px;
    line-height: 1.6;
    border-right: 1px solid #000;
    color: #444;
}}
.footer-right {{
    width: 200px;
    padding: 6px 10px;
    text-align: center;
    font-size: 10px;
    font-weight: 700;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}}
.signature-line {{
    margin-top: 24px;
    border-top: 1px solid #000;
    padding-top: 4px;
    font-size: 9px;
    font-weight: 400;
    color: #555;
}}
</style>
</head>
<body>
<div class="page">
<div class="outer">

    {paid_stamp}

    <!-- ══ HEADER ══ -->
    <div class="header-block">
        <div class="company-logo">{logo_img}</div>
        <div class="company-name">Captain Insecticide</div>
        <div class="company-addr">
            Plot No. 12, Patel Udhyognagar, Near Harsidhi Plastic, Jabalpur, Tankara<br>
            Morbi
        </div>
    </div>

    <!-- ══ INVOICE TYPE BAR ══ -->
    <div class="inv-type-bar">
        <div>Debit Memo</div>
        <div class="center-label">TAX INVOICE</div>
        <div>Original</div>
    </div>

    <!-- ══ PARTY INFO ══ -->
    <div class="party-row">
        <div class="party-col">
            <div class="party-header">Buyer To Party</div>
            <div style="margin-bottom:6px;">
                <b>M/s. :&nbsp; {user.full_name or "Customer"}</b><br>
                {addr_line1}{"<br>" + addr_line2 if addr_line2 else ""}<br>
                {city_state}{" - " + postal if postal else ""}
            </div>
            <div class="field-row"><span class="fl">Phone No.</span>: <span class="fv">&nbsp;{user.phone_number or "N/A"}</span></div>
            <div class="field-row"><span class="fl">Email</span>: <span class="fv">&nbsp;{user.email or "N/A"}</span></div>
        </div>
        <div class="party-col">
            <div class="party-header">Ship To Party</div>
            <div style="margin-bottom:6px;">
                <b>M/s. :&nbsp; {user.full_name or "Customer"}</b><br>
                {addr_line1}{"<br>" + addr_line2 if addr_line2 else ""}<br>
                {city_state}{" - " + postal if postal else ""}
            </div>
            <div class="field-row"><span class="fl">Invoice No.</span>: <span class="fv">&nbsp;CI/{short}</span></div>
            <div class="field-row"><span class="fl">Date</span>: <span class="fv">&nbsp;{order_date}</span></div>
        </div>
    </div>

    <!-- ══ ITEMS TABLE ══ -->
    <table class="items-table">
        <thead>
            <tr>
                <th style="width:5%">Sr<br>No.</th>
                <th style="width:32%">Product Name</th>
                <th style="width:12%">Unit</th>
                <th style="width:8%">Qty</th>
                <th style="width:18%">Rate</th>
                <th style="width:20%">Amount</th>
            </tr>
        </thead>
        <tbody>
            {items_rows}
            <!-- empty filler rows to maintain table height -->
            <tr style="height:40px"><td class="bdr"></td><td class="bdr"></td><td class="c bdr"></td><td class="c bdr"></td><td class="r bdr"></td><td class="r"></td></tr>
        </tbody>
    </table>

    <!-- ══ BOTTOM: LEFT + RIGHT ══ -->
    <div class="bottom-row">
        <div class="bottom-left">
            <div class="bl-section">
                <b>Bill Amount :</b>&nbsp; {total_words}
            </div>
            {"" if not pay_logs else '<div class="bl-section"><b>Payment History :</b><table style="width:100%;border-collapse:collapse;font-size:10px;margin-top:4px;"><thead><tr><th style="border-bottom:1px solid #999;padding:2px 4px;text-align:center;font-size:9px;">#</th><th style="border-bottom:1px solid #999;padding:2px 4px;text-align:left;font-size:9px;">Date</th><th style="border-bottom:1px solid #999;padding:2px 4px;text-align:center;font-size:9px;">Method</th><th style="border-bottom:1px solid #999;padding:2px 4px;text-align:right;font-size:9px;">Amount</th></tr></thead><tbody>' + payment_rows + '</tbody></table></div>'}
            <div class="bl-section" style="font-size:9px;color:#555;">
                <b>Note :</b>&nbsp; {"Payment received in full. Thank you!" if balance <= 0 else f"Balance remaining: {_rs(balance)}"}
            </div>
        </div>
        <div class="bottom-right">
            <div class="br-row">
                <span class="br-label">Sub Total</span>
                <span class="br-value">{_rs(total)}</span>
            </div>
            <div class="br-row">
                <span class="br-label">Amount Paid</span>
                <span class="br-value">{_rs(paid)}</span>
            </div>
            <div class="br-row">
                <span class="br-label">Balance Due</span>
                <span class="br-value" style="color:{"#047857" if balance <= 0 else "#b91c1c"}">{_rs(balance)}</span>
            </div>
            <div class="br-row br-grand">
                <span>Grand Total</span>
                <span>{_rs(total)}</span>
            </div>
        </div>
    </div>

    <!-- ══ FOOTER ══ -->
    <div class="footer-row">
        <div class="footer-left">
            <b>Terms &amp; Conditions :</b><br>
            1. Goods once sold will not be taken back.<br>
            2. Interest @18% p.a. will be charged if payment is not made within due date.<br>
            3. Our risk and responsibility ceases as soon as the goods leave our premises.<br>
            4. Subject to 'MORBI' Jurisdiction only. E.&amp;O.E.
        </div>
        <div class="footer-right">
            For, CAPTAIN INSECTICIDE
            <div class="signature-line">Authorised Signatory</div>
        </div>
    </div>

</div>

<div style="text-align:center;margin-top:6px;font-size:8px;color:#aaa;">
    Generated on {now.strftime("%d/%m/%Y")} at {now.strftime("%I:%M %p")} &middot; Invoice INV-{short}
</div>

</div>
</body>
</html>"""
    return html


def generate_bill_pdf(order, db: Session) -> bytes:
    """Generate a professional A4 PDF bill using HTML/CSS + headless Chromium. Returns raw PDF bytes."""
    html = _build_html(order, db)

    with tempfile.TemporaryDirectory() as tmp:
        html_path = os.path.join(tmp, "bill.html")
        pdf_path = os.path.join(tmp, "bill.pdf")

        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html)

        file_url = "file:///" + html_path.replace("\\", "/")

        subprocess.run(
            [
                _CHROMIUM,
                "--headless=new",
                "--disable-gpu",
                "--no-sandbox",
                "--disable-software-rasterizer",
                f"--print-to-pdf={pdf_path}",
                "--no-pdf-header-footer",
                file_url,
            ],
            capture_output=True,
            timeout=30,
            check=True,
        )

        with open(pdf_path, "rb") as f:
            return f.read()
