#!/usr/bin/env python3

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DOC_ROOT = ROOT / ".codex"
CONTEXT_DIR = DOC_ROOT / "context"

REQUIRED_FILES = [
    DOC_ROOT / "rules" / "README.md",
    DOC_ROOT / "rules" / "documentation-loop.md",
    DOC_ROOT / "rules" / "typescript-nextjs.md",
    DOC_ROOT / "rules" / "server-boundaries.md",
    CONTEXT_DIR / "open-interview-overview.md",
    CONTEXT_DIR / "open-interview-architecture.md",
    CONTEXT_DIR / "open-interview-domain.md",
    CONTEXT_DIR / "open-interview-dependencies.md",
    ROOT / ".githooks" / "pre-commit",
]

FEATURE_TAG_PATTERN = re.compile(r"@feature\s+([^\s]+)")
EXPECTED_AGENTS_HEADERS = [
    "## 项目概要",
    "## Context 索引",
]
EXPECTED_AGENTS_CONTEXT_FILES = [
    "open-interview-overview.md",
    "open-interview-architecture.md",
    "open-interview-domain.md",
    "open-interview-dependencies.md",
]


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def collect_feature_targets() -> list[tuple[Path, str]]:
    targets: list[tuple[Path, str]] = []
    for path in (ROOT / "src").rglob("*"):
        if not path.is_file():
            continue
        text = read_text(path)
        for match in FEATURE_TAG_PATTERN.findall(text):
            targets.append((path, match.strip()))
    return targets


def resolve_feature_target(raw: str) -> Path:
    candidate = Path(raw)
    if candidate.is_absolute():
        return candidate
    if "/" not in raw:
        return CONTEXT_DIR / raw
    return ROOT / candidate


def run_check() -> int:
    errors: list[str] = []

    for path in REQUIRED_FILES:
        if not path.exists():
            errors.append(f"缺失必需文件: {path.relative_to(ROOT)}")

    agents_path = ROOT / "AGENTS.md"
    if not agents_path.exists():
        errors.append("缺失 AGENTS.md")
    else:
        agents_text = read_text(agents_path)
        for header in EXPECTED_AGENTS_HEADERS:
            if header not in agents_text:
                errors.append(f"AGENTS.md 缺失区块: {header}")
        for file_name in EXPECTED_AGENTS_CONTEXT_FILES:
            if file_name not in agents_text:
                errors.append(f"AGENTS.md 未索引 Context 文件: {file_name}")

    for source_path, raw_target in collect_feature_targets():
        target_path = resolve_feature_target(raw_target)
        if not target_path.exists():
            errors.append(
                f"{source_path.relative_to(ROOT)} 的 @feature 指向不存在: {raw_target}"
            )

    if errors:
        sys.stderr.write("Isomorphism check failed:\n")
        for error in errors:
            sys.stderr.write(f"- {error}\n")
        return 1

    sys.stdout.write("Isomorphism check passed.\n")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    if not args.check:
        parser.error("只支持 --check")

    return run_check()


if __name__ == "__main__":
    raise SystemExit(main())
