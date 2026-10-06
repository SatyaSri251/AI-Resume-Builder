const express = require("express");
const auth = require("../middleware/auth");
const { analyzeJob, improveText } = require("../services/aiService");
const { atsCheck } = require("../utils/keywords");
const { getResume } = require("./resumes");
const pool = require("../config/db");

const router=express.Router();

router.post("/analyze-job",auth,async(req,res)=>{
  const {title="",description=""}=req.body;
  if(!description.trim()) return res.status(400).json({message:"Job description is required"});
  try {
    const analysis=await analyzeJob(description);
    const job=await pool.query("INSERT INTO job_descriptions(user_id,title,description) VALUES($1,$2,$3) RETURNING id",[req.user.id,title,description]);
    const id=job.rows[0].id;
    for(const k of analysis.keywords||[]) {
      await pool.query("INSERT INTO job_keywords(job_id,keyword) VALUES($1,$2)",[id,k]);
    }
    res.json({...analysis,jobId:id});
  } catch(e) { console.error(e); res.status(500).json({message:"Job analysis failed"}); }
});

router.post("/improve",auth,async(req,res)=>{
  const {text,section="summary",iteration=1}=req.body;
  if(!text?.trim()) return res.status(400).json({message:"Text is required"});
  try { res.json({improved:await improveText(text,section,iteration)}); }
  catch(e) { console.error(e); res.status(500).json({message:"AI improvement failed"}); }
});

router.post("/ats-check",auth,async(req,res)=>{
  const {resumeId,jobDescription=""}=req.body;
  try {
    const resume=await getResume(resumeId,req.user.id);
    if(!resume) return res.status(404).json({message:"Resume not found"});
    const normalized={
      ...resume,
      educationText:JSON.stringify(resume.education),
      experienceText:JSON.stringify(resume.experience),
      projectsText:JSON.stringify(resume.projects),
      skillsText:resume.skills.map(s=>s.name).join(" ")
    };
    res.json(atsCheck(normalized,jobDescription));
  } catch(e) { console.error(e); res.status(500).json({message:"ATS check failed"}); }
});

module.exports=router;
