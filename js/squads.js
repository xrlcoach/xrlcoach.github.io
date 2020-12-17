import { GetAllPlayers, GetAllUsers, GetPlayersFromNrlClub, GetPlayersFromXrlTeam } from "./ApiFetch.js";
import { PopulatePlayerTable } from './Tables.js'

window.onload = async function () {
    var club = document.getElementById('nrlClubSelect').value;
    document.getElementById('squadName').innerText = club;
    try {
        const users = await GetAllUsers();
        var select = document.getElementById('xrlTeamSelect');
        for (var i = 0; i < users.length; i++) {
            var option = document.createElement('option');
            option.value = users[i].team_short;
            option.innerText = users[i].team_short;
            select.appendChild(option);
        }
    } catch (error) {
        document.getElementById('feedback').innerText += error;
    }
    // GetPlayersFromNrlClub(club)
    // .then((players) => {
    //     PopulatePlayerTable(players, 'squadTable')
    // })
    // .catch((error) => {
    //     document.getElementById('feedback').innerText += error;
    // });
}

async function selectNrlClub(event) {
    event.preventDefault();
    var club = document.getElementById('nrlClubSelect').value;
    document.getElementById('squadName').innerText = club;
    try {
        const players = await GetPlayersFromNrlClub(club);
        PopulatePlayerTable(players, 'squadTable');
    } catch (error) {
        document.getElementById('feedback').innerText += error;
    }
}
window.selectNrlClub = selectNrlClub;

async function selectXrlTeam(event) {
    event.preventDefault();
    var team = document.getElementById('xrlTeamSelect').value;
    document.getElementById('squadName').innerText = team;
    try {
        const players = await GetPlayersFromXrlTeam(team);
        PopulatePlayerTable(players, 'squadTable');
    } catch (error) {
        document.getElementById('feedback').innerText += error;
    }
}
window.selectXrlTeam = selectXrlTeam;