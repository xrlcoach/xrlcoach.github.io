import { GetActiveUserInfo, GetActiveUserTeamShort, GetAllPlayers, GetAllStats, GetAllUsers, getCookie, GetCurrentRoundInfo, GetIdToken, GetRoundInfo, GetRoundInfoFromCookie, GetStatsByRound } from "./ApiFetch.js";
import { GetPlayerXrlScores, DisplayPlayerInfo, DisplayFeedback, DisplayAppearanceInfoFromStats, SortByPlayerName, SortByPlayerNameDesc, DefaultPlayerSort, DefaultPlayerSortDesc } from "./Helpers.js";

let roundToDisplay, currentRound, allPlayers, allStats, allUsers, activeUser, allPlayersWithStats, singleRoundStats, displayedStats, scoreAsKicker, singleRound;
let sortAttribute = 'score';
let sortOrder = 'Descending';

window.onload = async function() {
    console.log("Page load start at " + new Date());
    roundToDisplay = getCookie('round');
    currentRound = await GetRoundInfoFromCookie();
    console.log("Round data loaded at " + new Date());
    for (let i = roundToDisplay; i > 0; i--) {
        let option = document.createElement('option');
        option.innerText = i;
        document.getElementById('roundSelect').appendChild(option);
    }
    // allStats = await GetAllStats();
    // let playerIdsWithStats = allStats.map(p => p.player_id);
    allUsers = await GetAllUsers();
    console.log("User data loaded at " + new Date());
    for (let user of allUsers) {
        let option = document.createElement('option');
        option.innerText = user.team_short;
        document.getElementById('xrlTeamSelect').appendChild(option);
    }
    activeUser = allUsers.find(u => u.team_short == GetActiveUserTeamShort());
    allPlayers = await GetAllPlayers();
    console.log("Player data loaded at " + new Date());
    // allPlayersWithStats = allPlayers.filter(p => playerIdsWithStats.includes(p.player_id))
    // for (let i in allStats) {
    //     let player = allPlayersWithStats.find(p => p.player_id == allStats[i].player_id);
    //     allStats[i].score = GetPlayerXrlScores(player.position, allStats[i]);
    //     allStats[i].score_not_kicking = GetPlayerXrlScores(player.position, allStats[i], false);
    //     allStats[i].position = player.position;
    //     allStats[i].xrl_team = player.xrl_team ? player.xrl_team : 'None';
    // }
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
    displayedStats = allPlayers;
    populateStatsTable(allPlayers, sortByTotalXrlScore);
    document.getElementById('loading').hidden = true;
    document.getElementById('mainContent').hidden = false;
    console.log("Page load finished at " + new Date());
}


function populateStatsTable(stats, sortFunction, scoringAsKicker=true) {
    let sortedStats = stats.sort(sortFunction);
    let table = document.getElementById('statTableBody');
    table.innerHTML = '';
    for (var player of sortedStats) {
        let tr = document.createElement('tr');
        let name = document.createElement('td');
        let logo = document.createElement('img');
        logo.src = 'static/' + player.nrl_club + '.svg';
        logo.height = '40';
        logo.className = 'me-1';
        name.appendChild(logo);
        let nameLink = document.createElement('a');
        nameLink.href = '#';
        nameLink.innerText = player.player_name;
        nameLink.value = player.player_id;
        if (!singleRound) {
            nameLink.onclick = function() {
                DisplayPlayerInfo(allPlayers.find(p => p.player_id == this.value), currentRound);
            };
        } else {
            nameLink.onclick = function() {
                DisplayAppearanceInfoFromStats(displayedStats.find(p => p.player_id == this.value));
            };
        }
        name.appendChild(nameLink);
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
        if (scoringAsKicker) {
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

async function filterStats(event) {
    event.preventDefault();
    document.getElementById('filterLoading').hidden = false;
    let roundNumber = document.getElementById('roundSelect').value;
    let nrlClub = document.getElementById('nrlClubSelect').value;
    let xrlTeam = document.getElementById('xrlTeamSelect').value;
    let position = document.getElementById('positionSelect').value;
    scoreAsKicker = document.getElementById('scoreKickerSelect').value == 'Yes' ? true : false;
    singleRound = roundNumber != 'ALL';
    let statsToDisplay;
    if (singleRound) {
        if (roundNumber == roundToDisplay) {
            statsToDisplay = singleRoundStats;
        } else {
            let roundStats = await GetStatsByRound(roundToDisplay);
            for (let i in roundStats) {
                let player = allPlayers.find(p => p.player_id == roundStats[i].player_id);
                roundStats[i].score = GetPlayerXrlScores(player.position, roundStats[i]);
                roundStats[i].score_not_kicking = GetPlayerXrlScores(player.position, roundStats[i], false);
                roundStats[i].position = player.position;
                roundStats[i].xrl_team = player.xrl_team ? player.xrl_team : 'None';
            }
            singleRoundStats = roundStats;
            statsToDisplay = roundStats;
        }
    } else {
        statsToDisplay = allPlayers;
    }
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
    let sortFunction = singleRound ? scoreAsKicker ? sortByXrlScore : sortByXrlScoreNoKicking : scoreAsKicker ? sortByTotalXrlScore : sortByTotalXrlScoreNoKicking;
    populateStatsTable(statsToDisplay, sortFunction, scoreAsKicker);
    document.getElementById('filterLoading').hidden = true;
}

window.filterStats = filterStats;

function sortByTotalXrlScore(p1, p2) {
    return (p2.scoring_stats[p2.position].points + p2.scoring_stats.kicker.points) - (p1.scoring_stats[p1.position].points + p1.scoring_stats.kicker.points);
}
function sortByTotalXrlScoreAsc(p1, p2) {
    return (p1.scoring_stats[p1.position].points + p1.scoring_stats.kicker.points) - (p2.scoring_stats[p2.position].points + p2.scoring_stats.kicker.points);
}
function sortByTotalXrlScoreNoKicking(p1, p2) {
    return p2.scoring_stats[p2.position].points - p1.scoring_stats[p1.position].points;
}
function sortByTotalXrlScoreNoKickingAsc(p1, p2) {
    return p1.scoring_stats[p1.position].points - p2.scoring_stats[p2.position].points;
}
function sortByXrlScore(p1, p2) {
    return p2.score - p1.score;
}
function sortByXrlScoreAsc(p1, p2) {
    return p1.score - p2.score;
}
function sortByXrlScoreNoKicking(p1, p2) {
    return p2.score_not_kicking - p1.score_not_kicking;
}
function sortByXrlScoreNoKickingAsc(p1, p2) {
    return p1.score_not_kicking - p2.score_not_kicking;
}

function sortPlayers(attribute) {
    let sortFunction;
    if (sortAttribute == attribute) {
        if (sortOrder == 'Descending') {
            sortOrder = 'Ascending';
        } else {
            sortOrder = 'Descending';
        }
    }
    if (['involvement_try', 'positional_try', 'concede', 'mia', 'tries'].includes(attribute)) {
        if (sortOrder == 'Descending') sortFunction = (p1, p2) => p2.scoring_stats[p2.position][attribute] - p1.scoring_stats[p1.position][attribute];
        else sortFunction = (p1, p2) => p1.scoring_stats[p1.position][attribute] - p2.scoring_stats[p2.position][attribute];
    } else if (['goals', 'field_goals'].includes(attribute)) {
        if (sortOrder == 'Descending') sortFunction = (p1, p2) => p2.scoring_stats.kicker[attribute] - p1.scoring_stats.kicker[attribute];
        else sortFunction = (p1, p2) => p1.scoring_stats.kicker[attribute] - p2.scoring_stats.kicker[attribute];
    } else if (attribute == 'player_name') {
        if (sortOrder == 'Descending') sortFunction = SortByPlayerName;
        else sortFunction = SortByPlayerNameDesc;
    } else if (attribute == 'score') {
        if (sortOrder == 'Descending') sortFunction = singleRound ? scoreAsKicker ? sortByXrlScore : sortByXrlScoreNoKicking : scoreAsKicker ? sortByTotalXrlScore : sortByTotalXrlScoreNoKicking;
        else sortFunction = singleRound ? scoreAsKicker ? sortByXrlScoreAsc : sortByXrlScoreNoKickingAsc : scoreAsKicker ? sortByTotalXrlScoreAsc : sortByTotalXrlScoreNoKickingAsc;
    } else if (attribute == 'position') { 
        if (sortOrder == 'Descending') sortFunction = DefaultPlayerSort;
        else sortFunction = DefaultPlayerSortDesc;
    } else {
        if (sortOrder == 'Descending') {
            sortFunction = function(p1, p2) {
                if (p1[attribute] == undefined) p1[attribute] = 'None';
                if (p2[attribute] == undefined) p2[attribute] = 'None';
                return p1[attribute] > p2[attribute] ? 1 : -1;
            }
        } else {
            sortFunction = function(p1, p2) {
                if (p1[attribute] == undefined) p1[attribute] = 'None';
                if (p2[attribute] == undefined) p2[attribute] = 'None';
                return p1[attribute] < p2[attribute] ? 1 : -1;
            }
        }
    }
    populateStatsTable(displayedStats, sortFunction, scoreAsKicker, singleRound);
}
window.sortPlayers = sortPlayers;

function searchPlayer(event) {
    event.preventDefault();
    let search = document.getElementById('playerSearch').value.toLowerCase();
    let result = displayedStats.filter(p => p.player_name.toLowerCase().includes(search));
    populateStatsTable(result, function(p1, p2) {
        return p1.player_name.split(' ')[1] > p2.player_name.split(' ')[1] ? 1 : -1;
    });
}
window.searchPlayer = searchPlayer;