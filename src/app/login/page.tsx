'use client';
import { useEffect,useState } from 'react';
import { authClient } from '../../lib/auth-client';
import {safeLoginReturn} from '../../lib/login-return.mjs';
import { ArrowRight,Loader2,ShieldCheck } from 'lucide-react';
type Mode='login'|'signup'|'factor'|'forgot'|'reset';
export default function LoginPage(){
 const [mode,setMode]=useState<Mode>('login'),[config,setConfig]=useState<any>(null),[email,setEmail]=useState(''),[name,setName]=useState(''),[password,setPassword]=useState(''),[code,setCode]=useState(''),[backup,setBackup]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[destination,setDestination]=useState('/');
 useEffect(()=>{void(async()=>{
  const q=new URLSearchParams(window.location.search),next=q.get('returnTo')||'/';
  const safe=safeLoginReturn(next);
  setDestination(safe);sessionStorage.setItem('geko.auth.returnTo',safe);
  const settings:any=await fetch('/api/auth/config').then(r=>r.json());setConfig(settings);
  if(q.has('signout')){await authClient.signOut();window.history.replaceState(null,'','/login');return;}
  if(q.has('token')){setMode('reset');return;}
  if(q.has('error'))setError('Sign-in could not be completed. Check the provider settings or try your existing login method.');
  const account:any=await fetch('/api/account').then(async r=>r.ok?r.json():null);
  if(account?.requiresTwoFactor||q.has('twofactor'))setMode('factor');
  else if(account)window.location.replace(safe);
 })().catch(()=>setError('Unable to load sign-in. Try again.'));},[]);
 function finish(){window.location.assign(safeLoginReturn(sessionStorage.getItem('geko.auth.returnTo')||destination));}
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');setNotice('');try{
  if(mode==='forgot'){
   const r=await authClient.requestPasswordReset({email,redirectTo:window.location.origin+'/login'});if(r.error)throw new Error(r.error.message);
   setNotice('If the address has an account, a password reset email is on its way.');return;
  }
  if(mode==='reset'){
   const token=new URLSearchParams(window.location.search).get('token')||'';
   const r=await authClient.resetPassword({newPassword:password,token});if(r.error)throw new Error(r.error.message);
   window.history.replaceState(null,'','/login');setMode('login');setPassword('');setNotice('Password changed. Sign in with your new password.');return;
  }
  if(mode==='factor'){
   const r=backup?await authClient.twoFactor.verifyBackupCode({code}):await authClient.twoFactor.verifyTotp({code});
   if(r.error)throw new Error(r.error.message);finish();return;
  }
  const r=mode==='signup'?await authClient.signUp.email({email,password,name}):await authClient.signIn.email({email,password});
  if(r.error)throw new Error(r.error.message);
  if(r.data&&'twoFactorRedirect' in r.data&&r.data.twoFactorRedirect){setMode('factor');setPassword('');return;}
  const account:any=await fetch('/api/account');
  if(account.ok)finish();else {setMode('login');setPassword('');setNotice('Account created. Check your email if verification is required, then sign in.');}
 }catch(e:any){setError(e.message||'Sign-in failed.');}finally{setBusy(false);}}
 return <main className="auth-page"><section className="auth-card"><a className="brand auth-brand" href="/"><img src="/brand/geko-mark.svg" alt="" width={44} height={44}/><span>geko<span className="brand-dot">.ai</span></span></a><p className="eyebrow">YOUR CHARACTERS. YOUR CONVERSATIONS.</p><h1>{mode==='factor'?'One more step.':mode==='signup'?'Make yourself at home.':mode==='forgot'?'Reset your password.':mode==='reset'?'Choose a new password.':'Welcome back.'}</h1><p className="muted">{mode==='factor'?'Enter your authenticator code or a single-use recovery code.':mode==='signup'?'Use an email invited by this installation’s administrator.':'Sign in to this geko.ai installation.'}</p>
 {!config?<p role="status"><Loader2 className="spin"/>Loading login options…</p>:<><form onSubmit={submit}>
 {mode==='signup'&&<label className="field"><span>Name</span><input required maxLength={60} autoComplete="name" value={name} onChange={e=>setName(e.target.value)}/></label>}
 {['login','signup','forgot'].includes(mode)&&<label className="field"><span>Email</span><input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>}
 {['login','signup','reset'].includes(mode)&&<label className="field"><span>Password</span><input required type="password" minLength={mode==='login'?1:12} maxLength={128} autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)}/>{mode!=='login'&&<small>At least 12 characters.</small>}</label>}
 {mode==='factor'&&<><label className="field"><span>{backup?'Recovery code':'Authenticator code'}</span><input required autoFocus autoComplete="one-time-code" inputMode={backup?'text':'numeric'} value={code} onChange={e=>setCode(e.target.value.trim())}/></label><label className="checkbox"><input type="checkbox" checked={backup} onChange={e=>{setBackup(e.target.checked);setCode('');}}/>Use a recovery code instead</label></>}
 {error&&<p className="error-text" role="alert">{error}</p>}{notice&&<p className="success-text" role="status">{notice}</p>}
 <button className="button light full-width" disabled={busy}>{busy?<Loader2 className="spin" size={16}/>:mode==='factor'?<ShieldCheck size={16}/>:<ArrowRight size={16}/>} {mode==='signup'?'Create account':mode==='factor'?'Verify':mode==='forgot'?'Send reset email':mode==='reset'?'Save password':'Sign in'}</button>
 </form>{mode==='login'&&config.providers.map((provider:'google'|'github')=><button className="button full-width" disabled={busy} key={provider} onClick={async()=>{setBusy(true);setError('');try{const r=await authClient.signIn.social({provider,callbackURL:'/login?complete=1&returnTo='+encodeURIComponent(destination),errorCallbackURL:'/login?error=oauth'});if(r.error)throw new Error(r.error.message);}catch(e:any){setError(e.message);setBusy(false);}}}>Continue with {provider==='google'?'Google':'GitHub'}</button>)}
 {mode==='login'?<div className="auth-links"><button onClick={()=>{setMode('signup');setError('');}}>Create an invited account</button>{config.passwordReset&&<button onClick={()=>{setMode('forgot');setError('');}}>Forgot password?</button>}</div>:<button className="text-button" onClick={()=>{setMode('login');setError('');setCode('');}}>Back to sign in</button>}
 </>}<p className="tiny muted">Accounts and conversations belong to this installation. A group link grants a room seat only after you sign in.</p></section></main>;
}
