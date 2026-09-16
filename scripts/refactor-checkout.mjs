import fs from "fs";
import path from "path";

const pagePath = path.join(process.cwd(), "app/checkout/page.tsx");
let content = fs.readFileSync(pagePath, "utf8");

// 1. Make step default to 1 so Cart is skipped (cart is already visible in summary)
content = content.replace(
  `const [step, setStep] = useState(0);`,
  `const [step, setStep] = useState(1);`
);

// 2. Change the button to go back to store instead of Cart (since cart step is removed)
content = content.replace(
  `onClick={() => setStep(0)}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" /> Back to Cart`,
  `onClick={() => router.push(shopHref)}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" /> Continue Shopping`
);

// 3. Add Trust badges on Step 1 at top
const trustBadgesStr = `
                {/* Immediate Trust Badges */}
                <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                  {[
                    { icon: ShieldCheck, title: "1 Year", desc: "Warranty" },
                    { icon: RotateCcw, title: "7 Days", desc: "Returns" },
                    { icon: Banknote, title: "COD", desc: "Available" },
                    { icon: Lock, title: "Secure", desc: "Checkout" },
                  ].map((t) => (
                    <div key={t.title} className="flex flex-col items-center justify-center p-3 text-center border rounded-xl bg-white shadow-sm">
                       <t.icon className="h-5 w-5 text-primary mb-1.5" />
                       <p className="text-[11px] font-bold uppercase">{t.title}</p>
                       <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                    </div>
                  ))}
                </div>
`;
content = content.replace(
  /<div className="flex items-center justify-between mb-4">\s*<h2 className="text-xl font-bold tracking-tight">\s*Delivery Details\s*<\/h2>\s*<\/div>/,
  match => trustBadgesStr + "\n" + match
);

// 4. Update Phone Input validation
content = content.replace(
  /type="tel"\s*required\s*autoComplete="tel"/,
  `type="tel"
                        required
                        pattern="^\\\\+92 3\\\\d{2} \\\\d{7}$"
                        title="Enter a valid Pakistani mobile number: +92 3XX XXXXXXX"
                        autoComplete="tel"`
);

// 5. Update City to use Datalist
content = content.replace(
  /<Input\s*id="city"\s*name="city"\s*required\s*autoComplete="address-level2"\s*defaultValue={customer.city}\s*\/>/,
  `<Input
                        id="city"
                        name="city"
                        required
                        list="pakistan-cities"
                        autoComplete="address-level2"
                        defaultValue={customer.city}
                      />
                      <datalist id="pakistan-cities">
                        <option value="Karachi" />
                        <option value="Lahore" />
                        <option value="Islamabad" />
                        <option value="Rawalpindi" />
                        <option value="Faisalabad" />
                        <option value="Multan" />
                        <option value="Peshawar" />
                        <option value="Quetta" />
                        <option value="Gujranwala" />
                        <option value="Sialkot" />
                        <option value="Abbottabad" />
                        <option value="Hyderabad" />
                      </datalist>`
);

// 6. Merge Step 1 and Step 2 logic.
content = content.replace(
  /onSubmit={\(e\) => {[\s\S]*?nextStep\(2\); \/\/ Move directly to Review step\s*}}/m,
  `onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const customerData = Object.fromEntries(formData) as Record<string, string>;
                      setCustomer(customerData);
                      setTimeout(() => placeOrder(e), 0);
                    }}`
);

// Bring Payment Method into Step 1
const paymentMethodHtml = `
                    <div className="col-span-1 sm:col-span-2 pt-4 mt-2 border-t text-left">
                      <Label className="text-sm font-bold mb-3 block">Payment Method *</Label>
                      <div className="space-y-3">
                        {PAYMENT_METHODS.map((method) => {
                          const selected = payment === method.id;
                          return (
                            <label
                              key={method.id}
                              className={\`flex items-center gap-4 rounded-lg border p-4 cursor-pointer transition-colors \${selected ? "border-primary bg-primary/5" : "bg-white hover:bg-secondary/50"}\`}
                            >
                              <div
                                className={\`shrink-0 flex items-center justify-center h-5 w-5 rounded-full border-2 \${selected ? "border-primary bg-primary text-white" : "border-border"}\`}
                              >
                                {selected && (
                                  <Check className="h-3 w-3" strokeWidth={3} />
                                )}
                              </div>
                              <method.icon
                                className={\`h-5 w-5 \${selected ? "text-primary" : "text-muted-foreground"}\`}
                              />
                              <div className="flex-1">
                                <p className="text-[13px] font-bold tracking-wide">
                                  {method.label}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                                  {method.description}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
`;

content = content.replace(
  /<\/form>[\s\S]*?<div className="mt-6 flex flex-col-reverse gap-3 sm:mt-8 sm:flex-row sm:items-center sm:justify-between">\s*<Button\s*type="button"\s*variant="ghost"/,
  match => `
${paymentMethodHtml}
${match.substring(match.indexOf('<div className="mt-6'))}`
);

// Remove the standalone Step 2 section completely to avoid double rendering
content = content.replace(/\{step === 2 && \([\s\S]*?\}\)[\s\S]*?<\/div>[\s\S]*?\{\/\* ── Order summary sidebar/m, `\n          </div>\n\n          {/* ── Order summary sidebar`);


content = content.replace(
  /Continue to Review <ArrowRight className="ml-2 h-4 w-4" \/>/,
  `{placing ? "Processing..." : "Place Order"} {placing ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Lock className="ml-2 h-4 w-4" />}`
);

content = content.replace(
  /async function placeOrder\(e\?: React\.FormEvent<HTMLFormElement>\) \{/,
  `async function placeOrder(e?: React.FormEvent<HTMLFormElement>) {
    let currentCustomer = customer;
    if (e && e.target instanceof HTMLFormElement) {
      currentCustomer = Object.fromEntries(new FormData(e.target)) as Record<string, string>;
      setCustomer(currentCustomer);
    }`
);

content = content.replace(
  /customer: \{\s*\.\.\.customer,/,
  `customer: {\n            ...currentCustomer,`
);
content = content.replace(
  /const checkoutEmail = customer\.email/g,
  `const checkoutEmail = currentCustomer.email`
);
content = content.replace(
  /email: customer\.email,/g,
  `email: currentCustomer.email,`
);
content = content.replace(
  /phone: customer\.phone,/g,
  `phone: currentCustomer.phone,`
);
content = content.replace(
  /name: customer\.name/g,
  `name: currentCustomer.name`
);

// Sidebar fix for step
content = content.replace(/step === 2 && \(/g, `step >= 1 && (`);

// Remove the duplicate end form tags that might have broken
content = content.replace(/<\/form>\s*<\/form>/g, `</form>`);

fs.writeFileSync(pagePath, content);
console.log("Refactored checkout page successfully.");
