import { GetPlayersFromXrlTeam, GetActiveUserInfo, GetLineupByTeamAndRound, GetAllUsers, GetRoundInfoFromCookie } from './ApiFetch.js';
import { GetTeamFixture, GetOrdinal, PositionNames, GetLineupScore, DisplayFeedback } from './Helpers.js';

let user, allUsers, squad, currentRound, fixture;
let completed = false;

window.onload = async function () {
    try {
        user = await GetActiveUserInfo(idToken);
        allUsers = await GetAllUsers();
        currentRound = await GetRoundInfoFromCookie();
        completed = currentRound.completed;
        squad = await GetPlayersFromXrlTeam(user.team_short);
        displayUserData();
        fixture = GetTeamFixture(user.team_short, currentRound);
        if (fixture == undefined) {
            document.getElementById('matchTeamsDisplay').innerHTML = '<h4>No fixture to display...</h4>';
        }
        else {
            displayFixture(currentRound.round_number, fixture);
        }
    } catch (error) {
        DisplayFeedback('Error While Loading', error);
    }
}

function displayUserData() {
    let ladder = allUsers.sort((u1, u2) => u2.stats.points - u1.stats.points);
    let position = ladder.findIndex(u => u.username == user.username) + 1;
    document.getElementById('teamNameDisplay').innerHTML = `<h4>${user.team_name}</h4>`;
    document.getElementById('teamPositionDisplay').innerHTML = `<h4>Position: ${GetOrdinal(position)}</h4>`;
    document.getElementById('teamStatsDisplay').innerHTML = `<h4>Wins: ${user.stats.wins}, Draws: ${user.stats.draws}, Losses: ${user.stats.losses}</h4>`;
}

async function displayFixture(roundNumber, fixture) {
    let homeUser = allUsers.find(u => u.team_short == fixture.home);
    let awayUser = allUsers.find(u => u.team_short == fixture.away);
    document.getElementById('roundNumberDisplay').innerHTML = `<h4>Round ${roundNumber}</h4>`;
    document.getElementById('matchTeamsDisplay').innerHTML = `<h4>${homeUser.team_name} v ${awayUser.team_name}</h4>`;
    document.getElementById('homegroundDisplay').innerHTML = `<h4>@ ${homeUser.homeground}</h4>`;
    document.getElementById('homeLogo').src = `/static/${homeUser.team_short}.png`;
    document.getElementById('awayLogo').src = `/static/${awayUser.team_short}.png`;
    let homeLineup = await GetLineupByTeamAndRound(roundNumber, fixture.home);
    if (homeLineup.length == 0) {
        document.getElementById('homeTableHeader').innerText = "No lineup yet for " + fixture.home;
    } else {
        populateLineupTable('homeTableBody', homeLineup.sort((a, b) => a.position_number - b.position_number));
        document.getElementById('homeTableHeader').innerText = fixture.home + " Score";
    }
    let awayLineup = await GetLineupByTeamAndRound(roundNumber, fixture.away);
    if (awayLineup.length == 0) {
        document.getElementById('awayTableHeader').innerText = "No lineup yet for " + fixture.away;
    } else {
        populateLineupTable('awayTableBody', awayLineup.sort((a, b) => a.position_number - b.position_number));
        document.getElementById('awayTableHeader').innerText = fixture.away + " Score";
    }
    document.getElementById('fixtureContainer').hidden = false;
}

function populateLineupTable(tableId, lineup) {
    let table = document.getElementById(tableId);
    let starters = lineup.filter(p => p.position_number < 14);
    let bench = lineup.filter(p => p.position_number >= 14);
    for (let player of starters) {
        let tr = document.createElement('tr');
        if (player.played_xrl) tr.style.color = "green";
        if (!player.played_xrl && completed) tr.style.color = "#c94d38";
        let name = document.createElement('td');
        name.style.whiteSpace = 'nowrap';
        name.innerText = player.player_name;
        tr.appendChild(name);
        let nrlClub = document.createElement('td');
        nrlClub.innerText = player.nrl_club;
        tr.appendChild(nrlClub);
        let position = document.createElement('td');
        position.innerText = PositionNames[player.position_specific];
        tr.appendChild(position);
        let captain = document.createElement('td');
        if (player.captain || player.captain2) captain.innerText = 'Captain';
        if (player.vice) captain.innerText = 'Vice-Captain';
        tr.appendChild(captain);
        let kicker = document.createElement('td');
        if (player.kicker) kicker.innerText = 'Kicker';
        if (player.backup_kicker) kicker.innerText = 'Backup Kicker';
        tr.appendChild(kicker);
        let score = document.createElement('td');
        score.innerText = player.score;
        tr.appendChild(score);
        table.appendChild(tr);
    }
    let tr = document.createElement('tr');
    let benchHeader = document.createElement('td');
    benchHeader.innerText = 'Interchange'; 
    benchHeader.colSpan = "6";
    benchHeader.className = "border-bottom border-white";
    tr.appendChild(benchHeader);
    table.appendChild(tr);
    for (let player of bench) {
        let tr = document.createElement('tr');
        if (player.played_xrl) tr.style.color = "green";
        if (!player.played_xrl && completed) tr.style.color = "#c94d38";
        if (!player.played_xrl && !completed) tr.style.color = "grey";
        let name = document.createElement('td');
        name.innerText = player.player_name;
        tr.appendChild(name);
        let nrlClub = document.createElement('td');
        nrlClub.innerText = player.nrl_club;
        tr.appendChild(nrlClub);
        let position = document.createElement('td');
        position.innerText = player.position_general;
        tr.appendChild(position);
        let captain = document.createElement('td');
        tr.appendChild(captain);
        let kicker = document.createElement('td');
        tr.appendChild(kicker);
        let score = document.createElement('td');
        score.innerText = player.score;
        tr.appendChild(score);
        table.appendChild(tr);
    }
    tr = document.createElement('tr');
    tr.className = 'rounded-bottom';
    for (let i = 0; i < 4; i++) {
        tr.appendChild(document.createElement('td'));
    }
    let label = document.createElement('td');
    label.innerText = 'Total:';
    tr.appendChild(label);
    let total = GetLineupScore(lineup);
    let totalDisplay = document.createElement('td');
    totalDisplay.innerText = total;
    tr.appendChild(totalDisplay);
    table.appendChild(tr);
}

function showModal() {
    let redirect = function() {
        window.location.href = 'team.html';
    }
    DisplayFeedback('Success!', 'The modal thingy worked! Would you like to go to the team page?', true, redirect);
}
window.showModal = showModal;


