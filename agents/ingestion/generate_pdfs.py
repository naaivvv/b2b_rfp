import os
from fpdf import FPDF

def create_pdf(filename, title, content):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=12)
    
    # Title
    pdf.set_font("Helvetica", style="B", size=16)
    pdf.cell(200, 10, txt=title, ln=True, align="C")
    pdf.ln(10)
    
    # Body
    pdf.set_font("Helvetica", size=12)
    pdf.multi_cell(0, 10, txt=content)
    
    pdf.output(filename)
    print(f"Created {filename}")

# 1. Company Technical Profile
tech_content = """
Company Name: TechNova Solutions
Founded: 2015
Headquarters: San Francisco, CA

Overview:
TechNova Solutions is an enterprise software development firm specializing in cloud-native applications, 
multi-tenant SaaS platforms, and enterprise system integrations. Our core mission is to accelerate 
digital transformation for healthcare and government sectors.

Technical Capabilities:
We utilize a modern technology stack to deliver scalable solutions:
- Frontend: React, Next.js, TypeScript, Tailwind CSS.
- Backend: Node.js, Python, FastAPI, Postgres (Supabase).
- Cloud Infrastructure: AWS, Vercel, Docker, Kubernetes.
- AI & Machine Learning: Retrieval-Augmented Generation (RAG), OpenAI, Anthropic, HuggingFace embeddings.

Our team consists of 150+ engineers, architects, and compliance officers dedicated to delivering 
high-quality, robust software solutions with a 99.99% uptime guarantee.
"""

# 2. Security Compliance Playbook
security_content = """
TechNova Solutions - Security & Compliance Playbook

Data Protection:
At TechNova, security is our top priority. All data at rest is encrypted using AES-256 encryption. 
Data in transit is secured via TLS 1.3. We enforce strict Role-Based Access Control (RBAC) across 
all our systems and infrastructure.

Certifications & Compliance:
We are fully compliant with industry standards required for enterprise, government, and healthcare systems.
- SOC 2 Type II Certified: Annually audited by third-party security firms.
- ISO 27001 Certified: Information Security Management System (ISMS) verified.
- HIPAA Compliant: Complete support for Business Associate Agreements (BAA) and PHI safeguarding.

Incident Response SLA:
Our security operations center operates 24/7/365. We guarantee a 15-minute response time for 
critical security incidents (Severity 1) and full root cause analysis within 48 hours of resolution.
"""

# 3. Past Performance Case Studies
case_studies_content = """
TechNova Solutions - Past Performance & Case Studies

Case Study 1: Department of Public Health (DPH)
Project: Statewide Health Metrics Dashboard
Duration: 18 months
Overview: TechNova built a scalable, HIPAA-compliant React and PostgreSQL application to aggregate 
health metrics across 50+ regional hospitals. The system currently handles over 5 million daily 
transactions with 99.995% uptime.

Case Study 2: Global Logistics Corp
Project: Cloud Infrastructure Modernization
Duration: 12 months
Overview: We migrated legacy on-premise logistics tracking software to a cloud-native architecture 
using AWS and Node.js. This migration reduced infrastructure costs by 40% and improved API response 
times by over 300%. We ensured zero downtime during the cutover phase.

These successful engagements highlight our ability to handle massive scale, stringent compliance, 
and complex technical requirements.
"""

# 4. Actual RFP for Testing
rfp_content = """
ACME CORP - REQUEST FOR PROPOSAL (RFP)
Project Name: Enterprise Cloud Modernization & Dashboarding
Issue Date: October 1, 2026
Submission Deadline: December 31, 2026

1. Introduction
Acme Corp is seeking a strategic technology partner to modernize our legacy data infrastructure 
and build a highly responsive, secure web dashboard for our executive team.

2. Technical Requirements
- The vendor must utilize modern frameworks, specifically React for the frontend and PostgreSQL 
  for the database.
- The system must be cloud-native and capable of scaling to 100,000 concurrent users.
- The architecture must support AI-driven insights using open-source embedding models.

3. Compliance Requirements
- The vendor MUST hold an active SOC 2 Type II certification.
- All data must be encrypted at rest (AES-256) and in transit.

4. Evaluation Criteria & Experience
- Vendors will be evaluated based on their past performance. 
- Must provide evidence of successfully delivering a similar project for a government or 
  healthcare entity within the last 3 years.

5. Proposal Submission Format
Please submit a detailed proposal containing:
- Executive Summary
- Technical Approach
- Compliance & Timeline
- Relevant Experience
"""

if __name__ == "__main__":
    out_dir = r"c:\b2b_rfp\agents\ingestion"
    
    # Create 3 knowledge documents
    create_pdf(os.path.join(out_dir, "Company_Technical_Profile.pdf"), "Company Technical Profile", tech_content)
    create_pdf(os.path.join(out_dir, "Security_Compliance_Playbook.pdf"), "Security & Compliance Playbook", security_content)
    create_pdf(os.path.join(out_dir, "Past_Performance_Case_Studies.pdf"), "Past Performance & Case Studies", case_studies_content)
    
    # Create 1 RFP document for testing
    create_pdf(os.path.join(out_dir, "RFP_Acme_Corp_Cloud_Modernization.pdf"), "Acme Corp RFP", rfp_content)
