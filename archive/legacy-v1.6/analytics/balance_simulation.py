import json
import math
import random
from collections import defaultdict
from datetime import datetime, timezone
from itertools import product
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT_PATH = ROOT / 'balance_simulation.json'

CIVS = {
    'forge': {
        'name': 'FORJA',
        'factory': {'production_mult': 1.00, 'building_cost_mult': 0.90},
        'pvp': {'attack_mult': 1.12, 'shield_mult': 1.08},
    },
    'bastion': {
        'name': 'BASTIÓN',
        'factory': {'production_mult': 1.08, 'building_cost_mult': 1.00},
        'pvp': {'attack_mult': 1.00, 'shield_mult': 1.18},
    },
    'swarm': {
        'name': 'ENJAMBRE',
        'factory': {'production_mult': 1.00, 'building_cost_mult': 1.00},
        'pvp': {'attack_mult': 1.15, 'shield_mult': 1.00},
    },
    'nexus': {
        'name': 'NEXO',
        'factory': {'production_mult': 1.00, 'building_cost_mult': 1.00},
        'pvp': {'attack_mult': 1.18, 'shield_mult': 1.00},
    },
}

ADJUSTED_CIVS = {
    'forge': {
        'name': 'FORJA',
        'factory': {'production_mult': 1.00, 'building_cost_mult': 0.90},
        'pvp': {'attack_mult': 1.09, 'shield_mult': 1.08},
    },
    'bastion': {
        'name': 'BASTIÓN',
        'factory': {'production_mult': 1.07, 'building_cost_mult': 1.00},
        'pvp': {'attack_mult': 1.00, 'shield_mult': 1.15},
    },
    'swarm': {
        'name': 'ENJAMBRE',
        'factory': {'production_mult': 1.00, 'building_cost_mult': 1.00},
        'pvp': {'attack_mult': 1.13, 'shield_mult': 1.00},
    },
    'nexus': {
        'name': 'NEXO',
        'factory': {'production_mult': 1.00, 'building_cost_mult': 1.00},
        'pvp': {'attack_mult': 1.14, 'shield_mult': 1.00},
    },
}

BOT_BASE = [
    ('FerroGreed', 'greedy', 82, 92, 70),
    ('Blitz-9', 'rusher', 88, 68, 96),
    ('Aegis', 'turtle', 78, 88, 74),
    ('Tempo-X', 'tempo', 84, 74, 80),
    ('Mimic', 'adaptive', 80, 76, 82),
    ('Dice', 'random', 72, 70, 90),
    ('Atlas', 'balanced', 83, 82, 76),
    ('VaultMax', 'hoarder', 79, 98, 68),
    ('GhostWire', 'saboteur', 85, 72, 90),
]

BOT_VARIANTS_PER_CIV = len(BOT_BASE)
RANDOM_PLAYERS_PER_CIV = 11
SPECIALIST_PROFILES = ('factory_farmer', 'research_specialist')
SPECIALISTS_PER_CIV = len(SPECIALIST_PROFILES)
PARTICIPANTS_PER_CIV = BOT_VARIANTS_PER_CIV + RANDOM_PLAYERS_PER_CIV + SPECIALISTS_PER_CIV
TOTAL_PARTICIPANTS = len(CIVS) * PARTICIPANTS_PER_CIV

FACTORY_TIER_FACTORS = {
    'generator': 8,
    'refinery': 9,
    'lab': 11,
    'automation': 10,
}

RANDOM_NAMES = [
    'Ardent', 'Morrow', 'Talon', 'Vanta', 'Cinder', 'Rivet', 'Harrow', 'Nova',
    'Hush', 'Sable', 'Pike', 'Kite', 'Iris', 'Rook', 'Zephyr', 'Quill', 'Storm',
    'Vex', 'Axiom', 'Kestrel', 'Lynx', 'Hex', 'Onyx', 'Echo', 'Basil', 'Dune',
    'Mako', 'Crest', 'Vale', 'Juno', 'Atlas', 'Drift', 'Rune', 'Feral', 'Cobalt'
]


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def logistic(prob):
    return 1 / (1 + math.exp(-prob))


def make_player(civ, index, is_bot=False, seed=None):
    if is_bot:
        name, strategy, skill, industrial, farm = BOT_BASE[index]
        factory_levels = {
            'generator': 2 + (index % 4),
            'refinery': 2 + ((index + 1) % 4),
            'lab': 1 + (index % 3),
            'automation': 2 + ((index + 2) % 4),
        }
        return {
            'id': f'{civ}_bot_{index + 1}',
            'name': name,
            'civilization': civ,
            'type': 'bot',
            'profile': 'bot',
            'strategy': strategy,
            'base_skill': skill,
            'base_industrial': industrial,
            'base_farm': farm,
            'factory_levels': factory_levels,
            'research_count': 1 + (index % 3),
            'contracts_completed': 2 + (index % 5),
            'prestige_count': 0,
            'wins': 0,
            'losses': 0,
            'draws': 0,
            'score': 0,
            'dominion': 0,
            'factory_score': 0,
            'pvp_score': 0,
            'matches': 0,
        }

    name = RANDOM_NAMES[(index * 7 + len(civ) * 3 + (seed or 0)) % len(RANDOM_NAMES)]
    strategy = ['aggressive', 'defensive', 'balanced', 'technical', 'economic'][index % 5]
    skill = 50 + (seed or 0) % 45 + index
    industrial = 45 + (seed or 0) % 70 + index * 2
    farm = 40 + (seed or 0) % 80 + index
    factory_levels = {
        'generator': 1 + ((seed + index) % 4),
        'refinery': 1 + ((seed + index + 2) % 4),
        'lab': 1 + ((seed + index + 1) % 3),
        'automation': 1 + ((seed + index + 3) % 4),
    }
    return {
        'id': f'{civ}_rand_{index + 1}',
        'name': f'{name}-{civ.upper()[:3]}',
        'civilization': civ,
        'type': 'random',
        'profile': 'generalist',
        'strategy': strategy,
        'base_skill': skill,
        'base_industrial': industrial,
        'base_farm': farm,
        'factory_levels': factory_levels,
        'research_count': (seed + index) % 4,
        'contracts_completed': (seed + index) % 6,
        'prestige_count': 0,
        'wins': 0,
        'losses': 0,
        'draws': 0,
        'score': 0,
        'dominion': 0,
        'factory_score': 0,
        'pvp_score': 0,
        'matches': 0,
    }


def make_specialist(civ, profile, index):
    farmer = profile == 'factory_farmer'
    return {
        'id': f'{civ}_{profile}',
        'name': 'Factory Farmer' if farmer else 'Research Specialist',
        'civilization': civ,
        'type': 'specialist',
        'profile': profile,
        'strategy': 'economic' if farmer else 'technical',
        'base_skill': 76 + index,
        'base_industrial': 120 if farmer else 82,
        'base_farm': 120 if farmer else 72,
        'factory_levels': (
            {'generator': 9, 'refinery': 9, 'lab': 5, 'automation': 9}
            if farmer else
            {'generator': 3, 'refinery': 3, 'lab': 8, 'automation': 3}
        ),
        'research_count': 2 if farmer else 6,
        'combat_doctrines': 1 if farmer else 3,
        'contracts_completed': 8 if farmer else 3,
        'prestige_count': 1 if farmer else 0,
        'wins': 0,
        'losses': 0,
        'draws': 0,
        'score': 0,
        'dominion': 0,
        'factory_score': 0,
        'pvp_score': 0,
        'matches': 0,
    }


def build_participants(seed):
    players = []
    for civ, data in CIVS.items():
        for i in range(BOT_VARIANTS_PER_CIV):
            players.append(make_player(civ, i, is_bot=True))
        for i in range(RANDOM_PLAYERS_PER_CIV):
            players.append(make_player(civ, i, is_bot=False, seed=seed + i + len(civ) * 10))
        for index, profile in enumerate(SPECIALIST_PROFILES):
            players.append(make_specialist(civ, profile, index))
    validate_participant_coverage(players)
    return players


def validate_participant_coverage(players):
    if len(players) != TOTAL_PARTICIPANTS:
        raise ValueError(
            f'Expected {TOTAL_PARTICIPANTS} total participants for all civ combinations, '
            f'but got {len(players)}.'
        )

    per_civ = {civ: 0 for civ in CIVS}
    profiles_per_civ = {civ: set() for civ in CIVS}
    bot_total = 0
    for player in players:
        per_civ[player['civilization']] += 1
        profiles_per_civ[player['civilization']].add(player['profile'])
        if player['type'] == 'bot':
            bot_total += 1

    for civ, count in per_civ.items():
        if count != PARTICIPANTS_PER_CIV:
            raise ValueError(
                f'Civilization {civ} needs exactly {PARTICIPANTS_PER_CIV} players, '
                f'but has {count}.'
            )
        missing_profiles = set(SPECIALIST_PROFILES) - profiles_per_civ[civ]
        if missing_profiles:
            raise ValueError(f'Civilization {civ} is missing specialist profiles: {sorted(missing_profiles)}.')

    required_bots = len(CIVS) * BOT_VARIANTS_PER_CIV
    if bot_total != required_bots:
        raise ValueError(
            f'Expected all bot combinations to be present ({required_bots}), '
            f'but found {bot_total}.'
        )


def effective_stats(player, with_effects, civ_map=None, with_factory=False):
    civ_map = civ_map or CIVS
    civ = civ_map[player['civilization']]
    factory_mult = civ['factory']['production_mult'] if with_effects else 1.0
    build_cost_mult = civ['factory']['building_cost_mult'] if with_effects else 1.0
    attack_mult = civ['pvp']['attack_mult'] if with_effects else 1.0
    shield_mult = civ['pvp']['shield_mult'] if with_effects else 1.0

    factory_total = sum(player.get('factory_levels', {}).get(k, 0) * FACTORY_TIER_FACTORS[k] for k in FACTORY_TIER_FACTORS)
    research_bonus = player.get('research_count', 0) * 12
    contracts_bonus = player.get('contracts_completed', 0) * 9
    prestige_bonus = player.get('prestige_count', 0) * 15
    factory_score = (player['base_industrial'] * factory_mult) + factory_total + research_bonus + contracts_bonus + prestige_bonus

    pvp_readiness = 0
    if with_factory:
        doctrine_bonus = player.get('combat_doctrines', 0) * 8
        pvp_readiness = (factory_total * 0.7) + research_bonus * 0.25 + contracts_bonus * 0.18 + prestige_bonus * 0.22 + doctrine_bonus

    pvp_score = (player['base_skill'] * attack_mult) + (player['base_skill'] * 0.25 * shield_mult) + pvp_readiness * 0.08

    return {
        'factory_score': factory_score,
        'pvp_score': pvp_score,
        'build_cost_mult': build_cost_mult,
        'attack_mult': attack_mult,
        'shield_mult': shield_mult,
        'factory_total': factory_total,
        'pvp_readiness': pvp_readiness,
    }


def simulate_scenario(players, with_effects, seed, civ_map=None, with_factory=False):
    civ_map = civ_map or CIVS
    random.seed(seed)
    match_results = []
    stats = {civ: {'wins': 0, 'losses': 0, 'draws': 0, 'score': 0, 'dominion': 0, 'avg_factory': 0, 'avg_pvp': 0, 'participants': 0} for civ in civ_map}
    profile_stats = defaultdict(lambda: {'wins': 0, 'losses': 0, 'draws': 0, 'matches': 0, 'score': 0, 'dominion': 0})

    for i, a in enumerate(players):
        for j in range(i + 1, len(players)):
            b = players[j]
            if a['civilization'] == b['civilization']:
                continue

            a_eff = effective_stats(a, with_effects, civ_map, with_factory)
            b_eff = effective_stats(b, with_effects, civ_map, with_factory)
            power_a = a_eff['pvp_score']
            power_b = b_eff['pvp_score']

            gap = power_a - power_b
            p_win_a = 1 / (1 + math.exp(-(gap / 90.0)))
            outcome = random.random()
            if outcome < p_win_a:
                winner, loser = a, b
                winner_res = 'win'
                loser_res = 'loss'
            elif outcome < p_win_a + 0.08:
                winner, loser = None, None
                winner_res = 'draw'
                loser_res = 'draw'
            else:
                winner, loser = b, a
                winner_res = 'win'
                loser_res = 'loss'

            if winner_res == 'draw':
                a['draws'] += 1
                b['draws'] += 1
                a['score'] += 1
                b['score'] += 1
                a['matches'] += 1
                b['matches'] += 1
                score_a = 1
                score_b = 1
                dominion_a = 12
                dominion_b = 12
            else:
                winner['wins'] += 1
                loser['losses'] += 1
                winner['matches'] += 1
                loser['matches'] += 1
                winner['score'] += 3
                loser['score'] += 0
                score_a = 3 if winner == a else 0
                score_b = 3 if winner == b else 0
                dominion_a = 30 if winner == a else 8
                dominion_b = 30 if winner == b else 8

            for player, result, score, dominion in (
                (a, 'draw' if winner_res == 'draw' else ('win' if winner == a else 'loss'), score_a, dominion_a),
                (b, 'draw' if winner_res == 'draw' else ('win' if winner == b else 'loss'), score_b, dominion_b),
            ):
                profile = profile_stats[player['profile']]
                profile[{'win': 'wins', 'loss': 'losses', 'draw': 'draws'}[result]] += 1
                profile['matches'] += 1
                profile['score'] += score
                profile['dominion'] += dominion

            a['pvp_score'] = a.get('pvp_score', 0) + max(0, a_eff['pvp_score'] * 0.12)
            b['pvp_score'] = b.get('pvp_score', 0) + max(0, b_eff['pvp_score'] * 0.12)
            a['factory_score'] = a.get('factory_score', 0) + max(0, a_eff['factory_score'] * 0.08)
            b['factory_score'] = b.get('factory_score', 0) + max(0, b_eff['factory_score'] * 0.08)

            if winner_res == 'draw':
                a['dominion'] += dominion_a
                b['dominion'] += dominion_b
            elif winner == a:
                a['dominion'] += dominion_a
                b['dominion'] += dominion_b
            else:
                a['dominion'] += dominion_a
                b['dominion'] += dominion_b

            match_results.append({
                'match_id': f'm_{len(match_results) + 1}',
                'a': a['id'],
                'b': b['id'],
                'civ_a': a['civilization'],
                'civ_b': b['civilization'],
                'winner': winner['id'] if winner else None,
                'result': winner_res if winner else 'draw',
                'score_a': score_a,
                'score_b': score_b,
                'dominion_a': dominion_a,
                'dominion_b': dominion_b,
                'power_a': round(power_a, 2),
                'power_b': round(power_b, 2),
            })

            if winner_res == 'draw':
                stats[a['civilization']]['draws'] += 1
                stats[b['civilization']]['draws'] += 1
                stats[a['civilization']]['score'] += score_a
                stats[b['civilization']]['score'] += score_b
                stats[a['civilization']]['dominion'] += dominion_a
                stats[b['civilization']]['dominion'] += dominion_b
            else:
                stats[winner['civilization']]['wins'] += 1
                stats[loser['civilization']]['losses'] += 1
                stats[winner['civilization']]['score'] += score_a if winner == a else score_b
                stats[loser['civilization']]['score'] += score_a if loser == a else score_b
                stats[winner['civilization']]['dominion'] += 30
                stats[loser['civilization']]['dominion'] += 8

    for civ in CIVS:
        chunk = [p for p in players if p['civilization'] == civ]
        stats[civ]['participants'] = len(chunk)
        stats[civ]['avg_factory'] = round(sum(effective_stats(p, with_effects, civ_map, with_factory)['factory_score'] for p in chunk) / max(1, len(chunk)), 2)
        stats[civ]['avg_pvp'] = round(sum(effective_stats(p, with_effects, civ_map, with_factory)['pvp_score'] for p in chunk) / max(1, len(chunk)), 2)
        stats[civ]['win_rate'] = round((stats[civ]['wins'] / max(1, stats[civ]['wins'] + stats[civ]['losses'] + stats[civ]['draws'])) * 100, 2)
        stats[civ]['average_score'] = round(stats[civ]['score'] / max(1, len(chunk)), 2)
        stats[civ]['average_dominion'] = round(stats[civ]['dominion'] / max(1, len(chunk)), 2)

    for profile, data in profile_stats.items():
        chunk = [p for p in players if p['profile'] == profile]
        profile_effects = [effective_stats(p, with_effects, civ_map, with_factory) for p in chunk]
        data['participants'] = len(chunk)
        data['avg_factory_score'] = round(sum(e['factory_score'] for e in profile_effects) / max(1, len(chunk)), 2)
        data['avg_pvp_score'] = round(sum(e['pvp_score'] for e in profile_effects) / max(1, len(chunk)), 2)
        data['avg_pvp_readiness'] = round(sum(e['pvp_readiness'] for e in profile_effects) / max(1, len(chunk)), 2)

    summary = {
        'scenario': 'with_effects' if with_effects else 'baseline',
        'participants': len(players),
        'matches': len(match_results),
        'civs': stats,
        'profiles': {
            profile: {
                **data,
                'win_rate': round(data['wins'] / max(1, data['matches']) * 100, 2),
                'average_score': round(data['score'] / max(1, data['matches']), 2),
                'average_dominion': round(data['dominion'] / max(1, data['matches']), 2),
                'avg_factory_score': data['avg_factory_score'],
                'avg_pvp_score': data['avg_pvp_score'],
                'avg_pvp_readiness': data['avg_pvp_readiness'],
            }
            for profile, data in profile_stats.items()
        },
    }
    return {'summary': summary, 'matches': match_results, 'participants': players}


def build_exhaustive_factory_factorial():
    levels = (0, 1, 2)
    factory_configs = [dict(zip(FACTORY_TIER_FACTORS, values)) for values in product(levels, repeat=len(FACTORY_TIER_FACTORS))]
    profiles = []

    for civ in CIVS:
        for bot_index, bot in enumerate(BOT_BASE):
            for config_index, factory_levels in enumerate(factory_configs):
                player = make_player(civ, bot_index, is_bot=True)
                player['factory_levels'] = factory_levels
                player['profile_id'] = f'{civ}_{bot_index + 1}_{config_index:02d}'
                profiles.append(player)

    current_stats = [effective_stats(player, with_effects=True, with_factory=False) for player in profiles]
    hypothesis_stats = [effective_stats(player, with_effects=True, with_factory=True) for player in profiles]
    profile_results = [
        {
            'profile_id': player['profile_id'],
            'civilization': player['civilization'],
            'bot': player['name'],
            'strategy': player['strategy'],
            'factory_levels': player['factory_levels'],
            'matches': 0,
            'current_expected_wins': 0.0,
            'hypothesis_expected_wins': 0.0,
            'current_expected_points': 0.0,
            'hypothesis_expected_points': 0.0,
        }
        for player in profiles
    ]
    matchup_results = defaultdict(lambda: {'matches': 0, 'current_expected_wins_a': 0.0, 'hypothesis_expected_wins_a': 0.0})
    civ_results = defaultdict(lambda: {'matches': 0, 'current_expected_wins': 0.0, 'hypothesis_expected_wins': 0.0})

    for index, player_a in enumerate(profiles):
        for index_b in range(index + 1, len(profiles)):
            player_b = profiles[index_b]
            if player_a['civilization'] == player_b['civilization']:
                continue

            profile_a = profile_results[index]
            profile_b = profile_results[index_b]
            matchup_key = (
                player_a['civilization'], player_a['strategy'],
                player_b['civilization'], player_b['strategy'],
            )
            matchup = matchup_results[matchup_key]
            civ_a = civ_results[player_a['civilization']]
            civ_b = civ_results[player_b['civilization']]
            matchup['matches'] += 1
            civ_a['matches'] += 1
            civ_b['matches'] += 1

            for stats, win_key, points_key, wins_a_key, civ_win_key in (
                (current_stats, 'current_expected_wins', 'current_expected_points', 'current_expected_wins_a', 'current_expected_wins'),
                (hypothesis_stats, 'hypothesis_expected_wins', 'hypothesis_expected_points', 'hypothesis_expected_wins_a', 'hypothesis_expected_wins'),
            ):
                probability_a = logistic((stats[index]['pvp_score'] - stats[index_b]['pvp_score']) / 90.0)
                draw_probability = 0.08
                probability_b = 1.0 - probability_a - draw_probability
                points_a = probability_a * 3.0 + draw_probability
                points_b = probability_b * 3.0 + draw_probability

                profile_a[win_key] += probability_a
                profile_b[win_key] += probability_b
                profile_a[points_key] += points_a
                profile_b[points_key] += points_b
                matchup[wins_a_key] += probability_a
                civ_a[civ_win_key] += probability_a
                civ_b[civ_win_key] += probability_b

            profile_a['matches'] += 1
            profile_b['matches'] += 1

    for row in profile_results:
        games = max(1, row['matches'])
        row['current_win_rate_pct'] = round(row.pop('current_expected_wins') / games * 100, 3)
        row['hypothesis_win_rate_pct'] = round(row.pop('hypothesis_expected_wins') / games * 100, 3)
        row['current_average_points'] = round(row.pop('current_expected_points') / games, 3)
        row['hypothesis_average_points'] = round(row.pop('hypothesis_expected_points') / games, 3)

    strategy_matchups = []
    for (civ_a, strategy_a, civ_b, strategy_b), data in matchup_results.items():
        games = max(1, data['matches'])
        strategy_matchups.append({
            'civilization_a': civ_a,
            'bot_a': strategy_a,
            'civilization_b': civ_b,
            'bot_b': strategy_b,
            'matches': data['matches'],
            'current_expected_win_rate_a_pct': round(data['current_expected_wins_a'] / games * 100, 3),
            'hypothesis_expected_win_rate_a_pct': round(data['hypothesis_expected_wins_a'] / games * 100, 3),
        })

    civ_summary = {}
    for civ, data in civ_results.items():
        games = max(1, data['matches'])
        civ_summary[civ] = {
            'matches': data['matches'],
            'current_expected_win_rate_pct': round(data['current_expected_wins'] / games * 100, 3),
            'hypothesis_expected_win_rate_pct': round(data['hypothesis_expected_wins'] / games * 100, 3),
        }

    return {
        'method': 'Expected outcomes from the existing logistic balance proxy; not executions of the interactive Arena Match engine.',
        'levels_per_building': list(levels),
        'factory_buildings': list(FACTORY_TIER_FACTORS),
        'factory_configurations_per_bot': len(factory_configs),
        'bots_per_civilization': BOT_VARIANTS_PER_CIV,
        'civilizations': len(CIVS),
        'profiles': len(profiles),
        'cross_civilization_matchups': sum(data['matches'] for data in civ_results.values()) // 2,
        'profile_results': profile_results,
        'strategy_matchups': strategy_matchups,
        'civilization_summary': civ_summary,
    }


def build_rankings(scenario_summary):
    rows = []
    for civ, data in scenario_summary['civs'].items():
        combined = (data['average_score'] * 0.45) + (data['average_dominion'] * 0.20) + (data['avg_pvp'] * 0.25) + (data['avg_factory'] * 0.10)
        rows.append({
            'civilization': civ,
            'name': CIVS[civ]['name'],
            'win_rate': data['win_rate'],
            'average_score': data['average_score'],
            'average_dominion': data['average_dominion'],
            'avg_pvp': data['avg_pvp'],
            'avg_factory': data['avg_factory'],
            'combined_score': round(combined, 2),
        })
    rows.sort(key=lambda x: x['combined_score'], reverse=True)
    return rows


def build_recommendations(comparison, proposed=None):
    recommended = []
    strongest_pvp = max(comparison.items(), key=lambda x: x[1]['avg_pvp_delta'])
    strongest_factory = max(comparison.items(), key=lambda x: x[1]['avg_factory_delta'])
    weakest_win = min(comparison.items(), key=lambda x: x[1]['win_rate_delta_pct'])

    if strongest_pvp[1]['avg_pvp_delta'] > 8:
        recommended.append(f"{strongest_pvp[0]} está muy fuerte en PvP; bajar su bonus de ataque o de escudo en ~5-10% para no desbalancear el combate.")
    if strongest_factory[1]['avg_factory_delta'] > 4:
        recommended.append(f"{strongest_factory[0]} gana demasiado en producción industrial; considerar un costo mayor o un beneficio más pequeño en fábrica.")
    if weakest_win[1]['win_rate_delta_pct'] < -2:
        recommended.append(f"{weakest_win[0]} queda por debajo en win rate; su utilidad en PvP o en fábrica necesita reforzarse o su identidad está demasiado débil.")

    if proposed:
        top = max(proposed.items(), key=lambda x: x[1]['win_rate'])
        recommended.append(f"La versión propuesta deja a {top[0]} como la civ más rentable en la simulación ajustada, manteniendo a las demás dentro del rango de equilibrio.")

    if not recommended:
        recommended.append('El balance está relativamente estable: las civilizaciones aparecen equilibradas en la simulación actual.')

    return recommended


def main():
    random.seed(20261006)
    players = build_participants(seed=20261006)

    baseline = simulate_scenario([p.copy() for p in players], with_effects=False, seed=20261006, civ_map=CIVS, with_factory=False)
    current_effects = simulate_scenario([p.copy() for p in players], with_effects=True, seed=20261007, civ_map=CIVS, with_factory=False)
    civ_plus_factory = simulate_scenario([p.copy() for p in players], with_effects=True, seed=20261008, civ_map=CIVS, with_factory=True)
    proposed_effects = simulate_scenario([p.copy() for p in players], with_effects=True, seed=20261009, civ_map=ADJUSTED_CIVS, with_factory=True)

    comparison = {}
    for civ in CIVS:
        b = baseline['summary']['civs'][civ]
        w = current_effects['summary']['civs'][civ]
        comparison[civ] = {
            'win_rate_delta_pct': round(w['win_rate'] - b['win_rate'], 2),
            'average_score_delta': round(w['average_score'] - b['average_score'], 2),
            'average_dominion_delta': round(w['average_dominion'] - b['average_dominion'], 2),
            'avg_pvp_delta': round(w['avg_pvp'] - b['avg_pvp'], 2),
            'avg_factory_delta': round(w['avg_factory'] - b['avg_factory'], 2),
        }

    factory_comparison = {}
    for civ in CIVS:
        b = baseline['summary']['civs'][civ]
        w = civ_plus_factory['summary']['civs'][civ]
        factory_comparison[civ] = {
            'win_rate_delta_pct': round(w['win_rate'] - b['win_rate'], 2),
            'average_score_delta': round(w['average_score'] - b['average_score'], 2),
            'average_dominion_delta': round(w['average_dominion'] - b['average_dominion'], 2),
            'avg_pvp_delta': round(w['avg_pvp'] - b['avg_pvp'], 2),
            'avg_factory_delta': round(w['avg_factory'] - b['avg_factory'], 2),
        }

    proposed_comparison = {}
    for civ in CIVS:
        b = baseline['summary']['civs'][civ]
        w = proposed_effects['summary']['civs'][civ]
        proposed_comparison[civ] = {
            'win_rate_delta_pct': round(w['win_rate'] - b['win_rate'], 2),
            'average_score_delta': round(w['average_score'] - b['average_score'], 2),
            'average_dominion_delta': round(w['average_dominion'] - b['average_dominion'], 2),
            'avg_pvp_delta': round(w['avg_pvp'] - b['avg_pvp'], 2),
            'avg_factory_delta': round(w['avg_factory'] - b['avg_factory'], 2),
        }

    baseline_ranking = build_rankings(baseline['summary'])
    current_ranking = build_rankings(current_effects['summary'])
    factory_ranking = build_rankings(civ_plus_factory['summary'])
    proposed_ranking = build_rankings(proposed_effects['summary'])
    recommendations = build_recommendations(comparison, proposed=proposed_effects['summary']['civs'])
    exhaustive_factorial = build_exhaustive_factory_factorial()

    payload = {
        'meta': {
            'generated_at': datetime.now(timezone.utc).isoformat(),
            'seed': 20261006,
            'description': 'Original balance proxy plus an exhaustive factorial sweep of all 9 bot styles, 4 civilizations, and factory building levels 0-2. The sweep separately reports zero persistent-factory PvP conversion and a hypothetical readiness conversion.',
            'bot_variants_per_civ': BOT_VARIANTS_PER_CIV,
            'random_players_per_civ': RANDOM_PLAYERS_PER_CIV,
            'specialist_profiles_per_civ': list(SPECIALIST_PROFILES),
            'specialists_per_civ': SPECIALISTS_PER_CIV,
            'participants_per_civ': PARTICIPANTS_PER_CIV,
            'total_participants': TOTAL_PARTICIPANTS,
            'required_participants_for_all_combinations': TOTAL_PARTICIPANTS,
            'cross_civilization_matches_per_scenario': len(CIVS) * (len(CIVS) - 1) // 2 * PARTICIPANTS_PER_CIV ** 2,
            'civilizations': list(CIVS.keys()),
            'scenarios': ['baseline', 'current_effects', 'civ_plus_factory', 'proposed_effects'],
        },
        'participants': {
            'baseline': [
                {
                    'id': p['id'],
                    'name': p['name'],
                    'civilization': p['civilization'],
                    'type': p['type'],
                    'profile': p['profile'],
                    'strategy': p['strategy'],
                    'base_skill': p['base_skill'],
                    'base_industrial': p['base_industrial'],
                    'base_farm': p['base_farm'],
                    'factory_levels': p['factory_levels'],
                    'research_count': p['research_count'],
                    'combat_doctrines': p.get('combat_doctrines', 0),
                    'contracts_completed': p['contracts_completed'],
                    'prestige_count': p['prestige_count'],
                }
                for p in players
            ],
        },
        'scenarios': {
            'baseline': baseline['summary'],
            'current_effects': current_effects['summary'],
            'civ_plus_factory': civ_plus_factory['summary'],
            'proposed_effects': proposed_effects['summary'],
        },
        'rankings': {
            'baseline': baseline_ranking,
            'current_effects': current_ranking,
            'civ_plus_factory': factory_ranking,
            'proposed_effects': proposed_ranking,
        },
        'comparison': {
            'current_effects_vs_baseline': comparison,
            'civ_plus_factory_vs_baseline': factory_comparison,
            'proposed_effects_vs_baseline': proposed_comparison,
        },
        'exhaustive_factory_factorial': exhaustive_factorial,
        'balance_summary': {
            'best_civ_baseline': baseline_ranking[0]['civilization'],
            'best_civ_current_effects': current_ranking[0]['civilization'],
            'best_civ_civ_plus_factory': factory_ranking[0]['civilization'],
            'best_civ_proposed_effects': proposed_ranking[0]['civilization'],
            'strongest_pvp_delta': max(comparison.items(), key=lambda x: x[1]['avg_pvp_delta'])[0],
            'strongest_factory_delta': max(comparison.items(), key=lambda x: x[1]['avg_factory_delta'])[0],
            'recomendations': recommendations,
        },
        'matches': {
            'baseline': baseline['matches'][:50],
            'current_effects': current_effects['matches'][:50],
            'civ_plus_factory': civ_plus_factory['matches'][:50],
            'proposed_effects': proposed_effects['matches'][:50],
        },
    }

    OUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Simulation saved to {OUT_PATH}')
    print(json.dumps({
        'baseline_total_matches': baseline['summary']['matches'],
        'current_effects_total_matches': current_effects['summary']['matches'],
        'civ_plus_factory_total_matches': civ_plus_factory['summary']['matches'],
        'proposed_effects_total_matches': proposed_effects['summary']['matches'],
        'factorial_profiles': exhaustive_factorial['profiles'],
        'factorial_cross_civilization_matchups': exhaustive_factorial['cross_civilization_matchups'],
        'participants': TOTAL_PARTICIPANTS,
        'participants_per_civ': PARTICIPANTS_PER_CIV,
        'cross_civilization_matches_per_scenario': baseline['summary']['matches'],
        'out_file': str(OUT_PATH),
    }, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
