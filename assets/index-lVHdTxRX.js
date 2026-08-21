(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))s(a);new MutationObserver(a=>{for(const o of a)if(o.type==="childList")for(const r of o.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&s(r)}).observe(document,{childList:!0,subtree:!0});function n(a){const o={};return a.integrity&&(o.integrity=a.integrity),a.referrerPolicy&&(o.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?o.credentials="include":a.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function s(a){if(a.ep)return;a.ep=!0;const o=n(a);fetch(a.href,o)}})();function E(t,...e){const n=t.reduce((a,o,r)=>a+o+(e[r]??""),""),s=document.createElement("template");return s.innerHTML=n.trim(),s.content.firstElementChild}function g(t,e){return t.querySelector(e)}const p={day:"avg",period:"all",layers:{speed:!0,cong:!1,dest:!1,stops:!1,roads:!1},destCats:null,area:null,areaName:null,areaRecord:null,transferPctMax:100},ht=new Set;function S(t){Object.assign(p,t),qt(Object.keys(t))}function qt(t){const e=new Set(t);for(const n of ht)n(p,e)}function we(t){return ht.add(t),()=>ht.delete(t)}const Ee="theme",gt=new Set;function wt(){return document.documentElement.dataset.theme==="light"?"light":"dark"}function R(){return wt()==="light"}function Se(){const t=R()?"dark":"light";document.documentElement.dataset.theme=t;try{localStorage.setItem(Ee,t)}catch{}for(const e of gt)e(t)}function xe(t){return gt.add(t),()=>gt.delete(t)}const J={dark:{base:"https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",labels:"https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"},light:{base:"https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png",labels:"https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"}},Pe={neighHighlightPane:350,roadPane:390,routeCasingPane:405,routeLinePane:410,pointPane:420,arrowPane:422},Et=[32.08,34.78];let b=null,Ut=null,bt=null;function Te(t){b=L.map(t,{zoomControl:!1,attributionControl:!1,preferCanvas:!0}).setView(Et,15),L.control.zoom({position:"topright"}).addTo(b);const e=wt();Ut=L.tileLayer(J[e].base,{maxZoom:19,subdomains:"abcd",className:"basemap"}).addTo(b),bt=L.tileLayer(J[e].labels,{maxZoom:19,subdomains:"abcd",opacity:Jt()}).addTo(b);for(const[n,s]of Object.entries(Pe))b.createPane(n).style.zIndex=String(s);return b}function Jt(){return R()?.8:.7}function Me(){const t=wt();Ut.setUrl(J[t].base),bt.setUrl(J[t].labels),bt.setOpacity(Jt())}function F(t,e){e?b.hasLayer(t)||b.addLayer(t):b.hasLayer(t)&&b.removeLayer(t)}const Ce=t=>`/ODflow/data/${t}`,c={center:Et,border:null,segments:[],speedProfile:null,stopTotals:null,destinations:null,stops:null,neighbourhoods:[],routesById:null,roads:null};async function C(t){const e=await fetch(Ce(t));if(!e.ok)throw new Error(`${t}: HTTP ${e.status}`);return e.json()}async function Oe(){var s,a,o;const[t,e,n]=await Promise.allSettled([C("border.json"),C("speeds.json"),C("kpis.json")]);if(t.status==="fulfilled"){c.border=t.value;const r=(o=(a=(s=t.value)==null?void 0:s.geometry)==null?void 0:a.coordinates)==null?void 0:o[0];if(r!=null&&r.length){const i=r.map(l=>l[1]),y=r.map(l=>l[0]);c.center=[(Math.min(...i)+Math.max(...i))/2,(Math.min(...y)+Math.max(...y))/2]}}return e.status==="fulfilled"&&(c.segments=e.value),n.status==="fulfilled"&&(c.speedProfile=n.value.speed_profile||null,c.stopTotals=n.value.stops||null),{segmentsFailed:e.status==="rejected"}}async function je(){return c.neighbourhoods.length||(c.neighbourhoods=await C("neighbourhoods.json")),c.neighbourhoods}const V=new Map;function st(t,e){return V.has(t)||V.set(t,e().catch(n=>{throw V.delete(t),n})),V.get(t)}function Re(){return st("destinations",async()=>(c.destinations=await C("destinations.json"),c.destinations))}function Ie(){return st("stops",async()=>(c.stops=await C("stops.json"),c.stops))}function Ae(){return st("routes",async()=>(c.routesById=await C("neighbourhood_routes.json"),c.routesById))}function Fe(){return st("roads",async()=>(c.roads=await C("roads.geojson"),c.roads))}function Ct(t,e,n){let s=!1;for(let a=0,o=n.length-1;a<n.length;o=a++){const r=n[a][0],i=n[a][1],y=n[o][0],l=n[o][1];i>t!=l>t&&e<(y-r)*(t-i)/(l-i)+r&&(s=!s)}return s}function Ot(t,e,n){if(!Ct(t,e,n[0]))return!1;for(let s=1;s<n.length;s++)if(Ct(t,e,n[s]))return!1;return!0}function Be(t,e,n){return n?n.type==="Polygon"?Ot(t,e,n.coordinates):n.type==="MultiPolygon"?n.coordinates.some(s=>Ot(t,e,s)):!1:!1}function St(t,e,n){const s=n.bbox;return t<s.min_lat||t>s.max_lat||e<s.min_lon||e>s.max_lon?!1:n.boundary?Be(t,e,n.boundary):!0}function De(t,e){for(const n of t.getLatLngs())if(St(n.lat,n.lng,e))return!0;return!1}const A=[8,15,22,30],ze=[5,4,3.25,2.75,2.5],Yt=15,jt={dark:{bands:["#e11d48","#f97316","#facc15","#34d399","#60a5fa"],empty:"#3d4a63",cong:"#fb7185",focus:"#2dd4bf",imported:"#38bdf8",casing:"#0b1220",hairline:"#0b0b0b",selected:"#ffffff"},light:{bands:["#e11d48","#9a3412","#ca8a04","#15803d","#1d4ed8"],empty:"#cbd5e1",cong:"#be123c",focus:"#0f766e",imported:"#1d4ed8",casing:"#ffffff",hairline:"#ffffff",selected:"#0f1f3e"}};function P(){return R()?jt.light:jt.dark}function Zt(t){if(t==null||t<=0)return-1;let e=0;for(;e<A.length&&t>=A[e];)e++;return e}function Wt(t){const e=P(),n=Zt(t);return n<0?e.empty:e.bands[n]}function Ne(t){const e=Zt(t);return e<0?2:ze[e]}const yt={dark:["#3987e5","#d95926","#199e70","#c98500","#d55181","#008300","#9085e9","#e66767"],light:["#2a78d6","#eb6834","#1baf7a","#eda100","#e87ba4","#008300","#4a3aa7","#e34948"]},He=yt.dark.length;function Ge(t){const e=R()?yt.light:yt.dark;return e[t%e.length]}const q=[{id:"edu",name:"חינוך",test:/ספר|גנ[יי]? ילדים|חינוך|לימוד/},{id:"health",name:"בריאות",test:/רפוא|מרפא|מרקחת|קופ[הות]|טיפ[הת] חלב|בריאות/},{id:"sport",name:"ספורט ופנאי",test:/ספורט|בריכ|אצטדיון|כושר|מגרש|חוף/},{id:"comm",name:"קהילה ותרבות",test:/קהיל|תרבות|מתנ״?ס/},{id:"relig",name:"דת",test:/כנסת|דת|מסגד|כנסי/},{id:"other",name:"אחר",test:/.^/}],Rt={dark:{edu:"#3987e5",health:"#d95926",sport:"#199e70",comm:"#c98500",relig:"#d55181",other:"#9085e9"},light:{edu:"#2a78d6",health:"#eb6834",sport:"#1baf7a",comm:"#eda100",relig:"#e87ba4",other:"#4a3aa7"}};function Ve(t){return(q.find(n=>n.test.test(t||""))||q[q.length-1]).id}function Xt(t){return(R()?Rt.light:Rt.dark)[t]}const Ke={motorway:"#fc8a8a",motorway_link:"#fc8a8a",trunk:"#fbb88a",trunk_link:"#fbb88a",primary:"#fce08a",primary_link:"#fce08a",secondary:"#d8d8b0",secondary_link:"#d8d8b0",tertiary:"#909090",tertiary_link:"#909090",residential:"#606878",unclassified:"#606878",living_street:"#606878"},qe={motorway:"#e892a2",motorway_link:"#e892a2",trunk:"#f9b29c",trunk_link:"#f9b29c",primary:"#fcd6a4",primary_link:"#fcd6a4",secondary:"#d8d8a0",secondary_link:"#d8d8a0",tertiary:"#b8b8b8",tertiary_link:"#b8b8b8",residential:"#c8c8c8",unclassified:"#c8c8c8",living_street:"#c8c8c8"},Ue={motorway:4,motorway_link:2.5,trunk:4,trunk_link:2.5,primary:3,primary_link:2,secondary:2.5,secondary_link:1.5,tertiary:1.5,tertiary_link:1,residential:1,unclassified:1,living_street:1};function Je(t){return(R()?qe:Ke)[t]??(R()?"#b0b0b0":"#505060")}function Ye(t){return Ue[t]??1}const It={dark:["#115e59","#0f766e","#0d9488","#14b8a6","#5eead4"],light:["#14b8a6","#0d9488","#0f766e","#115e59","#0b3d39"]};function at(){return R()?It.light:It.dark}const Y=L.layerGroup(),mt=L.layerGroup(),Z=[];let N=null;function Qt(t){const e=p.day==="avg"?[0,1,2,3,4]:[p.day],n=p.period==="all"?[0,1,2,3,4,5,6]:[p.period];let s=0,a=0;for(const o of e)for(const r of n){const i=t[o*7+r];i&&i>0&&(s+=i,a++)}return a?s/a:null}function te(){Y.clearLayers(),Z.length=0;const t=P();for(const e of c.segments){const n=L.polyline(e.coordinates,{color:t.empty,weight:3,opacity:.9});n._speeds=e.speeds,n.on("mouseover",function(){this.setStyle({weight:(this._w||3)+3})}),n.on("mouseout",function(){this.setStyle({weight:this._w||3})}),n.on("click",function(){const s=Qt(this._speeds),a=this.getLatLngs()[Math.floor(this.getLatLngs().length/2)];L.popup().setLatLng(a).setContent(`<div class="pp">מהירות אוטובוס במקטע<br><b>${s?s.toFixed(1):"—"} קמ״ש</b></div>`).openOn(b)}),Z.push(n),Y.addLayer(n)}ee()}function ee(){N=p.area?new Set(Z.filter(t=>De(t,p.area))):null}function Ze(){mt.clearLayers();const t=P();let e=0,n=0,s=0;for(const a of Z){const o=Qt(a._speeds),r=Ne(o);a._w=r,a.setStyle({color:Wt(o),opacity:o==null?.5:.9,weight:r}),o!=null&&(N&&!N.has(a)||(e+=o,n++,o<Yt&&(s++,mt.addLayer(L.polyline(a.getLatLngs(),{color:t.cong,weight:8,opacity:.35})))))}return{avgSpeed:n?e/n:null,congestedPct:n?Math.round(s/n*100):null,segmentCount:N?N.size:c.segments.length}}function We({speed:t,cong:e}){F(Y,t),F(mt,e)}const H=["בוקר מוקדם","שעות הבוקר","לפני הצהריים","צהריים","אחר הצהריים","שעת שיא ערב","ערב / לילה"],vt=["≈05–07","≈07–09","≈09–12","≈12–15","≈15–17","≈17–19","≈19–24"],Xe=["ראשון","שני","שלישי","רביעי","חמישי"],U=["א׳","ב׳","ג׳","ד׳","ה׳"];function $(t,e=0){return t==null?"—":(+t).toLocaleString("he-IL",{minimumFractionDigits:e,maximumFractionDigits:e})}function Qe(t){return t==="avg"?"ממוצע ימי חול (א׳–ה׳)":"יום "+Xe[t]}function ne(t){return t==="all"?"כל שעות היום":H[t]+" "+vt[t]}function _(t){return String(t).replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}const $t=L.layerGroup();function se(t){var n;const e=(n=c.destinations)==null?void 0:n.categories[t];return Ve(e==null?void 0:e.name)}function ae(t){return Xt(se(t))}function W(){var n;if(!c.destinations)return;$t.clearLayers();const t=c.destinations.categories,e=P().hairline;for(const[s,a,o,r,i]of c.destinations.points){if(p.destCats&&!p.destCats.has(s)||p.area&&!St(a,o,p.area))continue;const y=_(r||"(ללא שם)"),l=_(((n=t[s])==null?void 0:n.name)||""),d=i?" · "+_(i):"";L.circleMarker([a,o],{pane:"pointPane",radius:3,color:e,weight:.75,fillColor:ae(s),fillOpacity:.9}).bindPopup(`<div dir="rtl" style="text-align:right"><b>${y}</b><br><span style="opacity:.75">${l}${d}</span></div>`).addTo($t)}}function tn(t){F($t,t)}const Lt=L.layerGroup(),_t=new Map;let oe=()=>{};const k={visible:[],breaks:[],selected:null};function X(t){return`${t.code}@${t.lat},${t.lon}`}function en(t){oe=t}function nn(t){const e=t.map(s=>s.boardings_day).filter(s=>s!=null).sort((s,a)=>s-a);if(!e.length)return[];const n=at();return Array.from({length:n.length-1},(s,a)=>e[Math.floor(e.length*(a+1)/n.length)])}function sn(t){if(t==null)return null;const e=at();let n=0;for(;n<k.breaks.length&&t>k.breaks[n];)n++;return e[n]}function an(t,e){return t==null||!e?3:3.5+9*Math.sqrt(t/e)}function Q(){if(!c.stops)return;Lt.clearLayers(),_t.clear(),k.visible=c.stops.stations.filter(a=>!p.area||St(a.lat,a.lon,p.area)),k.breaks=nn(k.visible);const t=p.transferPctMax<100?k.visible.filter(a=>a.transfer_pct==null||a.transfer_pct<=p.transferPctMax):k.visible,e=k.visible.reduce((a,o)=>Math.max(a,o.boardings_day||0),0),n=P(),s=n.empty;for(const a of t){const o=sn(a.boardings_day),r=L.circleMarker([a.lat,a.lon],{pane:"pointPane",radius:an(a.boardings_day,e),color:o?n.hairline:s,weight:o?1:1.5,fillColor:o||"transparent",fillOpacity:o?.9:0});r._stroke=o?n.hairline:s,r._weight=o?1:1.5,r.bindTooltip(`<div dir="rtl" style="text-align:right"><b>${_(a.name)}</b><br>`+(a.boardings_day!=null?`${$(a.boardings_day)} עליות ביום`:"ללא נתוני סקר")+"</div>",{direction:"top",opacity:.95}),r.on("click",()=>re(a)),r.addTo(Lt),_t.set(X(a),r)}k.selected&&xt()}function xt(){const t=P().selected;for(const[e,n]of _t){const s=k.selected&&e===X(k.selected);n.setStyle({color:s?t:n._stroke,weight:s?2.5:n._weight}),s&&n.bringToFront()}}function re(t){k.selected=t,xt(),oe(t)}function At(){k.selected=null,xt()}function on(t){F(Lt,t)}const rn={5:"דן",3:"אגד",16:"מטרופולין",18:"קווים",14:"נסיעות",42:"גלים",91:"רכבת",7:'דן בי"ש',15:"קווים"};function ie(t){return rn[String(t)]||`סוכנות ${t}`}const G=L.layerGroup(),I=new Map,dt=new Map;let Ft=0;function Pt(t){return dt.has(t)||(dt.set(t,Ft%He),Ft++),Ge(dt.get(t))}function ln(t){return I.has(t)}function le(t){var a;if(I.has(t.route_id)||!((a=t.coordinates)!=null&&a.length))return;const e=Pt(t.route_id),n=L.polyline(t.coordinates,{pane:"routeCasingPane",color:P().casing,weight:8,opacity:.85,smoothFactor:1.2}),s=L.polyline(t.coordinates,{pane:"routeLinePane",color:e,weight:4.5,opacity:1,smoothFactor:1.2});s.bindTooltip(`קו ${t.route_short_name} · ${ie(t.agency_id)}<br><small>${t.route_long_name||""}</small>`,{sticky:!0,direction:"top"}),n.addTo(G),s.addTo(G),I.set(t.route_id,{stroke:s,casing:n})}function ce(t){const e=I.get(t);e&&(G.removeLayer(e.stroke),G.removeLayer(e.casing),I.delete(t))}function cn(t){I.has(t.route_id)?ce(t.route_id):le(t)}function pt(){for(const t of[...I.keys()])ce(t)}function dn(){const t=P().casing;for(const[e,n]of I)n.stroke.setStyle({color:Pt(e)}),n.casing.setStyle({color:t})}function pn(t){G.addTo(t||b)}const un={togeojson:"https://unpkg.com/@mapbox/togeojson@0.16.0/togeojson.js",shp:"https://unpkg.com/shpjs@6.2.0/dist/shp.js",jszip:"https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"},K=new Map;function fn(t){return K.has(t)||K.set(t,new Promise((e,n)=>{const s=document.createElement("script");s.src=t,s.onload=e,s.onerror=()=>{K.delete(t),n(new Error(`failed to load ${t}`))},document.head.appendChild(s)})),K.get(t)}function Bt(...t){return Promise.all(t.map(e=>fn(un[e])))}const hn=/\.(geojson|json|kml|zip)$/i,B=[];let ot=()=>{};function gn(t){ot=t}function de(t){return{color:t,weight:2,opacity:.9,fillOpacity:.15}}function ut(t,e){const n=P().imported,s=L.geoJSON(t,{style:de(n),pointToLayer:(a,o)=>L.circleMarker(o,{radius:6,color:n,weight:2,fillColor:n,fillOpacity:.8}),onEachFeature:(a,o)=>{if(!a.properties)return;const r=Object.entries(a.properties).filter(([,i])=>i!=null).map(([i,y])=>`<tr><td style="color:var(--ink3);padding-left:8px">${_(i)}</td><td>${_(y)}</td></tr>`).join("");r&&o.bindPopup(`<table style="font-size:12px;direction:ltr;border-collapse:collapse">${r}</table>`)}}).addTo(b);try{b.fitBounds(s.getBounds(),{padding:[30,30]})}catch{}B.push({layer:s,name:e,visible:!0}),ot()}const ft=(t,e)=>new Promise((n,s)=>{const a=new FileReader;a.onload=o=>n(o.target.result),a.onerror=()=>s(a.error),a[e](t)});async function Dt(t){const e=t.name.replace(/\.[^.]+$/,""),n=t.name.split(".").pop().toLowerCase();try{if(n==="kml"){const[s]=await Promise.all([ft(t,"readAsText"),Bt("togeojson")]);ut(toGeoJSON.kml(new DOMParser().parseFromString(s,"text/xml")),e)}else if(n==="zip"){const[s]=await Promise.all([ft(t,"readAsArrayBuffer"),Bt("jszip","shp")]),a=await JSZip.loadAsync(s),o=Object.values(a.files).filter(u=>!u.dir),r=o.find(u=>/\.shp$/i.test(u.name)),i=o.find(u=>/\.dbf$/i.test(u.name)),y=o.find(u=>/\.prj$/i.test(u.name));if(!r||!i){alert("קובץ ZIP לא מכיל קבצי Shapefile (.shp + .dbf)");return}const[l,d,h]=await Promise.all([r.async("arraybuffer"),i.async("arraybuffer"),y?y.async("string"):Promise.resolve(null)]);ut(shp.combine([shp.parseShp(l,h),shp.parseDbf(d)]),e)}else n==="geojson"||n==="json"?ut(JSON.parse(await ft(t,"readAsText")),e):alert(`סוג קובץ לא נתמך: .${n}
ניתן לייבא GeoJSON, KML או Shapefile בקובץ ZIP.`)}catch(s){console.error("[Import] failed:",s),alert(`שגיאה בייבוא ${t.name}: ${s.message}`)}}function bn(t){const e=B[t];e&&(e.visible=!e.visible,e.visible?b.addLayer(e.layer):b.removeLayer(e.layer),ot())}function yn(t){const e=B[t];e&&(b.removeLayer(e.layer),B.splice(t,1),ot())}function mn(){const t=P().imported;for(const{layer:e}of B)e.setStyle(n=>n instanceof L.CircleMarker?{color:t,weight:2,fillColor:t,fillOpacity:.8}:de(t))}const tt=L.layerGroup(),et=L.layerGroup(),vn=14;let Tt=!1;function $n(t){const[e,n]=t[0],[s,a]=t[t.length-1],o=(s-e)*Math.PI/180,r=n*Math.PI/180,i=a*Math.PI/180,y=Math.sin(o)*Math.cos(i),l=Math.cos(r)*Math.sin(i)-Math.sin(r)*Math.cos(i)*Math.cos(o);return(Math.atan2(y,l)*180/Math.PI+360)%360}function Ln(t){let e=0;for(let n=1;n<t.length;n++){const s=t[n][0]-t[n-1][0],a=t[n][1]-t[n-1][1];e+=Math.sqrt(s*s+a*a)}return e}function _n(t){return L.divIcon({html:`<div style="transform:rotate(${t}deg);width:10px;height:14px"><svg viewBox="0 0 10 14" xmlns="http://www.w3.org/2000/svg"><polygon points="5,0 10,14 5,10 0,14" fill="rgba(255,255,255,0.88)" stroke="rgba(0,0,0,0.35)" stroke-width="0.5"/></svg></div>`,className:"",iconSize:[10,14],iconAnchor:[5,7]})}function pe(t){tt.clearLayers(),et.clearLayers(),L.geoJSON(t,{pane:"roadPane",style:e=>({color:Je(e.properties.fclass),weight:Ye(e.properties.fclass),opacity:.72}),onEachFeature:(e,n)=>{const{name:s,ref:a}=e.properties,o=[s,a].filter(Boolean).join(" · ");o&&n.bindTooltip(o,{sticky:!0,opacity:.85})}}).addTo(tt);for(const e of t.features){const{oneway:n,fclass:s}=e.properties;if(n!=="T"&&n!=="F")continue;const a=e.geometry.type==="LineString"?[e.geometry.coordinates]:e.geometry.coordinates;for(const o of a){if(o.length<2||Ln(o)<3e-4)continue;let r=$n(o);n==="T"&&(r=(r+180)%360);const i=o[Math.floor(o.length/2)];L.marker([i[1],i[0]],{icon:_n(r),pane:"arrowPane",interactive:!1}).addTo(et)}}}function zt(t){Tt=t,F(tt,t),ue()}function kn(){Tt&&ue()}function ue(){F(et,Tt&&b.getZoom()>=vn)}const kt=L.layerGroup();let T=null;function fe(t={}){return{color:P().focus,opacity:.7,fill:!1,dashArray:"4 4",...t}}function he(t){kt.clearLayers(),t&&L.geoJSON(t,{style:fe({weight:2,opacity:.75,dashArray:"6 4"})}).addTo(kt)}function ge(t){if(be(),!t)return null;const e=fe({pane:"neighHighlightPane",weight:1.5});if(t.boundary)T=L.geoJSON(t.boundary,{style:e}),T.bindTooltip(t.name);else{const n=t.bbox;T=L.rectangle([[n.min_lat,n.min_lon],[n.max_lat,n.max_lon]],e),T.bindTooltip(`${t.name} (אזור משוער — אין גבול מדויק בנתונים)`)}return T.addTo(b),T.getBounds()}function be(){T&&(b.removeLayer(T),T=null)}const wn='<svg class="sun-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-12.37c-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.38.39-1.02 0-1.41zm-12.37 12.37c-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.38.39-1.02 0-1.41z"/></svg>',En='<svg class="moon-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.3 22h-.1c-5.5 0-10-4.5-10-10 0-4.8 3.5-8.9 8.2-9.8.6-.1 1.2.3 1.3.9.1.6-.3 1.2-.9 1.3-3.7.8-6.4 4-6.4 7.8 0 4.4 3.6 8 8 8 3.8 0 7.1-2.7 7.8-6.4.1-.6.7-1 1.3-.9.6.1 1 .7.9 1.3-.9 4.7-5 8.2-9.8 8.2z"/></svg>';function Sn(){const t=E`
    <header>
      <div class="brand">OD<span class="flow">flow</span></div>
      <div class="sub">ניתוח פערי שירות בתח״צ &nbsp;·&nbsp; <b>תל אביב-יפו</b></div>
      <div class="head-right">
        <div class="tag" title="מקור הנתונים המוצגים כרגע">
          <span class="dot"></span>מהירויות אוטובוס · GTFS · סקר תחנות
        </div>
        <button class="icon-btn" id="themeToggle"
                title="מעבר בין ערכת צבעים בהירה לכהה"
                aria-label="החלפת ערכת צבעים">${wn}${En}</button>
      </div>
    </header>`;return g(t,"#themeToggle").addEventListener("click",Se),{el:t}}const xn=[{id:"avg",label:"מהירות אוטובוס ממוצעת",unit:"קמ״ש",tint:"var(--ramp)",note:"ממוצע כל היום"},{id:"cong",label:"מקטעים בגודש",unit:"% מהרשת",tint:"var(--c-cong)",tone:"var(--c-cong)",note:"מתחת ל־15 קמ״ש"},{id:"seg",label:"מקטעי כביש בניתוח",unit:"",tint:"var(--c-net)",note:"ברחבי העיר"},{id:"board",label:"עליות לאוטובוס ביום",unit:"",tint:"var(--c-ride)",tone:"var(--c-ride)",note:"סקר תחנות"}];function Pn(){const t=E`
    <div class="kpis">
      ${xn.map(s=>`
        <div class="kpi" style="--tint:${s.tint}${s.tone?`;--tone:${s.tone}`:""}">
          <div class="k">${s.label}</div>
          <div class="row">
            <span class="v" data-v="${s.id}">—</span>
            ${s.unit?`<span class="u">${s.unit}</span>`:""}
          </div>
          <div class="d" data-d="${s.id}">${s.note}</div>
        </div>`).join("")}
    </div>`,e=s=>g(t,`[data-v="${s}"]`),n=s=>g(t,`[data-d="${s}"]`);return{el:t,setLoading(s="טוען…"){e("avg").textContent=s,e("seg").textContent=s},setSpeedStats({avgSpeed:s,congestedPct:a,segmentCount:o},r){e("avg").textContent=s==null?"—":s.toFixed(1),e("cong").textContent=a??"—",o&&(e("seg").textContent=$(o)),n("avg").textContent=ne(r)},setScope(s){n("seg").textContent=s?`בגבולות ${s}`:"ברחבי העיר"},setSegmentError(s){e("seg").textContent=s},setRidership(s,a){s!=null&&s.transit?(e("board").textContent=$(s.transit.boardings_day),n("board").textContent=`${$(s.transit.surveyed)} תחנות · ${s.name}`):s?(e("board").textContent="—",n("board").textContent=`אין תחנות מסוקרות ב${s.name}`):a&&(e("board").textContent=$(a.boardings_day),n("board").textContent=`${$(a.surveyed)} תחנות מסוקרות · כל העיר`)}}}const Nt="▶ הרצת יום",Tn="⏸ עצור",Mn=1100;function Cn({onReset:t}={}){const e=E`
    <div class="block" style="--tint:var(--c-time)">
      <h3>חתך זמן</h3>
      <div class="days"></div>
      <div class="periods"></div>
      <div class="allp on">כל שעות היום (ממוצע)</div>
      <div class="spark"></div>
      <div class="spark-cap">מהירות ממוצעת לפי חלון זמן · לחיצה מסננת</div>
      <div class="playrow">
        <button class="btn" data-play>${Nt}</button>
        <button class="btn ghost" data-reset title="איפוס כל הבחירות">איפוס</button>
      </div>
    </div>`,n=g(e,".days"),s=g(e,".periods"),a=g(e,".allp"),o=g(e,".spark"),r=g(e,"[data-play]");let i=null;U.forEach((u,v)=>{const w=E`<div class="day">${u}</div>`;w.addEventListener("click",()=>S({day:v})),n.appendChild(w)});const y=E`<div class="day avg">ממוצע</div>`;y.addEventListener("click",()=>S({day:"avg"})),n.appendChild(y),H.forEach((u,v)=>{const w=E`
      <div class="prow">
        <span class="pn">P${v+1}</span>
        <span class="pl">${u}</span>
        <span class="pt">${vt[v]}</span>
      </div>`;w.addEventListener("click",()=>S({period:v})),s.appendChild(w)}),a.addEventListener("click",()=>S({period:"all"}));function l(){i&&(clearInterval(i),i=null,r.textContent=Nt)}r.addEventListener("click",()=>{if(i){l();return}r.textContent=Tn,S({period:0});let u=0;i=setInterval(()=>{u=(u+1)%H.length,S({period:u})},Mn)}),g(e,"[data-reset]").addEventListener("click",()=>{l(),S({day:"avg",period:"all"}),t==null||t()});function d(){if(o.replaceChildren(),!c.speedProfile)return;const u=c.speedProfile.filter(w=>w!=null),v=u.length?Math.max(...u):1;c.speedProfile.forEach((w,f)=>{const m=w==null?0:w/v*100,x=E`
        <div class="spk" title="${H[f]} ${vt[f]}${w==null?" · אין נתונים":` · ${w.toFixed(1)} קמ״ש`}">
          <span class="val">${w==null?"—":w.toFixed(0)}</span>
          <span class="bar-wrap"><span class="bar" style="height:${m}%;background:${Wt(w)}"></span></span>
          <span class="lab">P${f+1}</span>
        </div>`;x.addEventListener("click",()=>S({period:f})),o.appendChild(x)}),h()}function h(){[...n.children].forEach((u,v)=>{u.classList.toggle("on",v<U.length&&p.day===v||v===U.length&&p.day==="avg")}),[...s.children].forEach((u,v)=>u.classList.toggle("on",p.period===v)),a.classList.toggle("on",p.period==="all"),[...o.children].forEach((u,v)=>u.classList.toggle("on",p.period===v))}return h(),{el:e,sync:h,buildSpark:d,stopPlaying:l}}const On=[{key:"speed",label:"רשת מהירויות אוטובוס",tint:"var(--ramp)",swatch:null},{key:"cong",label:"מוקדי גודש (&lt;15 קמ״ש)",tint:"var(--c-cong)",swatch:"background:var(--sp1)"},{key:"roads",label:"רשת דרכים + כיוונים",tint:"#f9b29c",swatch:"background:#f9b29c"},{key:"dest",label:"מוקדי שירות ותעסוקה",tint:"var(--c-place)",swatch:"multi"},{key:"stops",label:"תחנות ועליות",tint:"var(--c-ride)",swatch:"background:var(--primary)"}];function jn(){const t=E`
    <div class="block" style="--tint:var(--ramp)">
      <h3>שכבות מפה</h3>
      ${On.map(l=>`
        <div class="toggle${p.layers[l.key]?" on":""}" data-layer="${l.key}" style="--tint:${l.tint}">
          <span class="sw"></span>
          ${l.swatch==="multi"?'<span class="tc tc-multi"></span>':l.swatch?`<span class="tc" style="${l.swatch}"></span>`:""}
          <span class="tl">${l.label}</span>
        </div>
        ${l.key==="dest"?'<div class="dest-cats" hidden></div>':""}
        ${l.key==="stops"?`
          <div id="stopsFilter" hidden>
            <div class="filter-row">
              <span class="filter-label">סינון: נסיעות מעבר עד</span>
              <input type="range" id="transferPctSlider" min="0" max="100" step="5" value="100">
              <span id="transferPctVal">100%</span>
            </div>
          </div>
          <div id="stopsLegend" class="legend" hidden></div>`:""}`).join("")}
    </div>`,e=g(t,".dest-cats"),n=g(t,"#stopsLegend"),s=g(t,"#stopsFilter"),a=g(t,"#transferPctSlider"),o=g(t,"#transferPctVal");a.addEventListener("input",()=>{o.textContent=`${a.value}%`,S({transferPctMax:+a.value})}),t.querySelectorAll(".toggle").forEach(l=>{l.addEventListener("click",()=>{const d=l.dataset.layer;p.layers[d]=!p.layers[d],l.classList.toggle("on",p.layers[d]),qt(["layers"])})});function r(){if(!c.destinations)return;const l=d=>c.destinations.categories.filter(h=>se(h.id)===d.id).map(h=>`
        <label class="dest-cat" title="${_(h.name)}">
          <input type="checkbox" data-cat="${h.id}" ${!p.destCats||p.destCats.has(h.id)?"checked":""}>
          <span class="dest-dot" style="background:${ae(h.id)}"></span>
          <span class="dest-name">${_(h.name)}</span>
          <span class="dest-count">${$(h.count)}</span>
        </label>`).join("");e.innerHTML=q.map(d=>{const h=l(d);return h?`<div class="dest-group">
                <span class="dest-dot" style="background:${Xt(d.id)}"></span>${d.name}
              </div>${h}`:""}).join(""),e.querySelectorAll("input[data-cat]").forEach(d=>{d.addEventListener("change",()=>{S({destCats:new Set([...e.querySelectorAll("input[data-cat]:checked")].map(h=>+h.dataset.cat))})})})}function i(){if(!c.stops)return;const l=at(),d=k.visible.filter(u=>u.boardings_day!=null).length,h=l.map((u,v)=>{const w=v===0?0:k.breaks[v-1],f=v<k.breaks.length?k.breaks[v]:null,m=f==null?`${$(w)}+`:`${$(w)}–${$(f)}`;return`<div class="lg"><span style="background:${u}"></span> ${m}</div>`}).join("");n.innerHTML=`
      <div class="stops-legend-title">עליות ליום · ${$(d)} תחנות עם נתוני סקר</div>
      ${h}
      <div class="lg"><span class="lg-hollow"></span> ללא נתוני סקר</div>
      <div class="stops-legend-note">גודל העיגול ביחס למספר העליות</div>`}function y(){e.hidden=!p.layers.dest,n.hidden=!p.layers.stops,s.hidden=!p.layers.stops}return y(),{el:t,renderCategories:r,renderStopsLegend:i,syncPanels:y}}const Rn=["גודש קשה","גודש","איטי","זורם","מהיר / נתיב מהיר"];function In(){const t=Rn.map((s,a)=>{const o=a===0?0:A[a-1],r=a<A.length?A[a]:null,i=r==null?`${o}+`:`${o}–${r}`;return`<span style="background:var(--sp${a+1})" title="${i} קמ״ש · ${s}"></span>`}).join(""),e=["0",...A.map(String),"+"].map(s=>`<i>${s}</i>`).join("");return{el:E`
    <div class="block" style="--tint:var(--ramp)">
      <h3>מקרא מהירות</h3>
      <div class="ramp-bar">${t}</div>
      <div class="ramp-ticks">${e}</div>
      <div class="ramp-note">
        קמ״ש · קו עבה = איטי יותר. סף הגודש בדוח הוא <b>${Yt} קמ״ש</b>.
      </div>
    </div>`}}const Ht="תל אביב יפו",An=/^\d+[#֐-׿]?$/,Fn=[{id:"urban",label:"עירוני"},{id:"intercity",label:"בין-עירוני"}];function Bn(t){const e=t?t.indexOf("<->"):-1;if(e<0)return null;const n=t.slice(0,e);let s=t.slice(e+3);const a=s.lastIndexOf("-");a>0&&An.test(s.slice(a+1).trim())&&(s=s.slice(0,a));const o=n.slice(n.lastIndexOf("-")+1).trim(),r=s.slice(s.lastIndexOf("-")+1).trim();return o&&r?[o,r]:null}function Dn(t){const e=Bn(t==null?void 0:t.route_long_name);return e&&e[0]===Ht&&e[1]===Ht?"urban":"intercity"}function Gt(t){const e=String(t??""),n=e.match(/^(\d+)(.*)$/);return n?[0,Number(n[1]),n[2]]:[1,0,e]}function zn(t,e){const n=Gt(t.route_short_name),s=Gt(e.route_short_name);return n[0]-s[0]||n[1]-s[1]||n[2].localeCompare(s[2],"he")}function Nn(t){return Fn.map(e=>({...e,routes:t.filter(n=>Dn(n)===e.id).sort(zn)})).filter(e=>e.routes.length>0)}function Hn({onAreaChange:t}={}){const e=E`
    <div class="block" style="--tint:var(--c-place)">
      <h3>אזור ניתוח</h3>

      <div class="neigh-select-wrap">
        <select class="neigh-select" aria-label="בחירת שכונה">
          <option value="">כל העיר — ללא סינון</option>
        </select>
      </div>

      <div class="neigh-routes" hidden>
        <div class="neigh-header"></div>
        <div class="neigh-stats" hidden></div>

        <h3 style="--tint:var(--c-net)">קווי אוטובוס באזור</h3>

        <div class="neigh-actions">
          <button class="btn ghost" data-all>בחר הכל</button>
          <button class="btn ghost" data-clear>נקה</button>
        </div>

        <div class="neigh-loading" hidden><span class="neigh-spinner"></span> טוען קווים…</div>
        <div class="neigh-route-count"></div>
        <div class="lines-scroll" style="max-height:280px"></div>
      </div>
    </div>`,n=g(e,".neigh-select"),s=g(e,".neigh-routes"),a=g(e,".neigh-header"),o=g(e,".neigh-stats"),r=g(e,".neigh-loading"),i=g(e,".neigh-route-count"),y=g(e,".lines-scroll");let l=[];function d(f){const m=f==null?void 0:f.population;if(!(m!=null&&m.total)){o.hidden=!0,o.replaceChildren();return}const x=m.by_age||{},z=(...ct)=>ct.reduce((_e,ke)=>_e+(x[ke]||0),0),Mt=ct=>m.total?Math.round(ct/m.total*100):0;o.innerHTML=`
      <div class="neigh-stat-row">
        <div class="neigh-stat">
          <span class="neigh-stat-val">${$(m.total)}</span>
          <span class="neigh-stat-lbl">תושבים</span>
        </div>
        <div class="neigh-stat">
          <span class="neigh-stat-val">${Mt(z("g0to9","g10to19"))}%</span>
          <span class="neigh-stat-lbl">בני 0–19</span>
        </div>
        <div class="neigh-stat">
          <span class="neigh-stat-val">${Mt(z("g60to69","g70to79","g80up"))}%</span>
          <span class="neigh-stat-lbl">בני 60+</span>
        </div>
      </div>
      <div class="neigh-stat-src">מקור: אזורים סטטיסטיים למ״ס 2022, עיריית תל אביב-יפו</div>`,o.hidden=!1}function h(f){const m=ln(f.route_id),x=Pt(f.route_id),z=E`
      <li class="${m?"neigh-active":""}">
        <span class="num" style="background:${m?x:`color-mix(in srgb, ${x} 20%, transparent)`};color:${m?"#fff":x}">${_(f.route_short_name||"?")}</span>
        <span class="desc" title="${_(f.route_long_name||"")}">${_(f.route_long_name||"ללא תיאור")}</span>
        <span class="ag">${_(ie(f.agency_id))}</span>
        ${m?`<span class="neigh-color-dot" style="background:${x}"></span>`:""}
      </li>`;return z.addEventListener("click",()=>{cn(f),u()}),z}function u(){y.replaceChildren();for(const f of Nn(l)){y.append(E`
        <div class="lines-group">
          <span>${f.label}</span>
          <span class="lines-group-n">${$(f.routes.length)}</span>
        </div>`);const m=E`<ul class="lines"></ul>`;m.append(...f.routes.map(h)),y.append(m)}}g(e,"[data-all]").addEventListener("click",()=>{l.forEach(f=>le(f)),u()}),g(e,"[data-clear]").addEventListener("click",()=>{pt(),u()}),n.addEventListener("change",async()=>{pt(),l=[],u();const f=c.neighbourhoods.find(m=>m.id===n.value)||null;if(!f){s.hidden=!0,S({area:null,areaName:null,areaRecord:null}),t==null||t(null);return}s.hidden=!1,r.hidden=!1,i.textContent="",S({area:{bbox:f.bbox,boundary:f.boundary},areaName:f.name,areaRecord:f}),t==null||t(f),d(f);try{const m=await Ae();l=(f.route_ids||[]).map(x=>m[x]).filter(Boolean)}catch(m){console.error("[AreaPanel] failed to load the route index:",m),r.hidden=!0,a.textContent=`שגיאה: ${m.message}`;return}r.hidden=!0,a.innerHTML=`<b>${_(f.name)}</b> · ${$(l.length)} קווים פעילים ב-GTFS`,i.textContent=l.length?`${$(l.length)} קווים · לחץ לבחירה (ניתן לבחור מספר)`:"לא נמצאו קווים באזור זה",u()});async function v(){try{const f=await je();n.append(...f.map(m=>new Option(m.name,m.id)))}catch(f){console.error("[AreaPanel] failed to load neighbourhoods.json:",f)}}function w(){pt(),u()}return{el:e,load:v,renderRoutes:u,clearRoutes:w}}function Gn({dropTarget:t}={}){const e=E`
    <div class="block" style="--tint:var(--c-net)">
      <h3>ייבוא שכבות</h3>
      <label class="btn ghost import-btn">
        + GeoJSON · KML · SHP(zip)
        <input type="file" accept=".geojson,.json,.kml,.zip" multiple hidden>
      </label>
      <ul class="imported-list"></ul>
    </div>`,n=g(e,"input[type=file]"),s=g(e,".imported-list");n.addEventListener("change",()=>{[...n.files].forEach(Dt),n.value=""});function a(){s.replaceChildren(),B.forEach((o,r)=>{const i=E`
        <li class="imported-item${o.visible?" on":""}">
          <span class="sw" role="button" tabindex="0" title="הצג / הסתר"></span>
          <span class="imported-name" title="${_(o.name)}">${_(o.name)}</span>
          <button class="imported-remove" title="הסר שכבה">✕</button>
        </li>`;g(i,".sw").addEventListener("click",()=>bn(r)),g(i,".imported-remove").addEventListener("click",()=>yn(r)),s.appendChild(i)})}if(gn(a),t){let o=0;t.addEventListener("dragenter",r=>{r.preventDefault(),++o===1&&t.classList.add("drop-active")}),t.addEventListener("dragover",r=>r.preventDefault()),t.addEventListener("dragleave",()=>{--o<=0&&(o=0,t.classList.remove("drop-active"))}),t.addEventListener("drop",r=>{r.preventDefault(),o=0,t.classList.remove("drop-active"),[...r.dataTransfer.files].filter(i=>hn.test(i.name)).forEach(Dt)})}return{el:e,renderList:a}}const Vn={ADULT:"בוגר",YOUTH:"נוער",ELDERLY:"קשיש",STUDENT:"סטודנט",DISABLED:"נכה",OTHER:"אחר"};function M(t,e,n){return`<div class="stop-tile">
            <div class="stop-tile-val"${n?` style="color:${n}"`:""}>${t}</div>
            <div class="stop-tile-lbl">${e}</div>
          </div>`}function Kn(t){const e=t.reduce((n,s)=>n+s,0);return e>0?t.map(n=>n/e*100):t.map(()=>0)}function Vt(t,e,n){const s=Math.max(...e),a=e.indexOf(s),o=at(),r=e.reduce((l,d)=>l+d,0),i=s>=1e4?l=>(+l).toLocaleString("he-IL",{notation:"compact",maximumFractionDigits:1}):l=>$(l);return`<div class="bands">${e.map((l,d)=>{const h=s>0?Math.max(2,Math.round(l/s*46)):2,u=r>0?l/r*100:0;return`
      <div class="band ${d===a?"peak":""}" title="${t[d]} · ${$(l,1)} ${n} (${u.toFixed(0)}%)">
        <div class="band-val">${i(l)}</div>
        <div class="band-bar" style="height:${h}px;background:${d===a?o[o.length-1]:o[2]}"></div>
        <div class="band-lbl">${t[d]}</div>
      </div>`}).join("")}</div>`}function Kt(t,e){const n=Kn(e);return`<div class="riders">${t.map((a,o)=>({label:Vn[a]||a,pct:n[o],value:e[o]})).sort((a,o)=>o.pct-a.pct).map(a=>`
      <div class="rider" title="${a.label} · ${$(a.value,1)} עליות ביום">
        <span class="rider-lbl">${a.label}</span>
        <span class="rider-track"><span class="rider-fill" style="width:${a.pct.toFixed(1)}%"></span></span>
        <span class="rider-pct">${a.pct.toFixed(0)}%</span>
      </div>`).join("")}</div>`}function qn(){const t=E`<div id="stopPanel" dir="rtl"></div>`;function e(){At(),t.style.display="none"}function n(o){const r=c.stops.bands,i=o.boardings_day!=null,y=i?r[o.boardings_by_band.indexOf(Math.max(...o.boardings_by_band))]:null,l=[o.street,o.house||""].filter(Boolean).join(" ");return`
      <div class="stop-head">
        <button class="stop-close" title="סגירה">✕</button>
        <div class="stop-title">${_(o.name)}</div>
        <div class="stop-sub">מק״ט ${_(o.code)} · ${o.routes.length||o.routes_reported||0} קווים${l?" · "+_(l):""}</div>
      </div>

      <div class="stop-tiles">
        ${M($(o.departures_day),"עצירות מתוזמנות ביום")}
        ${M(i?$(o.boardings_day):"—","עליות ביום","var(--primary)")}
        ${M(o.transfer_pct!=null?o.transfer_pct.toFixed(0)+"%":"—","% נסיעות מעבר")}
        ${M($(o.routes.length||o.routes_reported),"קווים")}
      </div>

      ${o.routes.length?`
        <div class="stop-sec">קווים בתחנה</div>
        <div class="stop-chips">${o.routes.map(d=>`<span class="chip">${_(d)}</span>`).join("")}</div>`:""}

      ${i?`
        <div class="stop-sec">עליות לתחנה לפי שעה</div>
        ${Vt(r,o.boardings_by_band,"עליות")}

        <div class="stop-sec">פילוח נוסעים</div>
        ${Kt(c.stops.rider_types,o.riders)}

        <div class="stop-tiles">
          ${M(o.trips_to_dest!=null?o.trips_to_dest.toFixed(2):"—","נסיעות ממוצע ליעד")}
          ${M(y,"שעת שיא","var(--primary)")}
        </div>`:`
        <div class="stop-empty">התחנה לא נכללה בסקר העליות — מוצגות רק העצירות המתוזמנות והקווים מתוך ה-GTFS.</div>`}

      <div class="stop-foot"><button class="stop-link" data-view="city">↩ סקירת כל התחנות</button></div>
      <div class="stop-src">${_(c.stops.source)}</div>`}function s(){const o=k.visible.filter(d=>d.boardings_day!=null),r=c.stops.bands.map((d,h)=>o.reduce((u,v)=>u+(v.boardings_by_band?v.boardings_by_band[h]:0),0)),i=c.stops.rider_types.map((d,h)=>o.reduce((u,v)=>u+(v.riders?v.riders[h]:0),0)),y=o.reduce((d,h)=>d+h.boardings_day,0),l=[...o].sort((d,h)=>h.boardings_day-d.boardings_day).slice(0,5);return`
      <div class="stop-head">
        <button class="stop-close" title="סגירה">✕</button>
        <div class="stop-title">סקירת תחנות · ${p.area?"בשכונה הנבחרת":"ברחבי העיר"}</div>
        <div class="stop-sub">${$(k.visible.length)} תחנות · ${$(o.length)} עם נתוני סקר</div>
      </div>

      <div class="stop-tiles">
        ${M($(y),"עליות ביום","var(--primary)")}
        ${M($(o.reduce((d,h)=>d+(h.departures_day||0),0)),"עצירות ביום")}
      </div>

      <div class="stop-sec">עליות לפי שעה</div>
      ${Vt(c.stops.bands,r,"עליות")}

      <div class="stop-sec">פילוח נוסעים</div>
      ${Kt(c.stops.rider_types,i)}

      <div class="stop-sec">התחנות העמוסות ביותר</div>
      <div class="stop-top">
        ${l.map(d=>`
          <button class="stop-top-row" data-key="${_(X(d))}">
            <span class="stop-top-name">${_(d.name)}</span>
            <span class="stop-top-val">${$(d.boardings_day)}</span>
          </button>`).join("")}
      </div>
      <div class="stop-src">${_(c.stops.source)}</div>`}function a(){var o;c.stops&&(t.style.display="block",t.scrollTop=0,t.innerHTML=k.selected?n(k.selected):s(),t.querySelector(".stop-close").addEventListener("click",e),(o=t.querySelector(".stop-link"))==null||o.addEventListener("click",()=>{At(),a()}),t.querySelectorAll(".stop-top-row").forEach(r=>{r.addEventListener("click",()=>{const i=k.visible.find(y=>X(y)===r.dataset.key);i&&(re(i),b.setView([i.lat,i.lon],Math.max(b.getZoom(),16)))})}))}return{el:t,render:a,close:e,refresh(){t.style.display==="block"&&a()}}}function Un(){const t=E`
    <div class="timebadge">
      <div class="now">—</div>
      <div class="lbl">בחר יום ושעה מהתפריט</div>
    </div>`,e=g(t,".now"),n=g(t,".lbl");return{el:t,update({day:s,period:a}){const o=s==="avg"?"ממוצע":U[s],r=a==="all"?"כל היום":H[a];e.textContent=`${o} · ${r}`,n.textContent=`${Qe(s)} · ${ne(a)}`}}}const ye=document.getElementById("app"),rt=E`
  <div class="shell" style="display:contents">
    <aside></aside>
    <div id="mapwrap"><div id="map"></div></div>
  </div>`;ye.appendChild(rt);const Jn=g(rt,"aside"),me=g(rt,"#mapwrap"),ve=g(rt,"#map");Te(ve);const Yn=Sn(),O=Pn(),$e=Un(),D=qn(),it=Hn({onAreaChange:Xn}),lt=Cn({onReset:Qn}),j=jn(),Zn=In(),Wn=Gn({dropTarget:me});ye.prepend(Yn.el);me.prepend(O.el);ve.append($e.el,D.el);Jn.append(it.el,lt.el,j.el,Zn.el,Wn.el);kt.addTo(b);tt.addTo(b);et.addTo(b);Y.addTo(b);pn(b);b.on("zoomend",()=>kn());en(()=>D.render());function nt(){O.setSpeedStats(Ze(),p.period),$e.update(p)}function Le(){We(p.layers),tn(p.layers.dest),on(p.layers.stops),zt(p.layers.roads),j.syncPanels(),p.layers.roads&&!c.roads&&Fe().then(t=>{pe(t),zt(p.layers.roads)}).catch(t=>console.error("[Roads] failed to load:",t)),p.layers.dest&&Re().then(()=>{j.renderCategories(),W()}).catch(t=>console.error("[Destinations] failed to load:",t)),p.layers.stops?Ie().then(()=>{Q(),j.renderStopsLegend()}).catch(t=>console.error("[Stops] failed to load:",t)):D.close()}we((t,e)=>{(e.has("day")||e.has("period"))&&(lt.sync(),nt()),e.has("layers")&&Le(),e.has("destCats")&&c.destinations&&W(),e.has("transferPctMax")&&c.stops&&t.layers.stops&&(Q(),j.renderStopsLegend(),D.refresh()),e.has("area")&&(ee(),O.setScope(t.areaName),nt(),c.destinations&&t.layers.dest&&W(),c.stops&&(Q(),j.renderStopsLegend(),D.refresh()),O.setRidership(t.areaRecord,c.stopTotals))});function Xn(t){if(!t){be();return}const e=ge(t);e&&b.fitBounds(e,{padding:[30,30]})}function Qn(){it.clearRoutes(),b.setView(c.center||Et,15)}xe(()=>{Me(),te(),nt(),lt.buildSpark(),he(c.border),p.areaRecord&&ge(p.areaRecord),dn(),it.renderRoutes(),mn(),c.roads&&pe(c.roads),c.destinations&&(j.renderCategories(),W()),c.stops&&(Q(),j.renderStopsLegend(),D.refresh())});async function ts(){O.setLoading(),it.load();const{segmentsFailed:t}=await Oe();he(c.border),c.center&&b.setView(c.center,13),te(),lt.buildSpark(),nt(),O.setRidership(null,c.stopTotals),Le(),t&&O.setSegmentError("שגיאת נתונים")}ts().catch(t=>{console.error("Dashboard failed to start",t),O.setSegmentError("שגיאת רשת")});
