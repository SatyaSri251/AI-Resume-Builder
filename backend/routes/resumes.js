const express = require("express");
const pool = require("../config/db");
const auth = require("../middleware/auth");

const router = express.Router();

async function getResume(resumeId, userId) {
  const r = await pool.query(`
    SELECT r.*, t.name AS template_name, t.template_key
    FROM resumes r
    LEFT JOIN templates t ON t.id=r.template_id
    WHERE r.id=$1 AND r.user_id=$2
  `, [resumeId, userId]);
  if (!r.rows.length) return null;

  const resume = r.rows[0];

  const [education, experience, projects, skills] = await Promise.all([
    pool.query("SELECT * FROM education WHERE resume_id=$1 ORDER BY id", [resumeId]),
    pool.query("SELECT * FROM experience WHERE resume_id=$1 ORDER BY id", [resumeId]),
    pool.query("SELECT * FROM projects WHERE resume_id=$1 ORDER BY id", [resumeId]),
    pool.query(`SELECT s.* FROM skills s JOIN resume_skills rs ON rs.skill_id=s.id WHERE rs.resume_id=$1 ORDER BY s.name`, [resumeId])
  ]);

  return {
    ...resume,
    education: education.rows,
    experience: experience.rows,
    projects: projects.rows,
    skills: skills.rows
  };
}

router.get("/", auth, async (req,res) => {
  const result = await pool.query(`
    SELECT r.id,r.title,r.updated_at,t.name AS template_name
    FROM resumes r LEFT JOIN templates t ON t.id=r.template_id
    WHERE r.user_id=$1 ORDER BY r.updated_at DESC
  `,[req.user.id]);
  res.json(result.rows);
});

router.get("/:id", auth, async (req,res) => {
  const resume = await getResume(req.params.id, req.user.id);
  if (!resume) return res.status(404).json({message:"Resume not found"});
  res.json(resume);
});

router.post("/", auth, async (req,res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const b = req.body;
    const r = await client.query(`
      INSERT INTO resumes(user_id,title,template_id,objective,summary,phone,location,linkedin_url,github_url,portfolio_url)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id
    `,[req.user.id,b.title || "My Resume",b.template_id || 1,b.objective||"",b.summary||"",b.phone||"",b.location||"",b.linkedin_url||"",b.github_url||"",b.portfolio_url||""]);
    const id = r.rows[0].id;
    await saveChildren(client,id,b);
    await saveVersion(client,id,b);
    await client.query("COMMIT");
    res.status(201).json(await getResume(id,req.user.id));
  } catch(e) {
    await client.query("ROLLBACK"); console.error(e); res.status(500).json({message:"Could not create resume"});
  } finally { client.release(); }
});

router.put("/:id", auth, async (req,res) => {
  const client = await pool.connect();
  try {
    const check = await client.query("SELECT id FROM resumes WHERE id=$1 AND user_id=$2",[req.params.id,req.user.id]);
    if (!check.rows.length) return res.status(404).json({message:"Resume not found"});

    await client.query("BEGIN");
    const b=req.body;
    await client.query(`
      UPDATE resumes SET title=$1,template_id=$2,objective=$3,summary=$4,phone=$5,location=$6,
      linkedin_url=$7,github_url=$8,portfolio_url=$9,updated_at=CURRENT_TIMESTAMP
      WHERE id=$10
    `,[b.title||"My Resume",b.template_id||1,b.objective||"",b.summary||"",b.phone||"",b.location||"",b.linkedin_url||"",b.github_url||"",b.portfolio_url||"",req.params.id]);

    await client.query("DELETE FROM education WHERE resume_id=$1",[req.params.id]);
    await client.query("DELETE FROM experience WHERE resume_id=$1",[req.params.id]);
    await client.query("DELETE FROM projects WHERE resume_id=$1",[req.params.id]);
    await client.query("DELETE FROM resume_skills WHERE resume_id=$1",[req.params.id]);
    await saveChildren(client,req.params.id,b);
    await saveVersion(client,req.params.id,b);
    await client.query("COMMIT");
    res.json(await getResume(req.params.id,req.user.id));
  } catch(e) {
    await client.query("ROLLBACK"); console.error(e); res.status(500).json({message:"Could not update resume"});
  } finally { client.release(); }
});

router.delete("/:id", auth, async (req,res)=>{
  const result=await pool.query("DELETE FROM resumes WHERE id=$1 AND user_id=$2 RETURNING id",[req.params.id,req.user.id]);
  if(!result.rows.length) return res.status(404).json({message:"Resume not found"});
  res.json({message:"Resume deleted"});
});

async function saveChildren(client,id,b) {
  for (const e of b.education || []) {
    if (!e.institution || !e.degree) continue;
    await client.query(`INSERT INTO education(resume_id,institution,degree,field,start_year,end_year,grade) VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [id,e.institution,e.degree,e.field||"",e.start_year||"",e.end_year||"",e.grade||""]);
  }
  for (const e of b.experience || []) {
    if (!e.company || !e.position) continue;
    await client.query(`INSERT INTO experience(resume_id,company,position,subheading,start_date,end_date,current_job,description) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id,e.company,e.position,e.subheading||"",e.start_date||"",e.end_date||"",!!e.current_job,e.description||""]);
  }
  for (const p of b.projects || []) {
    if (!p.title) continue;
    await client.query(`INSERT INTO projects(resume_id,title,technologies,description,project_url) VALUES($1,$2,$3,$4,$5)`,
      [id,p.title,p.technologies||"",p.description||"",p.project_url||""]);
  }
  for (const s of b.skills || []) {
    const name = typeof s === "string" ? s : s.name;
    if (!name) continue;
    const sr=await client.query("INSERT INTO skills(name) VALUES($1) ON CONFLICT(name) DO UPDATE SET name=EXCLUDED.name RETURNING id",[name.trim()]);
    await client.query("INSERT INTO resume_skills(resume_id,skill_id) VALUES($1,$2) ON CONFLICT DO NOTHING",[id,sr.rows[0].id]);
  }
}

async function saveVersion(client,id,b) {
  const vr=await client.query("SELECT COALESCE(MAX(version_number),0)+1 AS n FROM resume_versions WHERE resume_id=$1",[id]);
  await client.query("INSERT INTO resume_versions(resume_id,version_number,resume_data) VALUES($1,$2,$3)",[id,vr.rows[0].n,JSON.stringify(b)]);
}

module.exports = { router, getResume };
