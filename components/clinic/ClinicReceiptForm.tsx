"use client";
import { useState, type FormEvent } from "react";
type Patient={id:string;patient_number:string;full_name:string};
type Charge={id:string;patient_id:string;description:string;quantity:number;unit_price:number;currency:string;status:string};
export default function ClinicReceiptForm({patients,charges}:{patients:Patient[];charges:Charge[]}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");setMessage("");const form=e.currentTarget;try{const res=await fetch("/api/clinic/receipts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.fromEntries(new FormData(form).entries()))});const data=await res.json();if(!res.ok)throw new Error(data.error||"Could not record payment.");setMessage("Payment recorded. Receipt: "+data.receipt.receipt_number);form.reset();setTimeout(()=>location.reload(),1000);}catch(e){setError(e instanceof Error?e.message:"Could not record payment.");}finally{setBusy(false);}}
 const field={width:"100%",padding:11,border:"1px solid #d9dee7",borderRadius:9,background:"#fff",color:"#252b36"} as const;
 const label={display:"grid",gap:6,fontSize:13,fontWeight:700,color:"#454d5a"} as const;
 return <form onSubmit={submit} style={{display:"grid",gap:14}}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:14}}>
 <label style={label}>Patient *<select name="patient_id" required defaultValue="" style={field}><option value="" disabled>Select patient</option>{patients.map(p=><option key={p.id} value={p.id}>{p.full_name} · {p.patient_number}</option>)}</select></label>
 <label style={label}>Charge<select name="charge_id" defaultValue="" style={field}><option value="">Unallocated payment</option>{charges.filter(c=>c.status==="unpaid").map(c=><option key={c.id} value={c.id}>{c.description} · {c.currency} {(Number(c.quantity)*Number(c.unit_price)).toFixed(2)}</option>)}</select></label>
 <label style={label}>Amount received *<input name="amount" type="number" min="0.01" step="0.01" required style={field} placeholder="0.00"/></label>
 <label style={label}>Currency *<select name="currency" defaultValue="UGX" style={field}>{["UGX","USD","KES","TZS","EUR","GBP"].map(x=><option key={x}>{x}</option>)}</select></label>
 <label style={label}>Payment method *<select name="payment_method" defaultValue="cash" style={field}>{[["cash","Cash"],["mobile_money","Mobile money"],["bank_transfer","Bank transfer"],["card","Card"],["other","Other"]].map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>
 <label style={label}>Transaction reference<input name="transaction_reference" maxLength={120} style={field} placeholder="Optional transaction ID"/></label></div>
 <p style={{fontSize:12,color:"#687080",margin:0}}>Record only payments received. Linked payments must match the charge currency and outstanding balance.</p>
 {error&&<p role="alert" style={{color:"#a61b29"}}>{error}</p>}{message&&<p role="status" style={{color:"#17663a"}}>{message}</p>}
 <button disabled={busy||!patients.length} style={{justifySelf:"start",border:0,borderRadius:9,background:"#ad1d2e",color:"#fff",fontWeight:800,padding:"12px 18px"}}>{busy?"Recording…":"Record payment & issue receipt"}</button></form>;
}