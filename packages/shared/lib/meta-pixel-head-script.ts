/**
 * Meta pixel base code that runs from <head>, before React loads.
 *
 * Why: the old pixel mounted only after the page hydrated and the browser went
 * idle (up to ~5 seconds). Shoppers who left before that were never counted as
 * landing page views. This script starts the pixel and sends PageView at once.
 *
 * It only runs for visitors who already accepted advertising cookies and have
 * no Global Privacy Control / Do Not Track signal, on storefront pages. Everyone
 * else is handled by components/analytics/meta-pixel.tsx when they accept the
 * banner. Keep the checks below in step with canSendMetaBrowserEvents().
 */
export function metaPixelHeadScript(input: { pixelId: string; testMode: boolean }): string {
  if (!/^\d{5,30}$/.test(input.pixelId)) return "";
  return `(function(w,d,id,test){try{
var c=w.localStorage.getItem('bnt-cookie-consent');
if(c!=='all'&&c!=='advertising')return;
var n=w.navigator,dnt=n.doNotTrack||n.msDoNotTrack;
if(n.globalPrivacyControl===true||n.globalPrivacyControl==='1'||dnt==='1'||String(dnt).toLowerCase()==='yes')return;
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
(d.head||d.documentElement).appendChild(s);
var e=uid();
q('trackSingle',id,'PageView',{},{eventID:e});
w.__META_PIXEL_LAST_PATHNAME__=p;w.__META_PAGEVIEW_SEQUENCE__=1;
var t=0;(function m(){
if(!/(?:^|;\\s*)_fbp=/.test(d.cookie)&&t++<5){w.setTimeout(m,200);return}
var b={eventName:'PageView',eventId:e,consent:c,pageUrl:l.origin+p};
if(um.em)b.em=um.em;if(um.ph)b.ph=um.ph;
w.fetch('/api/meta/events',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).catch(function(){})
})();
}catch(e){}})(window,document,${JSON.stringify(input.pixelId)},${input.testMode ? "true" : "false"});`;
}
