import { GetLineupByTeamAndRound } from "./ApiFetch.js"

export function GetLineupScore(lineup) {
    return lineup.reduce(function(totalScore, player) {
        let playerScore = player.score;
        let played = player.played_xrl;
        if (played) {
            return totalScore + playerScore;
        } else {
            return totalScore;
        }
    }, 0);
}

export async function GetLineupScoreByTeamAndRound(round, xrlTeam) {
    let lineup = await GetLineupByTeamAndRound(round, xrlTeam);
    return GetLineupScore(lineup);
}

export function GetPlayerXrlScores(scoringPosition, appearance) {
    let scores = {}
    for (let position in appearance.scoring_stats) {
        let score = 0;
        if (position == 'kicker') {
            score += position.goals * 2;
            score += position.field_goals;
        } else if (position == scoringPosition) {
            score += position.tries * 4;
            score -= position.sin_bins * 2;
            score -= position.send_offs * 4;
            if (position.involvement_try) score += 4;
            if (position.playmaker_try) score += 4;
            if (position.mia) score -= 4;
            if (position.concede) score -= 4;
        }
    }
    return score;
}

export function GetUserFixture(user, round) {
    return round.fixtures.find(f => f.home == user.team_short || f.away == user.team_short);
}

export function GetOrdinal(num) {
    let str = String(num);
    let lastNum = str.charAt(str.length - 1);
    if (lastNum == '1') {
        return str + 'st';
    } else if (lastNum == '2') {
        return str + 'nd';
    } else if (lastNum == '3') {
        return str + 'rd';
    } else {
        return str + 'th';
    }
}

export const PositionNames = {
    'fullback': 'Fullback',
    'winger1': 'Winger',
    'winger2': 'Winger',
    'centre1': 'Centre',
    'centre2': 'Centre',
    'five-eighth': 'Five-Eighth',
    'halfback': 'Halfback',
    'hooker': 'Hooker',
    'prop1': 'Prop',
    'prop2': 'Prop',
    'row1': '2nd Row',
    'row2': '2nd Row',
    'lock': 'Lock',
}