import { GetLineupByTeamAndRound } from "./ApiFetch.js"
/**
 * Displays feedback message in the feedback element on the top of each page
 * @param {String} feedback 
 */
export function DisplayFeedback(title, message, confirm=false, onConfirmFunction=null) {
    let feedback = new bootstrap.Modal(document.getElementById('feedback'));
    document.getElementById('feedbackTitle').innerText = title;
    document.getElementById('feedbackMessage').innerHTML = message;
    if (confirm) {
        document.getElementById('feedbackFooter').hidden = false;
        document.getElementById('feedbackConfirm').onclick = onConfirmFunction;
    } else {
        document.getElementById('feedbackFooter').hidden = true;
    }
    feedback.show();
}
/**
 * Tallies up the scores of all players in a lineup who played or subbed in
 * @param {Array} lineup 
 */
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
/**
 * Calls the API method to retrieve lineup data for a specific team and round, and then calls
 * the GetLineupScore method to calculate total score.
 * @param {*} round 
 * @param {String} xrlTeam XRL team acronym
 */
export async function GetLineupScoreByTeamAndRound(round, xrlTeam) {
    let lineup = await GetLineupByTeamAndRound(round, xrlTeam);
    return GetLineupScore(lineup);
}
/**
 * Calculates a player's XRL score in a given position from a given NRL appearance. Specifically the
 * scoring_stats property of the appearance, which contains scoring stats for each position the player
 * is eligible to play in as well as kicking stats.
 * @param {String} scoringPosition The position to score the player in, e.g. 'Forward'
 * @param {Object} appearance A player's appearance entry in the stats table
 * @param {Boolean} scoreAsKicker Whether to score the player's kicking stats as well
 */
export function GetPlayerXrlScores(scoringPosition, appearance, scoreAsKicker=true) {
    let score = 0;
    let stats = appearance.scoring_stats;
    //Iterate through the position keys in the scoring_stats object
    for (let position in stats) {
        //Score kicking stats by default, but can be turned off
        if (position == 'kicker' && scoreAsKicker) {
            //2 points for each goal (conversion or penalty goal)
            score += stats[position].goals * 2;
            //1 point for each field goal
            score += stats[position].field_goals;
        //Score stats for the provided position
        } else if (position == scoringPosition) {
            //4 points for each try
            score += stats[position].tries * 4;
            //-2 points for a sin bin
            score -= stats[position].sin_bins * 2;
            //-4 points for a red card
            score -= stats[position].send_offs * 4;
            //4 points for involvement and positional tries
            if (stats[position].involvement_try) score += 4;
            if (stats[position].positional_try > 0) score += 4;
            //-4 points for conceding and missing-in-action
            if (stats[position].mia) score -= 4;
            if (stats[position].concede) score -= 4;
        }
    }
    return score;
}
/**
 * Searches a round's fixture list and returns the match containing the specified user
 * @param {*} user A user data object
 * @param {*} round A round data object
 */
export function GetUserFixture(user, round) {
    return round.fixtures.find(f => f.home == user.team_short || f.away == user.team_short);
}
/**
 * Returns ordinal number string for provided integer, e.g. 1 = '1st', 11 = '11th' 
 * @param {Number} num 
 */
export function GetOrdinal(num) {
    let str = String(num);
    let lastNum = str.charAt(str.length - 1);
    let secondLastNum = str.charAt(str.length - 2);
    if (lastNum == '1' && secondLastNum != '1') {
        return str + 'st';
    } else if (lastNum == '2' && secondLastNum != '1') {
        return str + 'nd';
    } else if (lastNum == '3') {
        return str + 'rd';
    } else {
        return str + 'th';
    }
}
/**
 * Retrieves the current active round from an array of round objects
 * @param {Array} rounds An array of round data objects
 */
export function GetActiveRoundFromFixtures(rounds) {
    let activeRounds = rounds.filter(r => r.active);
    let roundNumbers = activeRounds.map(r => r.round_number);
    let currentRoundNumber = Math.max(...roundNumbers);
    let currentRound = rounds.find(r => r.round_number == currentRoundNumber);
    return currentRound;
}
/**
 * Dictionary for converting position element ids into position display names
 */
export const PositionNames = {
    'fullback': 'Fullback',
    'winger1': 'Winger',
    'winger2': 'Winger',
    'centre1': 'Centre',
    'centre2': 'Centre',
    'five_eighth': 'Five-Eighth',
    'halfback': 'Halfback',
    'hooker': 'Hooker',
    'prop1': 'Prop',
    'prop2': 'Prop',
    'row1': '2nd Row',
    'row2': '2nd Row',
    'lock': 'Lock',
}