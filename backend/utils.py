def is_placeholder(val: str) -> bool:
    if not val:
        return True
    return val.startswith("your_") or val == "your-key-here"
