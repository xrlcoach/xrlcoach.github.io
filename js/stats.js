import { GetActiveUserInfo, GetAllPlayers, GetAllStats, GetAllUsers, GetCurrentRoundInfo, GetIdToken, GetRoundInfo } from "./ApiFetch.js";
import { GetPlayerXrlScores } from "./Helpers.js";

let roundToDisplay, allStats, allUsers, activeUser, allPlayers, playersTotalStats;

window.onload = async function() {
    roundToDisplay = await GetCurrentRoundInfo();
    allStats = await GetAllStats();
    allUsers = await GetAllUsers();
    activeUser = await GetActiveUserInfo(GetIdToken());
    allPlayers = await GetAllPlayers();
    playersTotalStats = allPlayers.map(p => {
        let playerStats = allStats.filter(s => s.player_id == p.player_id);
        let playerStatsWithScores = playerStats.map(a => {
            a.score = GetPlayerXrlScores(p.position, a);
            return a;
        });
        p.stats = playerStatsWithScores.reduce((totals, appearance) => {
            for (let stat in appearance.stats) {
                totals[stat] += appearance[stat];
            }
            return totals;
        }, {});
        p.scoring_stats = playerStatsWithScores.reduce((totals, appearance) => {
            for (let position in appearance.scoring_stats) {
                for (let stat in position) {
                    if (typeof(appearance[position][stat]) == "boolean") {
                        totals[position][stat] += 1;
                    } else {
                        totals[position][stat] += appearance[position][stat];
                    }
                }
            }
            return totals;
        }, {});
        p.score = playerStatsWithScores.reduce((totals, appearance) => {
            return totals.score + appearance.score;
        });
        return p;
    });
    populateStatsTable(playersTotalStats);
}

function populateStatsTable(stats) {
    let table = document.getElementById('statTableBody');
    for (var player of stats) {
        let tr = document.createElement('tr');
        let name = document.createElement('td');
        name.innerText = player.player_name;
        tr.appendChild(name);
        let nrlClub = document.createElement('td');
        nrlClub.innerText = player.nrl_club;
        tr.appendChild(nrlClub);
        let xrlTeam = document.createElement('td');
        xrlTeam.innerText = player.xrl_team;
        tr.appendChild(xrlTeam);
        let position = document.createElement('td');
        position.innerText = player.position;
        tr.appendChild(position);
        let tries = document.createElement('td');
        tries.innerText = player.stats.tries;
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
        PTs.innerText = player.scoring_stats[player.position].playmaker_try;
        tr.appendChild(PTs);
        let mia = document.createElement('td');
        mia.innerText = player.scoring_stats[player.position].mia;
        tr.appendChild(mia);
        let concede = document.createElement('td');
        concede.innerText = player.scoring_stats[player.position].concede;
        tr.appendChild(concede);
        let total = document.createElement('td');
        total.innerText = player.scoring_stats.score;
        tr.appendChild(total);
        table.appendChild(total);
    }
}

function filterStats(event) {
    event.preventDefault();
    let statsToDisplay;
    let roundNumber = document.getElementById('roundSelect').nodeValue;
    let nrlClub = document.getElementById('nrlClubSelect').nodeValue;
    let xrlTeam = document.getElementById('xrlTeamSelect').nodeValue;
    if (roundNumber == 'ALL' && nrlClub == 'ALL' && xrlTeam == 'ALL') {
        statsToDisplay = playersTotalStats;
    } else if (roundNumber == 'ALL' && nrlClub == 'ALL') {
        statsToDisplay = playersTotalStats.filter(p => p.xrl_team == xrlTeam);
    } else if (roundNumber == 'ALL' && xrlTeam == 'ALL') {
        statsToDisplay = playersTotalStats.filter(p => p.nrl_club == nrlClub);
    } else if (nrlClub == 'ALL' && xrlTeam == 'ALL') {
        statsToDisplay = allStats.filter(p => p.round_number == roundNumber);
    } else if (roundNumber == 'ALL') {
        statsToDisplay = playersTotalStats.filter(p => p.nrl_club == nrlClub && p.xrl_team == xrlTeam);
    } else if (nrlClub == 'ALL') {
        statsToDisplay = allStats.filter(p => p.round_number == roundNumber && p.xrl_team == xrlTeam);
    } else if (xrlTeam == 'ALL') {
        statsToDisplay = allStats.filter(p => p.nrl_club == nrlClub && p.round_number == roundNumber);
    } else {
        statsToDisplay = playersTotalStats.filter(p => p.nrl_club == nrlClub && p.xrl_team == xrlTeam && p.round_number == roundNumber);
    }
    populateStatsTable(statsToDisplay);
}

window.filterStats = filterStats;