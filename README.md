# AI-Powered Resume Builder

A complete CSE semester project using:
- Node.js
- Express.js
- PostgreSQL
- JWT authentication
- AI-assisted resume rewriting (optional OpenAI API)
- Rule-based NLP/ATS fallback
- PDF and DOCX export
- Blue-gray UI palette: #6A89A7, #BDDDFC, #88BDF2, #384959
- Skill suggestions with compact skill rows
- Live right-side resume preview while editing
- Month/year calendar pickers for education and experience
- Current-job support with disabled end date and Present output
- Optional experience subheading
- Rotating AI summary improvements on repeated clicks
- Responsive HTML/CSS/JavaScript frontend

## 1. Requirements

Install:
1. Node.js 18+ (Node 20 or 22 LTS recommended)
2. PostgreSQL
3. VS Code or another editor

## 2. Database

Open pgAdmin Query Tool or psql and run:

    database/schema.sql

The schema creates the `resume_builder` database plus all required tables.

If your PostgreSQL installer created a different password, use that password in `.env`.

## 3. Backend setup

Open a terminal in `backend`:

    npm install

Copy `.env.example` to `.env` and edit the PostgreSQL password and JWT secret.

Optional:
    OPENAI_API_KEY=your_key_here

Without an OpenAI key, the application still provides:
- keyword extraction
- skill matching
- ATS analysis
- rule-based content suggestions

Start:

    npm run dev

or:

    npm start

Open:
    http://localhost:5003

## 4. Demo account

Register a new account from the Login/Register page.

## 5. Main API routes

POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me

GET  /api/resumes
POST /api/resumes
GET  /api/resumes/:id
PUT  /api/resumes/:id
DELETE /api/resumes/:id

POST /api/ai/analyze-job
POST /api/ai/improve
POST /api/ai/ats-check

GET /api/templates
GET /api/skills

GET /api/export/:id/pdf
GET /api/export/:id/docx

## 6. Important

Never commit `.env` to GitHub. It contains database credentials and potentially an AI API key.
