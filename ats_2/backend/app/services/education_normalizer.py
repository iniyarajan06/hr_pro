import re

def normalize_education_value(text: str) -> str:
    if not text:
        return "Unknown"
    
    # 1. Basic Cleaning
    # Remove dots, commas, extra spaces, and convert to lowercase
    s = text.lower()
    s = re.sub(r'[^a-z0-9\s]', '', s) # Remove punctuation
    s = re.sub(r'\s+', ' ', s).strip() # Normalize spaces
    
    # 2. Specific Degree Mapping (Stronger Regex / Semantic Matching)
    # Master's Decision & Computing
    if re.search(r'(msc|master.*science).*decision.*computing', s):
        return "M.Sc. Decision and Computing Sciences"
    
    # Schooling - Higher Secondary
    if re.search(r'(class 12|12th|hsc|hslc|higher secondary|xii)', s):
        return "Higher Secondary"
        
    # Schooling - Secondary
    if re.search(r'(class 10|10th|sslc|secondary|x|matriculation)', s):
        return "Secondary"
    
    # Bachelor's Tech/Eng
    if re.search(r'(btech|be|bachelor.*tech|bachelor.*eng).*computer', s):
        return "B.Tech. Computer Science"
    
    # Master's Tech/Eng
    if re.search(r'(mtech|me|master.*tech|master.*eng).*computer', s):
        return "M.Tech. Computer Science"

    # General Abbreviations
    s = re.sub(r'^m tech', 'm.tech', s)
    s = re.sub(r'^b tech', 'b.tech', s)
    s = re.sub(r'^m sc', 'm.sc', s)
    s = re.sub(r'^b sc', 'b.sc', s)
    s = re.sub(r'^mba', 'mba', s)
    s = re.sub(r'^be ', 'b.e ', s)
    s = re.sub(r'^me ', 'm.e ', s)

    # Return slightly cleaned version if no specific match
    # Title Case for better display
    return text.strip()

def get_education_category(normalized_text: str) -> str:
    # Use the same logic but return high-level category
    s = normalized_text.lower()
    
    if s == "higher secondary": return "Higher Secondary"
    if s == "secondary": return "Secondary"
    
    if re.search(r'(ph\.?d|doctorate)', s): return "Doctorate"
    if re.search(r'(m\.?sc|m\.?tech|m\.?b\.?a|master|m\.?a|m\.?phil|mba)', s): return "Master's Degree"
    if re.search(r'(b\.?sc|b\.?tech|b\.?e|b\.?a|bachelor|b\.?com|b\.?b\.?a)', s): return "Bachelor's Degree"
    if re.search(r'(diploma)', s): return "Diploma"
    
    return "Other"
