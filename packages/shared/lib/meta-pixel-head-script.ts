/**
 * Meta pixel base code that runs from <head>, before React loads.
 *
 * Why: the old pixel mounted only after the page hydrated and the browser went
 * idle (up to ~5 seconds). Shoppers who left before that were never counted as
 * landing page views. This script starts the pixel and sends PageView at once.
 *
 * It runs for every visitor on storefront pages. Neither a cookie-banner choice
 * nor a privacy signal stops it (see tracking-policy.ts). It stays off only on
 * admin/test/order pages and non-production hosts. Keep the checks below in
 * step with canSendMetaBrowserEvents().
 *
 * Timing: the fbq stub and PageView are queued at once (nothing is lost), but the
 * 100 KB fbevents.js file is fetched only after the page's own load event (at most
 * 3 s later). On a slow phone that file otherwise shares the connection with the
 * product photo and delays it by about half a second. The server (Conversions API)
 * PageView is sent as soon as the SDK has set the _fbp cookie, at once for returning
 * visitors, and immediately if the visitor leaves or hides the page first, so quick
 * bounces are still counted. Both copies share one event id, so Meta counts one.
 */
/** Only used when NEXT_PUBLIC_TRACK_ALL_VISITORS=false: honour saved choices and privacy signals. */
const CONSENT_GATE = `var c=w.localStorage.getItem('bnt-cookie-consent');
if(c!=='all'&&c!=='advertising'){if(c==='essential'||c==='analytics')return;c=null}
var n=w.navigator,dnt=n.doNotTrack||n.msDoNotTrack;
if(n.globalPrivacyControl===true||n.globalPrivacyControl==='1'||dnt==='1'||String(dnt).toLowerCase()==='yes')return;`;

export function metaPixelHeadScript(input: { pixelId: string; testMode: boolean; requireConsent?: boolean }): string {
  if (!/^\d{5,30}$/.test(input.pixelId)) return "";
  return `(function(w,d,id,test){try{
${input.requireConsent ? CONSENT_GATE : "var c=null;"}
var l=w.location,p=l.pathname;
if(/^\\/(admin|studio|demo|test|api|order|track)(\\/|$)/i.test(p)||l.hash||/(email|phone|address|token|password|name)=/i.test(l.search))return;
if(!test&&l.hostname!=='buyntryy.com'&&l.hostname!=='www.buyntryy.com')return;
if(w.fbq||w.__META_PIXEL_BOOTSTRAPPED__)return;
function ck(k){var m=d.cookie.match(new RegExp('(?:^|;\\\\s*)'+k+'=([^;]+)'));return m?m[1]:''}
function uid(){return w.crypto&&w.crypto.randomUUID?w.crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12)}
var x=ck('bnt_xid');
if(!x){x=uid().replace(/-/g,'');d.cookie='bnt_xid='+x+'; Path=/; Max-Age=31536000; SameSite=Lax; Secure'}
var fb=l.search.match(/[?&]fbclid=([A-Za-z0-9_-]{1,400})/);
if(fb&&!ck('_fbc'))d.cookie='_fbc=fb.1.'+Date.now()+'.'+fb[1]+'; Path=/; Max-Age=7776000; SameSite=Lax; Secure';
var um={external_id:x};
try{var k=JSON.parse(w.localStorage.getItem('bnt-meta-match')||'{}');
if(/^[a-f0-9]{64}$/.test(k.em))um.em=k.em;if(/^[a-f0-9]{64}$/.test(k.ph))um.ph=k.ph}catch(e){}
var q=function(){q.callMethod?q.callMethod.apply(q,arguments):q.queue.push(arguments)};
q.push=q;q.loaded=true;q.version='2.0';q.queue=[];
w.fbq=q;if(!w._fbq)w._fbq=q;
q('consent','grant');q('set','autoConfig',false,id);q('init',id,um);
w.__META_PIXEL_BOOTSTRAPPED__=true;
var s=d.createElement('script');s.id='meta-pixel-sdk';s.async=true;s.src='https://connect.facebook.net/en_US/fbevents.js';
var e=uid();
q('trackSingle',id,'PageView',{},{eventID:e});
w.__META_PIXEL_LAST_PATHNAME__=p;w.__META_PAGEVIEW_SEQUENCE__=1;
var sent=0;
function sv(){
if(sent)return;sent=1;
var b={eventName:'PageView',eventId:e,consent:null,pageUrl:l.origin+p};
if(um.em)b.em=um.em;if(um.ph)b.ph=um.ph;
w.fetch('/api/meta/events',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).catch(function(){})
}
function fp(){var t=0;(function m(){
if(!/(?:^|;\\s*)_fbp=/.test(d.cookie)&&t++<5){w.setTimeout(m,200);return}
sv()
})()}
var ld=0;
function go(){if(ld)return;ld=1;s.onload=fp;s.onerror=sv;(d.head||d.documentElement).appendChild(s);w.setTimeout(sv,6000)}
if(/(?:^|;\\s*)_fbp=/.test(d.cookie))sv();
try{
w.addEventListener('pagehide',sv);
d.addEventListener('visibilitychange',function(){if(d.visibilityState==='hidden')sv()});
if(d.readyState==='complete')go();
else{w.addEventListener('load',function(){w.setTimeout(go,0)});w.setTimeout(go,3000)}
}catch(x){go()}
}catch(e){}})(window,document,${JSON.stringify(input.pixelId)},${input.testMode ? "true" : "false"});`;
}
