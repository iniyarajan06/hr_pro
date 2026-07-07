def evaluate_threshold(rules: list[dict], logic: str, candidate_data: dict) -> dict:
    """
    Evaluates a candidate against a set of threshold rules.
    Args:
        rules: list like [{"field": "score", "op": ">=", "value": 70}]
        logic: "AND" | "OR"
        candidate_data: dict containing flat attributes e.g. {"score": 75, "experience_years": 4}
    Returns:
        dict: {"passed": bool, "failed_rules": list}
    """
    if not rules:
        return {"passed": True, "failed_rules": []}

    passed_overall = (logic.upper() == "AND")
    failed_rules = []

    for rule in rules:
        field = rule.get("field")
        op = rule.get("op")
        target = rule.get("value")
        
        actual = candidate_data.get(field)
        
        rule_passed = False
        if actual is not None:
            try:
                # convert type if needed for basic comparisons
                if isinstance(target, (int, float)):
                    actual = float(actual)
                
                if op == ">=": rule_passed = actual >= target
                elif op == "<=": rule_passed = actual <= target
                elif op == ">": rule_passed = actual > target
                elif op == "<": rule_passed = actual < target
                elif op == "==": rule_passed = actual == target
                elif op == "!=": rule_passed = actual != target
            except (ValueError, TypeError):
                rule_passed = False
        
        if logic.upper() == "AND":
            if not rule_passed:
                passed_overall = False
                failed_rules.append(rule)
        else: # OR
            if rule_passed:
                passed_overall = True
            else:
                failed_rules.append(rule)
                
    if logic.upper() == "OR":
        if passed_overall:
            failed_rules = [] # None failed the combination
            
    return {"passed": passed_overall, "failed_rules": failed_rules}
