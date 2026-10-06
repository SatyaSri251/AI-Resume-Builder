const express=require("express");
const pool=require("../config/db");
const router=express.Router();

router.get("/",async(req,res)=>{
  const r=await pool.query("SELECT * FROM templates ORDER BY id");
  res.json(r.rows);
});

router.get("/skills",async(req,res)=>{
  const r=await pool.query("SELECT * FROM skills ORDER BY category,name");
  res.json(r.rows);
});

module.exports=router;
