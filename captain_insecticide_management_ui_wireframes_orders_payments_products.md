# Captain Insecticide – Management UI Wireframes

This document defines the **complete Management App UI wireframes** for the Captain Insecticide system.
It directly maps UI screens to database structure and backend workflows.

Scope covered in this document:
- Orders Management (Approve / Deliver / Pay)
- Product Publishing to E-commerce
- Payment Logs & Audit Screens
- UX rules & validations
- PDF Payment Receipt design

---

## 2. Orders List Screen

### Purpose
The Orders List is the primary screen for the owner/admin to monitor and manage all customer orders placed from the E-commerce app.

### Layout
Orders are displayed as cards or rows, grouped by status tabs.

```
Orders
──────────────────────────────────────────────
[ Pending ] [ Approved ] [ Partial ] [ Delivered ] [ Rejected ]

┌──────────────────────────────────────────────┐
│ Order ID: ORD-1023                            │
│ Customer: Iron Traders                       │
│ Total: ₹10,000   Paid: ₹5,000   Due: ₹5,000  │
│ Status: Approved | Payment: Partial          │
│ Date: 12 Feb 2026                            │
│ [ View Details ]                             │
└──────────────────────────────────────────────┘
```

### Displayed Fields
- Order ID
- Customer / Organization name
- Total amount
- Paid amount
- Remaining amount (auto-calculated)
- Order status
- Payment status
- Order creation date

### UX Rules
- Status color coding:
  - Pending → Yellow
  - Approved → Blue
  - Partial Delivery → Orange
  - Fully Delivered → Green
  - Rejected → Red
- Remaining amount is **never editable**
- Orders are sorted by newest first by default

---

## 3. Order Detail Screen

### Purpose
The Order Detail screen is the **control center** for approving, delivering, and collecting payments.

### Layout

```
Order ORD-1023
──────────────────────────────────────────────

Customer Info
─────────────
Name: Iron Traders
Email: iron@shop.com
Phone: 9XXXXXXXXX
Address: Ahmedabad, Gujarat

Order Summary
─────────────
Total Amount: ₹10,000
Paid Amount:  ₹5,000
Remaining:    ₹5,000

Status: Approved
Payment Status: Partial

------------------------------------------------

Items
------------------------------------------------
| Product      | Ordered | Delivered | Remaining |
| Iron Man     | 10      | 6         | 4         |
| Captain Max  | 5       | 5         | 0         |

------------------------------------------------

Actions
------------------------------------------------
[ Approve Order ]   (only if status = pending)
[ Reject Order ]    (only if status = pending)

[ Deliver Items ]
[ Update Payment ]
```

### Rules
- Approve / Reject visible only when order is `pending`
- Delivery & payment actions visible only after approval

---

## 4. Deliver Items Modal

### Purpose
Allows partial or full delivery while validating inventory.

### Layout

```
Deliver Items – ORD-1023
────────────────────────────────

Iron Man
Ordered: 10
Delivered so far: 6
Available stock: 20

[ + Delivered Now:  __ ]

Captain Max
Ordered: 5
Delivered so far: 5
✔ Fully Delivered

--------------------------------
[ Confirm Delivery ]
```

### Backend Effects
- Update `ecommerce_order_items.delivered_quantity`
- Reduce `inventory.quantity`
- Insert record into `stock_logs`
- Auto-update order status (Partial / Delivered)

---

## 5. Update Payment Modal

### Purpose
Record partial or full payments against an order.

### Layout

```
Update Payment – ORD-1023
────────────────────────────────

Total Amount:   ₹10,000
Paid So Far:    ₹5,000
Remaining Due:  ₹5,000

Enter Payment Received:
[ ₹ ________ ]

Payment Method:
[ Cash | UPI | Bank | Other ]

Remarks:
[ Optional note ]

--------------------------------
[ Save Payment ]
```

### Rules
- Payment amount cannot exceed remaining due
- Payment records are immutable once saved

---

## 6. Product Publish Screen (Management → E-commerce)

### Purpose
Allow owner to publish internal products to the E-commerce site with minimal manual work.

### Layout

```
Create E-commerce Product
────────────────────────────────

Select Product
[ 🔍 Search by name / QR code ]

--------------------------------
Auto-filled (Read-only)
--------------------------------
SKU:           QR-IRON-001
Name:          Iron Man
Category:      Insecticide
Unit Type:     Bottle
Unit Label:    500ml
Stock:         120

--------------------------------
Manual Inputs
--------------------------------
Price:         [ ₹ ______ ]
Description:   [ textarea ]
Pack Size:     [ text ]
Weight:        [ text ]
Dimensions:    [ text ]

Images (URLs)
[ + Add Image URL ]

[ Active ✔ ]

--------------------------------
[ Publish Product ]
```

### Rules
- Stock is always synced from inventory
- Owner cannot manually edit stock here

---

## 7. Logs / Audit Screen

### Purpose
Provide a full audit trail of order, delivery, and payment actions.

### Layout

```
Order Logs – ORD-1023
────────────────────────────────

[12 Feb 10:12] Order Created
[12 Feb 10:30] Order Approved by Admin
[12 Feb 11:00] Delivered 6 units – Iron Man
[12 Feb 12:15] Payment ₹5,000 received (UPI)
```

### Data Sources
- order_logs
- payment_logs
- stock_logs

---

## 8. Payment Logs Screens

### 8.1 Payments List Screen

```
Payments
──────────────────────────────────────────────

Filters:
[ Date Range ] [ Order ID ] [ Customer ] [ Method ]

┌──────────────────────────────────────────────┐
│ Payment ID: PAY-2045                          │
│ Order ID: ORD-1023                            │
│ Customer: Iron Traders                       │
│ Amount Paid: ₹5,000                          │
│ Method: UPI                                  │
│ Date: 12 Feb 2026 – 12:15 PM                  │
│ [ View Details ]                             │
└──────────────────────────────────────────────┘
```

### 8.2 Payment Detail Screen

```
Payment Details – PAY-2045
──────────────────────────────────────────────

Order ID: ORD-1023
Customer: Iron Traders
Email: iron@shop.com

Amount Paid:    ₹5,000
Payment Method: UPI
Remarks:        Advance payment
Received At:    12 Feb 2026 – 12:15 PM

Order Snapshot
──────────────
Order Total:    ₹10,000
Paid Till Now:  ₹5,000
Remaining Due:  ₹5,000

[ View Order ]
```

### 8.3 Order-linked Payment History

```
Payment History
──────────────────────────────────────────────
| Date & Time     | Amount | Method | Note |
| 12 Feb 12:15 PM | 5,000  | UPI    | Adv. |

[ + Add Payment ]
```

### 8.4 Filters & UX Rules
- Payments are read-only
- Cannot delete or edit payments
- Filter by date, customer, order, method

### 8.5 Security Rules
- Only Admin / Owner can add payments
- Amount must not exceed remaining due

### 8.6 Database Mapping

```
payment_logs
------------
id
order_id
amount_paid
payment_method
remarks
created_at
created_by
```

---

## 9. PDF Payment Receipt Design

### Purpose
Generate a professional, printable receipt for every payment.

### Receipt Content

```
Captain Insecticide
Payment Receipt
────────────────────────────────

Receipt ID: PAY-2045
Order ID: ORD-1023
Date: 12 Feb 2026

Customer:
Iron Traders
Ahmedabad, Gujarat

--------------------------------
Payment Details
--------------------------------
Amount Paid:    ₹5,000
Payment Method: UPI
Remarks:        Advance payment

--------------------------------
Order Summary
--------------------------------
Order Total:    ₹10,000
Paid Till Now:  ₹5,000
Remaining Due:  ₹5,000

--------------------------------
Authorized By: Captain Insecticide
(This is a system-generated receipt)
```

### Rules
- Generated after every payment
- Downloadable from Payment Detail screen
- Immutable once generated
- Can be emailed to customer

---

## End of Document

