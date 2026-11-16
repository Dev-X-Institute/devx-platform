import { useState } from "react";
import { Badge, Brand, Card, ClassSelect, Modal, PageHeader, ProductArt, ProgressBar, Stats } from "../components";
import { download, downloadReport, money, school, subjects, type Product, type ScreenProps } from "../demo";

export function AdminDashboard({ demo, navigate }: ScreenProps) {
  return <><PageHeader eyebrow="Administrator dashboard" title="Welcome, [ADMIN NAME]" />
    <Stats values={[["Students enrolled", 428], ["Fees collected this term", money(112450)], ["Outstanding fees", money(28650)], ["Shop orders to fulfil", demo.data.orders.filter(o => !o.collected).length]]} />
    <div className="admin-layout"><Card><h2>Fee collection by class</h2><div className="collection-bars">{[78, 64, 91, 55].map((value, i) => <div key={i}><span>{["JHS 1", "JHS 2", "JHS 3", "SHS 1"][i]}</span><ProgressBar value={value} label={`${["JHS 1", "JHS 2", "JHS 3", "SHS 1"][i]} fee collection`} /><span className="muted">{value}%</span></div>)}</div><h2 className="activity-title">Recent activity</h2><div className="list-row"><span>[PARENT NAME] paid fees for [STUDENT NAME]</span><Badge>Payment</Badge></div><div className="list-row"><span>Report cards for JHS 2 sent to parents</span><Badge>Reports</Badge></div><div className="list-row"><span>New shop order: School uniform</span><Badge tone="amber">To fulfil</Badge></div></Card>
      <Card className="quick-actions"><h2>Quick actions</h2><button className="button outline" onClick={() => navigate("reports")}>Generate report cards</button><button className="button outline" onClick={() => navigate("fees")}>Send fee reminders</button><button className="button outline" onClick={() => navigate("shop")}>Add a shop item</button><button className="button outline" onClick={() => navigate("parent")}>Preview the parent view</button></Card></div>
  </>;
}

const feeNames = ["Tuition", "PTA dues", "ICT levy", "Exams fee"];
export function Fees({ demo, notify }: ScreenProps) {
  const [className, setClassName] = useState("JHS 2");
  const [edit, setEdit] = useState(false);
  const [reminders, setReminders] = useState(false);
  const [channel, setChannel] = useState("WhatsApp");
  const balances = [0, demo.data.balance, 1500, 1500];
  const exportFees = () => {
    download("student-payments.csv", `Student,Class,Balance (GHS),Status\n${balances.map((balance, i) => `Student ${i + 1},${className},${balance},${balance === 0 ? "Paid" : balance < 1500 ? "Part-paid" : "Unpaid"}`).join("\n")}`);
    notify("Student payments exported.");
  };
  return <><PageHeader eyebrow="Fees" title="School fees"><button className="button outline" onClick={exportFees}>Export</button><button className="button primary" onClick={() => setReminders(true)}>Send reminders (WhatsApp or email)</button></PageHeader>
    <div className="fees-layout"><Card><h2>Fee structure, Term 1</h2>{feeNames.map((name, i) => <div className="list-row" key={name}><span>{name}</span><strong>{money(demo.data.fees[i]!)}</strong></div>)}<button className="button outline section-spaced" onClick={() => setEdit(true)}>Edit fee structure</button></Card>
      <Card><div className="card-heading"><h2>Student payments</h2><ClassSelect value={className} onChange={setClassName} /></div><div className="table-wrap"><table><caption className="sr-only">School fee payments for {className}</caption><thead><tr><th>Student</th><th>Class</th><th>Balance</th><th>Status</th></tr></thead><tbody>{balances.map((balance, i) => <tr key={i}><th scope="row">Student {i + 1}</th><td className="muted">{className}</td><td>{money(balance)}</td><td><Badge tone={balance === 0 ? "green" : balance < 1500 ? "amber" : "red"}>{balance === 0 ? "Paid" : balance < 1500 ? "Part-paid" : "Unpaid"}</Badge></td></tr>)}</tbody></table></div></Card></div>
    {edit && <Modal title="Edit fee structure" close={() => setEdit(false)}><form onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); demo.update({ fees: feeNames.map((_, i) => Number(data.get(`fee-${i}`))) }); setEdit(false); notify("Term 1 fee structure saved in the preview."); }}>{feeNames.map((name, i) => <label key={name}>{name} (GH₵)<input type="number" name={`fee-${i}`} min="0" max="100000" step="0.01" required defaultValue={demo.data.fees[i]} /></label>)}<button className="button primary full">Save fee structure</button></form></Modal>}
    {reminders && <Modal title="Fee reminder preview" close={() => setReminders(false)}><p className="muted">Prepare reminders for {balances.filter(b => b > 0).length} parents in {className} with outstanding balances.</p><label>Delivery channel<select value={channel} onChange={e => setChannel(e.target.value)}><option>WhatsApp</option><option>Email</option></select></label><div className="message-preview">Hello [PARENT NAME], the school fee balance for [STUDENT NAME] is {money(demo.data.balance)}. Please use your parent link to view the balance and payment options.</div><p className="demo-label">Frontend preview. Messages are saved as a draft and are not sent.</p><button className="button primary full" onClick={() => { download("fee-reminder-draft.txt", `Channel: ${channel}\nClass: ${className}\n\nHello [PARENT NAME], the school fee balance for [STUDENT NAME] is ${money(demo.data.balance)}. Please use your parent link to view the balance and payment options.`, "text/plain"); setReminders(false); notify("Fee reminder draft downloaded."); }}>Save reminder draft</button></Modal>}
  </>;
}

export function Shop({ demo, notify }: ScreenProps) {
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const save = (form: HTMLFormElement) => {
    const data = new FormData(form);
    const existing = editing && editing !== "new" ? editing : null;
    const product: Product = { id: existing?.id ?? Date.now(), name: String(data.get("name")).trim(), price: Number(data.get("price")), stock: Number(data.get("stock")), kind: existing?.kind ?? "other" };
    if (!product.name) return;
    demo.update(d => ({ products: existing ? d.products.map(p => p.id === existing.id ? product : p) : [...d.products, product] }));
    setEditing(null); notify(existing ? "Shop item updated." : "Shop item added.");
  };
  return <><PageHeader eyebrow="Shop" title="School shop"><button className="button primary" onClick={() => setEditing("new")}>Add item</button></PageHeader><div className="product-grid">{demo.data.products.map(p => <Card key={p.id} className="product-card"><ProductArt product={p} /><h3>{p.name}</h3><strong className="product-price">{money(p.price)}</strong><Badge tone={p.stock === 0 ? "red" : p.stock <= 5 ? "amber" : "green"}>{p.stock === 0 ? "Out of stock" : p.stock <= 5 ? "Low stock" : "In stock"}</Badge><button className="text-button product-edit" onClick={() => setEditing(p)}>Edit</button></Card>)}</div>
    <Card className="section-spaced"><h2>Recent orders</h2><div className="orders-list">{demo.data.orders.map(order => <div className="list-row" key={order.id}><strong>Order #{order.id}</strong><span>{order.item} for [STUDENT NAME]</span><span className="muted">Buyer [PARENT NAME]</span><Badge>Paid</Badge>{order.collected ? <Badge>Collected</Badge> : <button className="badge amber status-button" onClick={() => { demo.update(d => ({ orders: d.orders.map(o => o.id === order.id ? { ...o, collected: true } : o) })); notify(`Order #${order.id} marked collected.`); }}>Ready for pickup</button>}</div>)}</div></Card>
    {editing && <Modal title={editing === "new" ? "Add shop item" : "Edit shop item"} close={() => setEditing(null)}><form onSubmit={e => { e.preventDefault(); save(e.currentTarget); }}><label>Item name<input required name="name" maxLength={80} pattern=".*\S.*" defaultValue={editing === "new" ? "" : editing.name} /></label><div className="two-columns"><label>Price (GH₵)<input required type="number" min="0.01" max="100000" step="0.01" name="price" defaultValue={editing === "new" ? "" : editing.price} /></label><label>Stock quantity<input required type="number" min="0" max="100000" step="1" name="stock" defaultValue={editing === "new" ? "" : editing.stock} /></label></div><button className="button primary full">Save item</button></form></Modal>}
  </>;
}

function ReportContent({ term = "Term 1", className = "JHS 2" }: { term?: string; className?: string }) {
  return <div className="report-document"><div className="report-brand"><span className="crest">D</span><div><h2>{school}</h2><p className="muted">Terminal report, {term} · 2026</p></div></div><dl className="report-meta"><div><dt>Student</dt><dd>[STUDENT NAME]</dd></div><div><dt>Class</dt><dd>{className}</dd></div><div><dt>Position</dt><dd>4 of 34</dd></div><div><dt>Attendance</dt><dd>58 of 60 days</dd></div></dl><div className="table-wrap"><table className="report-table"><caption className="sr-only">Terminal report subject scores</caption><thead><tr><th>Subject</th><th>Class score</th><th>Exam</th><th>Total</th><th>Grade</th><th>Remark</th></tr></thead><tbody>{subjects.map((subject, i) => <tr key={subject}><th scope="row">{subject}</th><td>{[27, 24, 26, 25, 28][i]}</td><td>{[58, 52, 55, 54, 60][i]}</td><td>{[85, 76, 81, 79, 88][i]}</td><td>{i === 1 || i === 3 ? "B2" : "A1"}</td><td className="muted">{i === 1 || i === 3 ? "Very good" : "Excellent"}</td></tr>)}</tbody></table></div><div className="two-columns report-remarks"><div><p className="muted">Class teacher’s remark</p><p>A strong term. Keep practising regularly.</p></div><div><p className="muted">Head’s remark</p><p>Well done. Keep up the good work.</p></div></div></div>;
}

export function Reports({ notify }: ScreenProps) {
  const [term, setTerm] = useState("Term 1");
  const [className, setClassName] = useState("JHS 2");
  const [delivery, setDelivery] = useState(false);
  return <><PageHeader eyebrow={`${term}, ${className}`} title="Report cards"><button className="button outline" onClick={() => notify(`Sample report cards generated for ${className}, ${term}.`)}>Generate for class</button><button className="button primary" onClick={() => setDelivery(true)}>Send to parents</button></PageHeader><div className="filters"><label className="inline-label">Term<select value={term} onChange={e => setTerm(e.target.value)}>{["Term 1", "Term 2", "Term 3"].map(t => <option key={t}>{t}</option>)}</select></label><ClassSelect value={className} onChange={setClassName} /></div>
    <div className="reports-layout"><Card className="report-card"><ReportContent term={term} className={className} /><button className="text-button report-download" onClick={() => downloadReport(term, className)}>Download PDF</button></Card><Card><h2>Delivery to parents</h2><p className="muted delivery-description">Each parent gets a PDF by email or WhatsApp, using the contact saved on the student record.</p><div className="delivery-list">{["Email", "WhatsApp", "WhatsApp", "None"].map((channel, i) => <div className="list-row" key={i}><strong>Student {i + 1}</strong><span className="muted">{channel}</span><Badge tone={i === 3 ? "red" : i === 2 ? "amber" : "green"}>{i === 3 ? "No contact saved" : i === 2 ? "Queued" : "Sent"}</Badge></div>)}</div><p className="demo-label">Sample delivery history</p></Card></div>
    {delivery && <Modal title="Prepare report delivery" close={() => setDelivery(false)}><p>Report cards for {className}, {term} are ready to review.</p><p className="muted">3 parents have contact details. Student 4 needs a parent contact before delivery.</p><p className="demo-label">Frontend preview. No email or WhatsApp messages will be sent.</p><button className="button primary full" onClick={() => { download("report-delivery-draft.csv", `Student,Class,Term,Channel,Status\nStudent 1,${className},${term},Email,Prepared\nStudent 2,${className},${term},WhatsApp,Prepared\nStudent 3,${className},${term},WhatsApp,Prepared\nStudent 4,${className},${term},None,Missing contact`); setDelivery(false); notify("Report delivery draft downloaded."); }}>Save delivery draft</button></Modal>}
  </>;
}

export function ParentView({ demo, navigate, notify }: ScreenProps) {
  const [amount, setAmount] = useState(String(demo.data.balance));
  const [method, setMethod] = useState("Mobile Money");
  const [payment, setPayment] = useState(false);
  const [orderReview, setOrderReview] = useState(false);
  const [cart, setCart] = useState<Record<number, number>>({});
  const cartItems = demo.data.products.filter(p => (cart[p.id] ?? 0) > 0);
  const total = cartItems.reduce((sum, p) => sum + p.price * cart[p.id]!, 0);
  const pay = () => {
    demo.update(d => ({ balance: Math.max(0, d.balance - Number(amount)) }));
    setPayment(false); notify("Demo payment recorded. No money was charged.");
  };
  const placeOrder = () => {
    demo.update(d => ({
      products: d.products.map(p => ({ ...p, stock: p.stock - (cart[p.id] ?? 0) })),
      orders: [{ id: Date.now(), item: cartItems.map(p => `${p.name} × ${cart[p.id]}`).join(", "), collected: false }, ...d.orders],
    }));
    setCart({}); setOrderReview(false); notify("Demo order placed. Collect items at school. No money was charged.");
  };
  return <div className="parent-screen"><header className="parent-header"><Brand schoolName /><button className="text-button" onClick={() => navigate("admin")}>Exit parent preview</button></header><div className="parent-content"><header className="parent-intro"><h1>Hello, [PARENT NAME]</h1><p className="muted">You are viewing [STUDENT NAME], JHS 2. No account needed: this page opens from the secure link in your message.</p></header><div className="parent-grid"><Card><h2>Report card</h2><p className="muted">Term 1</p><div className="report-summary"><div><span className="muted">Average</span><strong>81.8%</strong></div><div><span className="muted">Position</span><strong>4</strong></div></div><button className="button outline full" onClick={() => downloadReport()}>Download PDF</button></Card>
      <Card><h2>School fees</h2><p className="muted">Balance due by 30 November 2026</p><strong className="balance-amount">{money(demo.data.balance)}</strong><form onSubmit={e => { e.preventDefault(); setPayment(true); }}><label className="muted">Amount to pay<input required type="number" min="0.01" max={demo.data.balance} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} disabled={demo.data.balance === 0} /></label><div className="payment-methods" aria-label="Payment method">{["Mobile Money", "Card"].map(m => <button type="button" key={m} aria-pressed={method === m} className={method === m ? "selected" : ""} onClick={() => setMethod(m)}>{m}</button>)}</div><button className="button primary full" disabled={demo.data.balance === 0}>{demo.data.balance === 0 ? "Fees paid" : "Pay now"}</button></form></Card></div>
      <Card className="parent-shop"><h2>School shop</h2>{demo.data.products.map(p => <div className="list-row" key={p.id}><span>{p.name}</span><strong>{money(p.price)}</strong><div className="cart-controls">{(cart[p.id] ?? 0) > 0 && <><button className="button outline compact" aria-label={`Remove one ${p.name}`} onClick={() => setCart(c => ({ ...c, [p.id]: Math.max(0, (c[p.id] ?? 0) - 1) }))}>−</button><span aria-live="polite">{cart[p.id]}</span></>}<button className="button outline compact" disabled={(cart[p.id] ?? 0) >= p.stock} onClick={() => setCart(c => ({ ...c, [p.id]: (c[p.id] ?? 0) + 1 }))}>{p.stock === 0 ? "Out of stock" : "Add"}</button></div></div>)}<button className="button primary full section-spaced" disabled={!cartItems.length} onClick={() => setOrderReview(true)}>Review order and pay{total > 0 ? ` · ${money(total)}` : ""}</button><p className="muted">Collect items at school.</p></Card><p className="demo-label parent-demo-note">Frontend preview · sample records and demo payments</p>
    </div>{payment && <Modal title="Review payment" close={() => setPayment(false)}><p>School fees for [STUDENT NAME]</p><strong className="balance-amount">{money(Number(amount))}</strong><p className="muted">Payment method: {method}</p><p className="demo-label">This is a demo. No payment will be collected.</p><button className="button primary full" onClick={pay}>Complete demo payment</button></Modal>}
    {orderReview && <Modal title="Review your order" close={() => setOrderReview(false)}>{cartItems.map(p => <div className="list-row" key={p.id}><span>{p.name} × {cart[p.id]}</span><strong>{money(p.price * cart[p.id]!)}</strong></div>)}<div className="list-row"><strong>Total</strong><strong>{money(total)}</strong></div><p className="muted">Collect items at school after placing your order.</p><p className="demo-label">This is a demo. No payment will be collected.</p><button className="button primary full" onClick={placeOrder}>Place demo order</button></Modal>}
  </div>;
}
