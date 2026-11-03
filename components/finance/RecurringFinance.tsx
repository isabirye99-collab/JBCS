"use client";
import { useCallback, useEffect, useState } from "react";

type Template = Record<string, unknown> & { id:string; name:string; frequency:string; next_run_date:string; end_date:string|null; is_active:boolean };
type Contact = {id:string;name:string};
const style:React.CSSProperties={width:"100%",padding:"10px 12px",border:"1px solid #d8dee8",borderRadius:8,font:"inherit",background:"#fff",color:"#172033"};
const frequencies=[["weekly","Weekly"],["monthly","Monthly"],["quarterly","Quarterly"],["yearly","Yearly"]];
const today=()=>{const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)};
export default function RecurringFinance({onNotice}:{onNotice:(message:string)=>void}){
 const [kind,setKind]=useState<"invoices"|"expenses">("invoices");
 const [templates,setTemplates]=useState<Template[]>([]);
 const [customers,setCustomers]=useState<Contact[]>([]);
 const [suppliers,setSuppliers]=useState<Contact[]>([]);
 const [loading,setLoading]=useState(false);const [saving,setSaving]=useState(false);const [error,setError]=useState("");
 const [form,setForm]=useState({name:"",contact_id:"",supplier_contact_id:"",category:"Office supplies",description:"",amount:"",currency:"UGX",exchange_rate:"1",payment_method:"bank_transfer",frequency:"monthly",next_run_date:today(),end_date:"",notes:"",item_description:"",quantity:"1",unit_price:"",tax_rate:"0"});
 const load=useCallback(async()=>{setLoading(true);setError("");try{const [r,cr,sr]=await Promise.all([fetch("/api/finance/recurring-"+kind,{cache:"no-store"}),fetch("/api/finance/customers?type=client",{cache:"no-store"}),fetch("/api/finance/customers?type=supplier",{cache:"no-store"})]);const [d,cd,sd]=await Promise.all([r.json(),cr.json(),sr.json()]);if(!r.ok)throw new Error(d.error||"Unable to load recurring templates.");if(!cr.ok)throw new Error(cd.error||"Unable to load customers.");if(!sr.ok)throw new Error(sd.error||"Unable to load suppliers.");setTemplates(Array.isArray(d.templates)?d.templates:[]);setCustomers(Array.isArray(cd.customers)?cd.customers:[]);setSuppliers(Array.isArray(sd.customers)?sd.customers:[]);}catch(e){setError(e instanceof Error?e.message:"Unable to load recurring templates.");}finally{setLoading(false)}},[kind]);
 useEffect(()=>{void load()},[load]);
 const update=(key:string,value:string)=>setForm(old=>({...old,[key]:value}));
 async function processDue(){setSaving(true);setError("");try{const r=await fetch("/api/finance/recurring-process",{method:"POST"});const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to process due schedules.");const result=d.result||{};onNotice(`Recurring schedules processed: ${result.invoices_created||0} invoices and ${result.expenses_created||0} expenses created.`);await load();}catch(e){setError(e instanceof Error?e.message:"Unable to process due schedules.");}finally{setSaving(false)}}
 async function save(e:React.FormEvent){e.preventDefault();setSaving(true);setError("");try{const payload=kind==="invoices"?{name:form.name,contact_id:form.contact_id,currency:form.currency,exchange_rate:Number(form.exchange_rate),frequency:form.frequency,next_run_date:form.next_run_date,end_date:form.end_date||null,notes:form.notes,items:[{description:form.item_description,quantity:Number(form.quantity),unit_price:Number(form.unit_price),tax_rate:Number(form.tax_rate)}]}:{name:form.name,category:form.category,description:form.description,amount:Number(form.amount),currency:form.currency,exchange_rate:Number(form.exchange_rate),payment_method:form.payment_method,supplier_contact_id:form.supplier_contact_id,frequency:form.frequency,next_run_date:form.next_run_date,end_date:form.end_date||null,notes:form.notes};const r=await fetch("/api/finance/recurring-"+kind,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to save template.");setForm(old=>({...old,name:"",description:"",amount:"",item_description:"",unit_price:"",notes:""}));onNotice("Recurring "+(kind==="invoices"?"invoice":"expense")+" template saved.");await load();}catch(e){setError(e instanceof Error?e.message:"Unable to save template.");}finally{setSaving(false)}}
 const field=(label:string,key:string,type="text",required=true)=><label style={{display:"grid",gap:6,fontSize:13,fontWeight:600}}>{label}<input style={style} type={type} required={required} value={form[key as keyof typeof form]} onChange={e=>update(key,e.target.value)} /></label>;
 return <div style={{display:"grid",gap:18}}>
  <section className="finance-panel" style={{padding:20}}>
   <div className="finance-panel-heading"><div><h2>Recurring schedules</h2><p>Save repeat invoice and expense templates with a frequency and next run date.</p></div><select className="finance-search" value={kind} onChange={e=>setKind(e.target.value as "invoices"|"expenses")}><option value="invoices">Recurring invoices</option><option value="expenses">Recurring expenses</option></select></div>
   {error&&<div className="finance-notice" role="alert">{error} <button className="finance-text-button" onClick={()=>void load()}>Retry</button></div>}
   <form onSubmit={save} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:14,marginTop:16}}>
    {field("Template name","name")}
    {kind==="invoices"?<label style={{display:"grid",gap:6,fontSize:13,fontWeight:600}}>Customer<select required style={style} value={form.contact_id} onChange={e=>update("contact_id",e.target.value)}><option value="">Select customer</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>:<>
     {field("Category","category")}
     {field("Expense description","description")}
     {field("Amount","amount","number")}
     <label style={{display:"grid",gap:6,fontSize:13,fontWeight:600}}>Supplier (optional)<select style={style} value={form.supplier_contact_id} onChange={e=>update("supplier_contact_id",e.target.value)}><option value="">No supplier</option>{suppliers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
     <label style={{display:"grid",gap:6,fontSize:13,fontWeight:600}}>Payment method<select style={style} value={form.payment_method} onChange={e=>update("payment_method",e.target.value)}>{["cash","bank_transfer","mobile_money","card","cheque","other"].map(m=><option key={m} value={m}>{m.replace("_"," ")}</option>)}</select></label>
    </>}
    {kind==="invoices"&&<>{field("Item description","item_description")}{field("Quantity","quantity","number")}{field("Unit price","unit_price","number")}{field("Tax rate (%)","tax_rate","number")}</>}
    <label style={{display:"grid",gap:6,fontSize:13,fontWeight:600}}>Currency<select style={style} value={form.currency} onChange={e=>update("currency",e.target.value)}>{["UGX","USD","EUR","GBP","KES","TZS","RWF"].map(c=><option key={c}>{c}</option>)}</select></label>
    {field("Exchange rate to UGX","exchange_rate","number")}
    <label style={{display:"grid",gap:6,fontSize:13,fontWeight:600}}>Frequency<select style={style} value={form.frequency} onChange={e=>update("frequency",e.target.value)}>{frequencies.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
    {field("First / next run date","next_run_date","date")}
    {field("Stop after (optional)","end_date","date",false)}
    <label style={{display:"grid",gap:6,fontSize:13,fontWeight:600,gridColumn:"1 / -1"}}>Notes<textarea style={style} rows={2} value={form.notes} onChange={e=>update("notes",e.target.value)}/></label>
    <div style={{gridColumn:"1 / -1"}}><button className="finance-primary-button" type="submit" disabled={saving}>{saving?"Saving…":"Save recurring template"}</button></div>
   </form>
  </section>
  <section className="finance-panel" style={{padding:20}}><div className="finance-panel-heading"><div><h2>Saved {kind==="invoices"?"invoice":"expense"} schedules</h2><p>Review the next scheduled date and recurrence interval.</p></div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button className="finance-secondary-button" onClick={()=>void load()} disabled={loading||saving}>Refresh</button><button className="finance-primary-button" onClick={()=>void processDue()} disabled={saving}>{saving?"Processing…":"Run due schedules"}</button></div></div>
   {loading?<p className="finance-empty">Loading schedules…</p>:!templates.length?<p className="finance-empty">No recurring templates saved yet.</p>:<div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>NAME</th><th>FREQUENCY</th><th>NEXT RUN</th><th>END DATE</th><th>STATUS</th></tr></thead><tbody>{templates.map(t=><tr key={t.id}><td>{t.name}</td><td>{t.frequency}</td><td>{t.next_run_date}</td><td>{t.end_date||"No end date"}</td><td>{t.is_active?"Active":"Paused"}</td></tr>)}</tbody></table></div>}
  </section>
 </div>
}
