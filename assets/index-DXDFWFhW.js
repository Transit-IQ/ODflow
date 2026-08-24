(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))s(o);new MutationObserver(o=>{for(const a of o)if(a.type==="childList")for(const r of a.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&s(r)}).observe(document,{childList:!0,subtree:!0});function n(o){const a={};return o.integrity&&(a.integrity=o.integrity),o.referrerPolicy&&(a.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?a.credentials="include":o.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function s(o){if(o.ep)return;o.ep=!0;const a=n(o);fetch(o.href,a)}})();function M(e,...t){const n=e.reduce((o,a,r)=>o+a+(t[r]??""),""),s=document.createElement("template");return s.innerHTML=n.trim(),s.content.firstElementChild}function y(e,t){return e.querySelector(t)}const u={day:"avg",period:"all",layers:{speed:!0,cong:!1,dest:!1,stops:!1,roads:!1},destCats:null,area:null,areaName:null,areaRecords:[],transferPctMax:100},Te=new Set;function A(e){Object.assign(u,e),vt(Object.keys(e))}function vt(e){const t=new Set(e);for(const n of Te)n(u,t)}function Wt(e){return Te.add(e),()=>Te.delete(e)}const Xt="theme",je=new Set;function Ke(){return document.documentElement.dataset.theme==="light"?"light":"dark"}function W(){return Ke()==="light"}function Qt(){const e=W()?"dark":"light";document.documentElement.dataset.theme=e;try{localStorage.setItem(Xt,e)}catch{}for(const t of je)t(e)}function en(e){return je.add(e),()=>je.delete(e)}const ue={dark:{base:"https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",labels:"https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"},light:{base:"https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png",labels:"https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"}},tn={neighHighlightPane:350,roadPane:390,routeCasingPane:405,routeLinePane:410,arrowPane:418,pointPane:420},Ue=[32.08,34.78];let E=null,$t=null,Oe=null;function nn(e){E=L.map(e,{zoomControl:!1,attributionControl:!1,preferCanvas:!0}).setView(Ue,15),L.control.zoom({position:"topright"}).addTo(E);const t=Ke();$t=L.tileLayer(ue[t].base,{maxZoom:19,subdomains:"abcd",className:"basemap"}).addTo(E),Oe=L.tileLayer(ue[t].labels,{maxZoom:19,subdomains:"abcd",opacity:_t()}).addTo(E);for(const[n,s]of Object.entries(tn))E.createPane(n).style.zIndex=String(s);return E}function _t(){return W()?.8:.7}function sn(){const e=Ke();$t.setUrl(ue[e].base),Oe.setUrl(ue[e].labels),Oe.setOpacity(_t())}function pe(e,t){t?E.hasLayer(e)||E.addLayer(e):E.hasLayer(e)&&E.removeLayer(e)}const B=[],on={"04-06":"לפנות בוקר","06-09":"שעת שיא בוקר","09-12":"לפני הצהריים","12-15":"צהריים","15-19":"שעת שיא אחר הצהריים","19-24":"ערב","00-04":"לילה"};function an(e){B.length=0,Array.isArray(e)&&B.push(...e)}function rn(){return B.length}function fe(e){const t=B[e];return t?on[t.label]||he(e):""}function he(e){const t=B[e];if(!t)return"";const n=s=>String(s%24).padStart(2,"0");return`${n(t.from)}–${n(t.to)}`}function Je(e){var t;return((t=B[e])==null?void 0:t.speed_indices)||[]}function ln(){return B.flatMap(e=>e.speed_indices||[])}function Lt(e){return Je(e).length>0}function cn(e){var t;return((t=B[e])==null?void 0:t.band_index)??null}const dn=e=>`/ODflow/data/${e}`,c={center:Ue,border:null,segments:[],speedProfile:null,stopTotals:null,destinations:null,stops:null,neighbourhoods:[],routesById:null};async function q(e){const t=await fetch(dn(e));if(!t.ok)throw new Error(`${e}: HTTP ${t.status}`);return t.json()}async function un(){var s,o,a;const[e,t,n]=await Promise.allSettled([q("border.json"),q("speeds.json"),q("kpis.json")]);if(e.status==="fulfilled"){c.border=e.value;const r=(a=(o=(s=e.value)==null?void 0:s.geometry)==null?void 0:o.coordinates)==null?void 0:a[0];if(r!=null&&r.length){const l=r.map(d=>d[1]),m=r.map(d=>d[0]);c.center=[(Math.min(...l)+Math.max(...l))/2,(Math.min(...m)+Math.max(...m))/2]}}return t.status==="fulfilled"&&(c.segments=t.value),n.status==="fulfilled"&&(c.speedProfile=n.value.speed_profile||null,an(n.value.periods),c.stopTotals=n.value.stops||null),{segmentsFailed:t.status==="rejected"}}async function pn(){return c.neighbourhoods.length||(c.neighbourhoods=await q("neighbourhoods.json")),c.neighbourhoods}const ie=new Map;function Ye(e,t){return ie.has(e)||ie.set(e,t().catch(n=>{throw ie.delete(e),n})),ie.get(e)}function fn(){return Ye("destinations",async()=>(c.destinations=await q("destinations.json"),c.destinations))}function Ze(){return Ye("stops",async()=>(c.stops=await q("stops.json"),c.stops))}function St(){return Ye("routes",async()=>(c.routesById=await q("neighbourhood_routes.json"),c.routesById))}function st(e,t,n){let s=!1;for(let o=0,a=n.length-1;o<n.length;a=o++){const r=n[o][0],l=n[o][1],m=n[a][0],d=n[a][1];l>e!=d>e&&t<(m-r)*(e-l)/(d-l)+r&&(s=!s)}return s}function ot(e,t,n){if(!st(e,t,n[0]))return!1;for(let s=1;s<n.length;s++)if(st(e,t,n[s]))return!1;return!0}function hn(e,t,n){return n?n.type==="Polygon"?ot(e,t,n.coordinates):n.type==="MultiPolygon"?n.coordinates.some(s=>ot(e,t,s)):!1:!1}function We(e,t,n){const s=n.bbox;return e<s.min_lat||e>s.max_lat||t<s.min_lon||t>s.max_lon?!1:n.boundary?hn(e,t,n.boundary):!0}function gn(e,t){for(const n of e.getLatLngs())if(We(n.lat,n.lng,t))return!0;return!1}function mn(e){return[[[e.min_lon,e.min_lat],[e.max_lon,e.min_lat],[e.max_lon,e.max_lat],[e.min_lon,e.max_lat],[e.min_lon,e.min_lat]]]}function bn(e){if(!(e!=null&&e.length))return null;const t=[];let n=null;for(const s of e){const o=s.analysis_bbox||s.bbox;n=n?{min_lat:Math.min(n.min_lat,o.min_lat),max_lat:Math.max(n.max_lat,o.max_lat),min_lon:Math.min(n.min_lon,o.min_lon),max_lon:Math.max(n.max_lon,o.max_lon)}:{...o};const a=s.analysis_boundary||s.boundary;(a==null?void 0:a.type)==="Polygon"?t.push(a.coordinates):(a==null?void 0:a.type)==="MultiPolygon"?t.push(...a.coordinates):t.push(mn(o))}return{bbox:n,boundary:{type:"MultiPolygon",coordinates:t}}}const Y=[8,15,22,30],yn=[5,4,3.25,2.75,2.5],xt=15,at={dark:{bands:["#e11d48","#f97316","#facc15","#34d399","#60a5fa"],empty:"#3d4a63",cong:"#fb7185",focus:"#2dd4bf",imported:"#38bdf8",casing:"#0b1220",hairline:"#0b0b0b",selected:"#ffffff"},light:{bands:["#e11d48","#9a3412","#ca8a04","#15803d","#1d4ed8"],empty:"#cbd5e1",cong:"#be123c",focus:"#0f766e",imported:"#1d4ed8",casing:"#ffffff",hairline:"#ffffff",selected:"#0f1f3e"}};function R(){return W()?at.light:at.dark}function kt(e){if(e==null||e<=0)return-1;let t=0;for(;t<Y.length&&e>=Y[t];)t++;return t}function wt(e){const t=R(),n=kt(e);return n<0?t.empty:t.bands[n]}function vn(e){const t=kt(e);return t<0?2:yn[t]}const Ae={dark:["#3987e5","#d95926","#199e70","#c98500","#d55181","#008300","#9085e9","#e66767"],light:["#2a78d6","#eb6834","#1baf7a","#eda100","#e87ba4","#008300","#4a3aa7","#e34948"]},$n=Ae.dark.length;function _n(e){const t=W()?Ae.light:Ae.dark;return t[e%t.length]}const ce=[{id:"edu",name:"חינוך",test:/ספר|גנ[יי]? ילדים|חינוך|לימוד/},{id:"health",name:"בריאות",test:/רפוא|מרפא|מרקחת|קופ[הות]|טיפ[הת] חלב|בריאות/},{id:"sport",name:"ספורט ופנאי",test:/ספורט|בריכ|אצטדיון|כושר|מגרש|חוף/},{id:"comm",name:"קהילה ותרבות",test:/קהיל|תרבות|מתנ״?ס/},{id:"relig",name:"דת",test:/כנסת|דת|מסגד|כנסי/},{id:"other",name:"אחר",test:/.^/}],rt={dark:{edu:"#3987e5",health:"#d95926",sport:"#199e70",comm:"#c98500",relig:"#d55181",other:"#9085e9"},light:{edu:"#2a78d6",health:"#eb6834",sport:"#1baf7a",comm:"#eda100",relig:"#e87ba4",other:"#4a3aa7"}};function Ln(e){return(ce.find(n=>n.test.test(e||""))||ce[ce.length-1]).id}function Et(e){return(W()?rt.light:rt.dark)[e]}const it={dark:["#115e59","#0f766e","#0d9488","#14b8a6","#5eead4"],light:["#14b8a6","#0d9488","#0f766e","#115e59","#0b3d39"]};function _e(){return W()?it.light:it.dark}const ge=L.layerGroup(),Be=L.layerGroup(),me=[];let ee=null;const Sn=7;function Pt(e){const t=u.day==="avg"?[0,1,2,3,4]:[u.day],n=u.period==="all"?ln():Je(u.period);let s=0,o=0;for(const a of t)for(const r of n){const l=e[a*Sn+r];l&&l>0&&(s+=l,o++)}return o?s/o:null}function Ct(){ge.clearLayers(),me.length=0;const e=R();for(const t of c.segments){const n=L.polyline(t.coordinates,{color:e.empty,weight:3,opacity:.9});n._speeds=t.speeds,n.on("mouseover",function(){this.setStyle({weight:(this._w||3)+3})}),n.on("mouseout",function(){this.setStyle({weight:this._w||3})}),n.on("click",function(){const s=Pt(this._speeds),o=this.getLatLngs()[Math.floor(this.getLatLngs().length/2)];L.popup().setLatLng(o).setContent(`<div class="pp">מהירות אוטובוס במקטע<br><b>${s?s.toFixed(1):"—"} קמ״ש</b></div>`).openOn(E)}),me.push(n),ge.addLayer(n)}Mt()}function Mt(){ee=u.area?new Set(me.filter(e=>gn(e,u.area))):null}function xn(){Be.clearLayers();const e=R();let t=0,n=0,s=0;for(const o of me){const a=Pt(o._speeds),r=vn(a);o._w=r,o.setStyle({color:wt(a),opacity:a==null?.5:.9,weight:r}),a!=null&&(ee&&!ee.has(o)||(t+=a,n++,a<xt&&(s++,Be.addLayer(L.polyline(o.getLatLngs(),{color:e.cong,weight:8,opacity:.35})))))}return{avgSpeed:n?t/n:null,congestedPct:n?Math.round(s/n*100):null,segmentCount:ee?ee.size:c.segments.length}}function kn({speed:e,cong:t}){pe(ge,e),pe(Be,t)}const wn=["ראשון","שני","שלישי","רביעי","חמישי"],de=["א׳","ב׳","ג׳","ד׳","ה׳"];function v(e,t=0){return e==null?"—":(+e).toLocaleString("he-IL",{minimumFractionDigits:t,maximumFractionDigits:t})}function En(e){return e==="avg"?"ממוצע ימי חול (א׳–ה׳)":"יום "+wn[e]}function ne(e){return e==="all"||!rn()?"כל שעות היום":`${fe(e)} ${he(e)}`}function x(e){return String(e).replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}const Ie=L.layerGroup();function Tt(e){var n;const t=(n=c.destinations)==null?void 0:n.categories[e];return Ln(t==null?void 0:t.name)}function jt(e){return Et(Tt(e))}function be(){var n;if(!c.destinations)return;Ie.clearLayers();const e=c.destinations.categories,t=R().hairline;for(const[s,o,a,r,l]of c.destinations.points){if(u.destCats&&!u.destCats.has(s)||u.area&&!We(o,a,u.area))continue;const m=x(r||"(ללא שם)"),d=x(((n=e[s])==null?void 0:n.name)||""),i=l?" · "+x(l):"";L.circleMarker([o,a],{pane:"pointPane",radius:3,color:t,weight:.75,fillColor:jt(s),fillOpacity:.9}).bindPopup(`<div dir="rtl" style="text-align:right"><b>${m}</b><br><span style="opacity:.75">${d}${i}</span></div>`).addTo(Ie)}}function Pn(e){pe(Ie,e)}function Cn(e,t){if(e.boardings_day==null)return null;if(t==="all"||t==null)return e.boardings_day;const n=cn(t);if(n==null)return null;const s=e.boardings_by_band;if(!s)return null;const o=s.reduce((a,r)=>a+(r||0),0);return o?(s[n]||0)/o*e.boardings_day:null}let lt=null,Fe=null;function Mn(){var t;const e=(t=c.stops)==null?void 0:t.stations;if(!e)return!1;if(lt===e)return!0;Fe=new Map;for(const n of e){const s=String(n.code??"").trim();s&&Fe.set(s,n)}return lt=e,!0}function Tn(e,t){return{code:String(e.code??e.id??"").trim(),name:e.name||"",lat:e.lat,lon:e.lon,street:"",house:0,routes:[...t],routes_reported:t.size,terminal:!1,boardings_day:null,departures_day:null,boardings_by_band:null,departures_by_band:null,riders:null,transfer_pct:null,trips_to_dest:null,neighbourhoods:[],fromRoute:!0}}function jn(e){if(!(e!=null&&e.length)||!Mn())return[];const t=new Map,n=new Map;for(const s of e){const o=String(s.route_short_name??"").trim();for(const a of s.stops||[]){const r=String(a.code??"").trim(),l=r?Fe.get(r):null;if(l){t.set(l,l);continue}const m=String(a.id??`${a.lat},${a.lon}`);if(n.has(m))n.get(m)._lines.add(o);else{const d=new Set([o]),i=Tn(a,d);i._lines=d,n.set(m,i)}}}for(const s of n.values())s.routes=[...s._lines].filter(Boolean),s.routes_reported=s.routes.length,delete s._lines;return[...t.values(),...n.values()]}const On={5:"דן",3:"אגד",16:"מטרופולין",18:"קווים",14:"נסיעות",42:"גלים",91:"רכבת",7:'דן בי"ש',15:"קווים"};function Ot(e){return On[String(e)]||`סוכנות ${e}`}const K=L.layerGroup(),I=new Map,we=new Map;let ct=0;const Re=new Set;function An(e){return Re.add(e),()=>Re.delete(e)}let Ee=!1;function Xe(){Ee||(Ee=!0,queueMicrotask(()=>{Ee=!1;for(const e of Re)e()}))}function Le(){return[...I.values()].map(e=>e.route)}function Se(e){return we.has(e)||(we.set(e,ct%$n),ct++),_n(we.get(e))}function ze(e){return I.has(e)}function Qe(e){var o;if(I.has(e.route_id)||!((o=e.coordinates)!=null&&o.length))return;const t=Se(e.route_id),n=L.polyline(e.coordinates,{pane:"routeCasingPane",color:R().casing,weight:8,opacity:.85,smoothFactor:1.2}),s=L.polyline(e.coordinates,{pane:"routeLinePane",color:t,weight:4.5,opacity:1,smoothFactor:1.2});s.bindTooltip(`קו ${e.route_short_name} · ${Ot(e.agency_id)}<br><small>${e.route_long_name||""}</small>`,{sticky:!0,direction:"top"}),n.addTo(K),s.addTo(K),I.set(e.route_id,{route:e,stroke:s,casing:n}),Xe()}function At(e){const t=I.get(e);t&&(K.removeLayer(t.stroke),K.removeLayer(t.casing),I.delete(e),Xe())}function Bn(e){I.has(e.route_id)?At(e.route_id):Qe(e)}function Pe(){if(I.size){for(const e of I.values())K.removeLayer(e.stroke),K.removeLayer(e.casing);I.clear(),Xe()}}function In(){const e=R().casing;for(const[t,n]of I)n.stroke.setStyle({color:Se(t)}),n.casing.setStyle({color:e})}function Fn(e){K.addTo(e||E)}const De=L.layerGroup(),Ne=new Map;let Bt=()=>{};const w={visible:[],inArea:[],breaks:[],selected:null};function G(e){return Cn(e,u.period)}function It(){return u.period==="all"?"עליות ליום":`עליות · ${ne(u.period)}`}function ye(e){return`${e.code}@${e.lat},${e.lon}`}function Rn(e){Bt=e}function zn(e){const t=e.map(G).filter(s=>s!=null).sort((s,o)=>s-o);if(!t.length)return[];const n=_e();return Array.from({length:n.length-1},(s,o)=>t[Math.floor(t.length*(o+1)/n.length)])}function Dn(e){if(e==null)return null;const t=_e();let n=0;for(;n<w.breaks.length&&e>w.breaks[n];)n++;return t[n]}function Nn(e,t){return e==null||!t?3:3.5+9*Math.sqrt(e/t)}function N(){if(!c.stops)return;De.clearLayers(),Ne.clear(),w.inArea=c.stops.stations.filter(a=>!u.area||We(a.lat,a.lon,u.area));const e=u.layers.stops?u.transferPctMax<100?w.inArea.filter(a=>a.transfer_pct==null||a.transfer_pct<=u.transferPctMax):w.inArea:[],t=new Set(e);w.visible=e.concat(jn(Le()).filter(a=>!t.has(a))),w.breaks=zn(w.visible);const n=w.visible.reduce((a,r)=>Math.max(a,G(r)||0),0),s=R(),o=s.empty;for(const a of w.visible){const r=G(a),l=Dn(r),m=L.circleMarker([a.lat,a.lon],{pane:"pointPane",radius:1.2*Nn(r,n),color:l?s.hairline:o,weight:l?1:1.5,fillColor:l||"transparent",fillOpacity:l?.9:0});m._stroke=l?s.hairline:o,m._weight=l?1:1.5,m.bindTooltip(`<div dir="rtl" style="text-align:right"><b>${x(a.name)}</b><br>`+(r==null?"ללא נתוני סקר":u.period!=="all"?`${v(r)} עליות · ${x(ne(u.period))}<br><span style="opacity:.7">${v(a.boardings_day)} עליות ביום</span>`:`${v(r)} עליות ביום`)+"</div>",{direction:"top",opacity:.95}),m.on("click",()=>Ft(a)),m.addTo(De),Ne.set(ye(a),m)}w.selected&&et()}function et(){const e=R().selected;for(const[t,n]of Ne){const s=w.selected&&t===ye(w.selected);n.setStyle({color:s?e:n._stroke,weight:s?2.5:n._weight}),s&&n.bringToFront()}}function Ft(e){w.selected=e,et(),Bt(e)}function dt(){w.selected=null,et()}function He(){pe(De,u.layers.stops||Le().length>0)}const Hn={togeojson:"https://unpkg.com/@mapbox/togeojson@0.16.0/togeojson.js",shp:"https://unpkg.com/shpjs@6.2.0/dist/shp.js",jszip:"https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"},le=new Map;function Gn(e){return le.has(e)||le.set(e,new Promise((t,n)=>{const s=document.createElement("script");s.src=e,s.onload=t,s.onerror=()=>{le.delete(e),n(new Error(`failed to load ${e}`))},document.head.appendChild(s)})),le.get(e)}function ut(...e){return Promise.all(e.map(t=>Gn(Hn[t])))}const Vn=/\.(geojson|json|kml|zip)$/i,Z=[];let xe=()=>{};function qn(e){xe=e}function Rt(e){return{color:e,weight:2,opacity:.9,fillOpacity:.15}}function Ce(e,t){const n=R().imported,s=L.geoJSON(e,{style:Rt(n),pointToLayer:(o,a)=>L.circleMarker(a,{radius:6,color:n,weight:2,fillColor:n,fillOpacity:.8}),onEachFeature:(o,a)=>{if(!o.properties)return;const r=Object.entries(o.properties).filter(([,l])=>l!=null).map(([l,m])=>`<tr><td style="color:var(--ink3);padding-left:8px">${x(l)}</td><td>${x(m)}</td></tr>`).join("");r&&a.bindPopup(`<table style="font-size:12px;direction:ltr;border-collapse:collapse">${r}</table>`)}}).addTo(E);try{E.fitBounds(s.getBounds(),{padding:[30,30]})}catch{}Z.push({layer:s,name:t,visible:!0}),xe()}const Me=(e,t)=>new Promise((n,s)=>{const o=new FileReader;o.onload=a=>n(a.target.result),o.onerror=()=>s(o.error),o[t](e)});async function pt(e){const t=e.name.replace(/\.[^.]+$/,""),n=e.name.split(".").pop().toLowerCase();try{if(n==="kml"){const[s]=await Promise.all([Me(e,"readAsText"),ut("togeojson")]);Ce(toGeoJSON.kml(new DOMParser().parseFromString(s,"text/xml")),t)}else if(n==="zip"){const[s]=await Promise.all([Me(e,"readAsArrayBuffer"),ut("jszip","shp")]),o=await JSZip.loadAsync(s),a=Object.values(o.files).filter(g=>!g.dir),r=a.find(g=>/\.shp$/i.test(g.name)),l=a.find(g=>/\.dbf$/i.test(g.name)),m=a.find(g=>/\.prj$/i.test(g.name));if(!r||!l){alert("קובץ ZIP לא מכיל קבצי Shapefile (.shp + .dbf)");return}const[d,i,h]=await Promise.all([r.async("arraybuffer"),l.async("arraybuffer"),m?m.async("string"):Promise.resolve(null)]);Ce(shp.combine([shp.parseShp(d,h),shp.parseDbf(i)]),t)}else n==="geojson"||n==="json"?Ce(JSON.parse(await Me(e,"readAsText")),t):alert(`סוג קובץ לא נתמך: .${n}
ניתן לייבא GeoJSON, KML או Shapefile בקובץ ZIP.`)}catch(s){console.error("[Import] failed:",s),alert(`שגיאה בייבוא ${e.name}: ${s.message}`)}}function Kn(e){const t=Z[e];t&&(t.visible=!t.visible,t.visible?E.addLayer(t.layer):E.removeLayer(t.layer),xe())}function Un(e){const t=Z[e];t&&(E.removeLayer(t.layer),Z.splice(e,1),xe())}function Jn(){const e=R().imported;for(const{layer:t}of Z)t.setStyle(n=>n instanceof L.CircleMarker?{color:e,weight:2,fillColor:e,fillOpacity:.8}:Rt(e))}const Ge=L.layerGroup();let V=null;function Ve(e={}){return{color:R().focus,opacity:.7,fill:!1,dashArray:"4 4",...e}}function zt(e){Ge.clearLayers(),e&&L.geoJSON(e,{style:Ve({weight:2,opacity:.75,dashArray:"6 4"})}).addTo(Ge)}function Dt(e){Nt();const t=(Array.isArray(e)?e:[e]).filter(Boolean);if(!t.length)return null;V=L.layerGroup();const n=Ve({pane:"neighHighlightPane",weight:1.5}),s=Ve({pane:"neighHighlightPane",weight:1,opacity:.45,dashArray:"2 5"});for(const o of t){let a;if(o.boundary)a=L.geoJSON(o.boundary,{style:n}),a.bindTooltip(o.name);else{const r=o.bbox;a=L.rectangle([[r.min_lat,r.min_lon],[r.max_lat,r.max_lon]],n),a.bindTooltip(`${o.name} (אזור משוער — אין גבול מדויק בנתונים)`)}if(o.analysis_boundary){const r=L.geoJSON(o.analysis_boundary,{style:s});r.bindTooltip(`${o.name} · טווח ניתוח ${o.analysis_buffer_m} מ׳ מהגבול`),r.addTo(V)}a.addTo(V)}return V.addTo(E),Yn(t)}function Yn(e){const t=L.latLngBounds([]);for(const n of e){const s=n.analysis_bbox||n.bbox;t.extend([[s.min_lat,s.min_lon],[s.max_lat,s.max_lon]])}return t.isValid()?t:null}function Nt(){V&&(E.removeLayer(V),V=null)}const Zn='<svg class="sun-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-12.37c-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.38.39-1.02 0-1.41zm-12.37 12.37c-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.38.39-1.02 0-1.41z"/></svg>',Wn='<svg class="moon-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.3 22h-.1c-5.5 0-10-4.5-10-10 0-4.8 3.5-8.9 8.2-9.8.6-.1 1.2.3 1.3.9.1.6-.3 1.2-.9 1.3-3.7.8-6.4 4-6.4 7.8 0 4.4 3.6 8 8 8 3.8 0 7.1-2.7 7.8-6.4.1-.6.7-1 1.3-.9.6.1 1 .7.9 1.3-.9 4.7-5 8.2-9.8 8.2z"/></svg>';function Xn(){const e=M`
    <header>
      <div class="brand">OD<span class="flow">flow</span></div>
      <div class="sub">ניתוח פערי שירות בתח״צ &nbsp;·&nbsp; <b>תל אביב-יפו</b></div>
      <div class="head-right">
        <div class="tag" title="מקור הנתונים המוצגים כרגע">
          <span class="dot"></span>מהירויות אוטובוס · GTFS · סקר תחנות
        </div>
        <button class="icon-btn" id="themeToggle"
                title="מעבר בין ערכת צבעים בהירה לכהה"
                aria-label="החלפת ערכת צבעים">${Zn}${Wn}</button>
      </div>
    </header>`;return y(e,"#themeToggle").addEventListener("click",Qt),{el:e}}const Qn=[{id:"avg",label:"מהירות אוטובוס ממוצעת",unit:"קמ״ש",tint:"var(--ramp)",note:"ממוצע כל היום"},{id:"cong",label:"מקטעים בגודש",unit:"% מהרשת",tint:"var(--c-cong)",tone:"var(--c-cong)",note:"מתחת ל־15 קמ״ש"},{id:"seg",label:"מקטעי כביש בניתוח",unit:"",tint:"var(--c-net)",note:"ברחבי העיר"},{id:"board",label:"עליות לאוטובוס ביום",unit:"",tint:"var(--c-ride)",tone:"var(--c-ride)",note:"סקר תחנות"}];function es(){const e=M`
    <div class="kpis">
      ${Qn.map(s=>`
        <div class="kpi" style="--tint:${s.tint}${s.tone?`;--tone:${s.tone}`:""}">
          <div class="k">${s.label}</div>
          <div class="row">
            <span class="v" data-v="${s.id}">—</span>
            ${s.unit?`<span class="u">${s.unit}</span>`:""}
          </div>
          <div class="d" data-d="${s.id}">${s.note}</div>
        </div>`).join("")}
    </div>`,t=s=>y(e,`[data-v="${s}"]`),n=s=>y(e,`[data-d="${s}"]`);return{el:e,setLoading(s="טוען…"){t("avg").textContent=s,t("seg").textContent=s},setSpeedStats({avgSpeed:s,congestedPct:o,segmentCount:a},r){const l=r==="all"||Lt(r);t("avg").textContent=s==null?"—":s.toFixed(1),t("cong").textContent=o??"—",a&&(t("seg").textContent=v(a)),n("avg").textContent=l?ne(r):`${ne(r)} · אין נתוני מהירות`},setScope(s){n("seg").textContent=s?`בגבולות ${s}`:"ברחבי העיר"},setSegmentError(s){t("seg").textContent=s},setRidership(s,o,a=null){const r=s||[];if(!r.length){o&&(t("board").textContent=v(o.boardings_day),n("board").textContent=`${v(o.surveyed)} תחנות מסוקרות · כל העיר`);return}const l=r.length===1?r[0].name:`${v(r.length)} שכונות`;if(a){const m=a.filter(d=>d.boardings_day!=null);if(!m.length){t("board").textContent="—",n("board").textContent=`אין תחנות מסוקרות ב${l}`;return}t("board").textContent=v(m.reduce((d,i)=>d+i.boardings_day,0)),n("board").textContent=`${v(m.length)} תחנות · ${l}`;return}r.length===1&&r[0].transit?(t("board").textContent=v(r[0].transit.boardings_day),n("board").textContent=`${v(r[0].transit.surveyed)} תחנות · ${l}`):r.length===1?(t("board").textContent="—",n("board").textContent=`אין תחנות מסוקרות ב${l}`):(t("board").textContent="…",n("board").textContent=l)}}}const ft="▶ הרצת יום",ts="⏸ עצור",ns=1100;function ss({onReset:e}={}){const t=M`
    <div class="block" style="--tint:var(--c-time)">
      <h3>חתך זמן</h3>
      <div class="days"></div>
      <div class="periods"></div>
      <div class="allp on">כל שעות היום (ממוצע)</div>
      <div class="spark"></div>
      <div class="spark-cap">מהירות ממוצעת לפי חלון זמן · לחיצה מסננת</div>
      <div class="playrow">
        <button class="btn" data-play>${ft}</button>
        <button class="btn ghost" data-reset title="איפוס כל הבחירות">איפוס</button>
      </div>
    </div>`,n=y(t,".days"),s=y(t,".periods"),o=y(t,".allp"),a=y(t,".spark"),r=y(t,"[data-play]");let l=null;de.forEach((p,f)=>{const k=M`<div class="day">${p}</div>`;k.addEventListener("click",()=>A({day:f})),n.appendChild(k)});const m=M`<div class="day avg">ממוצע</div>`;m.addEventListener("click",()=>A({day:"avg"})),n.appendChild(m);function d(){s.replaceChildren(),B.forEach((p,f)=>{const k=!Lt(f),S=M`
        <div class="prow${k?" no-speed":""}"
             title="${k?"הסקר מדווח עליות בחלון זה; קובץ המהירויות אינו מכסה אותו":""}">
          <span class="pn">P${f+1}</span>
          <span class="pl">${fe(f)}</span>
          <span class="pt">${he(f)}</span>
        </div>`;S.addEventListener("click",()=>A({period:f})),s.appendChild(S)}),_()}o.addEventListener("click",()=>A({period:"all"}));function i(){l&&(clearInterval(l),l=null,r.textContent=ft)}r.addEventListener("click",()=>{if(l){i();return}r.textContent=ts,A({period:0});let p=0;l=setInterval(()=>{p=(p+1)%(B.length||1),A({period:p})},ns)}),y(t,"[data-reset]").addEventListener("click",()=>{i(),A({day:"avg",period:"all"}),e==null||e()});function h(p){const k=Je(p).map(S=>{var $;return($=c.speedProfile)==null?void 0:$[S]}).filter(S=>S!=null);return k.length?k.reduce((S,$)=>S+$,0)/k.length:null}function g(){if(a.replaceChildren(),!c.speedProfile||!B.length)return;const p=B.map((S,$)=>h($)),f=p.filter(S=>S!=null),k=f.length?Math.max(...f):1;p.forEach((S,$)=>{const ae=S==null?0:S/k*100,J=`${fe($)} ${he($)}`,X=M`
        <div class="spk${S==null?" no-speed":""}" title="${J}${S==null?" · אין נתוני מהירות בחלון זה":` · ${S.toFixed(1)} קמ״ש`}">
          <span class="val">${S==null?"—":S.toFixed(0)}</span>
          <span class="bar-wrap"><span class="bar" style="height:${ae}%;background:${wt(S)}"></span></span>
          <span class="lab">P${$+1}</span>
        </div>`;X.addEventListener("click",()=>A({period:$})),a.appendChild(X)}),_()}function _(){[...n.children].forEach((p,f)=>{p.classList.toggle("on",f<de.length&&u.day===f||f===de.length&&u.day==="avg")}),[...s.children].forEach((p,f)=>p.classList.toggle("on",u.period===f)),o.classList.toggle("on",u.period==="all"),[...a.children].forEach((p,f)=>p.classList.toggle("on",u.period===f))}return _(),{el:t,sync:_,buildPeriods:d,buildSpark:g,stopPlaying:i}}const os=[{key:"speed",label:"רשת מהירויות אוטובוס",tint:"var(--ramp)",swatch:null},{key:"cong",label:"מוקדי גודש (&lt;15 קמ״ש)",tint:"var(--c-cong)",swatch:"background:var(--sp1)"},{key:"dest",label:"מוקדי עניין",tint:"var(--c-place)",swatch:"multi"},{key:"stops",label:"תחנות ועליות",tint:"var(--c-ride)",swatch:"background:var(--primary)"}];function as(){const e=M`
    <div class="block" style="--tint:var(--ramp)">
      <h3>שכבות מפה</h3>
      ${os.map(d=>`
        <div class="toggle${u.layers[d.key]?" on":""}" data-layer="${d.key}" style="--tint:${d.tint}">
          <span class="sw"></span>
          ${d.swatch==="multi"?'<span class="tc tc-multi"></span>':d.swatch?`<span class="tc" style="${d.swatch}"></span>`:""}
          <span class="tl">${d.label}</span>
        </div>
        ${d.key==="dest"?'<div class="dest-cats" hidden></div>':""}
        ${d.key==="stops"?`
          <div id="stopsFilter" hidden>
            <div class="filter-row">
              <span class="filter-label">סינון: נסיעות מעבר עד</span>
              <input type="range" id="transferPctSlider" min="0" max="100" step="5" value="100">
              <span id="transferPctVal">100%</span>
            </div>
          </div>
          <div id="stopsLegend" class="legend" hidden></div>`:""}`).join("")}
    </div>`,t=y(e,".dest-cats"),n=y(e,"#stopsLegend"),s=y(e,"#stopsFilter"),o=y(e,"#transferPctSlider"),a=y(e,"#transferPctVal");o.addEventListener("input",()=>{a.textContent=`${o.value}%`,A({transferPctMax:+o.value})}),e.querySelectorAll(".toggle").forEach(d=>{d.addEventListener("click",()=>{const i=d.dataset.layer;u.layers[i]=!u.layers[i],d.classList.toggle("on",u.layers[i]),vt(["layers"])})});function r(){if(!c.destinations)return;const d=i=>c.destinations.categories.filter(h=>Tt(h.id)===i.id).map(h=>`
        <label class="dest-cat" title="${x(h.name)}">
          <input type="checkbox" data-cat="${h.id}" ${!u.destCats||u.destCats.has(h.id)?"checked":""}>
          <span class="dest-dot" style="background:${jt(h.id)}"></span>
          <span class="dest-name">${x(h.name)}</span>
          <span class="dest-count">${v(h.count)}</span>
        </label>`).join("");t.innerHTML=ce.map(i=>{const h=d(i);return h?`<div class="dest-group">
                <span class="dest-dot" style="background:${Et(i.id)}"></span>${i.name}
              </div>${h}`:""}).join(""),t.querySelectorAll("input[data-cat]").forEach(i=>{i.addEventListener("change",()=>{A({destCats:new Set([...t.querySelectorAll("input[data-cat]:checked")].map(h=>+h.dataset.cat))})})})}function l(){if(!c.stops)return;const d=_e(),i=w.visible.filter(_=>_.boardings_day!=null).length,h=It(),g=d.map((_,p)=>{const f=p===0?0:w.breaks[p-1],k=p<w.breaks.length?w.breaks[p]:null,S=k==null?`${v(f)}+`:`${v(f)}–${v(k)}`;return`<div class="lg"><span style="background:${_}"></span> ${S}</div>`}).join("");n.innerHTML=`
      <div class="stops-legend-title">${x(h)} · ${v(i)} תחנות עם נתוני סקר</div>
      ${g}
      <div class="lg"><span class="lg-hollow"></span> ללא נתוני סקר</div>
      <div class="stops-legend-note">גודל העיגול ביחס למספר העליות</div>`}function m(){t.hidden=!u.layers.dest,n.hidden=!u.layers.stops,s.hidden=!u.layers.stops}return m(),{el:e,renderCategories:r,renderStopsLegend:l,syncPanels:m}}const rs=["גודש קשה","גודש","איטי","זורם","מהיר / נתיב מהיר"];function is(){const e=rs.map((s,o)=>{const a=o===0?0:Y[o-1],r=o<Y.length?Y[o]:null,l=r==null?`${a}+`:`${a}–${r}`;return`<span style="background:var(--sp${o+1})" title="${l} קמ״ש · ${s}"></span>`}).join(""),t=["0",...Y.map(String),"+"].map(s=>`<i>${s}</i>`).join("");return{el:M`
    <div class="block" style="--tint:var(--ramp)">
      <h3>מקרא מהירות</h3>
      <div class="ramp-bar">${e}</div>
      <div class="ramp-ticks">${t}</div>
      <div class="ramp-note">
        קמ״ש · קו עבה = איטי יותר. סף הגודש בדוח הוא <b>${xt} קמ״ש</b>.
      </div>
    </div>`}}const ls=[{id:"urban",label:"עירוני"},{id:"intercity",label:"בין-עירוני"}],cs=99;function ds(e){const t=String(e??"").match(/^\d+/);return t?Number(t[0]):null}function us(e){const t=ds(e==null?void 0:e.route_short_name);return t!=null&&t>cs?"intercity":"urban"}function ht(e){const t=String(e??""),n=t.match(/^(\d+)(.*)$/);return n?[0,Number(n[1]),n[2]]:[1,0,t]}function ps(e,t){const n=ht(e.route_short_name),s=ht(t.route_short_name);return n[0]-s[0]||n[1]-s[1]||n[2].localeCompare(s[2],"he")}function fs(e){return ls.map(t=>({...t,routes:e.filter(n=>us(n)===t.id).sort(ps)})).filter(t=>t.routes.length>0)}function hs({onAreaChange:e}={}){const t=M`
    <div class="block" style="--tint:var(--c-place)">
      <h3>אזור ניתוח</h3>

      <div class="neigh-picker">
        <input class="neigh-search" type="search" placeholder="חיפוש שכונה…" aria-label="חיפוש שכונה">
        <div class="neigh-chips" hidden></div>
        <div class="neigh-summary">
          <span class="neigh-summary-txt">כל העיר — ללא סינון</span>
          <button class="neigh-clear" hidden>נקה בחירה</button>
        </div>
        <div class="neigh-list" role="group" aria-label="בחירת שכונות"></div>
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
    </div>`,n=y(t,".neigh-search"),s=y(t,".neigh-chips"),o=y(t,".neigh-summary-txt"),a=y(t,".neigh-clear"),r=y(t,".neigh-list"),l=y(t,".neigh-routes"),m=y(t,".neigh-header"),d=y(t,".neigh-stats"),i=y(t,".neigh-loading"),h=y(t,".neigh-route-count"),g=y(t,".lines-scroll"),_=new Set;let p=[],f=0;function k(b){const P=b.map(j=>j.population).filter(j=>j==null?void 0:j.total),C=P.length?{total:P.reduce((j,Q)=>j+Q.total,0),by_age:P.reduce((j,Q)=>{for(const[re,Zt]of Object.entries(Q.by_age||{}))j[re]=(j[re]||0)+Zt;return j},{})}:null;if(!(C!=null&&C.total)){d.hidden=!0,d.replaceChildren();return}const T=C.by_age||{},z=(...j)=>j.reduce((Q,re)=>Q+(T[re]||0),0),O=j=>C.total?Math.round(j/C.total*100):0;d.innerHTML=`
      <div class="neigh-stat-row">
        <div class="neigh-stat">
          <span class="neigh-stat-val">${v(C.total)}</span>
          <span class="neigh-stat-lbl">תושבים</span>
        </div>
        <div class="neigh-stat">
          <span class="neigh-stat-val">${O(z("g0to9","g10to19"))}%</span>
          <span class="neigh-stat-lbl">בני 0–19</span>
        </div>
        <div class="neigh-stat">
          <span class="neigh-stat-val">${O(z("g60to69","g70to79","g80up"))}%</span>
          <span class="neigh-stat-lbl">בני 60+</span>
        </div>
      </div>
      <div class="neigh-stat-src">מקור: אזורים סטטיסטיים למ״ס 2022, עיריית תל אביב-יפו</div>`,d.hidden=!1}function S(b){const P=ze(b.route_id),C=Se(b.route_id),T=M`
      <li class="${P?"neigh-active":""}">
        <span class="num" style="background:${P?C:`color-mix(in srgb, ${C} 20%, transparent)`};color:${P?"#fff":C}">${x(b.route_short_name||"?")}</span>
        <span class="desc" title="${x(b.route_long_name||"")}">${x(b.route_long_name||"ללא תיאור")}</span>
        <span class="ag">${x(Ot(b.agency_id))}</span>
        ${P?`<span class="neigh-color-dot" style="background:${C}"></span>`:""}
      </li>`;return T.addEventListener("click",()=>{Bn(b),$()}),T}function $(){g.replaceChildren();for(const b of fs(p)){g.append(M`
        <div class="lines-group">
          <span>${b.label}</span>
          <span class="lines-group-n">${v(b.routes.length)}</span>
        </div>`);const P=M`<ul class="lines"></ul>`;P.append(...b.routes.map(S)),g.append(P)}}y(t,"[data-all]").addEventListener("click",()=>{p.forEach(b=>Qe(b)),$()}),y(t,"[data-clear]").addEventListener("click",()=>{Pe(),$()});function ae(){const b=new Map(c.neighbourhoods.map(P=>[P.id,P]));return[..._].map(P=>b.get(P)).filter(Boolean)}function J(){const b=n.value.trim(),P=c.neighbourhoods.filter(T=>!b||T.name.includes(b));r.replaceChildren(...P.map(T=>{const z=_.has(T.id),O=M`
        <label class="neigh-opt ${z?"on":""}">
          <input type="checkbox" ${z?"checked":""}>
          <span>${x(T.name)}</span>
        </label>`;return y(O,"input").addEventListener("change",()=>tt(T.id)),O})),P.length||r.append(M`<div class="neigh-empty">לא נמצאה שכונה בשם זה</div>`);const C=ae();s.hidden=!C.length,s.replaceChildren(...C.map(T=>{const z=M`
        <button class="neigh-chip" title="הסרה מהבחירה">
          ${x(T.name)}<span class="neigh-chip-x">✕</span>
        </button>`;return z.addEventListener("click",()=>tt(T.id)),z})),a.hidden=!C.length,o.textContent=C.length?C.length===1?`שכונה אחת נבחרה · טווח ניתוח ${v(X(C))} מ׳ מהגבול`:`${v(C.length)} שכונות נבחרו · טווח ניתוח ${v(X(C))} מ׳ מהגבול`:"כל העיר — ללא סינון"}function X(b){var P;return((P=b[0])==null?void 0:P.analysis_buffer_m)??0}function tt(b){_.has(b)?_.delete(b):_.add(b),J(),nt()}function Ut(){_.clear(),J(),nt()}async function nt(){Pe(),p=[],$();const b=ae(),P=++f;if(!b.length){l.hidden=!0,A({area:null,areaName:null,areaRecords:[]}),e==null||e([]);return}l.hidden=!1,i.hidden=!1,h.textContent="";const C=b.length===1?b[0].name:`${v(b.length)} שכונות`;A({area:bn(b),areaName:C,areaRecords:b}),e==null||e(b),k(b);let T;try{T=await St()}catch(O){if(console.error("[AreaPanel] failed to load the route index:",O),P!==f)return;i.hidden=!0,m.textContent=`שגיאה: ${O.message}`;return}if(P!==f)return;p=[...new Set(b.flatMap(O=>O.route_ids||[]))].map(O=>T[O]).filter(Boolean),i.hidden=!0,m.innerHTML=`<b>${x(b.map(O=>O.name).join(" · "))}</b> · ${v(p.length)} קווים פעילים ב-GTFS`,h.textContent=p.length?`${v(p.length)} קווים · לחץ לבחירה (ניתן לבחור מספר)`:"לא נמצאו קווים באזור זה",$()}n.addEventListener("input",J),a.addEventListener("click",Ut);async function Jt(){try{await pn(),J()}catch(b){console.error("[AreaPanel] failed to load neighbourhoods.json:",b),r.replaceChildren(M`<div class="neigh-empty">שגיאה בטעינת רשימת השכונות</div>`)}}function Yt(){Pe(),$()}return{el:t,load:Jt,renderRoutes:$,clearRoutes:Yt}}function gs({dropTarget:e}={}){const t=M`
    <div class="block" style="--tint:var(--c-net)">
      <h3>ייבוא שכבות</h3>
      <label class="btn ghost import-btn">
        + GeoJSON · KML · SHP(zip)
        <input type="file" accept=".geojson,.json,.kml,.zip" multiple hidden>
      </label>
      <ul class="imported-list"></ul>
    </div>`,n=y(t,"input[type=file]"),s=y(t,".imported-list");n.addEventListener("change",()=>{[...n.files].forEach(pt),n.value=""});function o(){s.replaceChildren(),Z.forEach((a,r)=>{const l=M`
        <li class="imported-item${a.visible?" on":""}">
          <span class="sw" role="button" tabindex="0" title="הצג / הסתר"></span>
          <span class="imported-name" title="${x(a.name)}">${x(a.name)}</span>
          <button class="imported-remove" title="הסר שכבה">✕</button>
        </li>`;y(l,".sw").addEventListener("click",()=>Kn(r)),y(l,".imported-remove").addEventListener("click",()=>Un(r)),s.appendChild(l)})}if(qn(o),e){let a=0;e.addEventListener("dragenter",r=>{r.preventDefault(),++a===1&&e.classList.add("drop-active")}),e.addEventListener("dragover",r=>r.preventDefault()),e.addEventListener("dragleave",()=>{--a<=0&&(a=0,e.classList.remove("drop-active"))}),e.addEventListener("drop",r=>{r.preventDefault(),a=0,e.classList.remove("drop-active"),[...r.dataTransfer.files].filter(l=>Vn.test(l.name)).forEach(pt)})}return{el:t,renderList:o}}let gt=null,te=null,qe=null;function ms(){if(gt===c.routesById)return!0;if(!c.routesById)return!1;te=new Map,qe=new Map;for(const e of Object.values(c.routesById)){const t=String(e.route_short_name??"").trim();t&&(te.has(t)||te.set(t,[]),te.get(t).push(e));const n=new Set;for(const s of e.stops||[]){const o=String(s.code??"").trim();o&&n.add(o)}qe.set(e.route_id,n)}return gt=c.routesById,!0}function mt(e,t){if(!ms())return{routes:[],confirmed:!1};const n=te.get(String(t??"").trim())||[];if(!n.length)return{routes:[],confirmed:!1};const s=String(e.code??"").trim(),o=s?n.filter(a=>{var r;return(r=qe.get(a.route_id))==null?void 0:r.has(s)}):[];return o.length?{routes:o,confirmed:!0}:{routes:n,confirmed:!1}}const bs={ADULT:"בוגר",YOUTH:"נוער",ELDERLY:"קשיש",STUDENT:"סטודנט",DISABLED:"נכה",OTHER:"אחר"};function ys(){const e=u.areaRecords;return e.length?e.length===1?`ב${e[0].name}`:`ב-${v(e.length)} שכונות נבחרות`:"ברחבי העיר"}function D(e,t,n){return`<div class="stop-tile">
            <div class="stop-tile-val"${n?` style="color:${n}"`:""}>${e}</div>
            <div class="stop-tile-lbl">${t}</div>
          </div>`}function vs(e){const t=e.reduce((n,s)=>n+s,0);return t>0?e.map(n=>n/t*100):e.map(()=>0)}function bt(e,t,n){const s=Math.max(...t),o=t.indexOf(s),a=_e(),r=t.reduce((d,i)=>d+i,0),l=s>=1e4?d=>(+d).toLocaleString("he-IL",{notation:"compact",maximumFractionDigits:1}):d=>v(d);return`<div class="bands">${t.map((d,i)=>{const h=s>0?Math.max(2,Math.round(d/s*46)):2,g=r>0?d/r*100:0;return`
      <div class="band ${i===o?"peak":""}" title="${e[i]} · ${v(d,1)} ${n} (${g.toFixed(0)}%)">
        <div class="band-val">${l(d)}</div>
        <div class="band-bar" style="height:${h}px;background:${i===o?a[a.length-1]:a[2]}"></div>
        <div class="band-lbl">${e[i]}</div>
      </div>`}).join("")}</div>`}function yt(e,t){const n=vs(t);return`<div class="riders">${e.map((o,a)=>({label:bs[o]||o,pct:n[a],value:t[a]})).sort((o,a)=>a.pct-o.pct).map(o=>`
      <div class="rider" title="${o.label} · ${v(o.value,1)} עליות ביום">
        <span class="rider-lbl">${o.label}</span>
        <span class="rider-track"><span class="rider-fill" style="width:${o.pct.toFixed(1)}%"></span></span>
        <span class="rider-pct">${o.pct.toFixed(0)}%</span>
      </div>`).join("")}</div>`}function $s({onRoutesChanged:e}={}){const t=M`<div id="stopPanel" dir="rtl"></div>`,n=new Set;function s(){dt(),t.style.display="none"}function o(i,h){const g=c.routesById?mt(i,h):null,_=g?g.routes.filter($=>ze($.route_id)):[],p=_.length>0&&_.length===g.routes.length,f=n.has(h),k=_.map($=>`<span class="chip-dot" style="background:${Se($.route_id)}"></span>`).join(""),S=g?g.routes.length?(g.confirmed?"":`הווריאנט המדויק בתחנה זו לא אומת — מוצגים כל מסלולי הקו
`)+g.routes.map($=>$.route_long_name||$.route_id).join(`
`):"הקו אינו מופיע במפתח המסלולים":"לחצו כדי לשרטט את הקו על המפה";return`<button class="chip${p?" on":""}${f?" busy":""}" data-line="${x(h)}"
              title="${x(S)}">${x(h)}${k}</button>`}async function a(i,h){if(n.has(h))return;if(!c.routesById){n.add(h),d();try{await St()}catch(p){console.error("[StopPanel] failed to load the route index:",p),n.delete(h),d();return}finally{n.delete(h)}if(w.selected!==i){d();return}}const{routes:g}=mt(i,h);if(!g.length){d();return}const _=g.every(p=>ze(p.route_id));for(const p of g)_?At(p.route_id):Qe(p);d(),e==null||e()}function r(i){const h=c.stops.bands,g=i.boardings_day!=null,_=g?h[i.boardings_by_band.indexOf(Math.max(...i.boardings_by_band))]:null,p=[i.street,i.house||""].filter(Boolean).join(" ");return`
      <div class="stop-head">
        <button class="stop-close" title="סגירה">✕</button>
        <div class="stop-title">${x(i.name)}</div>
        <div class="stop-sub">מק״ט ${x(i.code)} · ${i.routes.length||i.routes_reported||0} קווים${p?" · "+x(p):""}</div>
      </div>

      <div class="stop-tiles">
        ${D(v(i.departures_day),"עצירות מתוזמנות ביום")}
        ${D(g?v(i.boardings_day):"—","עליות ביום","var(--primary)")}
        ${D(i.transfer_pct!=null?i.transfer_pct.toFixed(0)+"%":"—","% נסיעות מעבר")}
        ${D(v(i.routes.length||i.routes_reported),"קווים")}
      </div>

      ${i.routes.length?`
        <div class="stop-sec">קווים בתחנה</div>
        <div class="stop-chips">${i.routes.map(f=>o(i,f)).join("")}</div>`:""}

      ${g?`
        <div class="stop-sec">עליות לתחנה לפי שעה</div>
        ${bt(h,i.boardings_by_band,"עליות")}

        <div class="stop-sec">פילוח נוסעים</div>
        ${yt(c.stops.rider_types,i.riders)}

        <div class="stop-tiles">
          ${D(i.trips_to_dest!=null?i.trips_to_dest.toFixed(2):"—","נסיעות ממוצע ליעד")}
          ${D(_,"שעת שיא","var(--primary)")}
        </div>`:`
        <div class="stop-empty">התחנה לא נכללה בסקר העליות — מוצגות רק העצירות המתוזמנות והקווים מתוך ה-GTFS.</div>`}

      <div class="stop-foot"><button class="stop-link" data-view="city">↩ סקירת כל התחנות</button></div>
      <div class="stop-src">${x(c.stops.source)}</div>`}function l(){const i=w.inArea.filter(f=>f.boardings_day!=null),h=c.stops.bands.map((f,k)=>i.reduce((S,$)=>S+($.boardings_by_band?$.boardings_by_band[k]:0),0)),g=c.stops.rider_types.map((f,k)=>i.reduce((S,$)=>S+($.riders?$.riders[k]:0),0)),_=i.reduce((f,k)=>f+G(k),0),p=[...i].sort((f,k)=>G(k)-G(f)).slice(0,5);return`
      <div class="stop-head">
        <button class="stop-close" title="סגירה">✕</button>
        <div class="stop-title">סקירת תחנות · ${ys()}</div>
        <div class="stop-sub">${v(w.inArea.length)} תחנות · ${v(i.length)} עם נתוני סקר</div>
      </div>

      <div class="stop-tiles">
        ${D(v(_),It(),"var(--primary)")}
        ${D(v(i.reduce((f,k)=>f+(k.departures_day||0),0)),"עצירות ביום")}
      </div>

      <div class="stop-sec">עליות לפי שעה</div>
      ${bt(c.stops.bands,h,"עליות")}

      <div class="stop-sec">פילוח נוסעים</div>
      ${yt(c.stops.rider_types,g)}

      <div class="stop-sec">התחנות העמוסות ביותר</div>
      <div class="stop-top">
        ${p.map(f=>`
          <button class="stop-top-row" data-key="${x(ye(f))}">
            <span class="stop-top-name">${x(f.name)}</span>
            <span class="stop-top-val">${v(G(f))}</span>
          </button>`).join("")}
      </div>
      <div class="stop-src">${x(c.stops.source)}</div>`}function m(){var h;if(!c.stops)return;t.style.display="block",t.scrollTop=0,t.innerHTML=w.selected?r(w.selected):l(),t.querySelector(".stop-close").addEventListener("click",s),(h=t.querySelector(".stop-link"))==null||h.addEventListener("click",()=>{dt(),m()});const i=w.selected;i&&t.querySelectorAll(".chip").forEach(g=>{g.addEventListener("click",()=>a(i,g.dataset.line))}),t.querySelectorAll(".stop-top-row").forEach(g=>{g.addEventListener("click",()=>{const _=w.visible.find(p=>ye(p)===g.dataset.key);_&&(Ft(_),E.setView([_.lat,_.lon],Math.max(E.getZoom(),16)))})})}function d(){t.style.display==="block"&&m()}return{el:t,render:m,close:s,refresh:d}}function _s(){const e=M`
    <div class="timebadge">
      <div class="now">—</div>
      <div class="lbl">בחר יום ושעה מהתפריט</div>
    </div>`,t=y(e,".now"),n=y(e,".lbl");return{el:e,update({day:s,period:o}){const a=s==="avg"?"ממוצע":de[s],r=o==="all"?"כל היום":fe(o);t.textContent=`${a} · ${r}`,n.textContent=`${En(s)} · ${ne(o)}`}}}const Ht=document.getElementById("app"),ke=M`
  <div class="shell" style="display:contents">
    <aside></aside>
    <div id="mapwrap"><div id="map"></div></div>
  </div>`;Ht.appendChild(ke);const Ls=y(ke,"aside"),Gt=y(ke,"#mapwrap"),Vt=y(ke,"#map");nn(Vt);const Ss=Xn(),U=es(),qt=_s(),H=$s({onRoutesChanged:()=>oe.renderRoutes()}),oe=hs({onAreaChange:ws}),se=ss({onReset:Es}),F=as(),xs=is(),ks=gs({dropTarget:Gt});Ht.prepend(Ss.el);Gt.prepend(U.el);Vt.append(qt.el,H.el);Ls.append(oe.el,se.el,F.el,xs.el,ks.el);Ge.addTo(E);ge.addTo(E);Fn(E);An(()=>{if(!c.stops){Ze().then(()=>{N(),He(),F.renderStopsLegend()}).catch(e=>console.error("[Stops] failed to load for the drawn line:",e));return}N(),He(),F.renderStopsLegend(),H.refresh()});Rn(()=>H.render());function ve(){U.setSpeedStats(xn(),u.period),qt.update(u)}function Kt(){kn(u.layers),Pn(u.layers.dest),He(),F.syncPanels(),u.layers.dest&&fn().then(()=>{F.renderCategories(),be()}).catch(e=>console.error("[Destinations] failed to load:",e)),u.layers.stops||Le().length?Ze().then(()=>{N(),F.renderStopsLegend(),$e()}).catch(e=>console.error("[Stops] failed to load:",e)):H.close()}function $e(){const e=c.stops&&u.areaRecords.length?w.inArea:null;U.setRidership(u.areaRecords,c.stopTotals,e)}Wt((e,t)=>{(t.has("day")||t.has("period"))&&(se.sync(),ve()),t.has("period")&&c.stops&&(N(),F.renderStopsLegend(),H.refresh()),t.has("layers")&&Kt(),t.has("destCats")&&c.destinations&&be(),t.has("transferPctMax")&&c.stops&&(e.layers.stops||Le().length)&&(N(),F.renderStopsLegend(),H.refresh()),t.has("area")&&(Mt(),U.setScope(e.areaName),ve(),c.destinations&&e.layers.dest&&be(),c.stops&&(N(),F.renderStopsLegend(),H.refresh()),$e(),!c.stops&&e.areaRecords.length>1&&Ze().then(()=>{N(),$e()}).catch(n=>console.error("[Stops] failed to load for the area roll-up:",n)))});function ws(e){if(!(e!=null&&e.length)){Nt();return}const t=Dt(e);t&&E.fitBounds(t,{padding:[30,30]})}function Es(){oe.clearRoutes(),E.setView(c.center||Ue,15)}en(()=>{sn(),Ct(),ve(),se.buildSpark(),zt(c.border),u.areaRecords.length&&Dt(u.areaRecords),In(),oe.renderRoutes(),Jn(),c.destinations&&(F.renderCategories(),be()),c.stops&&(N(),F.renderStopsLegend(),H.refresh())});async function Ps(){U.setLoading(),oe.load();const{segmentsFailed:e}=await un();zt(c.border),c.center&&E.setView(c.center,13),Ct(),se.buildPeriods(),se.buildSpark(),ve(),$e(),Kt(),e&&U.setSegmentError("שגיאת נתונים")}Ps().catch(e=>{console.error("Dashboard failed to start",e),U.setSegmentError("שגיאת רשת")});
