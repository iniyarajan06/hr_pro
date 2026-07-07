import csv
import io
import os
from openpyxl import Workbook
from reportlab.pdfgen import canvas
from app.core.config import settings

def generate_csv(candidates_data: list, target_path: str):
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    with open(target_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Name", "Email", "ATS Score", "Company Fit Score", "Status", "Skills", "Experience", "Education"])
        for c in candidates_data:
            writer.writerow([c["name"], c["email"], c["score"], c["fit_score"], c["status"], c["skills"], c["experience"], c["education"]])

def generate_xlsx(candidates_data: list, target_path: str):
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    wb = Workbook()
    ws = wb.active
    ws.append(["Name", "Email", "ATS Score", "Company Fit Score", "Status", "Skills", "Experience", "Education"])
    for c in candidates_data:
        ws.append([c["name"], c["email"], c["score"], c["fit_score"], c["status"], c["skills"], c["experience"], c["education"]])
    wb.save(target_path)

def generate_pdf(candidates_data: list, target_path: str):
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    c = canvas.Canvas(target_path)
    c.drawString(100, 800, "ATS Candidate Report")
    y = 750
    for cand in candidates_data:
        text = f"{cand['status'].upper()} | {cand['name']} | {cand['score']} Match | {cand['fit_score']} Fit"
        c.drawString(100, y, text)
        y -= 20
        c.setFont("Helvetica", 8)
        c.drawString(120, y, f"Email: {cand['email']} | Exp: {cand['experience']} | Edu: {cand['education'][:50]}...")
        y -= 30
        c.setFont("Helvetica", 10)
        if y < 100:
            c.showPage()
            y = 800
    c.save()
