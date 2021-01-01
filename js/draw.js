import { GetAllFixtures, GetAllUsers, GetCurrentRoundInfo } from "./ApiFetch.js";
import { GetLineupScoreByTeamAndRound, GetActiveRoundFromFixtures } from "./Helpers.js";

let draw;
let roundToDisplay;
let users;

window.onload = async function() {
    let fixtures = await GetAllFixtures();
    draw = fixtures.sort((a, b) => a.round_number - b.round_number);
    users = await GetAllUsers();
    console.log(draw);
    if (draw.length == 0) {
        document.getElementById('feedback').innerText = 'No draw yet. Fixtures will be generated once all teams have joined.';
        return;
    }
    roundToDisplay = GetActiveRoundFromFixtures(fixtures);
    document.getElementById('roundHeading').innerText = 'Round ' + roundToDisplay.round_number;
    console.log('Current round: ' + roundToDisplay.round_number);
    for (let i = 0; i < draw.length; i++) {
        let option = document.createElement('option');
        option.innerText = draw[i].round_number;
        option.value = draw[i].round_number;
        if (i == roundToDisplay.round_number) option.selected = true;
        document.getElementById('roundSelect').appendChild(option);
    }
    PopulateFixtureTable(roundToDisplay);
}

async function PopulateFixtureTable(round) {
    let status;
    if (round.completed) status = 'Completed';
    else if (round.in_progress) status = 'In Progress';
    else if (round.active) status = 'Active';
    else status = 'Inactive';
    document.getElementById('roundStatus').innerText = 'Status: ' + status;

    let table = document.getElementById('fixturesTableBody');
    table.innerHTML = '';
    let fixtures = round.fixtures;
    for (let i = 0; i < fixtures.length; i++) {
        let tr = document.createElement('tr');
        let home = document.createElement('td');
        let homeUser = users.find(u => u.team_short == fixtures[i].home);
        home.innerText = homeUser.team_name;
        let away = document.createElement('td');
        let awayUser = users.find(u => u.team_short == fixtures[i].away);
        away.innerText = awayUser.team_name;
        if (round.completed || round.in_progress) {
            let homeScore = await GetLineupScoreByTeamAndRound(round.round_number, homeUser.team_short);
            home.innerText += " " + homeScore;
            let awayScore = await GetLineupScoreByTeamAndRound(round.round_number, awayUser.team_short);
            away.innerText += " " + awayScore;
        }
        tr.appendChild(home);
        tr.appendChild(away);
        if (round.completed || round.in_progress) {
            let view = document.createElement('td');
            let link = document.createElement('a');
            link.innerText = 'View';
            link.href = `fixture.html?round=${round.round_number}&fixture=${fixtures[i].home}-v-${fixtures[i].away}`;
            view.appendChild(link);
            tr.appendChild(view);
        }
        table.appendChild(tr);
    }
}

function selectRound(event) {
    event.preventDefault();
    roundToDisplay = draw.find(r => r.round_number == document.getElementById('roundSelect').value);
    PopulateFixtureTable(roundToDisplay);
}

window.selectRound = selectRound;