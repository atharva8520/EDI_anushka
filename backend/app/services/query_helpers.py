"""Helper utilities for SQL queries, like escaping and grouping."""

def escape_like(term: str, escape_char: str = "\\") -> str:
    """Escape LIKE wildcards (%, _) and the escape character itself."""
    return (
        term.replace(escape_char, escape_char * 2)
        .replace("%", f"{escape_char}%")
        .replace("_", f"{escape_char}_")
    )
