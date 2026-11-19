"""LLM service providing Groq completions and fallback stub generators for AI Copilot."""

from __future__ import annotations

import json
import logging
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def generate_completion(
    messages: list[dict[str, str]],
    model: str | None = None,
    temperature: float = 0.2,
    max_tokens: int = 600,
) -> str:
    """Generate completion using Groq (OpenAI-compatible) or deterministic fallback stub."""
    provider = (settings.LLM_PROVIDER or "stub").lower()
    api_key = settings.LLM_API_KEY
    chosen_model = model or settings.LLM_MODEL or "openai/gpt-oss-120b"

    if provider == "groq" and api_key:
        try:
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": chosen_model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            response = httpx.post(
                "https://api.groq.com/openai/v1/chat/completions",
                json=payload,
                headers=headers,
                timeout=12.0,
            )
            if response.status_code == 200:
                data = response.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                if content and content.strip():
                    return content.strip()
            else:
                logger.warning("Groq API returned %s: %s", response.status_code, response.text)
        except Exception as exc:
            logger.warning("Groq API call failed (%s), using fallback stub", exc)

    # Deterministic fallback stub
    return _generate_stub_response(messages)


def _generate_stub_response(messages: list[dict[str, str]]) -> str:
    user_prompt = ""
    for m in reversed(messages):
        if m.get("role") == "user":
            user_prompt = m.get("content", "")
            break

    lower = user_prompt.lower()
    if "candidate" in lower or "match" in lower or "teammate" in lower:
        return (
            "Recommended candidate brings strong complementary skills aligned with your squad's target gaps. "
            "Their proficiency in missing technical categories and matching domain interest make them an ideal teammate."
        )
    if "task" in lower or "decompose" in lower or "sprint" in lower:
        return json.dumps([
            {
                "title": "Set up Backend API & Data Models",
                "description": "Initialize database schema, SQLAlchemy models, and core REST routes.",
                "priority": "high",
                "category": "Backend",
            },
            {
                "title": "Build Frontend Core Layout & Navigation",
                "description": "Construct UI pages, state management, and responsive views.",
                "priority": "high",
                "category": "Frontend",
            },
            {
                "title": "Implement Domain Business Logic & Algorithmic Layer",
                "description": "Implement triage, scoring, or computational routines required by problem statement.",
                "priority": "high",
                "category": "Backend",
            },
            {
                "title": "Integrate API Client with Frontend Views",
                "description": "Connect UI components with backend endpoints and error banners.",
                "priority": "medium",
                "category": "Frontend",
            },
            {
                "title": "Seed Realistic Demo Data & Prepare Pitch Flow",
                "description": "Create sample records and polish demo walkthrough for judging evaluation.",
                "priority": "medium",
                "category": "General",
            },
        ])

    return (
        "Based on your hackathon problem requirements, I recommend prioritizing modular system design, "
        "clean separation between presentation and data layers, and deterministic validation."
    )


def explain_candidate_match(
    candidate_name: str,
    candidate_skills: list[str],
    candidate_roles: list[str],
    missing_categories: list[str],
    problem_title: str,
) -> str:
    prompt = (
        f"You are HackNova's team formation assistant. Explain in 2 concise sentences why candidate '{candidate_name}' "
        f"(Skills: {', '.join(candidate_skills) or 'None listed'}, Preferred Roles: {', '.join(candidate_roles) or 'Flexible'}) "
        f"is a great match for a squad working on problem '{problem_title}' that currently needs skills in {', '.join(missing_categories) or 'general roles'}."
    )
    return generate_completion([
        {"role": "system", "content": "You are a concise hackathon team advisor. Respond directly with 2 helpful sentences."},
        {"role": "user", "content": prompt},
    ], max_tokens=150)


def decompose_problem_tasks(
    problem_title: str,
    problem_description: str,
    required_tech: str | None = None,
) -> list[dict[str, Any]]:
    prompt = (
        f"Decompose the following hackathon problem into 5-6 actionable sprint tasks:\n"
        f"Problem: {problem_title}\n"
        f"Description: {problem_description}\n"
        f"Technologies: {required_tech or 'Full Stack'}\n\n"
        f"Return ONLY a JSON array of objects with keys: title, description, priority ('high'/'medium'/'low'), category ('Backend'/'Frontend'/'AI/ML'/'UI/UX'/'General')."
    )
    raw = generate_completion([
        {"role": "system", "content": "You are a technical hackathon architect. Output JSON only, no markdown backticks."},
        {"role": "user", "content": prompt},
    ], max_tokens=700)

    try:
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]
            if cleaned.endswith("```"):
                cleaned = cleaned.rsplit("```", 1)[0]
        parsed = json.loads(cleaned.strip())
        if isinstance(parsed, list) and len(parsed) > 0:
            return parsed
    except Exception:
        pass

    # Fallback to default structured tasks
    return [
        {
            "title": f"Setup Architecture for {problem_title}",
            "description": "Initialize repository structure, environment variables, and base configuration.",
            "priority": "high",
            "category": "Backend",
        },
        {
            "title": "Design Core Data Models & Database Schema",
            "description": "Build models and tables needed for tracking problem domain entities.",
            "priority": "high",
            "category": "Backend",
        },
        {
            "title": "Build Frontend Dashboard & Core User Flows",
            "description": "Implement responsive layouts and input forms for target users.",
            "priority": "high",
            "category": "Frontend",
        },
        {
            "title": "Integrate Endpoints & Live Data",
            "description": "Wire frontend with REST APIs, handle loading states and validation.",
            "priority": "medium",
            "category": "Frontend",
        },
        {
            "title": "Testing & Demo Presentation Preparation",
            "description": "Verify user workflows and prepare concise 3-minute pitch.",
            "priority": "medium",
            "category": "General",
        },
    ]


def copilot_chat_response(
    team_name: str,
    problem_title: str,
    problem_desc: str,
    user_message: str,
    history: list[dict[str, str]],
) -> str:
    system_prompt = (
        f"You are HackNova Copilot, an AI technical mentor for team '{team_name}'. "
        f"They are building a solution for the hackathon problem '{problem_title}'. "
        f"Problem overview: {problem_desc}. "
        f"Provide direct, actionable, practical technical guidance and architectural advice."
    )
    messages = [{"role": "system", "content": system_prompt}]
    for h in history[-6:]:
        if h.get("role") in ("user", "assistant") and h.get("content"):
            messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": user_message})

    return generate_completion(messages, max_tokens=400)
