const API="/api";
let token=localStorage.getItem("resume_token");
let currentId=null;
let authMode="register";
let education=[],experience=[],projects=[],skills=[];
let summaryImproveCount=0;
let summaryOriginalText="";

const $=id=>document.getElementById(id);
function headers(){return {"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})}}
async function api(path,options={}) {
  const r=await fetch(API+path,{...options,headers:{...headers(),...(options.headers||{})}});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.message||"Request failed");
  return data;
}

function showAuth(mode){
  authMode=mode;
  $("auth").classList.remove("hidden");
  $("authTitle").textContent=mode==="register"?"Create account":"Login";
  $("authName").classList.toggle("hidden",mode==="login");
  $("authSwitch").innerHTML=mode==="register"
    ? 'Already registered? <a href="#" onclick="showAuth(\'login\');return false">Login</a>'
    : 'New user? <a href="#" onclick="showAuth(\'register\');return false">Create account</a>';
  window.scrollTo({top:$("auth").offsetTop-70,behavior:"smooth"});
}
async function submitAuth(){
  try{
    const body={email:$("authEmail").value,password:$("authPassword").value};
    if(authMode==="register") body.name=$("authName").value;
    const data=await api(`/auth/${authMode}`,{method:"POST",body:JSON.stringify(body)});
    token=data.token;localStorage.setItem("resume_token",token);
    $("auth").classList.add("hidden");$("logoutBtn").classList.remove("hidden");
    await loadDashboard();
  }catch(e){$("authMsg").textContent=e.message}
}
$("logoutBtn").onclick=()=>{token=null;localStorage.removeItem("resume_token");location.reload()};

async function loadDashboard(){
  if(!token){
    $("dashboard").classList.add("hidden");
    $("builder").classList.add("hidden");
    $("home").classList.remove("hidden");
    return;
  }
  $("home").classList.add("hidden");
  $("dashboard").classList.remove("hidden");
  $("builder").classList.add("hidden");
  $("logoutBtn").classList.remove("hidden");
  const list=await api("/resumes");
  $("resumeList").innerHTML=list.length
    ? list.map(r=>`
      <div class="resume-card">
        <h3>${esc(r.title)}</h3>
        <p>${esc(r.template_name||"Template")}</p>
        <small>Updated: ${new Date(r.updated_at).toLocaleString()}</small><br><br>
        <button class="primary" onclick="openResume(${r.id})">Edit</button>
        <button class="secondary" onclick="deleteResume(${r.id})">Delete</button>
      </div>`).join("")
    : `<div class="resume-card"><h3>No resumes yet</h3><p>Create your first resume.</p></div>`;
}

function newResume(){
  currentId=null;education=[];experience=[];projects=[];skills=[];summaryImproveCount=0;summaryOriginalText="";
  clearEditor();$("builderTitle").textContent="Create Resume";showBuilder();
}
async function openResume(id){
  const r=await api(`/resumes/${id}`);currentId=id;summaryImproveCount=0;summaryOriginalText="";
  $("builderTitle").textContent="Edit Resume";fillEditor(r);showBuilder();
}
function showBuilder(){
  $("home").classList.add("hidden");$("dashboard").classList.add("hidden");$("auth").classList.add("hidden");$("builder").classList.remove("hidden");
  window.scrollTo({top:$("builder").offsetTop-70,behavior:"smooth"});
  renderAll();updatePreview();
}
function clearEditor(){
  ["title","phone","location","linkedin_url","github_url","portfolio_url","summary","objective"].forEach(x=>$(x).value="");
  $("title").value="My Resume";$("jobDescription").value="";
}
function fillEditor(r){
  ["title","phone","location","linkedin_url","github_url","portfolio_url","summary","objective"].forEach(x=>$(x).value=r[x]||"");
  education=(r.education||[]).map(e=>({...e}));
  experience=(r.experience||[]).map(e=>({...e,current_job:!!e.current_job}));
  projects=(r.projects||[]).map(p=>({...p}));
  skills=(r.skills||[]).map(s=>s.name).filter(Boolean);
  $("jobDescription").value="";
}

const SKILL_SUGGESTIONS=[
  "Java","Python","JavaScript","TypeScript","C","C++","HTML","CSS","React","Angular","Node.js","Express.js","Spring Boot","REST API","PostgreSQL","MySQL","MongoDB","SQL","Git","GitHub","Docker","AWS","Azure","Machine Learning","Deep Learning","NLP","TensorFlow","PyTorch","Data Structures","Algorithms","OOP","Linux","Agile","Jira","Communication","Leadership","PeopleSoft","PeopleCode","Application Engine","Integration Broker","Workday","SAP","Power BI","Excel","Figma"
];

function renderAll(){
  $("skillsBox").innerHTML=skills.map((s,i)=>`
    <div class="skill-row">
      <input class="skill-input" list="skillSuggestions" placeholder="e.g. Java, React, AWS" value="${esc(s)}" oninput="skills[${i}]=this.value;updatePreview()" onchange="skills[${i}]=this.value;dedupeSkills();renderAll();updatePreview()">
      <button type="button" class="icon-btn" aria-label="Remove skill" onclick="removeSkill(${i})">×</button>
    </div>`).join("");

  $("educationBox").innerHTML=education.map((e,i)=>`
    <div class="repeat-item">
      <button type="button" class="remove-btn" onclick="education.splice(${i},1);renderAll();updatePreview()">×</button>
      <input placeholder="Institution" value="${esc(e.institution||"")}" oninput="education[${i}].institution=this.value;updatePreview()">
      <input placeholder="Degree" value="${esc(e.degree||"")}" oninput="education[${i}].degree=this.value;updatePreview()">
      <input placeholder="Field / Specialization" value="${esc(e.field||"")}" oninput="education[${i}].field=this.value;updatePreview()">
      <div class="two">
        <label>Start date<input type="month" value="${esc(normalizeMonth(e.start_year))}" onchange="education[${i}].start_year=this.value;updatePreview()"></label>
        <label>End date<input type="month" value="${esc(normalizeMonth(e.end_year))}" onchange="education[${i}].end_year=this.value;updatePreview()"></label>
      </div>
      <input placeholder="Grade / CGPA" value="${esc(e.grade||"")}" oninput="education[${i}].grade=this.value;updatePreview()">
    </div>`).join("");

  $("experienceBox").innerHTML=experience.map((e,i)=>{
    const current=!!e.current_job;
    return `<div class="repeat-item experience-item">
      <button type="button" class="remove-btn" onclick="experience.splice(${i},1);renderAll();updatePreview()">×</button>
      <input placeholder="Company" value="${esc(e.company||"")}" oninput="experience[${i}].company=this.value;updatePreview()">
      <input placeholder="Job title" value="${esc(e.position||"")}" oninput="experience[${i}].position=this.value;updatePreview()">
      <label class="optional-label">Subheading <span>Optional</span>
        <input placeholder="e.g. HCM / Absence Management Specialist" value="${esc(e.subheading||"")}" oninput="experience[${i}].subheading=this.value;updatePreview()">
      </label>
      <div class="two">
        <label>Start date<input type="month" value="${esc(normalizeMonth(e.start_date))}" onchange="experience[${i}].start_date=this.value;updatePreview()"></label>
        <label>End date<input id="endDate_${i}" type="month" value="${esc(normalizeMonth(e.end_date))}" ${current?"disabled":""} onchange="experience[${i}].end_date=this.value;updatePreview()"></label>
      </div>
      <label class="check-row"><input type="checkbox" ${current?"checked":""} onchange="toggleCurrentJob(${i},this.checked)"> <span>This is my current job</span></label>
      <textarea placeholder="Description / achievements" oninput="experience[${i}].description=this.value;updatePreview()">${esc(e.description||"")}</textarea>
    </div>`;
  }).join("");

  $("projectsBox").innerHTML=projects.map((p,i)=>`
    <div class="repeat-item">
      <button type="button" class="remove-btn" onclick="projects.splice(${i},1);renderAll();updatePreview()">×</button>
      <input placeholder="Project title" value="${esc(p.title||"")}" oninput="projects[${i}].title=this.value;updatePreview()">
      <input placeholder="Technologies" value="${esc(p.technologies||"")}" oninput="projects[${i}].technologies=this.value;updatePreview()">
      <textarea placeholder="Project description" oninput="projects[${i}].description=this.value;updatePreview()">${esc(p.description||"")}</textarea>
      <input placeholder="Project URL" value="${esc(p.project_url||"")}" oninput="projects[${i}].project_url=this.value;updatePreview()">
    </div>`).join("");
}

function normalizeMonth(value){
  if(!value)return "";
  const s=String(value);
  if(/^\d{4}-\d{2}$/.test(s))return s;
  const year=s.match(/\d{4}/)?.[0];
  return year?`${year}-01`:"";
}
function formatMonth(value){
  if(!value)return "";
  const s=String(value);
  if(/^\d{4}-\d{2}$/.test(s)){
    const [y,m]=s.split("-");
    return new Date(Number(y),Number(m)-1,1).toLocaleDateString(undefined,{month:"short",year:"numeric"});
  }
  return s;
}
function toggleCurrentJob(i,checked){
  experience[i].current_job=checked;
  if(checked)experience[i].end_date="";
  renderAll();updatePreview();
}
function dedupeSkills(){
  const seen=new Set();
  skills=skills.filter(s=>{const key=String(s||"").trim().toLowerCase();if(!key||seen.has(key))return false;seen.add(key);return true;});
}
function addSkill(){skills.push("");renderAll();setTimeout(()=>{const inputs=document.querySelectorAll(".skill-input");inputs[inputs.length-1]?.focus()},0)}
function removeSkill(i){skills.splice(i,1);renderAll();updatePreview()}
function addEducation(){education.push({});renderAll();updatePreview()}
function addExperience(){experience.push({current_job:false});renderAll();updatePreview()}
function addProject(){projects.push({});renderAll();updatePreview()}

function collect(){
  dedupeSkills();
  return {
    title:$("title").value,phone:$("phone").value,location:$("location").value,
    linkedin_url:$("linkedin_url").value,github_url:$("github_url").value,portfolio_url:$("portfolio_url").value,
    summary:$("summary").value,objective:$("objective").value,
    template_id:1,skills:skills.filter(Boolean).map(s=>s.trim()),
    education,experience,projects
  };
}
async function saveResume(){
  try{
    const data=await api(currentId?`/resumes/${currentId}`:"/resumes",{method:currentId?"PUT":"POST",body:JSON.stringify(collect())});
    currentId=data.id;alert("Resume saved successfully.");await loadDashboard();openResume(currentId);
  }catch(e){alert(e.message)}
}
async function improveSummary(){
  const current=$("summary").value.trim();
  if(!current){alert("Write a summary first, then click AI Improve Summary.");return;}
  if(summaryImproveCount===0 || !summaryOriginalText) summaryOriginalText=current;
  const button=document.querySelector('[onclick="improveSummary()"]');
  const original=button?.textContent;
  if(button){button.disabled=true;button.textContent="Improving..."}
  try{
    summaryImproveCount+=1;
    const d=await api("/ai/improve",{method:"POST",body:JSON.stringify({text:summaryOriginalText,section:"summary",iteration:summaryImproveCount})});
    if(d.improved && d.improved.trim() && d.improved.trim()!==current)$("summary").value=d.improved.trim();
    else alert("AI could not produce a different version. Please try again.");
    updatePreview();
  }catch(e){alert(e.message)}finally{if(button){button.disabled=false;button.textContent=original}}
}
async function analyzeJob(){
  try{
    const d=await api("/ai/analyze-job",{method:"POST",body:JSON.stringify({title:"Target Job",description:$("jobDescription").value})});
    $("analysisBox").innerHTML=`<b>Analysis mode:</b> ${esc(d.mode)}<br><b>Skills:</b><br>${(d.skills||[]).map(x=>`<span class="tag">${esc(x)}</span>`).join("")}<br><b>Keywords:</b><br>${(d.keywords||[]).map(x=>`<span class="tag">${esc(x)}</span>`).join("")}`;
  }catch(e){alert(e.message)}
}
async function runATS(){
  if(!currentId){alert("Please click Save before checking ATS.");return;}
  const jobDescription=$("jobDescription").value.trim();
  if(!jobDescription){$("atsBox").innerHTML=`<h3>ATS Check</h3><p>Please paste a Job Description above before running the ATS check.</p>`;$("atsBox").scrollIntoView({behavior:"smooth",block:"center"});return;}
  $("atsBox").innerHTML=`<h3>ATS Check</h3><p>Analyzing your resume...</p>`;$("atsBox").scrollIntoView({behavior:"smooth",block:"center"});
  try{
    const d=await api("/ai/ats-check",{method:"POST",body:JSON.stringify({resumeId:currentId,jobDescription})});
    const score=Number(d.score||0);
    const scoreMessage=score>=80?"Your resume contains many of the keywords found in the job description.":score>=60?"Your resume has a moderate keyword match with the job description.":"Consider adding relevant skills and keywords from the job description.";
    $("atsBox").innerHTML=`<div class="ats-result-card"><h3>ATS Compatibility Result</h3><div class="score-big">${score}%</div><p class="ats-message">${scoreMessage}</p><hr><h4>Matched Keywords</h4><div class="ats-tags">${d.matchedKeywords?.length?d.matchedKeywords.map(x=>`<span class="tag">${esc(x)}</span>`).join(""):"<p>No matching keywords found.</p>"}</div><h4>Missing Keywords</h4><div class="ats-tags">${d.missingKeywords?.length?d.missingKeywords.map(x=>`<span class="missing-tag">${esc(x)}</span>`).join(""):"<p>No major missing keywords.</p>"}</div><h4>ATS Warnings</h4><ul>${d.warnings?.length?d.warnings.map(x=>`<li>${esc(x)}</li>`).join(""):"<li>No major warnings.</li>"}</ul><p><b>Keyword Coverage:</b> ${esc(d.keywordCoverage||"0/0")}</p></div>`;
  }catch(e){$("atsBox").innerHTML=`<h3>ATS Check</h3><p>Unable to calculate the ATS score.</p><p>${esc(e.message)}</p>`}
}
async function exportFile(type){
  if(!currentId){alert("Save the resume first.");return;}
  try{
    const response=await fetch(`${API}/export/${currentId}/${type}`,{method:"GET",headers:{Authorization:`Bearer ${token}`}});
    if(!response.ok){alert("Export failed.");return;}
    const blob=await response.blob();if(!blob||blob.size===0){alert("The exported file is empty.");return;}
    const contentDisposition=response.headers.get("Content-Disposition")||"";
    let filename=`resume.${type}`;const filenameMatch=contentDisposition.match(/filename="?([^"]+)"?/i);if(filenameMatch?.[1])filename=filenameMatch[1];
    const blobUrl=window.URL.createObjectURL(blob);const link=document.createElement("a");link.href=blobUrl;link.download=filename;link.style.display="none";document.body.appendChild(link);link.click();
    setTimeout(()=>{document.body.removeChild(link);window.URL.revokeObjectURL(blobUrl)},1000);
  }catch(error){console.error("EXPORT ERROR:",error);alert("Unable to download the file.")}
}
async function deleteResume(id){if(!confirm("Delete this resume?"))return;await api(`/resumes/${id}`,{method:"DELETE"});loadDashboard()}

function updatePreview(){
  const d=collect();
  const contact=[d.phone,d.location,d.linkedin_url,d.github_url,d.portfolio_url].filter(Boolean).map(esc).join(' <span class="contact-sep">•</span> ');
  $("preview").innerHTML=`
    <div class="resume-header"><h1>${esc(d.title||"Your Name")}</h1>${contact?`<p class="contact-line">${contact}</p>`:""}</div>
    ${section("PROFESSIONAL SUMMARY",d.summary)}
    ${section("OBJECTIVE",d.objective)}
    ${skills.length?`<section class="resume-section"><h2>SKILLS</h2><div class="preview-skills">${skills.filter(Boolean).map(x=>`<span class="preview-skill">${esc(x)}</span>`).join("")}</div></section>`:""}
    ${experience.length?`<section class="resume-section"><h2>EXPERIENCE</h2>${experience.filter(e=>e.company||e.position||e.description).map(e=>`<div class="resume-entry"><div class="entry-top"><div><h3>${esc(e.position||"Position")}</h3><div class="entry-company">${esc(e.company||"Company")}</div>${e.subheading?`<div class="entry-subheading">${esc(e.subheading)}</div>`:""}</div><div class="entry-dates">${esc(formatMonth(e.start_date))}${e.start_date||e.end_date||e.current_job?` <span>–</span> ${e.current_job?"Present":esc(formatMonth(e.end_date))}`:""}</div></div>${e.description?`<p>${esc(e.description)}</p>`:""}</div>`).join("")}</section>`:""}
    ${projects.length?`<section class="resume-section"><h2>PROJECTS</h2>${projects.filter(p=>p.title||p.description).map(p=>`<div class="resume-entry"><h3>${esc(p.title||"Project")}</h3>${p.technologies?`<div class="entry-company">${esc(p.technologies)}</div>`:""}${p.description?`<p>${esc(p.description)}</p>`:""}${p.project_url?`<p class="entry-link">${esc(p.project_url)}</p>`:""}</div>`).join("")}</section>`:""}
    ${education.length?`<section class="resume-section"><h2>EDUCATION</h2>${education.filter(e=>e.institution||e.degree).map(e=>`<div class="resume-entry"><div class="entry-top"><div><h3>${esc(e.degree||"Degree")}</h3><div class="entry-company">${esc(e.institution||"Institution")}</div>${e.field?`<div class="entry-subheading">${esc(e.field)}</div>`:""}</div><div class="entry-dates">${esc(formatMonth(e.start_year))}${e.start_year||e.end_year?` <span>–</span> ${esc(formatMonth(e.end_year))}`:""}</div></div>${e.grade?`<p class="grade-line">${esc(e.grade)}</p>`:""}</div>`).join("")}</section>`:""}
  `;
}
function section(h,t){return t?`<section class="resume-section"><h2>${h}</h2><p>${esc(t)}</p></section>`:""}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

["title","phone","location","linkedin_url","github_url","portfolio_url","objective"].forEach(id=>$(id)?.addEventListener("input",updatePreview));
$("summary")?.addEventListener("input",()=>{summaryImproveCount=0;summaryOriginalText="";updatePreview()});
if(token) loadDashboard(); else showAuth("register");
function goHome(){$("home").classList.remove("hidden");$("dashboard").classList.add("hidden");$("builder").classList.add("hidden");$("auth").classList.add("hidden");window.scrollTo({top:0,behavior:"smooth"})}
async function goDashboard(){if(!token){showAuth("login");return}await loadDashboard();window.scrollTo({top:$("dashboard").offsetTop-70,behavior:"smooth"})}
function goBuilder(){if(!token){showAuth("login");return}if(!currentId)newResume();else showBuilder()}
