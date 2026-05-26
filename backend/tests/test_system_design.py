import pathlib

def test_system_design_exists_and_contains_sections():
    doc_path = pathlib.Path("SYSTEM_DESIGN.md")
    assert doc_path.is_file(), "SYSTEM_DESIGN.md does not exist"
    content = doc_path.read_text()
    required_headings = [
        "## Data flow",
        "## Architecture diagram",
        "## Scaling to 10,000 users",
        "## Estimated cost per user/month",
        "## Key bottlenecks",
    ]
    for heading in required_headings:
        assert heading in content, f"Missing heading: {heading}"
