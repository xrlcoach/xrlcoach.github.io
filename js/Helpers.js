import { GetLineupByTeamAndRound } from "./ApiFetch.js"

export function GetLineupScore(lineup) {
    return lineup.reduce(function(totalScore, player) {
        if (player['playerd_xrl']) {
            return totalScore + player['score'];
        }
    })
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