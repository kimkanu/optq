"use strict";import{QueryClient as T,onlineManager as y,focusManager as j}from"@tanstack/query-core";import{nanoid as b}from"nanoid/non-secure";import E from"object-hash";import{proxy as k}from"valtio/vanilla";export function createOptq(e){const t=e.queryClient??new T,n=k([]),f=k({}),d=k({}),o=getSetter({config:e,requestStore:n,cacheStore:f,predictionStore:d}),l=getGetter({config:e,predictionStore:d}),s=getFetcher({config:e,set:o}),h=getMutator({config:e,requestStore:n,cacheStore:f,predictionStore:d,set:o}),i=new Promise(u=>{y.subscribe(c=>{c&&u()})}).then(async()=>{if(e?.resumeRequestMode==="sequential"){const u=[];for(const c of n)if(c.waitingNetwork){c.waitingNetwork=!1;try{const w=await h(c);u.push({status:"fulfilled",value:{request:c,response:w}})}catch(w){u.push({status:"rejected",value:{request:c},reason:w})}}return u}return await Promise.all(n.filter(u=>u.waitingNetwork).map(async(u,c)=>{u.waitingNetwork=!1;try{const w=c*10;await new Promise(a=>setTimeout(a,w));const r=await h(u);return{status:"fulfilled",value:{request:u,response:r}}}catch(w){return{status:"rejected",value:{request:u},reason:w}}}))});return typeof window<"u"&&window.addEventListener&&j.setEventListener(u=>{const c=()=>u();return window.addEventListener("visibilitychange",c,!1),window.addEventListener("focus",c,!1),()=>{window.removeEventListener("visibilitychange",c),window.removeEventListener("focus",c)}}),{config:e,queryClient:t,requestStore:n,cacheStore:f,predictionStore:d,set:o,get:l,fetch:s,mutate:h,pendingResponses:i}}export function getSetter(e){return(t,n,f,d)=>{var o;const l=`GET ${t}`,m=(e.config?.routes?.[l]?.hash??E)(n??{}),i=e.cacheStore[t]?.[m]?.respondedAt;(i===void 0||i<=d)&&((o=e.cacheStore)[t]??(o[t]={}),e.cacheStore[t][m]={value:f,respondedAt:d}),P(e,t,m)}}export function getGetter(e){return(t,...n)=>{const[f]=n,d=`GET ${t}`,o=e.config.routes?.[d];if(!o)return;const s=(o?.hash??E)(f??{}),h=e.predictionStore[t]?.[s];return h!==void 0?h:typeof o.defaultValue=="function"?o.defaultValue(f):o.defaultValue}}export function getFetcher(e){return async(t,...n)=>{const[f,d]=n,o=`GET ${t}`,l=e.config.routes?.[o],s=await R({baseUrl:e.config?.baseUrl??"",method:"GET",path:t,params:f,headers:d});if(s.ok){const h=l?.respondedAt?.(s)??e.config?.respondedAt?.(s)??O(s),m={...s,params:f,request:{headers:d},respondedAt:h},i=l?.transform?.(m)??s.data;e.set(t,f,i,h)}return s}}export function getMutator(e){return async function({id:t=b(),apiId:n,params:f,headers:d,body:o}){let l,s=100;arguments.length>1&&(console.warn("Do not use additional arguments of `mutate` in production."),l=arguments[1],s=arguments[2]??100);const h=e.config?.routes?.[n],m={id:t,apiId:n,params:f,headers:d,body:o},i=[],v=(r,a)=>{const g=`GET ${r}`,x=(e.config?.routes?.[g]?.hash??E)(a??{});for(const[A,F]of i)if(r===A&&x===F)return;i.push([r,x])},u=r=>{for(let a=e.requestStore.length-1;a>=0;a--)e.requestStore[a].waitingNetwork&&r(e.requestStore[a])&&e.requestStore.splice(a,1)};if(!e.requestStore.some(r=>r.id===t)){e.requestStore.push({...m,waitingNetwork:!y.isOnline(),affectedPredictions:i}),h?.actions?.({...m,set:v,removeOfflineRequests:u});for(const[r,a]of i)P(e,r,a)}const c=n.slice(0,n.indexOf(" "));return(l?new Promise(r=>setTimeout(()=>r(),s)).then(l):new Promise(r=>{if(y.isOnline())return r();const a=y.subscribe(g=>{if(g){a(),r();const S=e.requestStore.findIndex(p=>p.id===t);S>=0&&(e.requestStore[S].waitingNetwork=!1)}})}).then(()=>R({baseUrl:e.config?.baseUrl??"",method:c,path:n.slice(c.length+1),params:f,headers:d,body:o}))).then(r=>{const a=h?.respondedAt?.(r)??e.config?.respondedAt?.(r)??O(r),g=e.requestStore.findIndex(S=>S.id===t);return g>=0&&(e.requestStore[g].respondedAt=a),h?.onResponse?.({respondedAt:a,params:f,status:r.status,ok:r.ok,headers:r.headers,data:r.data,set:(S,p,x)=>e.set(S,p,x,a),request:m,removeRequest(){const S=e.requestStore.findIndex(p=>p.id===t);if(S>=0){const[p]=e.requestStore.splice(S,1);for(const[x,A]of p.affectedPredictions??[])P(e,x,A)}}}),{...r,respondedAt:a}}).catch(r=>{const a=e.requestStore.findIndex(g=>g.id===t);if(a>=0){const[g]=e.requestStore.splice(a,1);for(const[S,p]of g.affectedPredictions??[])P(e,S,p)}throw r})}}function P(e,t,n){var f;const d=`GET ${t}`,l=e.config.routes?.[d]?.hash??E;(f=e.predictionStore)[t]??(f[t]={}),e.predictionStore[t][n]=e.cacheStore[t]?.[n]?.value;for(const s of e.requestStore){s.affectedPredictions=s.affectedPredictions?.filter(([m,i])=>m!==t||i!==n)??[];const h=(m,i,v)=>{function u(w){return w===t&&n===l(i)}if(!u(m)||s.respondedAt!==void 0&&e.cacheStore?.[t]?.[n].respondedAt!==void 0&&s.respondedAt<=e.cacheStore[t][n].respondedAt)return;const c=typeof v!="function"?v:v(e.predictionStore[t][n]);e.predictionStore[t][n]=c,s.affectedPredictions.every(([w,r])=>w!==t||r!==n)&&s.affectedPredictions.push([t,n])};e.config.routes?.[s.apiId]?.actions?.({...s,set:h,removeRequests:()=>{}})}for(let s=e.requestStore.length-1;s>=0;s--)e.requestStore[s].affectedPredictions.length||e.requestStore.splice(s,1)}async function R({baseUrl:e,method:t,path:n,params:f,headers:d,body:o}){let l=/^https?:\/\//.test(n)?n:e+n;{const w=new URLSearchParams;for(const[a,g]of Object.entries(f??{})){if(g==null)continue;const S=new RegExp(`:${a}(?=/|$)`,"g");S.test(l)?l=l.replace(S,g.toString()):w.append(a,g.toString())}const r=w.toString();l+=`${r?"?":""}${r}`}const s=o===void 0?!0:typeof o=="object"&&(o===null||o.constructor===Object),h=o===void 0?!1:typeof o=="string",m=o===void 0?!1:o instanceof FormData,i=await fetch(l,{method:t,headers:{"content-type":s?"application/json":h?"text/plain":m?"multipart/form-data":"application/octet-stream",...d},body:o===void 0?void 0:s?JSON.stringify(o):o}),v=i.headers.get("content-type"),u=Object.fromEntries(i.headers.entries());let c;try{c=v?.includes("json")?await i.json():v?.startsWith("text/")?await i.text():await i.arrayBuffer()}catch{c=void 0}return{status:i.status,ok:i.ok,headers:u,data:c,raw:i}}function O(e){return BigInt(new Date(e.headers.date??Date.now()).getTime())}
