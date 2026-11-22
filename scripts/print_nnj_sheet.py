"""Print print/nnj_clerking_sheet.html to print/NNJ_Clerking_Sheet.pdf (A4) with headless Chrome.

Usage: python3 scripts/print_nnj_sheet.py
"""
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "print", "nnj_clerking_sheet.html")
OUT = os.path.join(ROOT, "print", "NNJ_Clerking_Sheet.pdf")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def main() -> int:
    cmd = [
        CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
        "--allow-file-access-from-files", "--virtual-time-budget=3000",
        f"--print-to-pdf={OUT}", "file://" + SRC,
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    print(OUT)
    return 0


if __name__ == "__main__":
    sys.exit(main())
