require("dotenv").config();
const express=require("express");
const cors=require("cors");
const path=require("path");
const { ensureResumeFields }=require("./migrate");

const app=express();
const PORT=process.env.PORT||5003;

app.use(cors());
app.use(express.json({limit:"2mb"}));
app.use(express.urlencoded({extended:true}));

app.get("/api/health",(req,res)=>res.json({status:"ok",service:"AI Resume Builder"}));

app.use("/api/auth",require("./routes/auth"));
app.use("/api/resumes",require("./routes/resumes").router);
app.use("/api/ai",require("./routes/ai"));
app.use("/api/templates",require("./routes/templates"));
app.use("/api/export",require("./routes/export"));

app.use(express.static(path.join(__dirname,"../frontend")));

app.get("*splat",(req,res)=>{
  res.sendFile(path.join(__dirname,"../frontend/index.html"));
});

app.use((err,req,res,next)=>{
  console.error(err);
  res.status(500).json({message:"Internal server error"});
});

ensureResumeFields()
  .then(()=>app.listen(PORT,()=>console.log(`AI Resume Builder running at http://localhost:${PORT}`)))
  .catch(err=>{
    console.error("Database migration failed:",err);
    process.exit(1);
  });
