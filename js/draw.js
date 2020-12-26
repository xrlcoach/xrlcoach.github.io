import { GetAllFixtures } from "./ApiFetch";

let draw;
let roundToDisplay;

window.onload = async function() {
    draw = await GetAllFixtures();
    if (draw.length == 0) {
        document.getElementById('feedback').innerText = 'No draw yet. Fixtures will be generated once all teams have joined.';
        return;
    }
    let activeRounds = draw.filter(r => r.active == true);
    roundToDisplay = activeRounds.find(r => r.round_number == Math.max(activeRounds.map(r => r.round_number)));
    console.log('Current round: ' + roundToDisplay);
    for (let i = 0; i < draw.length; i++) {
        let option = document.createElement('option');
        option.innerText = draw[i].round_number;
        option.value = draw[i].round_number;
        document.getElementById('roundSelect').appendChild(option);
    }
    PopulateFixtureTable(roundToDisplay);
}

function PopulateFixtureTable(round) {
    let status;
    if (round.completed) status = 'Completed';
    else if (round.in_progress) status = 'In Progress';
    else if (round.active) status = 'Active';
    else status = 'Inactive';
    document.getElementById('roundStatus').innerText = 'Status: ' + status;

    let table = document.getElementById('fixtureTableBody');
    table.innerHTML = '';
    let fixtures = round.fixtures;
    for (let i = 0; i < fixtures.length; i++) {
        let tr = document.createElement('tr');
        let home = document.createElement('td');
        home.innerText = fixtures[i].home;
        tr.appendChild(home);
        let away = document.createElement('td');
        away.innerText = fixtures[i].away;
        tr.appendChild(away);
        let view = document.createElement('td');
        let link = document.createElement('a');
        link.innerText = 'View';
        link.href = `fixture.html?round=${round.round_number}&fixture=${fixtures[i].home}-v-${fixtures[i].away}`;
        view.appendChild(link);
        tr.appendChild(view);
        table.appendChild(tr);
    }
}

function selectRound(event) {
    event.preventDefault();
    roundToDisplay = document.getElementById('roundSelect').value;
    PopulateFixtureTable(roundToDisplay);
}