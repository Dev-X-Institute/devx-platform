import { useState } from "react";
import { Badge, Brand, Card, ClassSelect, EmptyState, Modal, PageHeader, Pagination, ProductArt, ProgressBar, Stats } from "../components";
import { csvCell, download, downloadReport, money, studentBalance, type Product, type ScreenProps } from "../demo";
import { dateKey } from "../records";
import { buildReport, initials } from "../report";
import { approveReport, computePosition, recordInPersonPayment, setReportField, type PaymentMethod, type ReportField, type SchoolState } from "../school";
import { Crest } from "../SchoolCrest";
import { FeeEditor, ProductEditor, feeNames } from "../SchoolEditors";
import { useFormValidation } from "../forms";
import { Icon } from "../icons";
import { AnalyticsPanel } from "../AnalyticsPanel";

export function AdminDashboard({ demo, navigate }: ScreenProps) {
  const due = demo.data.fees.reduce((a, b) => a + b, 0) * demo.data.students.length;
  const outstanding = demo.data.students.reduce((sum, s) => sum + studentBalance(demo.data, s.id), 0);
  return <><PageHeader eyebrow="Administrator dashboard / Term 1" title="Your school, at a glance." name={demo.data.schoolName} />
    <Stats values={[["Students enrolled", demo.data.students.length], ["Fees collected this term", money(due - outstanding)], ["Outstanding fees", money(outstanding)], ["Shop orders to fulfil", demo.data.orders.filter(o => !o.collected).length]]} />
    <div className="admin-layout"><div className="panel-stack"><AnalyticsPanel kind="fees" records={demo.data} /><Card><div className="card-heading"><h2>Recent activity</h2><span className="demo-label">Local records</span></div>{demo.data.payments.slice(-3).reverse().map(p => <div className="list-row" key={p.id}><span className="activity-copy"><span className="activity-icon"><Icon name="fees" /></span><span>Payment of {money(p.amount)} for {demo.data.students.find(s => s.id === p.studentId)?.name ?? "a student"}<small className="demo-label">{p.date}</small></span></span><Badge>Payment</Badge></div>)}{!demo.data.payments.length && <EmptyState icon="fees" title="No payments yet" description="Payments recorded in the parent preview will appear here." />}</Card></div>
      <Card className="quick-actions"><h2>Quick actions</h2><p className="muted">Keep the school day moving.</p><button className="button outline" onClick={() => navigate("reports")}><Icon name="report" />Generate report cards<Icon name="next" size={16} /></button><button className="button outline" onClick={() => navigate("fees")}><Icon name="fees" />Send fee reminders<Icon name="next" size={16} /></button><button className="button outline" onClick={() => navigate("shop")}><Icon name="shop" />Add a shop item<Icon name="next" size={16} /></button><button className="button outline" onClick={() => navigate("parent")}><Icon name="students" />Preview the parent view<Icon name="next" size={16} /></button><div className="workspace-note"><Icon name="shield" size={20} /><p>Preview school records and parent journeys with sample data.</p></div></Card></div>
  </>;
}

export function Fees({ demo, notify }: ScreenProps) {
  const [className, setClassName] = useState("JHS 2");
  const [edit, setEdit] = useState(false);
  const [reminders, setReminders] = useState(false);
  const [channel, setChannel] = useState("WhatsApp");
  const [page, setPage] = useState(0);
  const [paymentStudentId, setPaymentStudentId] = useState(2);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(dateKey());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const actor = demo.data.actor;
  const students = demo.data.students.filter(s => s.className === className);
  const balances = students.map(s => studentBalance(demo.data, s.id));
  const total = demo.data.fees.reduce((a, b) => a + b, 0);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(students.length / 20) - 1));
  const inPersonPayments = demo.data.payments.filter(payment => payment.method).slice(-5).reverse();
  const exportFees = () => {
    download("student-payments.csv", ["Student,Class,Balance (GHS),Status", ...students.map((s, i) => [s.name, s.className, balances[i]!, balances[i] === 0 ? "Paid" : balances[i]! < total ? "Part-paid" : "Unpaid"].map(csvCell).join(","))].join("\n"));
    notify("Student payments exported.");
  };
  const recordPayment = () => {
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) { notify("Enter a payment amount greater than zero."); return; }
    try {
      const next = recordInPersonPayment(demo.data, actor, {
        studentId: paymentStudentId,
        amount,
        date: paymentDate,
        method: paymentMethod,
        reference: paymentReference.trim() || undefined,
      });
      const undo = demo.update(() => next);
      setPaymentAmount("");
      setPaymentReference("");
      notify("In-person payment recorded.", undo);
    } catch (error) {
      notify(error instanceof Error ? error.message : "That payment could not be recorded.");
    }
  };
  return <><PageHeader eyebrow="School management / Term 1" title="School fees" name={demo.data.schoolName}><button className="button outline" onClick={exportFees} disabled={!students.length}><Icon name="download" size={18} />Export</button><button className="button primary" disabled={!balances.some(b => b > 0)} onClick={() => setReminders(true)}>Send reminders (WhatsApp or email)</button></PageHeader>
    <div className="fees-layout"><Card><h2>Fee structure, Term 1</h2>{feeNames.map((name, i) => <div className="list-row" key={name}><span>{name}</span><strong>{money(demo.data.fees[i]!)}</strong></div>)}<button className="button outline section-spaced" onClick={() => setEdit(true)} disabled={actor.role !== "admin"}>Edit fee structure</button></Card>
      <Card><div className="card-heading"><h2>Student payments</h2><ClassSelect value={className} onChange={value => { setClassName(value); setPage(0); }} /></div>{students.length ? <><div className="table-wrap"><table className="responsive-table"><caption className="sr-only">School fee payments for {className}</caption><thead><tr><th>Student</th><th>Class</th><th>Balance</th><th>Status</th></tr></thead><tbody>{students.slice(currentPage * 20, (currentPage + 1) * 20).map(student => { const balance = studentBalance(demo.data, student.id); return <tr key={student.id}><th scope="row" dir="auto">{student.name}</th><td data-label="Class" className="muted">{className}</td><td data-label="Balance">{money(balance)}</td><td data-label="Status"><Badge tone={balance === 0 ? "green" : balance < total ? "amber" : "red"}>{balance === 0 ? "Paid" : balance < total ? "Part-paid" : "Unpaid"}</Badge></td></tr>; })}</tbody></table></div><Pagination page={currentPage} count={students.length} size={20} onPage={setPage} /></> : <EmptyState icon="students" title="No student payments" description="Choose another class to see available student records." />}</Card>
      {actor.role === "admin" && <Card className="in-person-card"><div className="card-heading"><h2>Record in-person payment</h2><span className="demo-label">Administrator only</span></div><p className="muted fee-balance">Student 2 outstanding balance: {money(demo.data.balance)}</p><form className="payment-form" onSubmit={event => { event.preventDefault(); recordPayment(); }}>
        <label className="inline-label">Student<select aria-label="Payment student" value={paymentStudentId} onChange={event => setPaymentStudentId(Number(event.target.value))}>{demo.data.students.map(student => <option key={student.id} value={student.id}>{student.name}</option>)}</select></label>
        <label>Amount (GH₵)<input aria-label="Payment amount" type="number" min="0.01" step="0.01" value={paymentAmount} onChange={event => setPaymentAmount(event.target.value)} /></label>
        <label>Date<input aria-label="Payment date" type="date" value={paymentDate} onChange={event => setPaymentDate(event.target.value)} /></label>
        <label>Method<select aria-label="Payment method" value={paymentMethod} onChange={event => setPaymentMethod(event.target.value as PaymentMethod)}><option value="cash">Cash</option><option value="bank-transfer">Bank transfer</option><option value="mobile-money">Mobile money</option><option value="other">Other</option></select></label>
        <label>Reference<input aria-label="Payment reference" value={paymentReference} onChange={event => setPaymentReference(event.target.value)} placeholder="Receipt number" /></label>
        <button className="button primary" type="submit">Record payment</button>
      </form>
      <div className="card-heading section-spaced"><h3>Recorded in person</h3><span className="demo-label">Most recent first</span></div>{inPersonPayments.length ? <div className="list-row-group">{inPersonPayments.map(payment => <div className="list-row in-person-payment" key={payment.id}><span>{demo.data.students.find(student => student.id === payment.studentId)?.name ?? "Student"}</span><strong>{money(payment.amount)}</strong><small className="demo-label">{payment.reference || payment.date}</small></div>)}</div> : <p className="demo-label">No in-person payments recorded yet.</p>}
    </Card>}
    </div>
    {edit && <Modal title="Edit fee structure" close={() => setEdit(false)}><FeeEditor fees={demo.data.fees} save={fees => { const undo = demo.update(d => ({ fees, balance: Math.max(0, fees.reduce((a, b) => a + b, 0) - d.payments.filter(p => p.studentId === 2).reduce((sum, p) => sum + p.amount, 0)) })); setEdit(false); notify("Term 1 fee structure saved in the preview.", undo); }} /></Modal>}
    {reminders && <Modal title="Fee reminder preview" close={() => setReminders(false)}><p className="muted">Prepare reminders for {balances.filter(b => b > 0).length} parents in {className} with outstanding balances.</p><label>Delivery channel<select value={channel} onChange={e => setChannel(e.target.value)}><option>WhatsApp</option><option>Email</option></select></label><div className="message-preview">Hello [PARENT NAME], the school fee balance for [STUDENT NAME] is [BALANCE]. Please use your parent link to view the balance and payment options.</div><p className="demo-label">Frontend preview. Messages are saved as a draft and are not sent.</p><button className="button primary full" onClick={() => { const drafts = students.filter(s => studentBalance(demo.data, s.id) > 0).map(s => `Student: ${s.name}\nParent contact: ${s.contact ?? "Missing contact"}\nHello [PARENT NAME], the school fee balance for ${s.name} is ${money(studentBalance(demo.data, s.id))}. Please use your parent link to view the balance and payment options.`); download("fee-reminder-draft.txt", [`Channel: ${channel}`, `Class: ${className}`, "Drafts only — no messages sent.", ...drafts].join("\n\n"), "text/plain"); setReminders(false); notify("Fee reminder draft downloaded."); }}>Save reminder draft</button></Modal>}
  </>;
}

export function Shop({ demo, notify }: ScreenProps) {
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [page, setPage] = useState(0);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(demo.data.orders.length / 10) - 1));
  const save = (form: HTMLFormElement) => {
    const data = new FormData(form);
    const existing = editing && editing !== "new" ? editing : null;
    const product: Product = { id: existing?.id ?? Date.now(), name: String(data.get("name")).trim(), price: Number(data.get("price")), stock: Number(data.get("stock")), kind: existing?.kind ?? "other" };
    if (!product.name) return;
    const undo = demo.update(d => ({ products: existing ? d.products.map(p => p.id === existing.id ? product : p) : [...d.products, product] }));
    setEditing(null); notify(existing ? "Shop item updated." : "Shop item added.", undo);
  };
  return <><PageHeader eyebrow="School management / Supplies" title="School shop" name={demo.data.schoolName}><button className="button primary" onClick={() => setEditing("new")}><Icon name="plus" size={18} />Add item</button></PageHeader>{demo.data.products.length ? <div className="product-grid">{demo.data.products.map(p => <Card key={p.id} className="product-card"><ProductArt product={p} /><h3 dir="auto">{p.name}</h3><strong className="product-price">{money(p.price)}</strong><Badge tone={p.stock === 0 ? "red" : p.stock <= 5 ? "amber" : "green"}>{p.stock === 0 ? "Out of stock" : p.stock <= 5 ? "Low stock" : "In stock"}</Badge><button className="text-button product-edit" onClick={() => setEditing(p)}>Edit</button></Card>)}</div> : <Card><EmptyState icon="shop" title="Your shop is empty" description="Add an item to start building your school supplies catalog."><button className="button outline" onClick={() => setEditing("new")}>Add your first item</button></EmptyState></Card>}
    <Card className="section-spaced"><h2>Recent orders</h2>{demo.data.orders.length ? <><div className="orders-list">{demo.data.orders.slice(currentPage * 10, (currentPage + 1) * 10).map(order => <div className="list-row" key={order.id}><strong>Order #{order.id}</strong><span>{order.item}</span><span className="muted">Buyer: Parent 2</span><Badge>Paid</Badge>{order.collected ? <Badge>Collected</Badge> : <button className="badge amber status-button" onClick={() => { const undo = demo.update(d => ({ orders: d.orders.map(o => o.id === order.id ? { ...o, collected: true } : o) })); notify(`Order #${order.id} marked collected.`, undo); }}>Ready for pickup</button>}</div>)}</div><Pagination page={currentPage} count={demo.data.orders.length} size={10} onPage={setPage} /></> : <EmptyState icon="shop" title="No orders yet" description="Orders placed in the parent preview will appear here." />}</Card>
    {editing && <Modal title={editing === "new" ? "Add shop item" : "Edit shop item"} close={() => setEditing(null)}><ProductEditor product={editing} save={save} /></Modal>}
  </>;
}

function ReportContent({ data, studentId, term = "Term 1" }: { data: SchoolState; studentId: number; term?: string }) {
  const report = buildReport(data, studentId, term);
  const value = (number: number | null) => number === null ? "—" : number;
  return <div className="report-document"><div className="report-brand"><span className="crest"><Crest label={report.monogram} size={56} /></span><div><h2 dir="auto">{report.schoolName}</h2><p className="muted">Sample terminal report, {report.term} · {report.year}</p></div></div><dl className="report-meta"><div><dt>Student</dt><dd>{report.student} (sample)</dd></div><div><dt>Class</dt><dd>{report.className}</dd></div><div><dt>Position</dt><dd>{report.position}</dd></div><div><dt>Attendance</dt><dd>{report.attendance}</dd></div><div><dt>Conduct</dt><dd>{report.conduct || "—"}</dd></div><div><dt>Promotion</dt><dd>{report.promotion || "—"}</dd></div></dl><div className="table-wrap"><table className="report-table"><caption className="sr-only">Terminal report subject scores</caption><thead><tr><th>Subject</th><th>Class score</th><th>Exam</th><th>Total</th><th>Grade</th><th>Remark</th></tr></thead><tbody>{report.rows.map(row => <tr key={row.subject}><th scope="row">{row.subject}</th><td>{value(row.classScore)}</td><td>{value(row.exam)}</td><td>{value(row.total)}</td><td>{row.grade}</td><td className="muted">{row.remark}</td></tr>)}</tbody></table></div><div className="two-columns report-remarks"><div><p className="muted">Class teacher’s remark</p><p>{report.teacherRemark}</p></div><div><p className="muted">Head’s remark</p><p>{report.headRemark}</p></div></div></div>;
}

export function Reports({ demo, notify, navigate }: ScreenProps) {
  const [term, setTerm] = useState("Term 1");
  const [className, setClassName] = useState("JHS 2");
  const [studentId, setStudentId] = useState(1);
  const [delivery, setDelivery] = useState(false);
  const actor = demo.data.actor;
  const students = demo.data.students.filter(s => s.className === className);
  const reportStudent = students.find(s => s.id === studentId) ?? students[0];
  const activeStudentId = reportStudent?.id ?? 1;
  const contacts = students.filter(s => s.contact).length;
  const draft = demo.data.reports.find(report => report.studentId === activeStudentId && report.term === term);
  const approved = draft?.status === "approved";
  const isFormMaster = demo.data.formMasters.some(assignment => assignment.className === className && assignment.teacherId === actor.userId);
  const canEditReport = !!draft && !approved && (actor.role === "admin" || isFormMaster);
  const canEditHeadRemark = !!draft && !approved && actor.role === "admin";
  const updateField = (field: ReportField, value: string) => {
    if (!draft) return;
    try {
      demo.update(() => setReportField(demo.data, actor, draft.id, field, value));
    } catch (error) {
      notify(error instanceof Error ? error.message : "That report field could not be saved.");
    }
  };
  const approve = () => {
    if (!draft) return;
    try {
      const position = computePosition(demo.data, draft.className, term, draft.studentId);
      const next = approveReport(demo.data, actor, draft.id, position);
      const undo = demo.update(() => next);
      notify(`Report approved for ${reportStudent?.name ?? "the selected student"}.`, undo);
    } catch (error) {
      notify(error instanceof Error ? error.message : "The report could not be approved.");
    }
  };
  return <><PageHeader eyebrow={`${term}, ${className}`} title="Report cards" name={demo.data.schoolName}><button className="button outline" disabled={!reportStudent} onClick={() => { void downloadReport(demo.data, activeStudentId, term).then(() => notify(`Report generated for ${reportStudent?.name ?? "the selected student"}, ${term}.`)).catch(() => notify("The report could not be generated.")); }}>Generate selected report</button><button className="button primary" disabled={!students.length} onClick={() => setDelivery(true)}>Send to parents</button></PageHeader><div className="filters"><label className="inline-label">Term<select aria-label="Term" value={term} onChange={e => setTerm(e.target.value)}>{["Term 1", "Term 2", "Term 3"].map(t => <option key={t}>{t}</option>)}</select></label><ClassSelect value={className} onChange={value => { setClassName(value); setStudentId(demo.data.students.find(s => s.className === value)?.id ?? 1); }} /><label className="inline-label">Student<select aria-label="Report student" value={activeStudentId} onChange={e => setStudentId(Number(e.target.value))}>{students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label></div>
    <div className="reports-layout"><div className="panel-stack"><Card className="report-card"><ReportContent data={demo.data} studentId={activeStudentId} term={term} /><button className="text-button report-download" disabled={!reportStudent} onClick={() => { void downloadReport(demo.data, activeStudentId, term).then(() => notify(`Report card downloaded for ${reportStudent?.name ?? "the selected student"}.`)).catch(() => notify("The report could not be generated.")); }}>Download PDF</button></Card>
      <Card className="report-editor"><div className="card-heading"><h2>Report approval</h2><Badge tone={approved ? "green" : "amber"}><span className="report-status">{approved ? "Approved" : "Draft"}</span></Badge></div>
        {!draft ? <EmptyState icon="report" title="No draft for this term" description="Term 1 reports are prepared in this demo. Choose Term 1 to edit or approve a report." />
          : <><p className="muted">{approved ? "This report is approved. Marks and report fields are frozen." : actor.role === "admin" ? "Administrator: you may edit every field and approve this report." : isFormMaster ? "Form master: you may edit the class teacher fields. Only an administrator can approve." : "Only the form master or an administrator may edit this report."}</p>
            <div className="report-fields">
              <label>Teacher remark<textarea aria-label="Teacher remark" rows={3} value={draft.teacherRemark} disabled={!canEditReport} onChange={event => updateField("teacherRemark", event.target.value)} /></label>
              <label>Conduct<input aria-label="Conduct" value={draft.conduct} disabled={!canEditReport} onChange={event => updateField("conduct", event.target.value)} /></label>
              <label>Promotion<select aria-label="Promotion" value={draft.promotion} disabled={!canEditReport} onChange={event => updateField("promotion", event.target.value)}><option value="promoted">Promoted</option><option value="not-promoted">Not promoted</option><option value="repeat">Repeat</option></select></label>
              <label>Head remark<textarea aria-label="Head remark" rows={3} value={draft.headRemark} disabled={!canEditHeadRemark} onChange={event => updateField("headRemark", event.target.value)} /></label>
            </div>
            {actor.role === "admin" && !approved && <button className="button primary section-spaced" onClick={approve}>Approve report</button>}
          </>}
      </Card></div>
      <Card><div className="card-heading"><h2>Delivery to parents</h2><span className="demo-label">Local contact preview</span></div><p className="muted delivery-description">Review the saved parent contacts before preparing a delivery draft.</p>{students.length > 0 && <div className="delivery-coverage"><div className="delivery-coverage-head"><span>{contacts} of {students.length} parents have contact details</span></div><ProgressBar value={(contacts / students.length) * 100} label="Parent contact coverage" /></div>}<ul className="delivery-list">{students.slice(0, 5).map(s => <li className="delivery-item" key={s.id}><span className="delivery-avatar" aria-hidden="true" dir="auto">{initials(s.name)}</span><div className="delivery-copy"><strong dir="auto">{s.name}</strong>{s.contact ? <span className="delivery-contact"><Icon name="mail" size={15} />{s.contact}</span> : <span className="delivery-missing"><Icon name="alert" size={15} />No parent contact on file</span>}</div><Badge tone={s.contact ? "green" : "red"}>{s.contact ? "Ready" : "Needs contact"}</Badge></li>)}</ul>{!students.length && <EmptyState icon="students" title="No students in this class" description="Choose another class to review parent contacts." />}{students.length > 5 && <button className="text-button" onClick={() => navigate("students")}>View all {students.length} student records</button>}<p className="demo-label">Local contact preview · no reports sent</p></Card></div>
    {delivery && <Modal title="Prepare report delivery" close={() => setDelivery(false)}><p>Prepare a delivery draft for {className}, {term}.</p><p className="muted">{contacts} parents have contact details. {students.length - contacts} student records need a parent contact before delivery.</p><p className="demo-label">Frontend preview. No email or WhatsApp messages will be sent.</p><button className="button primary full" onClick={() => { download("report-delivery-draft.csv", ["Student,Class,Term,Contact,Status", ...students.map(s => [s.name, className, term, s.contact ?? "", s.contact ? "Prepared" : "Missing contact"].map(csvCell).join(","))].join("\n")); setDelivery(false); notify("Report delivery draft downloaded."); }}>Save delivery draft</button></Modal>}
  </>;
}

export function ParentView({ demo, navigate, notify }: ScreenProps) {
  const [amount, setAmount] = useState(String(demo.data.balance));
  const [method, setMethod] = useState("Mobile Money");
  const [payment, setPayment] = useState(false);
  const [orderReview, setOrderReview] = useState(false);
  const [cart, setCart] = useState<Record<number, number>>({});
  const form = useFormValidation();
  const [orderError, setOrderError] = useState("");
  const student = demo.data.students.find(s => s.id === 2);
  const report = student ? buildReport(demo.data, student.id, "Term 1") : null;
  const cartItems = demo.data.products.filter(p => (cart[p.id] ?? 0) > 0);
  const total = cartItems.reduce((sum, p) => sum + p.price * cart[p.id]!, 0);
  const pay = () => {
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0 || Number(amount) > demo.data.balance) { setPayment(false); return; }
    const undo = demo.recordPayment(Number(amount));
    setPayment(false); notify("Demo payment recorded. No money was charged.", undo);
  };
  const placeOrder = () => {
    if (!cartItems.length || cartItems.some(p => (cart[p.id] ?? 0) > p.stock) || Object.keys(cart).some(id => cart[Number(id)]! > 0 && !demo.data.products.some(p => p.id === Number(id)))) { setOrderError("Some items are no longer available in this quantity. Update your cart and try again."); setOrderReview(false); return; }
    const undo = demo.update(d => ({
      products: d.products.map(p => ({ ...p, stock: p.stock - (cart[p.id] ?? 0) })),
      orders: [{ id: Date.now(), item: cartItems.map(p => `${p.name} × ${cart[p.id]}`).join(", "), collected: false }, ...d.orders],
    }));
    setCart({}); setOrderError(""); setOrderReview(false); notify("Demo order placed. Collect items at school. No money was charged.", undo);
  };
  return <div className="parent-screen"><header className="parent-header"><Brand schoolName name={demo.data.schoolName} /><button className="text-button" onClick={() => navigate("admin")}><Icon name="back" size={17} />Exit parent preview</button></header><div className="parent-content"><header className="parent-intro"><p className="eyebrow">Parent workspace / {student?.className ?? "School"}</p><h1>Your child’s school day, connected.</h1><p className="muted">View {student?.name ?? "your child"}’s report, school fees and supplies in this sample parent workspace.</p></header>{!student && <Card><EmptyState icon="students" title="No linked student" description="Choose Demo data in preview tools to return to the parent journey." /></Card>}<div className="parent-grid"><Card><div className="card-heading"><h2>Report card</h2><span className="stat-icon"><Icon name="report" /></span></div><p className="muted">Term 1 · Sample report</p><div className="report-summary"><div><span className="muted">Average</span><strong>{report?.average ?? "—"}{report?.average !== null && report?.average !== undefined ? "%" : ""}</strong></div><div><span className="muted">Position</span><strong>{report?.position ?? "—"}</strong></div></div><button className="button outline full" disabled={!student} onClick={() => void downloadReport(demo.data, student?.id ?? 2, "Term 1").catch(() => notify("The report could not be generated."))}><Icon name="download" size={18} />Download PDF</button></Card>
      <Card><div className="card-heading"><h2>School fees</h2><span className="stat-icon"><Icon name="fees" /></span></div><p className="muted">Balance due by 30 November 2026</p><strong className="balance-amount">{money(demo.data.balance)}</strong><form noValidate onSubmit={e => { e.preventDefault(); if (form.validate(e.currentTarget)) setPayment(true); }}><label className="muted">Amount to pay<input {...form.props("amount")} required type="number" inputMode="decimal" min="0.01" max={demo.data.balance} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} disabled={!student || demo.data.balance === 0} />{form.error("amount")}</label><div className="payment-methods" aria-label="Payment method">{["Mobile Money", "Card"].map(m => <button type="button" key={m} aria-pressed={method === m} className={method === m ? "selected" : ""} onClick={() => setMethod(m)}>{m}</button>)}</div><button className="button primary full" disabled={!student || demo.data.balance === 0}>{demo.data.balance === 0 ? "Fees paid" : "Pay now"}</button></form></Card></div>
      <Card className="parent-shop"><h2>School shop</h2>{!demo.data.products.length && <EmptyState icon="shop" title="No supplies available yet" description="School supplies will appear here when the catalog is ready." />}{demo.data.products.map(p => <div className="list-row" key={p.id}><span dir="auto">{p.name}</span><strong>{money(p.price)}</strong><div className="cart-controls">{(cart[p.id] ?? 0) > 0 && <><button className="button outline compact" aria-label={`Remove one ${p.name}`} onClick={() => setCart(c => ({ ...c, [p.id]: Math.max(0, (c[p.id] ?? 0) - 1) }))}>−</button><span aria-live="polite">{cart[p.id]}</span></>}<button className="button outline compact" disabled={!student || (cart[p.id] ?? 0) >= p.stock} onClick={() => setCart(c => ({ ...c, [p.id]: (c[p.id] ?? 0) + 1 }))}>{p.stock === 0 ? "Out of stock" : "Add"}</button></div></div>)}{orderError && <p className="form-error" role="alert">{orderError}</p>}<button className="button primary full section-spaced" disabled={!student || !cartItems.length} onClick={() => setOrderReview(true)}>Review order and pay{total > 0 ? ` · ${money(total)}` : ""}</button><p className="muted">Collect items at school.</p></Card><p className="demo-label parent-demo-note">Frontend preview · sample records and demo payments</p>
    </div>{payment && <Modal title="Review payment" close={() => setPayment(false)}><p>School fees for Student 2</p><strong className="balance-amount">{money(Number(amount))}</strong><p className="muted">Payment method: {method}</p><p className="demo-label">This is a demo. No payment will be collected.</p><button className="button primary full" onClick={pay}>Complete demo payment</button></Modal>}
    {orderReview && <Modal title="Review your order" close={() => setOrderReview(false)}>{cartItems.map(p => <div className="list-row" key={p.id}><span>{p.name} × {cart[p.id]}</span><strong>{money(p.price * cart[p.id]!)}</strong></div>)}<div className="list-row"><strong>Total</strong><strong>{money(total)}</strong></div><p className="muted">Collect items at school after placing your order.</p><p className="demo-label">This is a demo. No payment will be collected.</p><button className="button primary full" onClick={placeOrder}>Place demo order</button></Modal>}
  </div>;
}
