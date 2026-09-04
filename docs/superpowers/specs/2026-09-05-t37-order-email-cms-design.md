# T-37 — Order email theme + copy

Date: 2026-09-05  
Status: approved  
Scope: Shared theme/layout (including wrapper HTML) and subject/body for six order letters. Not Messaging, not From address, not a visual designer.

## Letters

confirmed, processing, shipped, delivered, cancelled, owner (new-order alert).

## Theme

Logo URL, background / card / text / button colors, header line, footer line, optional wrapper HTML. Wrapper is used only if it contains `{{title}}` and `{{body}}`. Otherwise the generated card is used (today’s white card when colors are empty).

## Per letter

Subject + body text. Placeholders: `{{name}}`, `{{orderId}}`, `{{brand}}`, `{{note}}`.  
Always appended in code: item table + address (confirm + owner), Track button, status note.

## Store

`site_settings.order_emails` jsonb. Admin `/admin/order-emails`. Empty letter fields → code defaults. Missing column → omit on publish; sends keep defaults.
