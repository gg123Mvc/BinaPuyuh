import"./config-Dinvi52x.js";/* empty css              */import"./app-BgDMR-5F.js";window.onload=function(){if(typeof Auth>"u"){const e=`CRITICAL: "Auth" class is not defined. 

Possibilities:
1. js/app.js failed to load (Check Network Tab)
2. js/app.js has a syntax error (Check Console)
3. js/config.js is missing or invalid`;console.error(e),alert(e),document.getElementById("error-msg").innerText="System Error: Failed to load Application Logic.",document.getElementById("error-msg").style.display="block",document.querySelector('button[type="submit"]').disabled=!0;return}document.getElementById("registerForm").addEventListener("submit",async e=>{e.preventDefault();const n=document.getElementById("fullname").value,l=document.getElementById("email").value,o=document.getElementById("password").value,t=document.getElementById("error-msg"),a=e.target.querySelector('button[type="submit"]');t.style.display="none",a.disabled=!0,a.innerText="MEMPROSES...";try{const i=Date.now();let s=parseInt(localStorage.getItem("puyuh_reg_attempts")||"0"),m=parseInt(localStorage.getItem("puyuh_reg_last")||"0");if(i-m>36e5&&(s=0),s>=3)throw new Error("rate limit reached");localStorage.setItem("puyuh_reg_attempts",s+1),localStorage.setItem("puyuh_reg_last",i),await Auth.register(l,o,n)&&(alert("Registrasi berhasil! Silakan tunggu persetujuan Admin sebelum bisa login."),window.location.href="login.html")}catch(r){console.error(r),r.message.includes("rate limit")?t.innerHTML=`
                            <div style="background: rgba(220, 38, 38, 0.15); border: 1px solid rgba(220, 38, 38, 0.5); padding: 1rem; border-radius: 12px; display: flex; gap: 12px; align-items: flex-start; text-align: left;">
                                <i class="fas fa-shield-alt" style="color: #EF5350; font-size: 1.5rem; margin-top: 2px;"></i>
                                <div>
                                    <h4 style="color: #EF5350; margin: 0 0 5px 0; font-weight: 600;">Akses Dibatasi Sementara</h4>
                                    <p style="color: #e5e7eb; font-size: 0.85rem; margin: 0; line-height: 1.4;">
                                        Sistem keamanan mendeteksi terlalu banyak percobaan pendaftaran dari email/device ini.
                                    </p>
                                    <div style="margin-top: 8px; background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px;">
                                        <p style="color: #4ADE80; font-size: 0.85rem; margin: 0; font-weight: 500;">
                                            <i class="fas fa-lightbulb"></i> Solusi:
                                        </p>
                                        <p style="color: #9ca3af; font-size: 0.8rem; margin: 4px 0 0 0;">
                                            Harap <b>tunggu 1 jam</b> sebelum mencoba lagi, atau gunakan <b>perangkat/browser lain</b>.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        `:t.innerHTML=`
                            <div style="background: rgba(220, 38, 38, 0.1); border: 1px solid #ef4444; padding: 0.8rem; border-radius: 8px; color: #fca5a5; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-exclamation-circle"></i>
                                <span>${r.message}</span>
                            </div>
                        `,t.style.display="block"}finally{a.disabled=!1,a.innerText="DAFTAR SEKARANG"}})};
