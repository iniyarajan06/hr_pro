import requests

BASE = "http://localhost:8000"

# Test 1: Jobs
r = requests.get(f"{BASE}/jobs", timeout=5)
print(f"Jobs status: {r.status_code}")
jobs = r.json()
print(f"Jobs count: {len(jobs)}")

if not jobs:
    print("No jobs found - please create a job first in the UI")
    exit(0)

jid = jobs[0]["id"]
print(f"First job: ID={jid}, title={jobs[0].get('title','?')}")

# Test 2: Resumes with scores
r2 = requests.get(f"{BASE}/jobs/{jid}/resumes", timeout=5)
print(f"\nResumes status: {r2.status_code}")
resumes = r2.json()
print(f"Resumes count: {len(resumes)}")
for res in resumes[:5]:
    fname = res.get("original_filename", "?")
    status = res.get("status", "?")
    score = res.get("score")
    print(f"  - {fname} | status: {status} | score: {score}")

# Test 3: Candidate ranking
r3 = requests.get(f"{BASE}/jobs/{jid}/ranking", timeout=5)
print(f"\nRanking status: {r3.status_code}")
ranking = r3.json()
print(f"Candidates ranked: {len(ranking)}")
for c in ranking[:5]:
    name = c.get("name", "Processing...")
    score_obj = c.get("score")
    ats = score_obj.get("score") if score_obj else "None"
    shortlisted = c.get("is_shortlisted", False)
    print(f"  Candidate: {name} | ATS: {ats} | Shortlisted: {shortlisted}")

print("\nPipeline verification complete!")
