import { GetActiveUserInfo, GetAllPlayers, GetAllStats, GetAllUsers, GetCurrentRoundInfo, GetIdToken, GetRoundInfo } from "./ApiFetch.js";
import { GetPlayerXrlScores } from "./Helpers.js";

let roundToDisplay, allPlayers, allStats, allUsers, activeUser, allPlayersWithStats, playersTotalStats, displayedStats;

window.onload = async function() {
    roundToDisplay = await GetCurrentRoundInfo();
    for (let i = roundToDisplay.round_number; i > 0; i--) {
        let option = document.createElement('option');
        option.innerText = i;
        document.getElementById('roundSelect').appendChild(option);
    }
    allStats = await GetAllStats();
    let playerIdsWithStats = allStats.map(p => p.player_id);
    allUsers = await GetAllUsers();
    for (let user of allUsers) {
        let option = document.createElement('option');
        option.innerText = user.team_short;
        document.getElementById('xrlTeamSelect').appendChild(option);
    }
    activeUser = await GetActiveUserInfo(GetIdToken());
    allPlayers = await GetAllPlayers();
    allPlayersWithStats = allPlayers.filter(p => playerIdsWithStats.includes(p.player_id))
    for (let i in allStats) {
        let player = allPlayersWithStats.find(p => p.player_id == allStats[i].player_id);
        allStats[i].score = GetPlayerXrlScores(player.position, allStats[i]);
        allStats[i].score_not_kicking = GetPlayerXrlScores(player.position, allStats[i], false);
        allStats[i].position = player.position;
        allStats[i].xrl_team = player.xrl_team ? player.xrl_team : 'None';
    }
    // playersTotalStats = allPlayersWithStats.map(function(p) {
    //     let playerStats = allStats.filter(s => s.player_id == p.player_id);
    //     // if (playerStats.length == 0) {
    //     //     return;
    //     // }
    //     // let playerStatsWithScores = playerStats.map(a => {
    //     //     a.score = GetPlayerXrlScores(p.position, a);
    //     //     return a;
    //     // });
    //     p.stats = playerStats.reduce((totals, appearance) => {
    //         let stats = appearance.stats;
    //         for (let stat in stats) {
    //             if (totals[stat] == undefined) {
    //                 totals[stat] = 0;
    //             }
    //             totals[stat] += stats[stat];
    //         }
    //         return totals;
    //     }, {});
    //     p.scoring_stats = playerStats.reduce((totals, appearance) => {
    //         let scoringStats = appearance.scoring_stats;
    //         for (let position in scoringStats) {
    //             if (totals[position] == undefined) {
    //                 totals[position] = {};
    //             }
    //             let positionStats = scoringStats[position];
    //             for (let stat in positionStats) {
    //                 if (totals[position][stat] == undefined) {
    //                     totals[position][stat] = 0;
    //                 }
    //                 if (stat == 'positional_try') {
    //                     if (positionStats[stat] > 0) {
    //                         totals[position][stat] += 1;
    //                     }
    //                     continue;
    //                 }
    //                 if (typeof(positionStats[stat]) == "boolean") {
    //                     if (positionStats[stat]) {
    //                         totals[position][stat] += 1;
    //                     } 
    //                 } else {
    //                     totals[position][stat] += positionStats[stat];
    //                 }
    //             }
    //         }
    //         return totals;
    //     }, {});
    //     p.score = playerStats.reduce((total, appearance) => {
    //         return total + appearance.score;
    //     }, 0);
    //     p.score_not_kicking = playerStats.reduce((total, appearance) => {
    //         return total + appearance.score_not_kicking;
    //     }, 0);
    //     return p;
    // });
    // statsToDisplay = playersTotalStats;
    populateStatsTable(allPlayers, sortByTotalXrlScore);
    document.getElementById('loading').hidden = true;
    document.getElementById('mainContent').hidden = false;
}


function populateStatsTable(stats, sortFunction, scoreAsKicker=true, singleRound=false) {
    let sortedStats = stats.sort(sortFunction);
    let table = document.getElementById('statTableBody');
    table.innerHTML = '';
    for (var player of sortedStats) {
        let tr = document.createElement('tr');
        let name = document.createElement('td');
        name.innerText = player.player_name;
        tr.appendChild(name);
        let nrlClub = document.createElement('td');
        nrlClub.innerText = player.nrl_club;
        tr.appendChild(nrlClub);
        let xrlTeam = document.createElement('td');
        xrlTeam.innerText = player.xrl_team == undefined ? 'None' : player.xrl_team;
        tr.appendChild(xrlTeam);
        let position = document.createElement('td');
        position.innerText = player.position;
        tr.appendChild(position);
        let tries = document.createElement('td');
        tries.innerText = player.stats.Tries;
        tr.appendChild(tries);
        let goals = document.createElement('td');
        goals.innerText = player.scoring_stats.kicker.goals;
        tr.appendChild(goals);
        let fieldGoals = document.createElement('td');
        fieldGoals.innerText = player.scoring_stats.kicker.field_goals;
        tr.appendChild(fieldGoals);
        let ITs = document.createElement('td');
        ITs.innerText = player.scoring_stats[player.position].involvement_try;
        tr.appendChild(ITs);
        let PTs = document.createElement('td');
        PTs.innerText = player.scoring_stats[player.position].positional_try;
        tr.appendChild(PTs);
        let concede = document.createElement('td');
        concede.innerText = player.scoring_stats[player.position].concede;
        tr.appendChild(concede);
        let mia = document.createElement('td');
        mia.innerText = player.scoring_stats[player.position].mia;
        tr.appendChild(mia);
        let total = document.createElement('td');
        if (scoreAsKicker) {
            if (singleRound) {
                total.innerText = player.score;
            } else {
                total.innerText = player.scoring_stats[player.position].points + player.scoring_stats.kicker.points;
            }
        } else {
            if (singleRound) {
                total.innerText = player.score_not_kicking;
            } else {
                total.innerText = player.scoring_stats[player.position].points;
            }
        }
        tr.appendChild(total);
        table.appendChild(tr);
    }
}

function filterStats(event) {
    event.preventDefault();
    let roundNumber = document.getElementById('roundSelect').value;
    let nrlClub = document.getElementById('nrlClubSelect').value;
    let xrlTeam = document.getElementById('xrlTeamSelect').value;
    let position = document.getElementById('positionSelect').value;
    let scoreAsKicker = document.getElementById('scoreKickerSelect').value == 'Yes' ? true : false;
    let singleRound = roundNumber != 'ALL';
    let statsToDisplay = !singleRound ? allPlayers : allStats.filter(p => p.round_number == roundNumber);
    if (nrlClub != 'ALL') statsToDisplay = statsToDisplay.filter(p => p.nrl_club == nrlClub);
    if (xrlTeam != 'ALL') {
        if (xrlTeam == 'Free Agents') statsToDisplay = statsToDisplay.filter(p => p.xrl_team == undefined || p.xrl_team == 'None');
        else statsToDisplay = statsToDisplay.filter(p => p.xrl_team == xrlTeam);
    }
    if (position != 'ALL') statsToDisplay = statsToDisplay.filter(p => p.position == position);
    
    // if (roundNumber == 'ALL' && nrlClub == 'ALL' && xrlTeam == 'ALL') {
    //     statsToDisplay = playersTotalStats;
    // } else if (roundNumber == 'ALL' && nrlClub == 'ALL') {
    //     statsToDisplay = playersTotalStats.filter(p => p.xrl_team == xrlTeam);
    // } else if (roundNumber == 'ALL' && xrlTeam == 'ALL') {
    //     statsToDisplay = playersTotalStats.filter(p => p.nrl_club == nrlClub);
    // } else if (nrlClub == 'ALL' && xrlTeam == 'ALL') {
    //     statsToDisplay = allStats.filter(p => p.round_number == roundNumber);
    // } else if (roundNumber == 'ALL') {
    //     statsToDisplay = playersTotalStats.filter(p => p.nrl_club == nrlClub && p.xrl_team == xrlTeam);
    // } else if (nrlClub == 'ALL') {
    //     statsToDisplay = allStats.filter(p => p.round_number == roundNumber && p.xrl_team == xrlTeam);
    // } else if (xrlTeam == 'ALL') {
    //     statsToDisplay = allStats.filter(p => p.nrl_club == nrlClub && p.round_number == roundNumber);
    // } else {
    //     statsToDisplay = allStats.filter(p => p.nrl_club == nrlClub && p.xrl_team == xrlTeam && p.round_number == roundNumber);
    // }

    displayedStats = statsToDisplay;
    let sortFunction = singleRound ? scoreAsKicker ? sortByXrlXcore : sortByXrlXcoreNoKicking : scoreAsKicker ? sortByTotalXrlScore : sortByTotalXrlScoreNoKicking;
    populateStatsTable(statsToDisplay, sortFunction, scoreAsKicker, singleRound);
}

window.filterStats = filterStats;

function sortByTotalXrlScore(p1, p2) {
    return (p2.scoring_stats[p2.position].points + p2.scoring_stats.kicker.points) - (p1.scoring_stats[p1.position].points + p1.scoring_stats.kicker.points);
}

function sortByTotalXrlScoreNoKicking(p1, p2) {
    return p2.scoring_stats[p2.position].points - p1.scoring_stats[p1.position].points;
}

function sortByXrlXcore(p1, p2) {
    return p2.score - p1.score;
}

function sortByXrlXcoreNoKicking(p1, p2) {
    return p2.score_not_kicking - p1.score_not_kicking;
}

function sortPlayers(attribute) {
    let sortFunction;
    if (['involvement_try', 'positional_try', 'concede', 'mia', 'tries'].includes(attribute)) {
        sortFunction = (p1, p2) => p2.scoring_stats[p2.position][attribute] - p1.scoring_stats[p1.position][attribute];
    } else if (['goals', 'field_goals'].includes(attribute)) {
        sortFunction = (p1, p2) => p2.scoring_stats.kicker[attribute] - p1.scoring_stats.kicker[attribute];
    } else if (attribute == 'player_name') {
        sortFunction = (p1, p2) => p1.player_name.split(' ')[1] > p2.player_name.split(' ')[1];
    } else if (attribute == 'score') {
        sortFunction = (p1, p2) => p2[attribute] - p1[attribute];
    } else {
        sortFunction = (p1, p2) => p1[attribute] > p2[attribute];
    }
    populateStatsTable(displayedStats, sortFunction);
}
window.sortPlayers = sortPlayers;