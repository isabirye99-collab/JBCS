import { NextResponse } from "next/server";
import { getClinicContext } from "@/lib/clinic-context";
export const dynamic="force-dynamic";
const str=(v:unknown,n:number)=>typeof v==="string"?v.trim().slice(0,n):"";
export async function POST(request:Request){
 const ctx=await getClinicContext();if("error" in ctx)return NextResponse.json({error:ctx.error},{status:ctx.status});
 let b:Record<string,unknown>;try{const v=await request.json();if(!v||typeof v!=="object"||Array.isArray(v))throw Error();b=v;}catch{return NextResponse.json({error:"Submit valid receipt details."},{status:400});}
 const patient=str(b.patient_id,80),chargeId=str(b.charge_id,80),amount=Number(b.amount),currency=str(b.currency,3).toUpperCase(),method=str(b.payment_method,30),reference=str(b.transaction_reference,120);
 if(!/^[0-9a-f-]{36}$/i.test(patient))return NextResponse.json({error:"Select a valid patient."},{status:400});
 if(!Number.isFinite(amount)||amount<=0||amount>1e12)return NextResponse.json({error:"Payment must be greater than zero."},{status:400});
 if(!["UGX","USD","KES","TZS","EUR","GBP"].includes(currency))return NextResponse.json({error:"Unsupported currency."},{status:400});
 if(!["cash","mobile_money","bank_transfer","card","other"].includes(method))return NextResponse.json({error:"Invalid payment method."},{status:400});
 const headers={apikey:ctx.serviceKey,Authorization:"Bearer "+ctx.serviceKey,"Content-Type":"application/json",Prefer:"return=representation"};
 const base=ctx.url+"/rest/v1/";
 const p=await fetch(base+"patients?id=eq."+encodeURIComponent(patient)+"&workspace_id=eq."+encodeURIComponent(ctx.workspaceId)+"&select=id&limit=1",{headers,cache:"no-store"});
 const ps=p.ok?await p.json():[];if(!Array.isArray(ps)||!ps.length)return NextResponse.json({error:"Patient not found in this clinic."},{status:400});
 let charge:any=null;
 if(chargeId){if(!/^[0-9a-f-]{36}$/i.test(chargeId))return NextResponse.json({error:"Invalid charge."},{status:400});
 const r=await fetch(base+"clinic_charges?id=eq."+encodeURIComponent(chargeId)+"&workspace_id=eq."+encodeURIComponent(ctx.workspaceId)+"&patient_id=eq."+encodeURIComponent(patient)+"&select=id,quantity,unit_price,currency,status&limit=1",{headers,cache:"no-store"});
 const found=r.ok?await r.json():[];if(!Array.isArray(found)||!found.length)return NextResponse.json({error:"Charge not found for this patient."},{status:400});charge=found[0];
 if(String(charge.currency).trim()!==currency)return NextResponse.json({error:"Payment currency must match the charge."},{status:400});
 const rr=await fetch(base+"clinic_receipts?workspace_id=eq."+encodeURIComponent(ctx.workspaceId)+"&charge_id=eq."+encodeURIComponent(chargeId)+"&select=amount",{headers,cache:"no-store"});
 const paidRows=rr.ok?await rr.json():null;if(!Array.isArray(paidRows))return NextResponse.json({error:"Could not verify existing payments; no receipt was saved."},{status:502});
 const total=Number(charge.quantity)*Number(charge.unit_price),paid=paidRows.reduce((s:number,x:any)=>s+Number(x.amount||0),0),remaining=Math.max(0,total-paid);
 if(amount>remaining+0.0001)return NextResponse.json({error:"Payment exceeds remaining balance of "+remaining.toFixed(2)+" "+currency+"."},{status:400});
 }
 const receiptNumber="JPMC-R-"+new Date().toISOString().slice(0,10).replaceAll("-","")+"-"+crypto.randomUUID().slice(0,8).toUpperCase();
 const saved=await fetch(base+"clinic_receipts",{method:"POST",headers,cache:"no-store",body:JSON.stringify({workspace_id:ctx.workspaceId,patient_id:patient,charge_id:chargeId||null,receipt_number:receiptNumber,amount,currency,payment_method:method,transaction_reference:reference||null})});
 if(!saved.ok){console.error("Clinic receipt save failed",saved.status,(await saved.text().catch(()=>"")).slice(0,200));return NextResponse.json({error:"Could not save receipt. Please retry."},{status:502});}
 const result=await saved.json();if(!Array.isArray(result)||!result[0])return NextResponse.json({error:"Receipt could not be confirmed."},{status:502});
 return NextResponse.json({receipt:{receipt_number:result[0].receipt_number,amount:result[0].amount,currency:result[0].currency,payment_method:result[0].payment_method}},{status:201});
}