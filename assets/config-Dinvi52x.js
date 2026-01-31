(function(){const o=document.createElement("link").relList;if(o&&o.supports&&o.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))s(e);new MutationObserver(e=>{for(const t of e)if(t.type==="childList")for(const i of t.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&s(i)}).observe(document,{childList:!0,subtree:!0});function l(e){const t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?t.credentials="include":e.crossOrigin==="anonymous"?t.credentials="omit":t.credentials="same-origin",t}function s(e){if(e.ep)return;e.ep=!0;const t=l(e);fetch(e.href,t)}})();const c={BASE_URL:"./",DEV:!1,MODE:"production",PROD:!0,SSR:!1,VITE_SUPABASE_ANON_KEY:"",VITE_SUPABASE_URL:""};let r,a;try{typeof import.meta<"u"&&c&&(r="",a="")}catch(n){console.warn("Vite Env not detected:",n)}if(!r||!a){const n=window.location.hostname,o=n==="localhost"||n==="127.0.0.1"||n.startsWith("192.168.")||n.startsWith("10.")||window.location.protocol==="file:";console.error("CRITICAL: Supabase Configuration Missing."),alert(o?`ERROR: Konfigurasi Database tidak ditemukan!

Penyebab: Browser tidak membaca file .env secara langsung (mode Static/XAMPP/File).

SOLUSI:
1. Buka Terminal
2. Ketik "npm run dev"
3. Buka link localhost yang muncul.`:`ERROR: Konfigurasi Supabase KOSONG di Hosting ini.

JIKA DI GITHUB PAGES:
Anda mungkin melakukan "Push" sebelum memasukkan "Secrets".

SOLUSI:
1. Pastikan Secrets (VITE_SUPABASE_URL, dll) ada di Settings > Secrets > Actions.
2. Buka tab "Actions", pilih workflow terakhir.
3. Klik "Re-run all jobs".`)}else window.supabase?(window.supabaseClient=window.supabase.createClient(r,a),console.log("✅ Supabase Client Connected via Vite")):(console.error("❌ Supabase JS Library not loaded (CDN Issue)"),alert("Gagal memuat library Supabase. Periksa koneksi internet Anda."));
