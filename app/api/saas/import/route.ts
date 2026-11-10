import { NextRequest, NextResponse } from "next/server";
import { getSaasContext } from "@/lib/saas-context";

export const dynamic = "force-dynamic";
type Row = Record<string, unknown>;
const str = (v: unknown, max = 500) => v == null ? "" : String(v).trim().slice(0, max);
const num = (v: unknown, fallback = NaN) => v === "" || v == null ? fallback : Number(v);
const validDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v + "T00:00:00Z").toISOString().slice(0,10) === v;
const headers = (c: { serviceKey: string }) => ({ apikey: c.serviceKey, Authorization: `Bearer ${c.serviceKey}` });
const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLocaleLowerCase();

async function rest(c: any, table: string, query = "") {
  return fetch(`${c.url}/rest/v1/${table}${query}`, { headers: headers(c), cache: "no-store" });
}
async function insert(c: any, table: string, body: any) {
  return fetch(`${c.url}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...headers(c), "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(body), cache: "no-store",
  });
}
async function patch(c: any, table: string, query: string, body: any) {
  return fetch(`${c.url}/rest/v1/${table}${query}`, {
    method: "PATCH", headers: { ...headers(c), "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(body), cache: "no-store",
  });
}
async function getContacts(c: any, type: "client" | "supplier") {
  const r = await rest(c, "business_contacts", `?workspace_id=eq.${encodeURIComponent(c.workspaceId)}&contact_type=eq.${type}&select=id,name,email,phone&limit=5000`);
  if (!r.ok) throw new Error("Could not load existing contacts.");
  return await r.json() as Array<{id:string;name:string;email?:string;phone?:string}>;
}
function cleanFrequency(v: string) {
  const s = v.toLowerCase();
  if (["weekly","week","weeks"].includes(s)) return "weekly";
  if (["monthly","month","months"].includes(s)) return "monthly";
  if (["quarterly","quarter","quarters"].includes(s)) return "quarterly";
  if (["yearly","annual","year","years"].includes(s)) return "yearly";
  return "";
}
function cleanStatus(v: string): "draft" | "sent" | "part_paid" | "paid" | "overdue" | "void" {
  const s = v.toLowerCase().replace(/[ -]/g, "_");
  if (["paid","void","overdue","sent","part_paid","partially_paid","partial_paid"].includes(s)) {
    if (s === "partially_paid" || s === "partial_paid") return "part_paid";
    return s as "draft" | "sent" | "part_paid" | "paid" | "overdue" | "void";
  }
  return "draft";
}
const methodValue = (v: string) => {
  const s = v.toLowerCase().replace(/[ -]/g, "_");
  if (["cash","bank_transfer","mobile_money","card","cheque","other"].includes(s)) return s;
  if (s.includes("bank")) return "bank_transfer";
  if (s.includes("mobile") || s.includes("mtn") || s.includes("airtel")) return "mobile_money";
  if (s.includes("card")) return "card";
  if (s.includes("cheque") || s.includes("check")) return "cheque";
  if (s.includes("cash")) return "cash";
  return "other";
};

export async function POST(req: NextRequest) {
  const c = await getSaasContext();
  if ("error" in c) return NextResponse.json({ error: c.error }, { status: c.status });
  if (!["owner", "admin", "finance"].includes(c.role)) return NextResponse.json({ error: "Your workspace role does not permit imports." }, { status: 403 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid import request." }, { status: 400 }); }
  const type = str(body.type, 40);
  const rows = body.rows as Row[];
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 5000) return NextResponse.json({ error: "Upload between 1 and 5,000 CSV rows per batch." }, { status: 400 });
  const result = { imported: 0, skipped: 0, errors: [] as Array<{row:number;message:string}> };
  const fail = (i: number, message: string) => result.errors.push({ row: i + 2, message });

  try {
    if (type === "customers" || type === "suppliers") {
      const contactType = type === "customers" ? "client" : "supplier";
      const existing = await getContacts(c, contactType);
      const names = new Set(existing.map(x => norm(x.name)));
      const emails = new Set(existing.map(x => norm(x.email || "")).filter(Boolean));
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i] || {}, name = str(r.name || r.customer_name || r.supplier_name,160), email = str(r.email,254).toLowerCase();
        if (name.length < 2) { fail(i,"Name is required."); continue; }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { fail(i,"Email address is invalid."); continue; }
        if (names.has(norm(name)) || (email && emails.has(norm(email)))) { result.skipped++; continue; }
        const saved = await insert(c,"business_contacts",{workspace_id:c.workspaceId,contact_type:contactType,name,email:email||null,phone:str(r.phone,40)||null,address:str(r.address,500)||null,tax_number:str(r.tax_number,100)||null,notes:str(r.notes,1000)||null});
        if (!saved.ok) { fail(i,`Could not save contact (server ${saved.status}).`); continue; }
        names.add(norm(name)); if(email) emails.add(norm(email)); result.imported++;
      }
    } else if (type === "items") {
      const got = await rest(c,"catalog_items",`?workspace_id=eq.${encodeURIComponent(c.workspaceId)}&select=item_code&limit=5000`);
      if (!got.ok) throw new Error("Could not load existing items.");
      const codes = new Set((await got.json()).map((x:any)=>norm(String(x.item_code||""))));
      for (let i=0;i<rows.length;i++) {
        const r=rows[i]||{}, code=str(r.item_code,40), name=str(r.name||r.product_name||r.item_name,160), item_type=str(r.item_type||"service",20).toLowerCase();
        const price=num(r.unit_price ?? r.bcy_item_price ?? r.price), tax=num(r.tax_rate,0), currency=str(r.currency||r.currency_code||"UGX",3).toUpperCase();
        if(!code||!name||!["product","service"].includes(item_type)||!Number.isFinite(price)||price<0||!Number.isFinite(tax)||tax<0||tax>100||!/^[A-Z]{3}$/.test(currency)){fail(i,"Required fields: item_code, name, item_type, unit_price and currency; check price/tax.");continue;}
        if(codes.has(norm(code))){result.skipped++;continue;}
        const saved=await insert(c,"catalog_items",{workspace_id:c.workspaceId,item_code:code,name,item_type,unit_price:price,currency,tax_rate:tax,description:str(r.description,1000)||null,category:str(r.category,100)||null,unit:str(r.unit||"unit",30),tax_inclusive:false,is_active:true,created_by:c.session.user.id});
        if(!saved.ok){fail(i,`Could not save item (server ${saved.status}).`);continue;} codes.add(norm(code));result.imported++;
      }
    } else if (type === "expenses") {
      for (let i=0;i<rows.length;i++) {
        const r=rows[i]||{}, date=str(r.expense_date||r.date||r.transaction_date,10), category=str(r.category||r.account_name||"Uncategorised",100), description=str(r.description||r.account_name||r.receipt_name||r.reference_number||"Imported Zoho expense",500);
        const amount=num(r.amount_with_tax ?? r.amount ?? r.bcy_total), currency=str(r.currency||r.currency_code||"UGX",3).toUpperCase(), method=methodValue(str(r.payment_method||r.payment_mode||"other",40));
        if(!validDate(date)||!category||!description||!Number.isFinite(amount)||amount<0||!/^[A-Z]{3}$/.test(currency)){fail(i,"Check date, category, description, amount and currency.");continue;}
        const legacyId=str(r.legacy_transaction_id||r.transaction_id||r.expense_id,100);
        const q=`?workspace_id=eq.${encodeURIComponent(c.workspaceId)}&expense_date=eq.${date}&category=eq.${encodeURIComponent(category)}&description=eq.${encodeURIComponent(description)}&amount=eq.${amount}&select=id&limit=1`;
        const existing=await rest(c,"expenses",q);
        if(existing.ok && (await existing.json()).length){result.skipped++;continue;}
        const notes=[str(r.notes,1000),str(r.reference_number,100),legacyId?`Zoho transaction ID: ${legacyId}`:"",str(r.status,50)?`Zoho status: ${str(r.status,50)}`:""].filter(Boolean).join(" | ");
        const saved=await insert(c,"expenses",{workspace_id:c.workspaceId,expense_date:date,category,description,amount,currency,payment_method:method,notes:notes||null,recorded_by:c.session.user.id});
        if(!saved.ok){fail(i,`Could not save expense (server ${saved.status}).`);continue;}result.imported++;
      }
    } else if (type === "invoices") {
      const contacts=await getContacts(c,"client");
      const byName=new Map(contacts.map(x=>[norm(x.name),x.id]));
      const groups=new Map<string,Row[]>();
      rows.forEach((r:any)=>{const key=str(r.invoice_number||r.transaction_number,100); if(!groups.has(key))groups.set(key,[]);groups.get(key)!.push(r);});
      const existingResponse=await rest(c,"invoices",`?workspace_id=eq.${encodeURIComponent(c.workspaceId)}&select=invoice_number&limit=5000`);
      if(!existingResponse.ok) throw new Error("Could not check existing invoices before import.");
      const existingNumbers=new Set((await existingResponse.json()).map((x:any)=>norm(String(x.invoice_number||""))));
      const candidates:Array<{invoiceNumber:string;items:any[];payload:any;rowIndex:number}> = [];
      let groupIndex=0;
      for (const [invoiceNumber, lines] of groups) {
        const first=lines[0]||{}, customerName=str(first.customer_name||first.client_name,160), contactId=byName.get(norm(customerName));
        if(!invoiceNumber||!contactId){fail(groupIndex,`Invoice ${invoiceNumber||"(blank)"} needs an invoice number and a customer already imported with matching name "${customerName}".`);groupIndex++;continue;}
        if(existingNumbers.has(norm(invoiceNumber))){result.skipped++;groupIndex++;continue;}
        const issue=str(first.issue_date||first.date||first.transaction_date,10), due=str(first.due_date,10), currency=str(first.currency||first.currency_code||"UGX",3).toUpperCase();
        if(!validDate(issue)||(due&&!validDate(due))||!/^[A-Z]{3}$/.test(currency)){fail(groupIndex,`Invoice ${invoiceNumber}: invalid issue/due date or currency.`);groupIndex++;continue;}
        const items:any[]=[]; let invalid="";
        for(const line of lines){
          const description=str(line.description||line.product_name||line.item_name||`Imported Zoho invoice ${invoiceNumber}`,500);
          const quantity=num(line.quantity??line.quantity_ordered,1);
          const unitPrice=num(line.unit_price ?? line.bcy_item_price ?? line.original_invoice_total ?? line.bcy_total,0);
          const tax=num(line.tax_rate,0);
          if(!description||!Number.isFinite(quantity)||quantity<=0||!Number.isFinite(unitPrice)||unitPrice<0||!Number.isFinite(tax)||tax<0||tax>100){invalid="one or more line items has invalid description, quantity, price or tax";break;}
          items.push({description,quantity,unit_price:unitPrice,tax_rate:tax});
        }
        if(invalid||!items.length){fail(groupIndex,`Invoice ${invoiceNumber}: ${invalid||"no line items"}.`);groupIndex++;continue;}
        const lineSubtotal=Number(items.reduce((sum,x)=>sum+x.quantity*x.unit_price,0).toFixed(2));
        const sourceTotal=num(first.original_invoice_total ?? first.invoice_total ?? first.bcy_total,NaN);
        const sourceBalance=num(first.original_balance ?? first.balance ?? first.bcy_balance,NaN);
        const total=Number.isFinite(sourceTotal)&&sourceTotal>=0?sourceTotal:Number(items.reduce((sum,x)=>sum+x.quantity*x.unit_price*(1+x.tax_rate/100),0).toFixed(2));
        const amountPaid=Number.isFinite(sourceBalance)?Math.max(0,Math.min(total,total-sourceBalance)):0;
        const status=cleanStatus(str(first.original_status||first.status,40));
        const taxAmount=Math.max(0,Number((total-lineSubtotal).toFixed(2)));
        const legacyId=str(first.legacy_invoice_id||first.invoice_id||first.transaction_id,100);
        const notes=[`Imported from Zoho. Original status: ${str(first.original_status||first.status,40)||"not supplied"}.`,Number.isFinite(sourceTotal)?`Original invoice total: ${sourceTotal}.`:"",Number.isFinite(sourceBalance)?`Original balance: ${sourceBalance}.`:"",str(first.reference_number,100)?`Reference: ${str(first.reference_number,100)}.`:"",legacyId?`Zoho invoice ID: ${legacyId}.`:"",str(first.notes,500)].filter(Boolean).join(" ").slice(0,2000);
        candidates.push({invoiceNumber,items,rowIndex:groupIndex,payload:{workspace_id:c.workspaceId,invoice_number:invoiceNumber,contact_id:contactId,issue_date:issue,due_date:due||null,currency,exchange_rate:num(first.exchange_rate,1)>0?num(first.exchange_rate,1):1,subtotal:lineSubtotal,tax_amount:taxAmount,total,amount_paid:amountPaid,status,notes,created_by:c.session.user.id}});
        groupIndex++;
      }
      if(candidates.length){
        const savedInvoices=await insert(c,"invoices",candidates.map(x=>x.payload));
        if(!savedInvoices.ok){
          for(const x of candidates) fail(x.rowIndex,`Invoice ${x.invoiceNumber} could not be created (server ${savedInvoices.status}). No invoices in this batch were imported.`);
        } else {
          const inserted=await savedInvoices.json() as Array<{id:string;invoice_number:string}>;
          const byInvoice=new Map(inserted.map(x=>[norm(x.invoice_number),x.id]));
          const allItems:any[]=[];
          for(const candidate of candidates){
            const invoiceId=byInvoice.get(norm(candidate.invoiceNumber));
            if(!invoiceId){fail(candidate.rowIndex,`Invoice ${candidate.invoiceNumber} was created but no ID was returned; check it before retrying.`);continue;}
            for(const x of candidate.items) allItems.push({workspace_id:c.workspaceId,document_type:"invoice",invoice_id:invoiceId,quote_id:null,description:x.description,quantity:x.quantity,unit_price:x.unit_price,tax_rate:x.tax_rate,line_total:Number((x.quantity*x.unit_price*(1+x.tax_rate/100)).toFixed(2))});
          }
          const savedItems=allItems.length?await insert(c,"document_items",allItems):null;
          if(savedItems && !savedItems.ok){
            for(let i=0;i<inserted.length;i+=40){
              const ids=inserted.slice(i,i+40).map(x=>x.id);
              await fetch(`${c.url}/rest/v1/invoices?workspace_id=eq.${encodeURIComponent(c.workspaceId)}&id=in.(${ids.join(",")})`,{method:"DELETE",headers:headers(c),cache:"no-store"});
            }
            for(const x of candidates) fail(x.rowIndex,`Invoice ${x.invoiceNumber} was rolled back because line items failed (server ${savedItems.status}).`);
          } else {
            result.imported+=inserted.length;
          }
        }
      }
    } else if (type === "payments") {
      const invoiceRows=await rest(c,"invoices",`?workspace_id=eq.${encodeURIComponent(c.workspaceId)}&select=id,invoice_number,total,amount_paid,status&limit=5000`);
      if(!invoiceRows.ok) throw new Error("Could not load invoices to match payment records.");
      const invoices=await invoiceRows.json() as Array<{id:string;invoice_number:string;total:number;amount_paid:number;status:string}>;
      const byNumber=new Map(invoices.map(x=>[norm(x.invoice_number),x]));
      for(let i=0;i<rows.length;i++){
        const r=rows[i]||{}, invoiceNumber=str(r.invoice_number||r.transaction_number||r.invoice,100), invoice=byNumber.get(norm(invoiceNumber));
        const date=str(r.payment_date||r.date||r.transaction_date,10), amount=num(r.amount||r.payment_amount||r.amount_received), currency=str(r.currency||r.currency_code||"UGX",3).toUpperCase(), method=methodValue(str(r.method||r.payment_method||r.payment_mode||"other",40)), reference=str(r.payment_reference||r.reference_number||r.transaction_id,150);
        if(!invoice||!validDate(date)||!Number.isFinite(amount)||amount<=0||!/^[A-Z]{3}$/.test(currency)){fail(i,"Payment needs a matching invoice_number, valid payment_date, positive amount and currency.");continue;}
        const duplicateQuery=reference?`?workspace_id=eq.${encodeURIComponent(c.workspaceId)}&invoice_id=eq.${encodeURIComponent(invoice.id)}&payment_reference=eq.${encodeURIComponent(reference)}&select=id&limit=1`:`?workspace_id=eq.${encodeURIComponent(c.workspaceId)}&invoice_id=eq.${encodeURIComponent(invoice.id)}&payment_date=eq.${date}&amount=eq.${amount}&select=id&limit=1`;
        const duplicate=await rest(c,"payments",duplicateQuery);
        if(duplicate.ok&&(await duplicate.json()).length){result.skipped++;continue;}
        const saved=await insert(c,"payments",{workspace_id:c.workspaceId,invoice_id:invoice.id,payment_reference:reference||null,payment_date:date,amount,currency,exchange_rate:num(r.exchange_rate,1)>0?num(r.exchange_rate,1):1,method,notes:str(r.notes,1000)||null,received_by:c.session.user.id});
        if(!saved.ok){fail(i,`Could not save payment (server ${saved.status}).`);continue;}
        const allPayments=await rest(c,"payments",`?workspace_id=eq.${encodeURIComponent(c.workspaceId)}&invoice_id=eq.${encodeURIComponent(invoice.id)}&select=amount&limit=5000`);
        const paymentRows=allPayments.ok?await allPayments.json():[];
        const transactionPaid=Number(paymentRows.reduce((sum:number,p:any)=>sum+Number(p.amount||0),0).toFixed(2));
        // The invoice export may already contain an amount paid/balance. Never reduce that historical value just because the payment export is partial.
        const newPaid=Math.min(Number(invoice.total),Math.max(Number(invoice.amount_paid||0),transactionPaid));
        const newStatus=invoice.status==="void"?"void":newPaid>=Number(invoice.total)?"paid":newPaid>0?"part_paid":invoice.status;
        const upd=await patch(c,"invoices",`?id=eq.${encodeURIComponent(invoice.id)}&workspace_id=eq.${encodeURIComponent(c.workspaceId)}`,{amount_paid:newPaid,status:newStatus});
        if(!upd.ok){fail(i,`Payment saved, but invoice totals could not be updated (server ${upd.status}); reconcile invoice ${invoiceNumber}.`);continue;}
        invoice.amount_paid=newPaid;invoice.status=newStatus;result.imported++;
      }
    } else if (type === "recurring") {
      const contacts=await getContacts(c,"client"), byName=new Map(contacts.map(x=>[norm(x.name),x.id]));
      for(let i=0;i<rows.length;i++){
        const r=rows[i]||{}, name=str(r.name||r.recurrence_name,150), templateType=str(r.template_type||"invoice",20).toLowerCase(), frequency=cleanFrequency(str(r.frequency||r.recurrence_frequency,30)), amount=num(r.amount??r.bcy_total), currency=str(r.currency||r.currency_code||"UGX",3).toUpperCase(), date=str(r.next_run_date||r.next_invoice_date,10), customerName=str(r.customer_name,160), endDate=str(r.end_date,10), startDate=str(r.start_date,10), lastSent=str(r.last_sent_date,10);
        if(!name||!frequency||!Number.isFinite(amount)||amount<0||!/^[A-Z]{3}$/.test(currency)||!validDate(date)|| (endDate&&!validDate(endDate))){fail(i,"Check recurrence name, frequency, amount, currency and next invoice date.");continue;}
        if(templateType==="expense"){
          const saved=await insert(c,"recurring_expense_templates",{workspace_id:c.workspaceId,name,category:str(r.category||"Recurring expense",100),description:str(r.description||name,500),amount:Math.max(amount,0.01),currency,frequency,next_run_date:date,end_date:endDate||null,is_active:str(r.status||"active",30).toLowerCase()!=="inactive",last_generated_at:validDate(lastSent)?`${lastSent}T00:00:00Z`:null,notes:`Imported from Zoho. Original start date: ${startDate||"not supplied"}.`});
          if(!saved.ok){fail(i,`Could not save recurring expense (server ${saved.status}).`);continue;}result.imported++;
        } else {
          const contactId=byName.get(norm(customerName));
          if(!contactId){fail(i,`Recurring invoice ${name} needs an imported customer matching "${customerName}".`);continue;}
          const items=[{description:str(r.description||name,500),quantity:1,unit_price:amount,tax_rate:0}];
          const saved=await insert(c,"recurring_invoice_templates",{workspace_id:c.workspaceId,contact_id:contactId,name,currency,exchange_rate:num(r.exchange_rate,1)>0?num(r.exchange_rate,1):1,items,notes:`Imported from Zoho. Original start date: ${startDate||"not supplied"}. Original last sent date: ${lastSent||"not supplied"}. ${str(r.reference_number,100)}`,frequency,next_run_date:date,end_date:endDate||null,is_active:str(r.status||"active",30).toLowerCase()!=="inactive",last_generated_at:validDate(lastSent)?`${lastSent}T00:00:00Z`:null});
          if(!saved.ok){fail(i,`Could not save recurring invoice (server ${saved.status}).`);continue;}result.imported++;
        }
      }
    } else {
      return NextResponse.json({error:"Unsupported import type. Supported: customers, suppliers, items, expenses, invoices, payments and recurring."},{status:400});
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Import failed.", ...result }, { status: 502 });
  }
  return NextResponse.json(result);
}
