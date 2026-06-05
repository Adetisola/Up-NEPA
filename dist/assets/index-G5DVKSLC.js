(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))n(r);new MutationObserver(r=>{for(const o of r)if(o.type==="childList")for(const i of o.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&n(i)}).observe(document,{childList:!0,subtree:!0});function s(r){const o={};return r.integrity&&(o.integrity=r.integrity),r.referrerPolicy&&(o.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?o.credentials="include":r.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function n(r){if(r.ep)return;r.ep=!0;const o=s(r);fetch(r.href,o)}})();const E={};function N(e,t){E[e]=t}function O(e){window.location.hash=e}function he(){function e(){const t=window.location.hash.slice(1)||"/home",s=document.getElementById("app");if(!s)return;const n=E[t];if(n)n(s);else{const r=E["/home"]||Object.values(E)[0];r&&r(s)}}window.addEventListener("hashchange",e),e()}const j="https://hxfrhxspehkubocajzun.supabase.co",H="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4ZnJoeHNwZWhrdWJvY2FqenVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NzgxOTcsImV4cCI6MjA5NjI1NDE5N30._uDOtUW8Q3--l7Tp4g3SqxM8r7y2D9Hl5WwP0Mu9sYk";let l=null,h=null;function ye(e){if(h=e,!window.supabase)return console.warn("[Up NEPA] Supabase CDN not loaded — running in offline mode"),null;const t={};return h&&(t["x-device-id"]=h),l=window.supabase.createClient(j,H,{global:{headers:t}}),console.log("[Up NEPA] Supabase connected"),l}function q(e){h=e,window.supabase&&(l=window.supabase.createClient(j,H,{global:{headers:{"x-device-id":h}}}))}function w(){return!!l}async function we(){if(!l)return null;const{data:e,error:t}=await l.from("areas").select("*").order("name");return t?(console.error("[Up NEPA] fetchAreas error:",t),null):e}async function Se(){if(!l)return null;const{data:e,error:t}=await l.from("area_status").select("*");if(t)return console.error("[Up NEPA] fetchAreaStatuses error:",t),null;const s={};for(const n of e)s[n.area_id]={areaId:n.area_id,currentStatus:n.current_status,confidence:n.confidence,reportCount:n.report_count,lastUpdated:n.last_updated};return s}async function ke(e,t){if(!l)return null;const{data:s,error:n}=await l.from("users").select("*").eq("device_id",e).maybeSingle();if(n)return console.error("[Up NEPA] getOrCreateUser select error:",n),null;if(s)return s;const{data:r,error:o}=await l.from("users").insert({device_id:e,area_id:t}).select().single();return o?(console.error("[Up NEPA] getOrCreateUser insert error:",o),null):(q(e),r)}async function z(e,t){if(!l)return null;const{data:s,error:n}=await l.from("users").update(t).eq("id",e).select().single();return n?(console.error("[Up NEPA] updateUser error:",n),null):s}async function Ee(e,t,s){if(!l)return null;const{data:n,error:r}=await l.from("reports").insert({user_id:e,area_id:t,status:s}).select().single();return r?(console.error("[Up NEPA] submitReport error:",r),null):n}function Oe(e){return l?l.channel("area-status-changes").on("postgres_changes",{event:"*",schema:"public",table:"area_status"},s=>{const n=s.new;n&&e({areaId:n.area_id,currentStatus:n.current_status,confidence:n.confidence,reportCount:n.report_count,lastUpdated:n.last_updated})}).subscribe():null}async function Ie(e,t){if(!l)return null;const{data:s,error:n}=await l.from("users").update({push_subscription:t}).eq("id",e).select().single();return n?(console.error("[Up NEPA] savePushSubscription error:",n),null):s}const L=[{id:"area-pipeline",name:"Pipeline Road",city:"Magboro",state:"Ogun"},{id:"area-arepo",name:"Arepo",city:"Magboro",state:"Ogun"},{id:"area-owoade",name:"Owoade",city:"Magboro",state:"Ogun"},{id:"area-likosi",name:"Likosi",city:"Magboro",state:"Ogun"},{id:"area-opic",name:"Opic Estate",city:"Magboro",state:"Ogun"},{id:"area-kosoko",name:"Kosoko",city:"Magboro",state:"Ogun"},{id:"area-ibafo",name:"Ibafo",city:"Magboro",state:"Ogun"},{id:"area-premier",name:"Premier Junction",city:"Magboro",state:"Ogun"}];function U(){const e=Date.now();return{"area-pipeline":{areaId:"area-pipeline",currentStatus:"ON",confidence:.85,reportCount:6,lastUpdated:new Date(e-480*1e3).toISOString()},"area-arepo":{areaId:"area-arepo",currentStatus:"ON",confidence:.72,reportCount:4,lastUpdated:new Date(e-240*1e3).toISOString()},"area-owoade":{areaId:"area-owoade",currentStatus:"OFF",confidence:.91,reportCount:7,lastUpdated:new Date(e-720*1e3).toISOString()},"area-likosi":{areaId:"area-likosi",currentStatus:"ON",confidence:.6,reportCount:3,lastUpdated:new Date(e-3900*1e3).toISOString()},"area-opic":{areaId:"area-opic",currentStatus:"OFF",confidence:.78,reportCount:5,lastUpdated:new Date(e-1500*1e3).toISOString()},"area-kosoko":{areaId:"area-kosoko",currentStatus:"UNCONFIRMED",confidence:0,reportCount:0,lastUpdated:new Date(e-14400*1e3).toISOString()},"area-ibafo":{areaId:"area-ibafo",currentStatus:"LIKELY_ON",confidence:.45,reportCount:2,lastUpdated:new Date(e-6e3*1e3).toISOString()},"area-premier":{areaId:"area-premier",currentStatus:"ON",confidence:.95,reportCount:9,lastUpdated:new Date(e-120*1e3).toISOString()}}}function Ae(e,t){const s=Date.now();return[{id:"report-1",userId:e,areaId:t,status:"ON",createdAt:new Date(s-480*1e3).toISOString()},{id:"report-2",userId:e,areaId:t,status:"OFF",createdAt:new Date(s-360*60*1e3).toISOString()},{id:"report-3",userId:e,areaId:t,status:"ON",createdAt:new Date(s-1440*60*1e3).toISOString()}]}const S="upnepa_user",V="upnepa_streak",G="upnepa_last_report",Z="upnepa_theme";let a={user:null,areas:[],statuses:{},reports:[],theme:"dark",online:!1,initialized:!1};const C=new Set;let _=null;function M(){return a}function Q(e){return C.add(e),()=>C.delete(e)}function b(){C.forEach(e=>e(a))}async function X(){var r;const e=localStorage.getItem(S);if(e)try{a.user=JSON.parse(e)}catch{a.user=null}const t=localStorage.getItem(V);if(t&&a.user)try{const o=JSON.parse(t);a.user.streak=o.count||0,a.user.streakLastDate=o.lastDate||null}catch{}const s=localStorage.getItem(Z);(s==="light"||s==="dark")&&(a.theme=s),pe(a.theme);const n=((r=a.user)==null?void 0:r.deviceId)||null;if(ye(n),w())try{const o=await we();o&&o.length>0?(a.areas=o,a.online=!0):a.areas=L;const i=await Se();i?a.statuses=i:a.statuses=U(),Ne()}catch(o){console.warn("[Up NEPA] Supabase fetch failed, using mock data:",o),a.areas=L,a.statuses=U()}else a.areas=L,a.statuses=U();a.user&&!a.online&&(a.reports=Ae(a.user.deviceId,a.user.areaId)),a.initialized=!0,b()}function Ne(){_&&_.unsubscribe(),_=Oe(e=>{ee(e.areaId,e)})}function ee(e,t){a.statuses={...a.statuses,[e]:t},b()}async function te(e){const t=crypto.randomUUID(),s={deviceId:t,areaId:e,streak:0,streakLastDate:null,lastReported:null,createdAt:new Date().toISOString()};if(w()){q(t);const n=await ke(t,e);n&&(s.id=n.id,a.online=!0)}return a.user=s,localStorage.setItem(S,JSON.stringify(s)),b(),s}async function ne(e){a.user&&(a.user.areaId=e,localStorage.setItem(S,JSON.stringify(a.user)),w()&&a.user.id&&await z(a.user.id,{area_id:e}),b())}function se(){return!!a.user}function I(){return a.user}function re(e){return a.areas.find(t=>t.id===e)}function R(){return a.user?re(a.user.areaId):null}function T(){return a.user&&a.statuses[a.user.areaId]||null}function ae(){return a.user?a.areas.filter(e=>e.id!==a.user.areaId).map(e=>({area:e,status:a.statuses[e.id]||{areaId:e.id,currentStatus:"UNCONFIRMED",confidence:0,reportCount:0,lastUpdated:null}})):[]}function oe(){const e=localStorage.getItem(G);if(!e)return null;try{return JSON.parse(e)}catch{return null}}async function ie(e){if(!a.user)return null;const t={id:`report-${Date.now()}`,userId:a.user.deviceId,areaId:a.user.areaId,status:e,createdAt:new Date().toISOString()};a.reports=[t,...a.reports],localStorage.setItem(G,JSON.stringify(t));const s=a.statuses[a.user.areaId];if(s){const n=(s.reportCount||0)+1;a.statuses={...a.statuses,[a.user.areaId]:{...s,currentStatus:e,reportCount:n,lastUpdated:t.createdAt,confidence:Math.min(.95,(s.confidence||.5)+.08)}}}if(a.user.lastReported=t.createdAt,localStorage.setItem(S,JSON.stringify(a.user)),b(),w()&&a.user.id)try{const n=await Ee(a.user.id,a.user.areaId,e);n&&(t.id=n.id)}catch(n){console.warn("[Up NEPA] Report failed to sync — saved locally:",n)}return t}function ce(){if(!a.user)return;const e=new Date().toDateString(),t={count:a.user.streak||0,lastDate:a.user.streakLastDate||null};if(t.lastDate===e)return t.count;const s=new Date(Date.now()-864e5).toDateString();return t.lastDate===s?t.count+=1:t.lastDate!==e&&(t.count=1),t.lastDate=e,a.user.streak=t.count,a.user.streakLastDate=t.lastDate,localStorage.setItem(S,JSON.stringify(a.user)),localStorage.setItem(V,JSON.stringify(t)),w()&&a.user.id&&z(a.user.id,{streak:t.count}).catch(()=>{}),b(),t.count}function le(e){return e>=30?"You're an Up NEPA legend for this area ⚡":e>=7?"One week strong 🔥 Magboro thanks you":e>=3?"You're helping your whole street 🙌":null}function F(e){if(!e)return"none";const s=(Date.now()-new Date(e).getTime())/(1e3*60);return s<=90?"fresh":s<=180?"fading":s<=360?"stale":"none"}function A(e){if(!e)return"No data";const t=Math.floor((Date.now()-new Date(e).getTime())/1e3);return t<60?"Just now":t<3600?`${Math.floor(t/60)}m ago`:t<86400?`${Math.floor(t/3600)}h ago`:`${Math.floor(t/86400)}d ago`}function $(){return a.theme}function de(){const e=a.theme==="dark"?"light":"dark";return ue(e),e}function ue(e){a.theme=e,localStorage.setItem(Z,e),pe(e),b()}function pe(e){e==="light"?document.body.classList.add("light-theme"):document.body.classList.remove("light-theme")}const Le=Object.freeze(Object.defineProperty({__proto__:null,addReport:ie,createUser:te,formatTimeAgo:A,getArea:re,getLastReport:oe,getNearbyStatuses:ae,getStalenessLevel:F,getState:M,getStreakMilestone:le,getTheme:$,getUser:I,getUserArea:R,getUserAreaStatus:T,hasUser:se,initStore:X,setTheme:ue,subscribe:Q,toggleTheme:de,updateAreaStatusLocal:ee,updateStreak:ce,updateUserArea:ne},Symbol.toStringTag,{value:"Module"})),Ue="modulepreload",_e=function(e){return"/"+e},B={},Y=function(t,s,n){let r=Promise.resolve();if(s&&s.length>0){let i=function(d){return Promise.all(d.map(g=>Promise.resolve(g).then(v=>({status:"fulfilled",value:v}),v=>({status:"rejected",reason:v}))))};document.getElementsByTagName("link");const c=document.querySelector("meta[property=csp-nonce]"),u=(c==null?void 0:c.nonce)||(c==null?void 0:c.getAttribute("nonce"));r=i(s.map(d=>{if(d=_e(d),d in B)return;B[d]=!0;const g=d.endsWith(".css"),v=g?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${d}"]${v}`))return;const p=document.createElement("link");if(p.rel=g?"stylesheet":Ue,g||(p.as="script"),p.crossOrigin="",p.href=d,u&&p.setAttribute("nonce",u),document.head.appendChild(p),g)return new Promise((be,me)=>{p.addEventListener("load",be),p.addEventListener("error",()=>me(new Error(`Unable to preload CSS for ${d}`)))})}))}function o(i){const c=new Event("vite:preloadError",{cancelable:!0});if(c.payload=i,window.dispatchEvent(c),!c.defaultPrevented)throw i}return r.then(i=>{for(const c of i||[])c.status==="rejected"&&o(c.reason);return t().catch(o)})};let y=0,m=null;const x=[Pe,Ce,Te,$e];function De(e){y=0,m=null,fe(e)}function fe(e){e.innerHTML=x[y](e),Me(e),Re(e)}function k(e){y<x.length-1&&(y++,fe(e))}function Pe(){return`
    <div class="onboarding" id="onboarding-screen">
      <div class="onboarding-content">
        <div class="onboarding-bolt">⚡</div>
        <h1 class="onboarding-title">
          Welcome to <span class="brand">Up NEPA</span>
        </h1>
        <p class="onboarding-subtitle">
          Know when light is coming — before it arrives.
          Community-powered electricity status for Magboro.
        </p>
        <div class="onboarding-actions">
          <button class="btn btn-primary btn-block btn-lg" id="btn-get-started">
            Get Started
          </button>
        </div>
      </div>
    </div>
  `}function Ce(){return`
    <div class="onboarding" id="onboarding-screen">
      <div class="onboarding-content">
        <div class="onboarding-bolt">📍</div>
        <h1 class="onboarding-title">Where do you stay?</h1>
        <p class="onboarding-subtitle">
          Select your area so we can show you the right power status.
        </p>
        <div class="onboarding-actions">
          <div class="select-wrapper">
            <select class="select" id="area-select">
              <option value="" disabled selected>Choose your area...</option>
              ${M().areas.map(s=>`<option value="${s.id}">${s.city} — ${s.name}</option>`).join("")}
            </select>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          <button class="btn btn-primary btn-block btn-lg" id="btn-area-next" disabled>
            Continue
          </button>
        </div>
      </div>
    </div>
  `}function Te(){return`
    <div class="onboarding" id="onboarding-screen">
      <div class="onboarding-content">
        <div class="onboarding-bolt">🔔</div>
        <h1 class="onboarding-title">Stay in the loop</h1>
        <p class="onboarding-subtitle">
          We'll ping you twice a day — you just tap Yes or No. That's it.
        </p>

        <div class="notif-illustration">
          <div class="notif-mock">
            <div class="notif-mock-header">
              ⚡ Up NEPA
            </div>
            <div class="notif-mock-body">
              Abi light dey your side? Help your neighbours know 👀
            </div>
            <div class="notif-mock-actions">
              <div class="notif-mock-btn yes">YES it's up</div>
              <div class="notif-mock-btn no">NO it's out</div>
            </div>
          </div>
        </div>

        <div class="onboarding-actions">
          <button class="btn btn-primary btn-block btn-lg" id="btn-allow-notif">
            Allow Notifications
          </button>
          <button class="btn btn-ghost btn-block" id="btn-skip-notif">
            Maybe later
          </button>
        </div>
      </div>
    </div>
  `}function $e(){return`
    <div class="onboarding" id="onboarding-screen">
      <div class="onboarding-content">
        <div class="onboarding-bolt" style="animation: bolt-flash 0.8s ease-in-out infinite;">🎉</div>
        <h1 class="onboarding-title">You're in!</h1>
        <p class="onboarding-subtitle">
          Your area is set up. Start reporting to help your neighbours
          and build your streak.
        </p>
        <div class="onboarding-actions">
          <button class="btn btn-primary btn-block btn-lg" id="btn-go-home">
            See Your Status →
          </button>
        </div>
      </div>
    </div>
  `}function Me(e){const t=e.querySelector("#onboarding-screen");if(!t)return;const s=`
    <div class="progress-dots">
      ${x.map((r,o)=>`<div class="progress-dot ${o===y?"active":""}"></div>`).join("")}
    </div>
  `,n=t.querySelector(".onboarding-content");n&&n.insertAdjacentHTML("beforeend",s)}function Re(e){const t=document.getElementById("btn-get-started");t&&t.addEventListener("click",()=>k(e));const s=document.getElementById("area-select"),n=document.getElementById("btn-area-next");s&&n&&(s.addEventListener("change",c=>{m=c.target.value,n.disabled=!m}),n.addEventListener("click",()=>{m&&k(e)}));const r=document.getElementById("btn-allow-notif"),o=document.getElementById("btn-skip-notif");r&&r.addEventListener("click",async()=>{if("Notification"in window)try{if(await Notification.requestPermission()==="granted"&&"serviceWorker"in navigator){const u=await navigator.serviceWorker.ready,{subscribeToPush:d}=await Y(async()=>{const{subscribeToPush:p}=await Promise.resolve().then(()=>st);return{subscribeToPush:p}},void 0),{getUser:g}=await Y(async()=>{const{getUser:p}=await Promise.resolve().then(()=>Le);return{getUser:p}},void 0),v=g();v&&u&&await d(u,v)}}catch{}k(e)}),o&&o.addEventListener("click",()=>k(e));const i=document.getElementById("btn-go-home");i&&i.addEventListener("click",async()=>{m&&await te(m),O("/home")})}function Fe(e){switch(e){case"ON":return"Light Is Up";case"OFF":return"Light Is Out";case"LIKELY_ON":return"Likely Up";case"LIKELY_OFF":return"Likely Out";case"UNCONFIRMED":default:return"Unconfirmed"}}function ge(e){switch(e){case"ON":case"LIKELY_ON":return"on";case"OFF":case"LIKELY_OFF":return"off";default:return"unknown"}}function xe(e){switch(e){case"ON":case"LIKELY_ON":return"⚡";case"OFF":case"LIKELY_OFF":return"🔴";default:return"—"}}function Be(e){switch(e){case"ON":return"ON";case"OFF":return"OFF";case"LIKELY_ON":return"~ON";case"LIKELY_OFF":return"~OFF";default:return"—"}}function Ye(e,t){if(!e||!t)return`
      <div class="status-hero status-unknown" id="status-card">
        <div class="status-icon-row">
          <span class="status-bolt">—</span>
          <div>
            <div class="status-label">No Area Selected</div>
          </div>
        </div>
        <div class="status-meta">
          <span class="status-meta-item">Select your area to see power status</span>
        </div>
      </div>
    `;const s=ge(e.currentStatus),n=Fe(e.currentStatus),r=F(e.lastUpdated),o=A(e.lastUpdated);let i=`status-${s}`;r==="fresh"&&(i+=" fresh"),r==="stale"&&(i="status-stale"),r==="none"&&(i="status-unknown");const c=s==="on"?"⚡":s==="off"?"🔴":"—";let u="";r==="stale"?u=" · Unconfirmed — tap to update":r==="none"&&(u="");const d=e.reportCount===1?"Reported by 1 person":e.reportCount>0?`Reported by ${e.reportCount} people`:"No reports yet";return`
    <div class="status-hero ${i}" id="status-card">
      <div class="area-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        ${t.city} — ${t.name}
      </div>

      <div class="status-icon-row" style="margin-top: var(--space-xl)">
        <span class="status-bolt">${c}</span>
        <div>
          <div class="status-label">${r==="none"?"No Recent Data":n}</div>
        </div>
      </div>

      <div class="status-meta">
        ${e.reportCount>0?`
          <span class="status-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span class="report-count" id="report-count">${d}</span>
          </span>
        `:""}
        ${e.lastUpdated?`
          <span class="status-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span id="time-ago">${o}${u}</span>
          </span>
        `:`
          <span class="status-meta-item">No data for this area yet</span>
        `}
      </div>
    </div>
  `}function Je(e){return!e||e.length===0?"":`
    <div class="nearby-section">
      <div class="section-label">Nearby Areas</div>
      <div class="nearby-list" id="nearby-list">
        ${[...e].sort((n,r)=>{const o=n.status.lastUpdated?new Date(n.status.lastUpdated).getTime():0;return(r.status.lastUpdated?new Date(r.status.lastUpdated).getTime():0)-o}).map(n=>{const r=ge(n.status.currentStatus),o=xe(n.status.currentStatus),i=Be(n.status.currentStatus),c=A(n.status.lastUpdated),u=F(n.status.lastUpdated);return`
      <div class="nearby-item" style="${u==="stale"||u==="none"?"opacity: 0.5;":""}">
        <div class="nearby-info">
          <span class="nearby-name">${n.area.name}</span>
          <span class="nearby-time">${c}</span>
        </div>
        <div class="nearby-status ${r}">
          <span>${o}</span>
          <span>${i}</span>
        </div>
      </div>
    `}).join("")}
      </div>
    </div>
  `}function Ke(e){if(!e||e<=0)return`
      <div class="streak-banner" id="streak-banner">
        <span class="streak-fire">💡</span>
        <div class="streak-content">
          <div class="streak-count">Start your streak!</div>
          <div class="streak-message">Report daily to build your streak and help your area.</div>
        </div>
      </div>
    `;const t=le(e);return`
    <div class="streak-banner" id="streak-banner">
      <span class="streak-fire">🔥</span>
      <div class="streak-content">
        <div class="streak-count">${e} ${e===1?"day":"days"} in a row</div>
        <div class="streak-message">${t||"Keep reporting to grow your streak!"}</div>
      </div>
    </div>
  `}const We=3e3;function f(e,t="info"){const s=document.getElementById("toast-container");if(!s)return;const n={info:"ℹ️",success:"✅",error:"❌",warning:"⚠️"},r=document.createElement("div");r.className="toast",r.innerHTML=`
    <span class="toast-icon">${n[t]||n.info}</span>
    <span>${e}</span>
  `,s.appendChild(r),setTimeout(()=>{r.classList.add("toast-exit"),r.addEventListener("animationend",()=>r.remove())},We),r.addEventListener("click",()=>{r.classList.add("toast-exit"),r.addEventListener("animationend",()=>r.remove())})}const je=1800*1e3;async function J(e){const t=oe();return t&&Date.now()-new Date(t.createdAt).getTime()<je&&t.status===e?(f("You already confirmed this — we'll ask again later 👍","info"),K("light"),!1):(K("medium"),e==="ON"?f("Confirmed — light is up! ⚡","success"):f("Noted — light is out. Your area will be updated.","info"),await ie(e)?(ce(),requestAnimationFrame(()=>{const n=document.getElementById("report-count");n&&(n.classList.remove("pop"),n.offsetWidth,n.classList.add("pop"))}),!0):(f("Something went wrong. Try again.","error"),!1))}function K(e="medium"){if(!navigator.vibrate)return;const t={light:[10],medium:[30],heavy:[50,30,50]};try{navigator.vibrate(t[e]||t.medium)}catch{}}function He(){const e=document.getElementById("btn-report-on"),t=document.getElementById("btn-report-off");e&&e.addEventListener("click",s=>{s.preventDefault(),J("ON")}),t&&t.addEventListener("click",s=>{s.preventDefault(),J("OFF")})}let D=null,P=null;function qe(e){D&&D(),P&&clearInterval(P);function t(){const s=I(),n=R(),r=T(),o=ae(),i=(s==null?void 0:s.streak)||0;e.innerHTML=`
      ${ze()}
      <main class="home" role="main">
        ${Ye(r,n)}
        ${Ve(r)}
        ${Je(o)}
        ${Ge(r)}
        ${Ke(i)}
      </main>
    `,He(),Ze()}t(),D=Q(()=>{t()}),P=setInterval(()=>{const s=document.getElementById("time-ago");if(s){const n=T();n!=null&&n.lastUpdated&&(s.textContent=A(n.lastUpdated))}},3e4)}function ze(){return`
    <header class="header" role="banner">
      <div class="header-logo">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M13 2L3 14h9l-1 10 10-12h-9l1-10z"/>
        </svg>
        <span class="header-logo-text">Up NEPA</span>
      </div>
      <div class="header-actions">
        <button class="header-btn" id="btn-notif" aria-label="Notifications" title="Notifications">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </button>
        <button class="header-btn" id="btn-settings" aria-label="Settings" title="Settings">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>
    </header>
  `}function Ve(e){return e==null||e.currentStatus,`
    <div class="report-buttons" id="report-buttons">
      <button
        class="report-btn report-btn-on"
        id="btn-report-on"
        aria-label="Report power is on"
      >
        ✅ Confirm ON
      </button>
      <button
        class="report-btn report-btn-off"
        id="btn-report-off"
        aria-label="Report power is off"
      >
        ❌ It's Off
      </button>
    </div>
  `}function Ge(e){const t=(e==null?void 0:e.currentStatus)==="OFF"||(e==null?void 0:e.currentStatus)==="LIKELY_OFF";let s,n;return t?(s="Not enough data for your area yet — <em>help us by reporting daily</em>. With more reports, we'll predict when light usually comes back.",n="🔮"):(s="We're collecting patterns for your area. Keep reporting and we'll show <em>when light usually comes and goes</em>.",n="📊"),`
    <div class="prediction-card" id="prediction-card">
      <div class="section-label">Prediction</div>
      <div class="prediction-icon">${n}</div>
      <p class="prediction-text">${s}</p>
      <div class="prediction-confidence">
        <span>📈</span>
        <span>Building patterns from community reports...</span>
      </div>
    </div>
  `}function Ze(){const e=document.getElementById("btn-settings");e&&e.addEventListener("click",()=>{window.location.hash="/settings"})}function Qe(e){const t=I();R();const s=M().areas.map(o=>`<option value="${o.id}" ${o.id===(t==null?void 0:t.areaId)?"selected":""}>${o.city} — ${o.name}</option>`).join(""),r=("Notification"in window?Notification.permission:"unsupported")==="granted";e.innerHTML=`
    <header class="header" role="banner">
      <button class="header-btn" id="btn-back" aria-label="Go back" title="Go back">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <span class="header-logo-text" style="font-size: var(--fs-md);">Settings</span>
      <div style="width: 40px;"></div>
    </header>

    <div class="settings">
      <div class="settings-group">
        <div class="settings-group-label">Your Area</div>
        <div class="settings-item" style="flex-direction: column; align-items: stretch; gap: var(--space-md);">
          <div class="select-wrapper">
            <select class="select" id="settings-area-select">
              ${s}
            </select>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>
      </div>

      <div class="settings-group">
        <div class="settings-group-label">Notifications</div>
        <div class="settings-item">
          <span class="settings-item-label">Push notifications</span>
          <div class="toggle ${r?"active":""}" id="toggle-notif" role="switch" aria-checked="${r}" tabindex="0"></div>
        </div>
        <div class="settings-item">
          <span class="settings-item-label">Morning check-in (6am)</span>
          <span class="settings-item-value">${r?"Active":"Off"}</span>
        </div>
        <div class="settings-item">
          <span class="settings-item-label">Evening check-in (6pm)</span>
          <span class="settings-item-value">${r?"Active":"Off"}</span>
        </div>
      </div>

      <div class="settings-group">
        <div class="settings-group-label">Appearance</div>
        <div class="settings-item">
          <span class="settings-item-label">Light Mode</span>
          <div class="toggle ${$()==="light"?"active":""}" id="toggle-theme" role="switch" aria-checked="${$()==="light"}" tabindex="0"></div>
        </div>
      </div>

      <div class="settings-group">
        <div class="settings-group-label">Your Stats</div>
        <div class="settings-item">
          <span class="settings-item-label">Current streak</span>
          <span class="settings-item-value">${(t==null?void 0:t.streak)||0} days</span>
        </div>
        <div class="settings-item">
          <span class="settings-item-label">Member since</span>
          <span class="settings-item-value">${t!=null&&t.createdAt?new Date(t.createdAt).toLocaleDateString("en-NG",{month:"short",year:"numeric"}):"Unknown"}</span>
        </div>
      </div>

      <div class="settings-group">
        <div class="settings-group-label">About</div>
        <div class="settings-item">
          <span class="settings-item-label">Version</span>
          <span class="settings-item-value">MVP v1.0</span>
        </div>
        <div class="settings-item">
          <span class="settings-item-label">Area</span>
          <span class="settings-item-value">Magboro, Ogun State</span>
        </div>
      </div>

      <button class="btn btn-ghost btn-block" id="btn-reset" style="margin-top: var(--space-xl); color: var(--red);">
        Reset App Data
      </button>
    </div>
  `,Xe()}function Xe(){const e=document.getElementById("btn-back");e&&e.addEventListener("click",()=>O("/home"));const t=document.getElementById("settings-area-select");t&&t.addEventListener("change",o=>{ne(o.target.value),f("Area updated! 📍","success")});const s=document.getElementById("toggle-notif");s&&s.addEventListener("click",async()=>{if("Notification"in window)if(Notification.permission==="granted")f("Manage notifications in your browser settings","info");else try{await Notification.requestPermission()==="granted"?(s.classList.add("active"),s.setAttribute("aria-checked","true"),f("Notifications enabled! 🔔","success")):f("Notifications blocked — check browser settings","warning")}catch{f("Notifications not supported","error")}else f("Notifications not supported on this browser","error")});const n=document.getElementById("toggle-theme");n&&n.addEventListener("click",()=>{de()==="light"?(n.classList.add("active"),n.setAttribute("aria-checked","true")):(n.classList.remove("active"),n.setAttribute("aria-checked","false"))});const r=document.getElementById("btn-reset");r&&r.addEventListener("click",()=>{confirm("This will erase all your data. Are you sure?")&&(localStorage.clear(),window.location.hash="",window.location.reload())})}const et="BHWgcj_JYaY3rdv5rFQbkxuJ0SbWWEyF-25j5lrCzTRxoUVu47hArUVubQWFHwa7o0_RbLQj8yqtCMnypZZMcoY";async function W(){if(console.log("⚡ Up NEPA — Starting..."),await X(),N("/onboarding",De),N("/home",qe),N("/settings",Qe),!se())O("/onboarding");else{const e=window.location.hash.slice(1);(!e||e==="/onboarding")&&O("/home")}he(),tt(),console.log("⚡ Up NEPA — Ready!")}async function tt(){if(!("serviceWorker"in navigator)){console.warn("[Up NEPA] Service workers not supported");return}try{const e=await navigator.serviceWorker.register("/sw.js",{scope:"/"});console.log("[Up NEPA] Service worker registered:",e.scope);const t=I();t&&Notification.permission==="granted"&&await ve(e,t)}catch(e){console.error("[Up NEPA] Service worker registration failed:",e)}}async function ve(e,t){if(!(!e||!(t!=null&&t.id)))try{let s=await e.pushManager.getSubscription();if(!s){const r=nt(et);s=await e.pushManager.subscribe({userVisibleOnly:!0,applicationServerKey:r}),console.log("[Up NEPA] Push subscription created")}const n=s.toJSON();await Ie(t.id,n),console.log("[Up NEPA] Push subscription saved to Supabase")}catch(s){console.error("[Up NEPA] Push subscription failed:",s)}}function nt(e){const t="=".repeat((4-e.length%4)%4),s=(e+t).replace(/-/g,"+").replace(/_/g,"/"),n=atob(s),r=new Uint8Array(n.length);for(let o=0;o<n.length;o++)r[o]=n.charCodeAt(o);return r}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",W):W();const st=Object.freeze(Object.defineProperty({__proto__:null,subscribeToPush:ve},Symbol.toStringTag,{value:"Module"}));
