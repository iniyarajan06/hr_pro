import pytest
from app.services.ats_engine import calculate_ats_score
from app.services.threshold_engine import evaluate_threshold

def test_ats_engine_no_keywords():
    jd_text = "Looking for a Python developer with Django."
    resume_text = "I am a Python developer and I know Django."
    result = calculate_ats_score(jd_text, resume_text, [])
    assert result["score"] > 0
    assert len(result["matched_keywords"]) == 0
    assert len(result["missing_keywords"]) == 0

def test_ats_engine_with_keywords():
    jd_text = "Python developer. Must know React and AWS."
    resume_text = "I am a python developer. I don't know the other things."
    keywords = [
        {"keyword": "Python", "weight": 5},
        {"keyword": "React", "weight": 4},
        {"keyword": "AWS", "weight": 3}
    ]
    result = calculate_ats_score(jd_text, resume_text, keywords)
    assert "Python" in result["matched_keywords"]
    assert "React" in result["missing_keywords"]
    assert "AWS" in result["missing_keywords"]

def test_threshold_empty_rules():
    result = evaluate_threshold([], "AND", {"score": 50})
    assert result["passed"] is True
    assert len(result["failed_rules"]) == 0

def test_threshold_all_pass_and():
    rules = [
        {"field": "score", "op": ">=", "value": 70},
        {"field": "cgpa", "op": ">=", "value": 7.0}
    ]
    data = {"score": 80, "cgpa": 8.0}
    result = evaluate_threshold(rules, "AND", data)
    assert result["passed"] is True
    assert len(result["failed_rules"]) == 0

def test_threshold_one_fail_and():
    rules = [
        {"field": "score", "op": ">=", "value": 70},
        {"field": "cgpa", "op": ">=", "value": 7.0}
    ]
    data = {"score": 80, "cgpa": 6.5}
    result = evaluate_threshold(rules, "AND", data)
    assert result["passed"] is False
    assert len(result["failed_rules"]) == 1
    assert result["failed_rules"][0]["field"] == "cgpa"

def test_threshold_or_logic():
    rules = [
        {"field": "score", "op": ">=", "value": 90},
        {"field": "experience_years", "op": ">=", "value": 5}
    ]
    data = {"score": 85, "experience_years": 6}
    result = evaluate_threshold(rules, "OR", data)
    assert result["passed"] is True
    assert len(result["failed_rules"]) == 0
