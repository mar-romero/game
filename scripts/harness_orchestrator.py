#!/usr/bin/env python3
"""Small, deterministic request router for the repository's Codex workflow.

It recommends methods, skills, roles, and per-role model settings. It does not
call a model, infer provider availability, or perform external side effects.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
MODEL_POLICY = ROOT / "harness" / "model-routing.json"

RISK_PATTERNS = {
    "R3": [r"\b(deploy|deployment|production|prod|publish|push to main|merge|release|destructive|irreversible|borrar.*datos|producci[oó]n|desplegar|publicar|subir a main|fusionar|lanzar)\b", r"\b(secret|credential|private key|auth bypass|security critical|secreto|credencial|clave privada)\b"],
    "R2": [r"\b(database|postgres|migration|schema|persistence|transaction|concurren|auth|login|oauth|authentication|authorization|payment|financial|external api|calculation|formula|reward|economy|balance|orchestrator|multi.?agent|model routing|agent routing|hooks?|base de datos|migraci[oó]n|esquema|persistencia|autenticaci[oó]n|autorizaci[oó]n|pagos|financier|c[aá]lculo|f[oó]rmula|recompensa|econom[ií]a|balance|orquestador|orquestaci[oó]n|enrutamiento de agentes|selecci[oó]n de modelos|hooks?)\b"],
    "R1": [r"\b(fix|bug|feature|implement|refactor|ui|ux|gameplay|balance|connect\w*|wire\w*|integrat\w*|orchestrat\w*|route\w*|correg\w*|error|funci[oó]n|implementar|interfaz|jugabilidad|conect\w*|integr\w*|orquest\w*|enrut\w*)\b"],
}
RISK_PATTERNS["R1"].append(r"\b(hud|canvas|responsive|viewport|layout|css|html|bot[oó]n(?:es)?|mapa|pantalla|controles|mejor\w*)\b")
RISK_PATTERNS["R1"].append(r"\b(crea\w*|agreg\w*|implement\w*|modific\w*|cambi\w*|actualiz\w*|correg\w*|corrig\w*|reorganiz\w*|conect\w*)\b")
RISK_RANK = {"R0": 0, "R1": 1, "R2": 2, "R3": 3}


def _matches(text: str, patterns: list[str]) -> bool:
    return any(re.search(pattern, text, re.IGNORECASE) for pattern in patterns)


def _risk(text: str) -> str:
    inferred = "R0"
    for risk in ("R1", "R2", "R3"):
        if _matches(text, RISK_PATTERNS[risk]):
            inferred = risk
    explicit = re.search(r"\b(?:risk|riesgo)\s*:?\s*R([0-3])\b", text, re.IGNORECASE)
    if explicit:
        inferred = max(inferred, f"R{explicit.group(1)}", key=RISK_RANK.get)
    return inferred


def _route(text: str) -> dict[str, Any]:
    review_request = _matches(text, [r"\b(review|code review|audit|revisa|revis[aá]|audita|auditor[ií]a)\b"])
    change_request = _matches(text, [
        r"\b(implement|build|create|add|change|modify|fix|refactor|update|write|reorganize|connect|publish|deploy|delete|remove|implementar|construir|crear|agregar|a[ñn]adir|cambiar|modificar|corregir|refactorizar|actualizar|escribir|reorganizar|conectar|publicar|desplegar|borrar|eliminar|subir)\b",
        r"\bplease\s+(make|build|add|fix|change)\b",
    ])
    question_only = not change_request and _matches(text, [
        r"\b(explain|what is|how does|why does|which|compare|review|inspect|read|explain|explic[aá]|qu[eé] es|c[oó]mo|por qu[eé]|cu[aá]l|compar[aá]|revisa|revis[aá]|inspecciona|lee|faltan cosas)\b",
    ])
    research_only = not change_request and _matches(text, [
        r"\b(research only|investigate only|solo investigar|solo investigaci[oó]n)\b"
    ])
    change_request = change_request or _matches(text, [r"\b(mejor\w*|crea\w*|agreg\w*|implement\w*|modific\w*|cambi\w*|actualiz\w*|correg\w*|corrig\w*|reorganiz\w*|conect\w*)\b"])
    question_only = question_only and not change_request
    research_only = research_only and not change_request
    risk = _risk(text)
    if review_request and risk == "R0":
        risk = "R1"
    rdd = _matches(text, [
        r"\b(unknown|unclear|ambiguous|research|investigate|compare|evaluate|new product|architecture|trade.?off|external api|migrate|desconocid|ambigu|investig|compar|evalu|arquitectura|api externa|nuevo producto|decisi[oó]n de dise[nñ]o)\b"
    ])
    visual_only = _matches(text, [r"\b(css|visual|copy|wording|asset|ui polish|ux|solo visual|texto|imagen|estilo|interfaz visual)\b"])
    visual_only = visual_only or _matches(text, [r"\b(hud|canvas|responsive|layout|bot[oó]n(?:es)?|mapa|pantalla|controles)\b"])
    legacy = _matches(text, [r"\b(legacy|brownfield|characterization|unknown behavior|c[oó]digo legado|comportamiento desconocido|refactor amplio)\b"])
    spike = _matches(text, [r"\b(spike|unknown contract|uncertain api|prototype first|contrato desconocido|prototipo primero|api incierta)\b"])
    behavior_bug = _matches(text, [r"\b(bug|regression|incorrect|broken|calculation|validator|parser|serialization|state machine|regresi[oó]n|c[aá]lculo|incorrecto|roto|validador)\b"])
    doc_only = _matches(text, [r"\b(documentation|docs|readme|documentaci[oó]n|instrucciones de uso)\b"]) and not _matches(text, [r"\b(code|implementation|behavior|logic|backend|frontend|api behavior|c[oó]digo|comportamiento|l[oó]gica|implementar|funci[oó]n)\b"])

    gameplay_signal = _matches(text, [r"\b(arena|match.engine|gameplay|jugabilidad|partida|combate|bot|bots|civilization|civilizaci[oó]n|empire|imperio|progresi[oó]n|econom[ií]a del juego|matchmaking)\b"])
    ui_signal = _matches(text, [r"\b(ui|ux|hud|canvas|responsive|viewport|layout|css|html|interfaz|bot[oó]n|botones|mapa|pantalla|controles|touch|pointer|iframe)\b"])
    persistence_signal = _matches(text, [r"\b(supabase|sql|schema|migration|migraci[oó]n|rls|rpc|persist|persistence|persistencia|save|guardado|auth|login|profile|perfil|sync|sincronizaci[oó]n|database|base de datos)\b"])
    balance_signal = _matches(text, [r"\b(balance|balancing|tuning|balanceo|equilibrio|simulat|simulaci[oó]n|simulador|win rate|tasa de victoria|econom[ií]a|economy|seed|semilla|matchup|enfrentamiento)\b"])

    if question_only or research_only or (doc_only and not behavior_bug):
        tdd = "not_applicable"
    elif spike:
        tdd = "spike_then_tdd"
    elif legacy:
        tdd = "characterization_then_tdd"
    elif visual_only:
        tdd = "test_after_allowed"
    elif risk in {"R2", "R3"} or behavior_bug:
        tdd = "tdd_required"
    elif risk == "R1":
        tdd = "tdd_preferred"
    else:
        tdd = "test_after_allowed"

    skills = ["harness-mvp"] if question_only or research_only else ["harness-mvp", "software-engineering"]
    if gameplay_signal:
        skills.append("gameplay-domain")
    if ui_signal:
        skills.append("browser-game-ui")
    if persistence_signal:
        skills.append("supabase-data")
    if balance_signal:
        skills.append("game-balance")
    if rdd:
        skills.append("rdd")
    if not question_only and not research_only and risk != "R0":
        skills.append("sdd")
    if not doc_only and not question_only and not research_only:
        skills.extend(["test-strategy", "adaptive-tdd", "implementation-loop"])
    if not question_only and (risk in {"R2", "R3"} or _matches(text, RISK_PATTERNS["R2"] + RISK_PATTERNS["R3"])):
        skills.extend(["independent-review", "verification"])
    if review_request:
        skills.append("independent-review")
    if not question_only and _matches(text, [r"\b(auth|login|oauth|security|secret|credential|token|inyecci[oó]n|seguridad|secreto|credencial)\b"]):
        skills.append("harness-mvp")
    skills = list(dict.fromkeys(skills))

    roles: list[str] = []
    if gameplay_signal and risk != "R0":
        roles.append("gameplay_specialist")
    if ui_signal and risk != "R0":
        roles.append("web_game_ui_specialist")
    if persistence_signal and risk != "R0":
        roles.append("supabase_specialist")
    if balance_signal and risk != "R0":
        roles.append("balance_specialist")
    if not question_only and (risk != "R0" or rdd):
        roles.append("explorer")
    if rdd and (not question_only or risk in {"R2", "R3"}):
        roles.append("docs_researcher")
    if not question_only and not research_only and (risk in {"R2", "R3"} or rdd):
        roles.append("planner")
    if not question_only and tdd in {"tdd_required", "characterization_then_tdd", "spike_then_tdd"}:
        roles.append("test_designer")
    if risk != "R0" and not doc_only and not question_only and not research_only:
        roles.append("implementer")
    if risk in {"R1", "R2", "R3"} and not doc_only and not question_only and not research_only:
        roles.append("reviewer")
    elif review_request:
        roles.append("reviewer")
    if risk in {"R2", "R3"} and not question_only and not research_only:
        roles.append("verifier")
    if (risk == "R3" or _matches(text, RISK_PATTERNS["R3"] + [r"\b(auth|authorization|authentication|security|secret|token|seguridad|autenticaci[oó]n|autorizaci[oó]n)\b"])) and not question_only and not research_only:
        roles.append("security_reviewer")

    policy = json.loads(MODEL_POLICY.read_text(encoding="utf-8"))
    models = {
        role: {
            "class": model_class,
            **policy["classes"][model_class],
            **policy.get("risk_overrides", {}).get(risk, {}).get(role, {}),
        }
        for role, model_class in policy["role_class"].items()
        if role in roles
    }
    stages = ["ANSWER"] if question_only else (["EXPLORE"] if "explorer" in roles else [])
    specialists = [role for role in roles if role.endswith("_specialist")]
    if specialists:
        stages.append("DOMAIN_SPECIALIST_INPUT")
    if rdd:
        stages.append("RDD")
    if not question_only and not research_only:
        stages.append("SDD" if risk != "R0" else "LIGHT_SPEC")
    if tdd in {"tdd_required", "characterization_then_tdd", "spike_then_tdd", "tdd_preferred"}:
        stages.extend(["BDD_SCENARIOS", "TDD_" + tdd.upper()])
    if "implementer" in roles:
        stages.extend(["IMPLEMENT", "CHECKS"])
    if "reviewer" in roles:
        stages.append("REVIEW")
    if "verifier" in roles:
        stages.append("VERIFY")
    stages.append("CLOSE")

    return {
        "request_type": "question_or_read_only" if question_only else ("research_only" if research_only else "change_or_execution"),
        "risk": risk,
        "rdd": {"required": rdd, "skill": "rdd" if rdd else None},
        "sdd": {"required": not question_only and not research_only and risk != "R0", "skill": "sdd" if not question_only and not research_only and risk != "R0" else None},
        "tdd_mode": tdd,
        "stages": stages,
        "skills": skills,
        "additional_references": [".agents/skills/harness-mvp/prompt-injection-defense.md"] if "security_reviewer" in roles else [],
        "roles": roles,
        "model_recommendations": models,
        "model_fallback": "If preferred model is not available in this session, inherit the parent model; never claim it was selected.",
        "delegation": "AGENTS.md explicitly requires routed roles for R1-R3 when available; R0 stays with the coordinator. Read-only roles never edit.",
        "human_gate": risk == "R3",
    }


def hook() -> int:
    try:
        payload = json.load(sys.stdin)
        prompt = str(payload.get("prompt", ""))
        route = _route(prompt)
        context = (
            "Repository harness route (advisory deterministic classification): "
            + json.dumps(route, ensure_ascii=False, separators=(",", ":"))
            + " Read each listed skill's SKILL.md before applying it. Apply stages in order. "
              "Use model_recommendations when invoking routed roles, subject to runtime availability. "
              "R3 requires explicit human approval before external or irreversible effects."
        )
        output = {"hookSpecificOutput": {"hookEventName": "UserPromptSubmit", "additionalContext": context}}
        print(json.dumps(output, ensure_ascii=False))
        return 0
    except Exception as exc:  # Fail open; AGENTS.md remains the durable policy.
        print(json.dumps({"hookSpecificOutput": {"hookEventName": "UserPromptSubmit", "additionalContext": f"Harness router unavailable ({type(exc).__name__}); follow AGENTS.md and docs/AGENT_WORKFLOW.md manually."}}))
        return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("route", "hook"))
    parser.add_argument("request", nargs="?", help="User request text for route command")
    args = parser.parse_args()
    if args.command == "hook":
        return hook()
    text = args.request or sys.stdin.read()
    print(json.dumps(_route(text), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
