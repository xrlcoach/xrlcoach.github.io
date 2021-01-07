import { GetActiveUserTeamShort, GetLineupByTeamAndRound, GetPlayersFromXrlTeam, UpdatePlayerXrlTeam } from "./ApiFetch.js"
/**
 * Displays feedback message in the feedback element on the top of each page
 * @param {String} feedback 
 */
export function DisplayFeedback(title, message, confirm=false, onConfirmFunction=null, cancel=true) {
    let feedback = new bootstrap.Modal(document.getElementById('feedback'));
    document.getElementById('feedbackTitle').innerText = title;
    document.getElementById('feedbackMessage').innerHTML = message;
    if (!cancel) {
        document.getElementById('feedbackCancel').hidden = true;
    }
    if (confirm) {
        document.getElementById('feedbackFooter').hidden = false;
        document.getElementById('feedbackConfirm').onclick = onConfirmFunction;
    } else {
        document.getElementById('feedbackFooter').hidden = true;
    }
    feedback.show();
}
export function DisplayPlayerInfo(player) {
    let playerInfo = new bootstrap.Modal(document.getElementById('playerInfo'));
    document.getElementById('playerInfoTitle').innerText = player.player_name;
    document.getElementById('playerNrlClub').innerText = player.nrl_club;
    document.getElementById('playerXrlTeam').innerText = player.xrl_team ? player.xrl_team : 'None';
    document.getElementById('playerPositions').innerText = player.position;
    if (player.position2) document.getElementById('playerPositions').innerText += ', ' + player.position2;
    document.getElementById('playerXrlPoints').innerText = player.scoring_stats[player.position].points + player.scoring_stats.kicker.points;
    document.getElementById('playerTries').innerText = player.stats.Tries;
    document.getElementById('playerITs').innerText = player.scoring_stats[player.position].involvement_try;
    document.getElementById('playerPTs').innerText = player.scoring_stats[player.position].positional_try;
    document.getElementById('playerGoals').innerText = player.scoring_stats.kicker.goals;
    document.getElementById('playerFGs').innerText = player.scoring_stats.kicker.field_goals;
    document.getElementById('playerMIAs').innerText = player.scoring_stats[player.position].mia;
    document.getElementById('playerConcedes').innerText = player.scoring_stats[player.position].concede;
    document.getElementById('playerSinBins').innerText = player.stats['Sin Bins'];
    document.getElementById('playerSendOffs').innerText = player.stats['Send Offs'];
    if (player.xrl_team == GetActiveUserTeamShort()) {
        document.getElementById('playerInfoFooter').hidden = false;
        document.getElementById('playerInfoDropButton').onclick = function() {
            DisplayFeedback('Confirm', 'Are you sure you want to drop ' + player.player_name + '?',
            true, async function() {
                await UpdatePlayerXrlTeam(null, player);
                DisplayFeedback('Success', player.player_name + ' has been dropped from your squad.',
                true, function() { location.href('index.html') }, false);
            });
        };
        document.getElementById('playerInfoDropButton').hidden = false;
    } else if (player.xrl_team == undefined || player.xrl_team == 'None') {
        document.getElementById('playerInfoFooter').hidden = false;
        document.getElementById('playerInfoPickButton').onclick = function () {
            DisplayFeedback('Confirm', 'Are you sure you want to pick ' + player.player_name + '?',
            true, async function() {
                let playerSquad = await GetPlayersFromXrlTeam(GetActiveUserTeamShort());
                if (playerSquad.length > 17) {
                    DisplayFeedback('Sorry!', 'Your squad already has 18 players.');
                } else {
                    await UpdatePlayerXrlTeam(GetActiveUserTeamShort(), player);
                    DisplayFeedback('Success', player.player_name + ' has been added to your squad.',
                    true, function() { location.href('index.html') }, false);
                }
            });
        };
        document.getElementById('playerInfoPickButton').hidden = false;
    }
    document.getElementById('allStatsContainer').innerHTML = '';
    for (let stat in player.stats) {
        let col = document.createElement('div');
        col.className = 'col-3';
        let p = document.createElement('p');
        p.innerText = stat + ': ' + player.stats[stat];
        col.appendChild(p);
        document.getElementById('allStatsContainer').appendChild(col);
    }
    playerInfo.show();
}
export function DisplayPlayerLineupInfo(appearance) {
    
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
            //-4 points for a red card and -1 for every 10 mins off field
            if (stats[position].send_offs != 0) {
                let minutes = 80 - stats[position].send_offs;
                let deduction = Math.floor(minutes / 10) + 4;
                score -= deduction;
            }
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
export function GetTeamFixture(team_short, round) {
    return round.fixtures.find(f => f.home == team_short || f.away == team_short);
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