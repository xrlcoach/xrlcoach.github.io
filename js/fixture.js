import { GetAllUsers, GetLineupByTeamAndRound, GetRoundInfo } from "./ApiFetch.js";
import { GetLineupScore, PositionNames } from "./Helpers.js";

let roundNumber, completed, homeTeam, awayTeam, homeLineup, awayLineup, users;

window.onload = async function() {
    let query = window.location.href.split('?')[1];
    let queries = query.split('&');
    for (let q of queries) {
        if (q.startsWith('round')) {
            roundNumber = q.split('=')[1];
        }
        if (q.startsWith('fixture')) {
            let fixture = q.split('=')[1];
            homeTeam = fixture.split('-v-')[0];
            awayTeam = fixture.split('-v-')[1];
        }
    }
    let heading = `Round ${roundNumber}: ${homeTeam} v ${awayTeam}`;
    document.getElementById('fixtureHeading').innerText = heading;
    let roundInfo = await GetRoundInfo(roundNumber);
    document.getElementById('homeTableHeader').innerText = homeTeam + " Score";
    document.getElementById('awayTableHeader').innerText = awayTeam + " Score";
    completed = roundInfo['completed'];
    homeLineup = await GetLineupByTeamAndRound(roundNumber, homeTeam);
    awayLineup = await GetLineupByTeamAndRound(roundNumber, awayTeam);
    populateLineupTable('homeTableBody', homeLineup.sort((a, b) => a.position_number - b.position_number));
    populateLineupTable('awayTableBody', awayLineup.sort((a, b) => a.position_number - b.position_number));
}

function populateLineupTable(tableId, lineup) {
    let table = document.getElementById(tableId);
    let starters = lineup.filter(p => p.position_number < 14);
    let bench = lineup.filter(p => p.position_number >= 14);
    for (let player of starters) {
        let tr = document.createElement('tr');
        if (player['played_xrl']) tr.style.color = "green";
        if (!player['played_xrl'] && completed) tr.style.color = "red";
        let name = document.createElement('td');
        name.innerText = player['player_name'];
        tr.appendChild(name);
        let nrlClub = document.createElement('td');
        nrlClub.innerText = player['nrl_club'];
        tr.appendChild(nrlClub);
        let position = document.createElement('td');
        position.innerText = PositionNames[player['position_specific']];
        tr.appendChild(position);
        let captain = document.createElement('td');
        if (player['captain']) captain.innerText = 'Captain';
        if (player['vice']) captain.innerText = 'Vice-Captain';
        tr.appendChild(captain);
        let kicker = document.createElement('td');
        if (player['kicker']) kicker.innerText = 'Kicker';
        if (player['backup_kicker']) kicker.innerText = 'Backup Kicker';
        tr.appendChild(kicker);
        let score = document.createElement('td');
        score.innerText = player['score'];
        tr.appendChild(score);
        table.appendChild(tr);
    }
    let tr = document.createElement('tr');
    let benchHeader = document.createElement('td');
    benchHeader.innerText = 'Interchange'; 
    tr.appendChild(benchHeader);
    table.appendChild(tr);
    for (let player of bench) {
        let tr = document.createElement('tr');
        if (player['played_xrl']) tr.style.color = "green";
        if (!player['played_xrl'] && completed) tr.style.color = "red";
        if (!player['played_xrl'] && !completed) tr.style.color = "grey";
        let name = document.createElement('td');
        name.innerText = player['player_name'];
        tr.appendChild(name);
        let nrlClub = document.createElement('td');
        nrlClub.innerText = player['nrl_club'];
        tr.appendChild(nrlClub);
        let position = document.createElement('td');
        position.innerText = player['position_general'];
        tr.appendChild(position);
        let captain = document.createElement('td');
        tr.appendChild(captain);
        let kicker = document.createElement('td');
        tr.appendChild(kicker);
        let score = document.createElement('td');
        score.innerText = player['score'];
        tr.appendChild(score);
        table.appendChild(tr);
    }
    tr = document.createElement('tr');
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