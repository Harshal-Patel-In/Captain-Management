"""Email Service - Gmail SMTP email sending with branded HTML templates"""
import smtplib
import threading
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from typing import Optional

from app.config import settings


# ─── Core Sender ───

def _send_email_sync(to_email: str, subject: str, html_body: str, attachment: Optional[tuple] = None):
    """Send email via Gmail SMTP. Runs inside a background thread."""
    try:
        msg = MIMEMultipart()
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_EMAIL}>"
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(html_body, "html"))

        if attachment:
            filename, data, mime_type = attachment
            part = MIMEApplication(data, Name=filename)
            part["Content-Disposition"] = f'attachment; filename="{filename}"'
            msg.attach(part)

        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(settings.SMTP_EMAIL, settings.SMTP_APP_PASSWORD)
            server.send_message(msg)

        print(f"[EMAIL] Sent to {to_email}: {subject}")
    except Exception as e:
        print(f"[EMAIL ERROR] Failed sending to {to_email}: {e}")


def send_email(to_email: str, subject: str, html_body: str, attachment: Optional[tuple] = None):
    """Fire-and-forget email via background thread so the API stays fast."""
    if not settings.SMTP_EMAIL or not settings.SMTP_APP_PASSWORD:
        print("[EMAIL] SMTP not configured — skipping")
        return
    threading.Thread(
        target=_send_email_sync,
        args=(to_email, subject, html_body, attachment),
        daemon=True,
    ).start()


# ─── Shared HTML Chrome ───

def _wrap(content: str) -> str:
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f1ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
  <div style="background:#0b1d15;border-radius:16px;padding:24px;text-align:center;margin-bottom:24px;">
    <h1 style="color:#f4f1ea;margin:0;font-size:22px;font-weight:700;">Captain Insecticide</h1>
    <p style="color:#f4f1ea99;margin:4px 0 0;font-size:13px;">Order Management</p>
  </div>
  <div style="background:#fff;border-radius:16px;padding:28px 24px;border:1px solid #0b1d1510;">
    {content}
  </div>
  <div style="text-align:center;padding:20px 0 0;color:#0b1d1560;font-size:12px;">
    <p style="margin:0;">This is an automated email from Captain Insecticide.</p>
    <p style="margin:4px 0 0;">Please do not reply to this email.</p>
  </div>
</div></body></html>"""


def _fmt(amount) -> str:
    return f"₹{float(amount):,.2f}"


def _items_table(items: list) -> str:
    rows = ""
    for it in items:
        name = it.get("product_name", "Product")
        qty  = it.get("quantity", 0)
        rate = it.get("unit_price", 0)
        amt  = it.get("line_total", float(rate) * qty)
        rows += f"""<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">{name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">{qty}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">{_fmt(rate)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">{_fmt(amt)}</td>
        </tr>"""
    return f"""<table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;">
      <tr style="background:#f4f1ea;">
        <th style="padding:10px 12px;text-align:left;font-weight:600;font-size:12px;text-transform:uppercase;color:#0b1d15aa;">Item</th>
        <th style="padding:10px 12px;text-align:center;font-weight:600;font-size:12px;text-transform:uppercase;color:#0b1d15aa;">Qty</th>
        <th style="padding:10px 12px;text-align:right;font-weight:600;font-size:12px;text-transform:uppercase;color:#0b1d15aa;">Rate</th>
        <th style="padding:10px 12px;text-align:right;font-weight:600;font-size:12px;text-transform:uppercase;color:#0b1d15aa;">Amount</th>
      </tr>{rows}</table>"""


# ─── Email Templates ───

def send_order_approved_email(to_email, customer_name, order_id, items, total_amount):
    short = order_id[:8]
    html = _wrap(f"""
    <h2 style="color:#0b1d15;margin:0 0 4px;font-size:20px;">Order Approved ✓</h2>
    <p style="color:#0b1d1580;margin:0 0 20px;font-size:14px;">Hello {customer_name or 'Customer'},</p>
    <p style="color:#0b1d15cc;font-size:14px;line-height:1.6;">
      Your order has been <strong style="color:#059669;">approved</strong> and is being prepared for delivery.
    </p>
    <div style="background:#f0fdf4;border-radius:12px;padding:14px 16px;margin:16px 0;border-left:4px solid #059669;">
      <span style="font-size:12px;color:#059669;font-weight:600;text-transform:uppercase;">Order ID</span><br/>
      <span style="font-family:monospace;font-size:14px;color:#0b1d15;">{short}...</span>
    </div>
    {_items_table(items)}
    <div style="text-align:right;padding:12px;background:#f4f1ea;border-radius:10px;margin-top:8px;">
      <span style="font-size:13px;color:#0b1d15aa;">Order Total</span><br/>
      <span style="font-size:22px;font-weight:700;color:#0b1d15;">{_fmt(total_amount)}</span>
    </div>""")
    send_email(to_email, f"Order Approved — {short}", html)


def send_order_rejected_email(to_email, customer_name, order_id, reason=None):
    short = order_id[:8]
    reason_block = ""
    if reason:
        reason_block = f"""<div style="background:#fef2f2;border-radius:12px;padding:14px 16px;margin:16px 0;border-left:4px solid #dc2626;">
          <span style="font-size:12px;color:#dc2626;font-weight:600;text-transform:uppercase;">Reason</span><br/>
          <span style="font-size:14px;color:#0b1d15;">{reason}</span>
        </div>"""
    html = _wrap(f"""
    <h2 style="color:#0b1d15;margin:0 0 4px;font-size:20px;">Order Rejected</h2>
    <p style="color:#0b1d1580;margin:0 0 20px;font-size:14px;">Hello {customer_name or 'Customer'},</p>
    <p style="color:#0b1d15cc;font-size:14px;line-height:1.6;">
      Unfortunately, your order <strong style="font-family:monospace;">{short}...</strong> has been rejected.
    </p>{reason_block}
    <p style="color:#0b1d1580;font-size:13px;margin-top:20px;">
      If you believe this is an error, please contact us.
    </p>""")
    send_email(to_email, f"Order Rejected — {short}", html)


def send_delivery_update_email(to_email, customer_name, order_id, delivered_items, is_fully_delivered):
    short = order_id[:8]
    label = "Fully Delivered" if is_fully_delivered else "Delivery Update"
    color = "#059669" if is_fully_delivered else "#d97706"
    bg    = "#f0fdf4" if is_fully_delivered else "#fffbeb"
    body_text = ('Your order has been <strong style="color:#059669;">fully delivered</strong>.'
                 if is_fully_delivered
                 else 'Part of your order has been delivered. Here are the details:')

    rows = ""
    for d in delivered_items:
        rows += f"""<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">{d['product_name']}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">{d['delivered_quantity']}</td>
        </tr>"""

    html = _wrap(f"""
    <h2 style="color:#0b1d15;margin:0 0 4px;font-size:20px;">{label}</h2>
    <p style="color:#0b1d1580;margin:0 0 20px;font-size:14px;">Hello {customer_name or 'Customer'},</p>
    <p style="color:#0b1d15cc;font-size:14px;line-height:1.6;">{body_text}</p>
    <div style="background:{bg};border-radius:12px;padding:14px 16px;margin:16px 0;border-left:4px solid {color};">
      <span style="font-size:12px;color:{color};font-weight:600;text-transform:uppercase;">Order {short}</span>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;">
      <tr style="background:#f4f1ea;">
        <th style="padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#0b1d15aa;">Item Delivered</th>
        <th style="padding:10px 12px;text-align:center;font-size:12px;text-transform:uppercase;color:#0b1d15aa;">Quantity</th>
      </tr>{rows}</table>""")
    send_email(to_email, f"{label} — Order {short}", html)


def send_payment_received_email(to_email, customer_name, order_id,
                                amount_paid_now, payment_method,
                                total_amount, total_paid, remaining):
    short = order_id[:8]
    remaining_f = float(remaining)
    paid_badge = ""
    if remaining_f <= 0:
        paid_badge = """<div style="background:#f0fdf4;border-radius:10px;padding:12px;text-align:center;margin:16px 0;border:1px solid #bbf7d0;">
          <span style="color:#059669;font-weight:700;font-size:16px;">✓ FULLY PAID</span>
        </div>"""

    html = _wrap(f"""
    <h2 style="color:#0b1d15;margin:0 0 4px;font-size:20px;">Payment Received</h2>
    <p style="color:#0b1d1580;margin:0 0 20px;font-size:14px;">Hello {customer_name or 'Customer'},</p>
    <p style="color:#0b1d15cc;font-size:14px;line-height:1.6;">
      We have recorded a payment for your order.
    </p>
    <div style="background:#f0fdf4;border-radius:12px;padding:14px 16px;margin:16px 0;border-left:4px solid #059669;">
      <span style="font-size:12px;color:#059669;font-weight:600;text-transform:uppercase;">Payment Amount</span><br/>
      <span style="font-size:22px;font-weight:700;color:#0b1d15;">{_fmt(amount_paid_now)}</span>
      <span style="font-size:13px;color:#0b1d15aa;margin-left:8px;">via {payment_method.upper()}</span>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;">
      <tr><td style="padding:6px 0;color:#0b1d15aa;">Order Total</td><td style="padding:6px 0;text-align:right;font-weight:600;">{_fmt(total_amount)}</td></tr>
      <tr><td style="padding:6px 0;color:#0b1d15aa;">Total Paid</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#059669;">{_fmt(total_paid)}</td></tr>
      <tr style="border-top:1px solid #eee;"><td style="padding:8px 0;color:#0b1d15aa;">Remaining Due</td>
        <td style="padding:8px 0;text-align:right;font-weight:700;font-size:16px;color:{'#059669' if remaining_f <= 0 else '#dc2626'};">{_fmt(max(0, remaining_f))}</td></tr>
    </table>{paid_badge}""")
    send_email(to_email, f"Payment Received — Order {short}", html)


def send_bill_email(to_email, customer_name, order_id, pdf_bytes):
    short = order_id[:8]
    html = _wrap(f"""
    <h2 style="color:#0b1d15;margin:0 0 4px;font-size:20px;">Your Bill is Ready</h2>
    <p style="color:#0b1d1580;margin:0 0 20px;font-size:14px;">Hello {customer_name or 'Customer'},</p>
    <p style="color:#0b1d15cc;font-size:14px;line-height:1.6;">
      Your order <strong style="font-family:monospace;">{short}...</strong> has been
      <strong style="color:#059669;">fully delivered</strong> and
      <strong style="color:#059669;">fully paid</strong>.
    </p>
    <p style="color:#0b1d15cc;font-size:14px;line-height:1.6;">
      Please find your detailed bill attached as a PDF.
    </p>
    <div style="background:#f0fdf4;border-radius:12px;padding:16px;text-align:center;margin:20px 0;border:1px solid #bbf7d0;">
      <span style="color:#059669;font-weight:700;font-size:16px;">✓ ORDER COMPLETE — BILL ATTACHED</span>
    </div>
    <p style="color:#0b1d1580;font-size:13px;">Thank you for your business!</p>""")
    attachment = (f"Bill_{short}.pdf", pdf_bytes, "application/pdf")
    send_email(to_email, f"Bill — Order {short}", html, attachment=attachment)
