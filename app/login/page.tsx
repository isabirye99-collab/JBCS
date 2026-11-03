"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type Mode = "login" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("signup");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currency, setCurrency] = useState("UGX");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(mode === "signup" ? "/api/saas/signup" : "/api/saas/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, email, password, currency }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Request could not be completed.");
      if (mode === "login") { window.location.assign(result.redirectTo || "/workspace"); return; }
      setMessage(result.message || "Account created. Check your email for next steps.");
      if (!result.requiresEmailConfirmation) window.location.assign("/workspace");
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong. Please try again."); }
    finally { setBusy(false); }
  }

  const switchMode = (next: Mode) => { setMode(next); setError(""); setMessage(""); };
  return <main style={{minHeight:"100vh",display:"grid",gridTemplateColumns:"minmax(0,1.05fr) minmax(340px,.95fr)",background:"#f6f4f0",color:"#201c1b"}}>
    <section style={{padding:"clamp(28px,6vw,80px)",display:"flex",flexDirection:"column",justifyContent:"space-between",background:"linear-gradient(145deg,#211c1c,#49302e)",color:"#fff"}}>
      <Link href="/" style={{color:"#fff",fontWeight:750,fontSize:20,textDecoration:"none",letterSpacing:"-.03em"}}>JOHDEN <span style={{color:"#e9b5a8"}}>BUSINESS TOOLS</span></Link>
      <div style={{maxWidth:560,padding:"60px 0"}}>
        <span style={{fontSize:12,letterSpacing:".16em",fontWeight:700,color:"#e9b5a8"}}>FINANCE, MADE CLEARER</span>
        <h1 style={{fontSize:"clamp(38px,5vw,66px)",lineHeight:1.04,letterSpacing:"-.055em",margin:"22px 0"}}>More control over the money side of your business.</h1>
        <p style={{fontSize:17,lineHeight:1.8,color:"#e2d8d5",maxWidth:480}}>Bring customer records, invoices and everyday expenses into one organised workspace, built for consultants and growing businesses.</p>
        <div style={{display:"grid",gap:14,marginTop:32,color:"#f7eeeb"}}>
          {["Create and organise customer records","Prepare professional draft invoices","Record expenses in multiple currencies","Keep each company's workspace separate"].map(item=><div key={item} style={{display:"flex",gap:12,alignItems:"center"}}><span style={{color:"#e9b5a8",fontSize:18}}>✓</span>{item}</div>)}
        </div>
      </div>
      <small style={{color:"#c9bcb8"}}>© {new Date().getFullYear()} Johden Business Consultancy Services</small>
    </section>
    <section style={{padding:"clamp(24px,5vw,64px)",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:"100%",maxWidth:460}}>
        <Link href="/invoicing" style={{color:"#685a56",textDecoration:"none",fontSize:14}}>← Back to invoicing</Link>
        <div style={{marginTop:34,marginBottom:28}}>
          <span style={{fontSize:12,fontWeight:750,letterSpacing:".12em",color:"#9b4a3d"}}>{mode==="signup"?"START YOUR WORKSPACE":"YOUR WORKSPACE"} </span>
          <h2 style={{fontSize:34,letterSpacing:"-.04em",margin:"10px 0"}}>{mode === "signup" ? "Start with a 14-day trial" : "Welcome back"}</h2>
          <p style={{color:"#6b625f",lineHeight:1.65,margin:0}}>{mode === "signup" ? "Set up your business account in a few steps. No subscription payment is collected during setup." : "Sign in with the email address and password you used to register."}</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",padding:5,gap:5,borderRadius:14,background:"#eae5e1",marginBottom:24}}>
          <button type="button" onClick={()=>switchMode("signup")} disabled={busy} aria-pressed={mode==="signup"} style={{border:0,borderRadius:10,padding:"12px 8px",fontWeight:700,background:mode==="signup"?"#fff":"transparent",color:"#292120",boxShadow:mode==="signup"?"0 2px 8px #0000000c":"none",cursor:"pointer"}}>Create account</button>
          <button type="button" onClick={()=>switchMode("login")} disabled={busy} aria-pressed={mode==="login"} style={{border:0,borderRadius:10,padding:"12px 8px",fontWeight:700,background:mode==="login"?"#fff":"transparent",color:"#292120",boxShadow:mode==="login"?"0 2px 8px #0000000c":"none",cursor:"pointer"}}>Sign in</button>
        </div>
        <form onSubmit={submit} style={{display:"grid",gap:17}}>
          {mode==="signup"&&<label style={{display:"grid",gap:7,fontSize:14,fontWeight:650}}>Business or company name<input style={fieldStyle} required minLength={2} maxLength={140} value={companyName} onChange={e=>setCompanyName(e.target.value)} autoComplete="organization" placeholder="e.g. Johden Consulting" /></label>}
          <label style={{display:"grid",gap:7,fontSize:14,fontWeight:650}}>Email address<input style={fieldStyle} type="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" placeholder="you@company.com" /></label>
          <label style={{display:"grid",gap:7,fontSize:14,fontWeight:650}}>Password<div style={{display:"flex",gap:8}}><input style={{...fieldStyle,flex:1,minWidth:0}} type={showPassword?"text":"password"} required minLength={mode==="signup"?10:1} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==="signup"?"new-password":"current-password"} placeholder={mode==="signup"?"At least 10 characters":"Enter your password"} /><button type="button" onClick={()=>setShowPassword(v=>!v)} style={{border:"1px solid #d8cfca",borderRadius:10,padding:"0 12px",background:"#fff",color:"#5e504c"}}>{showPassword?"Hide":"Show"}</button></div></label>
          {mode==="signup"&&<label style={{display:"grid",gap:7,fontSize:14,fontWeight:650}}>Annual subscription billing currency<select style={fieldStyle} value={currency} onChange={e=>setCurrency(e.target.value)}><option value="UGX">UGX — Ugandan Shilling</option><option value="USD">USD — US Dollar</option></select><small style={{fontWeight:400,color:"#776d69"}}>This sets your subscription billing preference, not the currency for every invoice.</small></label>}
          {error&&<p role="alert" style={{margin:0,padding:13,borderRadius:10,background:"#fff0ed",color:"#922f24",fontSize:14,lineHeight:1.5}}>{error}</p>}
          {message&&<p role="status" style={{margin:0,padding:13,borderRadius:10,background:"#e9f6ec",color:"#215c32",fontSize:14,lineHeight:1.5}}>{message}</p>}
          <button type="submit" disabled={busy} style={{border:0,borderRadius:11,padding:"15px 18px",background:busy?"#9d7770":"#9b4035",color:"#fff",fontWeight:750,fontSize:15,cursor:busy?"wait":"pointer",marginTop:3}}>{busy?"Please wait…":mode==="signup"?"Create my workspace":"Sign in securely"} <span aria-hidden="true">→</span></button>
        </form>
        <p style={{fontSize:12,lineHeight:1.7,color:"#776d69",marginTop:20}}>{mode==="signup"?"14-day trial. Annual subscription checkout is not yet enabled, and no payment is collected during account creation.":"If you recently registered, check your inbox for any email-confirmation request before signing in."}</p>
        <p style={{fontSize:13,color:"#6b625f"}}>Need help? <a href="https://wa.me/256702846597?text=Hello%20Johden%2C%20I%20need%20help%20accessing%20the%20invoicing%20platform." target="_blank" rel="noopener noreferrer" style={{color:"#923f34",fontWeight:700}}>Contact Johden support</a></p>
      </div>
    </section>
    <style>{`@media(max-width:800px){main{grid-template-columns:1fr!important}main>section:first-child{padding:26px!important}main>section:first-child>div{padding:35px 0!important}main>section:first-child h1{font-size:40px!important}main>section:first-child small{display:none}}`}</style>
  </main>;
}

const fieldStyle: React.CSSProperties = {width:"100%",boxSizing:"border-box",border:"1px solid #d8cfca",borderRadius:10,padding:"13px 14px",background:"#fff",color:"#211c1b",fontSize:15,outlineColor:"#9b4035"};
