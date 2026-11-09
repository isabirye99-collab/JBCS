"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, RefreshCw, Landmark, CalendarDays, CircleDollarSign, CheckCircle2, Clock3, Search, X } from "lucide-react";

type Loan = {
  id: string; lender_name: string; loan_name: string; currency: string;
  original_principal: number|string; term_months: number; start_date: string;
  monthly_principal: number|string; monthly_interest: number|string; monthly_fees: number|string;
  scheduled_payment: number|string; status: string; notes?: string|null;
};
type Instalment = {
  id: string; loan_id: string; installment_number: number; due_date: string;
  principal_due: number|string; interest_due: number|string; fees_due: number|string;
  scheduled_amount: number|string; amount_paid: number|string; paid_date?: string|null;
  status: string; payment_reference?: string|null; notes?: string|null;
};
const money = (v: number|string|null|undefined, currency = "UGX") => new Intl.NumberFormat("en-UG", { style:"currency", currency, maximumFractionDigits:0 }).format(Number(v||0));
const dateLabel = (v:string) => v ? new Date(v+"T00:00:00").toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : "—";

export default function LoansPage() {
  const [loans,setLoans] = useState<Loan[]>([]);
  const [instalments,setInstalments] = useState<Instalment[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [query,setQuery] = useState("");
  const [selected,setSelected] = useState<Instalment|null>(null);
  const [amount,setAmount] = useState("");
  const [paidDate,setPaidDate] = useState(new Date().toISOString().slice(0,10));
  const [reference,setReference] = useState("");
  const [saving,setSaving] = useState(false);
  const [notice,setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/saas/loans",{cache:"no-store"});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load loan schedule.");
      setLoans(data.loans||[]); setInstalments(data.installments||[]);
    } catch(e) { setError(e instanceof Error ? e.message : "Could not load loan schedule."); }
    finally { setLoading(false); }
  },[]);
  useEffect(()=>{ void load(); },[load]);

  const loan = loans[0];
  const paidTotal = useMemo(()=>instalments.reduce((s,i)=>s+Number(i.amount_paid||0),0),[instalments]);
  const overdue = useMemo(()=>instalments.filter(i=>i.status!=="paid"&&i.status!=="skipped"&&i.due_date<new Date().toISOString().slice(0,10)),[instalments]);
  const filtered = useMemo(()=>instalments.filter(i=>{
    const haystack=[i.installment_number,i.due_date,i.status,i.payment_reference].join(" ").toLowerCase();
    return haystack.includes(query.toLowerCase());
  }),[instalments,query]);

  function openPayment(item:Instalment) {
    setSelected(item); setAmount(String(item.amount_paid||"")); setPaidDate(item.paid_date||new Date().toISOString().slice(0,10)); setReference(item.payment_reference||""); setNotice("");
  }
  async function savePayment(e:FormEvent) {
    e.preventDefault(); if(!selected) return;
    setSaving(true); setNotice("");
    try {
      const res=await fetch("/api/saas/loans",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:selected.id,amount_paid:Number(amount),paid_date:paidDate,payment_reference:reference})});
      const data=await res.json(); if(!res.ok) throw new Error(data.error||"Could not save payment.");
      setSelected(null); setNotice("Instalment record updated."); await load();
    } catch(e) { setNotice(e instanceof Error?e.message:"Could not save payment."); }
    finally { setSaving(false); }
  }

  return <main style={{minHeight:"100vh",background:"#f7f7f8",padding:"26px clamp(14px,3vw,34px)",color:"#211f22"}}>
    <div style={{maxWidth:1440,margin:"0 auto"}}>
      <Link href="/workspace/finance" style={{display:"inline-flex",alignItems:"center",gap:7,color:"#7b2438",textDecoration:"none",fontWeight:700,fontSize:13,marginBottom:18}}><ArrowLeft size={16}/> Finance overview</Link>
      <header style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,flexWrap:"wrap",marginBottom:22}}>
        <div><p style={{fontSize:11,fontWeight:800,letterSpacing:".16em",color:"#9f1d35",margin:"0 0 8px"}}>FINANCE / BORROWING</p><h1 style={{fontSize:"clamp(27px,3vw,36px)",margin:0,letterSpacing:"-.04em"}}>Loans</h1><p style={{color:"#77717a",fontSize:14,margin:"8px 0 0"}}>Track loan terms, scheduled instalments and confirmed payments.</p></div>
        <button onClick={()=>void load()} disabled={loading} style={{border:"1px solid #ded9dc",borderRadius:9,background:"#fff",padding:"10px 13px",fontWeight:700,cursor:"pointer",display:"inline-flex",gap:8,alignItems:"center"}}><RefreshCw size={15}/>{loading?"Refreshing":"Refresh"}</button>
      </header>
      {error&&<div role="alert" style={{background:"#fff1f2",border:"1px solid #fecdd3",color:"#9f1239",padding:13,borderRadius:10,marginBottom:16}}>{error}</div>}
      {notice&&<div role="status" style={{background:"#f0fdf4",border:"1px solid #bbf7d0",color:"#166534",padding:13,borderRadius:10,marginBottom:16}}>{notice}</div>}
      {!loading&&!loans.length&&!error&&<section style={{background:"#fff",border:"1px solid #e7e3e5",borderRadius:14,padding:24}}>No loans have been configured for this workspace.</section>}
      {loan&&<>
        <section style={{background:"#fff",border:"1px solid #e7e3e5",borderRadius:14,padding:22,marginBottom:18}}>
          <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:18}}><div style={{background:"#fbecef",color:"#9f1d35",padding:12,borderRadius:12}}><Landmark size={23}/></div><div><h2 style={{fontSize:19,margin:0}}>{loan.lender_name} · {loan.loan_name}</h2><p style={{margin:"5px 0 0",fontSize:12,color:"#77717a"}}>{loan.term_months} months · Started {dateLabel(loan.start_date)} · {loan.status}</p></div></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12}}>
            {[{label:"Original principal",value:money(loan.original_principal,loan.currency),icon:CircleDollarSign},{label:"Scheduled instalment",value:money(loan.scheduled_payment,loan.currency),icon:CalendarDays},{label:"Payments recorded",value:money(paidTotal,loan.currency),icon:CheckCircle2},{label:"Unresolved past-due instalments",value:String(overdue.length),icon:Clock3}].map(card=>{const Icon=card.icon;return <article key={card.label} style={{background:"#faf9fa",border:"1px solid #efebed",borderRadius:10,padding:15}}><div style={{display:"flex",justifyContent:"space-between",color:"#77717a",fontSize:12,marginBottom:10}}>{card.label}<Icon size={16}/></div><strong style={{fontSize:22,letterSpacing:"-.03em",fontVariantNumeric:"tabular-nums"}}>{card.value}</strong></article>})}
          </div>
          <p style={{margin:"16px 0 0",fontSize:12,lineHeight:1.6,color:"#7a5a20",background:"#fffbeb",border:"1px solid #fde68a",borderRadius:9,padding:12}}>Schedule is provisional. The supplied monthly principal component does not reconcile to the original principal over 84 months. Confirm the amortisation and paid instalments against DTB statements before relying on an outstanding-balance figure.</p>
        </section>
        <section style={{background:"#fff",border:"1px solid #e7e3e5",borderRadius:14,overflow:"hidden"}}>
          <div style={{padding:18,borderBottom:"1px solid #eee9eb",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><div><h2 style={{fontSize:17,margin:0}}>Instalment schedule</h2><p style={{margin:"5px 0 0",fontSize:12,color:"#77717a"}}>{filtered.length} of {instalments.length} instalments · Payment status is only updated when recorded here.</p></div><div style={{display:"flex",alignItems:"center",gap:8,border:"1px solid #ded9dc",borderRadius:8,padding:"8px 10px"}}><Search size={15} color="#77717a"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search instalments" style={{border:0,outline:0,width:160,fontSize:13}}/></div></div>
          <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:880,fontSize:13}}><thead style={{background:"#faf9fa",color:"#77717a",textAlign:"left"}}><tr>{["No.","Due date","Principal","Interest","Duty/fees","Scheduled","Paid","Status","Action"].map(h=><th key={h} style={{padding:"12px 14px",fontSize:10,letterSpacing:".08em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead><tbody>{loading?<tr><td colSpan={9} style={{padding:28,textAlign:"center",color:"#77717a"}}>Loading schedule…</td></tr>:filtered.map(i=><tr key={i.id} style={{borderTop:"1px solid #f0edef"}}><td style={{padding:"12px 14px"}}>{i.installment_number}</td><td style={{padding:"12px 14px",whiteSpace:"nowrap"}}>{dateLabel(i.due_date)}</td><td style={{padding:"12px 14px",whiteSpace:"nowrap"}}>{money(i.principal_due)}</td><td style={{padding:"12px 14px",whiteSpace:"nowrap"}}>{money(i.interest_due)}</td><td style={{padding:"12px 14px",whiteSpace:"nowrap"}}>{money(i.fees_due)}</td><td style={{padding:"12px 14px",fontWeight:700,whiteSpace:"nowrap"}}>{money(i.scheduled_amount)}</td><td style={{padding:"12px 14px",whiteSpace:"nowrap"}}>{money(i.amount_paid)}</td><td style={{padding:"12px 14px"}}><span style={{display:"inline-block",borderRadius:99,padding:"5px 8px",fontSize:11,fontWeight:700,background:i.status==="paid"?"#dcfce7":i.status==="partial"?"#fef3c7":i.status==="overdue"?"#fee2e2":"#f1f0f2",color:i.status==="paid"?"#166534":i.status==="partial"?"#92400e":i.status==="overdue"?"#991b1b":"#5f5961"}}>{i.status}</span></td><td style={{padding:"12px 14px"}}><button onClick={()=>openPayment(i)} style={{border:"1px solid #d9d2d6",borderRadius:7,background:"#fff",padding:"7px 9px",fontSize:12,fontWeight:700,cursor:"pointer"}}>{Number(i.amount_paid)>0?"Edit payment":"Record payment"}</button></td></tr>):filtered.length ? filtered.map(i=><tr key={i.id} style={{borderTop:"1px solid #f0edef"}}><td style={{padding:"12px 14px"}}>{i.installment_number}</td><td style={{padding:"12px 14px",whiteSpace:"nowrap"}}>{dateLabel(i.due_date)}</td><td style={{padding:"12px 14px",whiteSpace:"nowrap"}}>{money(i.principal_due)}</td><td style={{padding:"12px 14px",whiteSpace:"nowrap"}}>{money(i.interest_due)}</td><td style={{padding:"12px 14px",whiteSpace:"nowrap"}}>{money(i.fees_due)}</td><td style={{padding:"12px 14px",fontWeight:700,whiteSpace:"nowrap"}}>{money(i.scheduled_amount)}</td><td style={{padding:"12px 14px",whiteSpace:"nowrap"}}>{money(i.amount_paid)}</td><td style={{padding:"12px 14px"}}><span style={{display:"inline-block",borderRadius:99,padding:"5px 8px",fontSize:11,fontWeight:700,background:i.status==="paid"?"#dcfce7":i.status==="partial"?"#fef3c7":i.status==="overdue"?"#fee2e2":"#f1f0f2",color:i.status==="paid"?"#166534":i.status==="partial"?"#92400e":i.status==="overdue"?"#991b1b":"#5f5961"}}>{i.status}</span></td><td style={{padding:"12px 14px"}}><button onClick={()=>openPayment(i)} style={{border:"1px solid #d9d2d6",borderRadius:7,background:"#fff",padding:"7px 9px",fontSize:12,fontWeight:700,cursor:"pointer"}}>{Number(i.amount_paid)>0?"Edit payment":"Record payment"}</button></td></tr>) : <tr><td colSpan={9} style={{padding:28,textAlign:"center",color:"#77717a"}}>No instalments match this search.</td></tr>}</tbody></table></div>
        </section>
      </>}
      {selected&&<div role="presentation" onClick={()=>setSelected(null)} style={{position:"fixed",inset:0,background:"rgba(25,20,23,.45)",zIndex:50,display:"flex",justifyContent:"flex-end"}}><aside role="dialog" aria-modal="true" aria-label="Record loan payment" onClick={e=>e.stopPropagation()} style={{background:"#fff",height:"100%",width:"min(100%,440px)",padding:24,overflowY:"auto",boxShadow:"-15px 0 40px rgba(0,0,0,.12)"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><div><p style={{fontSize:10,letterSpacing:".14em",fontWeight:800,color:"#9f1d35",margin:"0 0 6px"}}>INSTALMENT {selected.installment_number}</p><h2 style={{fontSize:22,margin:0}}>Record payment</h2></div><button aria-label="Close" onClick={()=>setSelected(null)} style={{border:0,background:"transparent",cursor:"pointer"}}><X size={20}/></button></div><p style={{fontSize:13,color:"#77717a"}}>Due {dateLabel(selected.due_date)} · Scheduled {money(selected.scheduled_amount)}</p><form onSubmit={savePayment} style={{display:"grid",gap:14}}><label style={{display:"grid",gap:6,fontSize:12,fontWeight:700}}>Actual amount paid (UGX)<input required type="number" min="0" step="1" value={amount} onChange={e=>setAmount(e.target.value)} style={{border:"1px solid #ded9dc",borderRadius:8,padding:12,fontSize:14}}/></label><label style={{display:"grid",gap:6,fontSize:12,fontWeight:700}}>Payment date<input required type="date" value={paidDate} onChange={e=>setPaidDate(e.target.value)} style={{border:"1px solid #ded9dc",borderRadius:8,padding:12,fontSize:14}}/></label><label style={{display:"grid",gap:6,fontSize:12,fontWeight:700}}>Bank reference (optional)<input value={reference} onChange={e=>setReference(e.target.value)} maxLength={160} style={{border:"1px solid #ded9dc",borderRadius:8,padding:12,fontSize:14}}/></label><p style={{fontSize:12,lineHeight:1.5,color:"#77717a",margin:0}}>This records payment status only. It does not yet create journal entries or post interest/principal to the general ledger.</p><div style={{display:"flex",gap:10,marginTop:8}}><button type="button" onClick={()=>setSelected(null)} style={{flex:1,border:"1px solid #ded9dc",borderRadius:8,padding:12,background:"#fff",fontWeight:700,cursor:"pointer"}}>Cancel</button><button disabled={saving} style={{flex:1,border:0,borderRadius:8,padding:12,background:"#9f1d35",color:"#fff",fontWeight:800,cursor:"pointer"}}>{saving?"Saving…":"Save payment"}</button></div></form></aside></div>}
    </div>
  </main>;
}
