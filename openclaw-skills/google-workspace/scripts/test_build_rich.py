#!/usr/bin/env python3
"""Test suite for docs build-rich command.

Tests the local document generation pipeline (docx-js via Node.js).
Does NOT test Drive upload (requires OAuth credentials).

Run:
    python3 scripts/test_build_rich.py
    # Or from the skill directory:
    cd ~/Documents/cgk-platform/openclaw-skills/google-workspace
    python3 scripts/test_build_rich.py
"""
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///

import json
import os
import pathlib
import subprocess
import sys
import tempfile

SCRIPT = pathlib.Path(__file__).parent / "google_workspace.py"
PASS = 0
FAIL = 0
ERRORS = []


def _run_build_rich(spec_json, extra_args=None, expect_fail=False):
    """Run build-rich via subprocess and return (returncode, stdout, stderr)."""
    cmd = [sys.executable, str(SCRIPT), "docs", "build-rich"]
    if extra_args:
        cmd.extend(extra_args)

    result = subprocess.run(
        cmd,
        input=spec_json,
        capture_output=True,
        text=True,
        timeout=60,
    )
    return result.returncode, result.stdout, result.stderr


def _check(name, condition, detail=""):
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f"  PASS: {name}")
    else:
        FAIL += 1
        msg = f"  FAIL: {name}"
        if detail:
            msg += f" -- {detail}"
        print(msg)
        ERRORS.append(name)


def test_all_element_types():
    """Test that all 18 element types render without error."""
    print("\n[TEST] All 18 element types")
    spec = {
        "theme": {"dark": "1A1A2E", "accent": "E94560", "accent2": "0F3460",
                  "lightBg": "F5F5F5", "medGray": "666666"},
        "header": "Test Header",
        "footer": "Test Footer",
        "sections": [{
            "children": [
                {"type": "heading", "level": 1, "text": "Test Heading", "color": "1A1A2E"},
                {"type": "heading", "level": 3, "text": "H3 Test"},
                {"type": "subtitle", "text": "Test Subtitle", "color": "E94560"},
                {"type": "paragraph", "runs": [
                    {"text": "Bold ", "bold": True},
                    {"text": "italic ", "italic": True},
                    {"text": "colored", "color": "FF0000", "size": 14}
                ]},
                {"type": "accentBar", "color": "E94560"},
                {"type": "divider"},
                {"type": "kpiRow", "items": [
                    {"value": "$42K", "label": "Revenue", "bg": "0F3460"},
                    {"value": "3.8x", "label": "ROAS", "bg": "2E7D32"}
                ]},
                {"type": "callout", "title": "Important", "body": "This is a callout.", "bg": "E8F5E9"},
                {"type": "table", "headers": ["A", "B", "C"], "rows": [
                    ["1", "2", "3"],
                    ["4", "5", "6"]
                ], "style": {"headerBg": "0F3460", "zebra": True}},
                {"type": "richTable", "headers": ["#", "Name", "Status"], "rows": [
                    ["1", "Test", {"text": "ACTIVE", "bold": True, "bg": "E8F5E9"}]
                ], "style": {"headerBg": "C62828"}},
                {"type": "bullets", "items": ["First", "Second", "Third"]},
                {"type": "numberedList", "items": ["Step 1", "Step 2"]},
                {"type": "personaCard", "name": "TEST PERSONA", "subtitle": "Test subtitle",
                 "color": "7B1FA2", "bg": "F3E5F5", "allocation": "50%",
                 "fields": {"Field1": "Value1", "Field2": "Value2"}},
                {"type": "conceptHeader", "number": 1, "title": "Test Concept",
                 "personas": [["PERSONA", "7B1FA2"]], "meta": "Test meta"},
                {"type": "tag", "text": "IN PIPELINE", "color": "FFFFFF", "bg": "3949AB"},
                {"type": "spacer", "height": 20},
                {"type": "pageBreak"},
                {"type": "paragraph", "text": "After page break."},
            ]
        }]
    }

    with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as f:
        output_path = f.name

    rc, stdout, stderr = _run_build_rich(
        json.dumps(spec), ["--output", output_path, "--title", "All Elements Test"]
    )

    _check("Exit code 0", rc == 0, f"rc={rc}, stderr={stderr[:200]}")
    _check("Output file created", os.path.exists(output_path))

    if os.path.exists(output_path):
        size = os.path.getsize(output_path)
        _check("Output file non-empty", size > 1000, f"size={size}")
        # Verify it's a valid docx (ZIP with expected OOXML entries)
        try:
            import zipfile
            with zipfile.ZipFile(output_path) as zf:
                names = zf.namelist()
                _check("Has [Content_Types].xml", "[Content_Types].xml" in names)
                _check("Has word/document.xml", "word/document.xml" in names)
                doc_xml = zf.read("word/document.xml").decode("utf-8")
                _check("Has paragraph content", "<w:p " in doc_xml or "<w:p>" in doc_xml)
                _check("Has table content", "<w:tbl>" in doc_xml or "<w:tbl " in doc_xml)
        except Exception as e:
            _check("Valid docx", False, str(e))
        os.unlink(output_path)

    parsed = json.loads(stdout) if stdout.strip() else {}
    _check("JSON output has localPath", "localPath" in parsed)
    _check("JSON output has title", parsed.get("title") == "All Elements Test")


def test_empty_spec_rejected():
    """Test that empty spec is rejected."""
    print("\n[TEST] Empty spec rejection")
    rc, stdout, stderr = _run_build_rich("{}", ["--output", "/tmp/test_empty.docx"])
    _check("Exit code non-zero", rc != 0)
    _check("Error mentions sections", "sections" in stderr.lower() or "sections" in stdout.lower())


def test_empty_sections_rejected():
    """Test that spec with empty sections is rejected."""
    print("\n[TEST] Empty sections rejection")
    spec = {"sections": [{"children": []}]}
    rc, stdout, stderr = _run_build_rich(json.dumps(spec), ["--output", "/tmp/test_empty_sect.docx"])
    _check("Exit code non-zero", rc != 0)
    _check("Error mentions empty", "empty" in stderr.lower() or "empty" in stdout.lower())


def test_no_stdin_no_file():
    """Test that missing input is rejected."""
    print("\n[TEST] No input rejection")
    # Use /dev/null as stdin to simulate no pipe
    result = subprocess.run(
        [sys.executable, str(SCRIPT), "docs", "build-rich", "--output", "/tmp/test_noinput.docx"],
        stdin=subprocess.DEVNULL,
        capture_output=True, text=True, timeout=30,
    )
    _check("Exit code non-zero", result.returncode != 0)


def test_invalid_json():
    """Test that invalid JSON is rejected."""
    print("\n[TEST] Invalid JSON rejection")
    rc, stdout, stderr = _run_build_rich("not json {{{", ["--output", "/tmp/test_badjson.docx"])
    _check("Exit code non-zero", rc != 0)
    _check("Error mentions JSON", "json" in stderr.lower())


def test_ragged_table_rows():
    """Test that tables with more columns in rows than headers don't crash."""
    print("\n[TEST] Ragged table rows")
    spec = {"sections": [{"children": [
        {"type": "table", "headers": ["A", "B"], "rows": [
            ["1", "2", "3", "4"],  # Extra columns
            ["5"],                  # Too few columns
        ]},
        {"type": "richTable", "headers": ["X"], "rows": [
            ["1", "2"],  # Extra column
            [{"text": "rich", "bold": True}, "extra"],  # Extra rich column
        ]},
    ]}]}

    with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as f:
        output_path = f.name

    rc, stdout, stderr = _run_build_rich(json.dumps(spec), ["--output", output_path])
    _check("Exit code 0 (ragged rows handled)", rc == 0, f"stderr={stderr[:200]}")
    if os.path.exists(output_path):
        os.unlink(output_path)


def test_unknown_element_type():
    """Test that unknown element types are skipped with warning."""
    print("\n[TEST] Unknown element type")
    spec = {"sections": [{"children": [
        {"type": "heading", "level": 1, "text": "Valid"},
        {"type": "nonexistent_widget", "data": "whatever"},
        {"type": "paragraph", "text": "Also valid"},
    ]}]}

    with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as f:
        output_path = f.name

    rc, stdout, stderr = _run_build_rich(json.dumps(spec), ["--output", output_path])
    _check("Exit code 0", rc == 0)
    _check("Warning about unknown type", "nonexistent_widget" in stderr)
    if os.path.exists(output_path):
        os.unlink(output_path)


def test_theme_defaults():
    """Test that missing theme keys use defaults."""
    print("\n[TEST] Theme defaults")
    spec = {"sections": [{"children": [
        {"type": "heading", "level": 1, "text": "No Theme Spec"},
        {"type": "accentBar"},  # Should use default accent color
        {"type": "divider"},    # Should use default lightBg
    ]}]}

    with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as f:
        output_path = f.name

    rc, stdout, stderr = _run_build_rich(json.dumps(spec), ["--output", output_path])
    _check("Exit code 0 (default theme)", rc == 0, f"stderr={stderr[:200]}")
    if os.path.exists(output_path):
        os.unlink(output_path)


def test_empty_kpi_row():
    """Test that kpiRow with empty items is skipped with warning."""
    print("\n[TEST] Empty kpiRow")
    spec = {"sections": [{"children": [
        {"type": "heading", "level": 1, "text": "Title"},
        {"type": "kpiRow", "items": []},
    ]}]}

    with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as f:
        output_path = f.name

    rc, stdout, stderr = _run_build_rich(json.dumps(spec), ["--output", output_path])
    _check("Exit code 0", rc == 0)
    _check("Warning about empty kpiRow", "kpiRow" in stderr)
    if os.path.exists(output_path):
        os.unlink(output_path)


def test_image_path_traversal_blocked():
    """Test that images outside media/tmp are blocked."""
    print("\n[TEST] Image path traversal blocked")
    spec = {"sections": [{"children": [
        {"type": "heading", "level": 1, "text": "Title"},
        {"type": "image", "path": "/etc/passwd"},
    ]}]}

    with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as f:
        output_path = f.name

    rc, stdout, stderr = _run_build_rich(json.dumps(spec), ["--output", output_path])
    _check("Exit code 0 (blocked gracefully)", rc == 0)
    _check("Warning about blocked path", "blocked" in stderr.lower() or "outside" in stderr.lower())
    if os.path.exists(output_path):
        os.unlink(output_path)


def test_image_missing_path():
    """Test that image with no path is handled."""
    print("\n[TEST] Image missing path")
    spec = {"sections": [{"children": [
        {"type": "heading", "level": 1, "text": "Title"},
        {"type": "image"},
    ]}]}

    with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as f:
        output_path = f.name

    rc, stdout, stderr = _run_build_rich(json.dumps(spec), ["--output", output_path])
    _check("Exit code 0 (missing path handled)", rc == 0)
    if os.path.exists(output_path):
        os.unlink(output_path)


def test_invalid_hex_colors():
    """Test that invalid hex colors don't crash."""
    print("\n[TEST] Invalid hex colors")
    spec = {"theme": {"dark": "ZZZZZZ", "accent": "short"},
            "sections": [{"children": [
        {"type": "heading", "level": 1, "text": "Bad Colors", "color": "NOTAHEX"},
        {"type": "accentBar", "color": "XYZ"},
    ]}]}

    with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as f:
        output_path = f.name

    rc, stdout, stderr = _run_build_rich(json.dumps(spec), ["--output", output_path])
    _check("Exit code 0 (bad colors handled)", rc == 0, f"stderr={stderr[:200]}")
    if os.path.exists(output_path):
        os.unlink(output_path)


def test_persona_string_list():
    """Test that personas as string list (not pairs) is handled."""
    print("\n[TEST] Persona string list coercion")
    spec = {"sections": [{"children": [
        {"type": "conceptHeader", "number": 1, "title": "Test",
         "personas": ["WANDA", "CHAD"],  # Strings, not pairs
         "meta": "Test"},
    ]}]}

    with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as f:
        output_path = f.name

    rc, stdout, stderr = _run_build_rich(json.dumps(spec), ["--output", output_path])
    _check("Exit code 0 (string personas handled)", rc == 0, f"stderr={stderr[:200]}")
    if os.path.exists(output_path):
        os.unlink(output_path)


def test_special_chars_in_title():
    """Test that special characters in title produce valid filename."""
    print("\n[TEST] Special chars in title")
    spec = {"sections": [{"children": [
        {"type": "heading", "level": 1, "text": "Test"},
    ]}]}

    with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as f:
        output_path = f.name

    rc, stdout, stderr = _run_build_rich(
        json.dumps(spec), ["--output", output_path, "--title", "!!!@#$"]
    )
    _check("Exit code 0 (special title handled)", rc == 0, f"stderr={stderr[:200]}")
    if os.path.exists(output_path):
        os.unlink(output_path)


def test_all_special_chars_title():
    """Test that all-special-chars title uses fallback name."""
    print("\n[TEST] All-special-chars title fallback")
    spec = {"sections": [{"children": [
        {"type": "heading", "level": 1, "text": "Test"},
    ]}]}

    with tempfile.TemporaryDirectory() as td:
        output_path = os.path.join(td, "test.docx")
        rc, stdout, stderr = _run_build_rich(
            json.dumps(spec), ["--output", output_path, "--title", "!!!"]
        )
        _check("Exit code 0", rc == 0, f"stderr={stderr[:200]}")
        if stdout.strip():
            result = json.loads(stdout)
            _check("Title preserved in output", result.get("title") == "!!!")


def test_spec_file_input():
    """Test --spec-file input method."""
    print("\n[TEST] --spec-file input")
    spec = {"sections": [{"children": [
        {"type": "heading", "level": 1, "text": "From File"},
    ]}]}

    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as sf:
        json.dump(spec, sf)
        spec_file = sf.name

    with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as f:
        output_path = f.name

    # Run WITHOUT stdin, using --spec-file instead
    result = subprocess.run(
        [sys.executable, str(SCRIPT), "docs", "build-rich",
         "--spec-file", spec_file, "--output", output_path],
        stdin=subprocess.DEVNULL,
        capture_output=True, text=True, timeout=30,
    )
    _check("Exit code 0", result.returncode == 0, f"stderr={result.stderr[:200]}")
    _check("Output file created", os.path.exists(output_path))
    os.unlink(spec_file)
    if os.path.exists(output_path):
        os.unlink(output_path)


def test_multi_section_with_page_breaks():
    """Test multiple sections with page break control."""
    print("\n[TEST] Multi-section with page breaks")
    spec = {"sections": [
        {"pageBreak": False, "children": [
            {"type": "heading", "level": 1, "text": "Section 1"},
        ]},
        {"pageBreak": True, "children": [
            {"type": "heading", "level": 1, "text": "Section 2"},
        ]},
        {"children": [  # Default pageBreak=True
            {"type": "heading", "level": 1, "text": "Section 3"},
        ]},
    ]}

    with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as f:
        output_path = f.name

    rc, stdout, stderr = _run_build_rich(json.dumps(spec), ["--output", output_path])
    _check("Exit code 0", rc == 0, f"stderr={stderr[:200]}")
    if os.path.exists(output_path):
        os.unlink(output_path)


def test_paragraph_text_shorthand():
    """Test paragraph with plain text (not runs)."""
    print("\n[TEST] Paragraph text shorthand")
    spec = {"sections": [{"children": [
        {"type": "paragraph", "text": "Simple text paragraph"},
        {"type": "paragraph", "runs": "String runs shorthand"},
    ]}]}

    with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as f:
        output_path = f.name

    rc, stdout, stderr = _run_build_rich(json.dumps(spec), ["--output", output_path])
    _check("Exit code 0", rc == 0, f"stderr={stderr[:200]}")
    if os.path.exists(output_path):
        import zipfile
        with zipfile.ZipFile(output_path) as zf:
            doc_xml = zf.read("word/document.xml").decode("utf-8")
            _check("Plain text rendered", "Simple text" in doc_xml)
        os.unlink(output_path)


def test_callout_body_only():
    """Test callout with body but no title."""
    print("\n[TEST] Callout body-only")
    spec = {"sections": [{"children": [
        {"type": "callout", "body": "Body without title", "bg": "FFF3E0"},
    ]}]}

    with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as f:
        output_path = f.name

    rc, stdout, stderr = _run_build_rich(json.dumps(spec), ["--output", output_path])
    _check("Exit code 0", rc == 0)
    if os.path.exists(output_path):
        os.unlink(output_path)


def test_fallback_error_json():
    """Test that fallback error output is valid JSON on stdout."""
    print("\n[TEST] Fallback error JSON format")
    # Trigger an error by providing invalid sections type
    spec = {"sections": "not a list"}
    rc, stdout, stderr = _run_build_rich(json.dumps(spec), ["--output", "/tmp/test_fallback.docx"])
    _check("Exit code non-zero", rc != 0)

    # The error should be parseable JSON on stdout
    if stdout.strip():
        try:
            error = json.loads(stdout)
            _check("Error JSON has 'error' field", error.get("error") is True)
            _check("Error JSON has 'fallbackSteps'", "fallbackSteps" in error)
            _check("Error JSON has 'stage'", "stage" in error)
        except json.JSONDecodeError:
            _check("Stdout is valid JSON", False, f"stdout={stdout[:200]}")
    else:
        _check("Stdout has fallback JSON", False, "stdout empty")


if __name__ == "__main__":
    print("=" * 60)
    print("  Rich Document Builder Test Suite")
    print("=" * 60)

    test_all_element_types()
    test_empty_spec_rejected()
    test_empty_sections_rejected()
    test_no_stdin_no_file()
    test_invalid_json()
    test_ragged_table_rows()
    test_unknown_element_type()
    test_theme_defaults()
    test_empty_kpi_row()
    test_image_path_traversal_blocked()
    test_image_missing_path()
    test_invalid_hex_colors()
    test_persona_string_list()
    test_special_chars_in_title()
    test_all_special_chars_title()
    test_spec_file_input()
    test_multi_section_with_page_breaks()
    test_paragraph_text_shorthand()
    test_callout_body_only()
    test_fallback_error_json()

    print("\n" + "=" * 60)
    print(f"  Results: {PASS} passed, {FAIL} failed")
    if ERRORS:
        print(f"  Failed: {', '.join(ERRORS)}")
    print("=" * 60)
    sys.exit(1 if FAIL > 0 else 0)
