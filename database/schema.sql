-- AI-Powered Resume Builder
-- PostgreSQL database schema

DROP DATABASE IF EXISTS resume_builder;
CREATE DATABASE resume_builder;

\connect resume_builder;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(80) NOT NULL,
    template_key VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE resumes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    template_id INTEGER REFERENCES templates(id) ON DELETE SET NULL,
    objective TEXT DEFAULT '',
    summary TEXT DEFAULT '',
    phone VARCHAR(40) DEFAULT '',
    location VARCHAR(150) DEFAULT '',
    linkedin_url TEXT DEFAULT '',
    github_url TEXT DEFAULT '',
    portfolio_url TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE education (
    id SERIAL PRIMARY KEY,
    resume_id INTEGER NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    institution VARCHAR(200) NOT NULL,
    degree VARCHAR(150) NOT NULL,
    field VARCHAR(150) DEFAULT '',
    start_year VARCHAR(10) DEFAULT '',
    end_year VARCHAR(10) DEFAULT '',
    grade VARCHAR(50) DEFAULT ''
);

CREATE TABLE experience (
    id SERIAL PRIMARY KEY,
    resume_id INTEGER NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    company VARCHAR(200) NOT NULL,
    position VARCHAR(150) NOT NULL,
    subheading VARCHAR(250) DEFAULT '',
    start_date VARCHAR(30) DEFAULT '',
    end_date VARCHAR(30) DEFAULT '',
    current_job BOOLEAN DEFAULT FALSE,
    description TEXT DEFAULT ''
);

CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    resume_id INTEGER NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    technologies VARCHAR(500) DEFAULT '',
    description TEXT DEFAULT '',
    project_url TEXT DEFAULT ''
);

CREATE TABLE skills (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(100) DEFAULT 'General'
);

CREATE TABLE resume_skills (
    resume_id INTEGER NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    PRIMARY KEY (resume_id, skill_id)
);

CREATE TABLE job_descriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) DEFAULT '',
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE job_keywords (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES job_descriptions(id) ON DELETE CASCADE,
    keyword VARCHAR(150) NOT NULL,
    importance INTEGER DEFAULT 1
);

CREATE TABLE resume_versions (
    id SERIAL PRIMARY KEY,
    resume_id INTEGER NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    resume_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resume_id, version_number)
);

CREATE INDEX idx_resumes_user ON resumes(user_id);
CREATE INDEX idx_education_resume ON education(resume_id);
CREATE INDEX idx_experience_resume ON experience(resume_id);
CREATE INDEX idx_projects_resume ON projects(resume_id);
CREATE INDEX idx_job_user ON job_descriptions(user_id);
CREATE INDEX idx_job_keywords_keyword ON job_keywords(keyword);

INSERT INTO templates (name, description, category, template_key) VALUES
('Modern Professional', 'Clean two-column professional resume', 'General', 'modern'),
('Classic ATS', 'Simple single-column ATS-friendly resume', 'ATS', 'classic'),
('Software Engineer', 'Technical resume optimized for software roles', 'Technology', 'software'),
('Minimal', 'Minimalist one-page style', 'General', 'minimal');

INSERT INTO skills (name, category) VALUES
('Java','Programming'),('Python','Programming'),('JavaScript','Programming'),
('TypeScript','Programming'),('C','Programming'),('C++','Programming'),
('HTML','Frontend'),('CSS','Frontend'),('React','Frontend'),('Angular','Frontend'),
('Node.js','Backend'),('Express.js','Backend'),('Spring Boot','Backend'),
('REST API','Backend'),('PostgreSQL','Database'),('MySQL','Database'),
('MongoDB','Database'),('SQL','Database'),('Git','Tools'),('GitHub','Tools'),
('Docker','DevOps'),('AWS','Cloud'),('Azure','Cloud'),('Machine Learning','AI'),
('Deep Learning','AI'),('NLP','AI'),('TensorFlow','AI'),('PyTorch','AI'),
('Data Structures','Computer Science'),('Algorithms','Computer Science'),
('OOP','Computer Science'),('Linux','Operating Systems'),('Agile','Process'),
('Jira','Tools'),('Communication','Soft Skills'),('Leadership','Soft Skills')
ON CONFLICT (name) DO NOTHING;
