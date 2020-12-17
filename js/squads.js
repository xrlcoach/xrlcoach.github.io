import { GetAllPlayers, GetAllUsers, GetPlayersFromNrlClub, GetPlayersFromXrlTeam } from "./ApiFetch.js";
import { PopulatePlayerTable } from './Tables.js'

window.onload = () => {
    var club = document.getElementById('nrlClubSelect').value;
    document.getElementById('squadName').innerText = club;
    GetAllUsers()
    .then((users) => {
        var select = document.getElementById('xrlTeamSelect');
        for (var i = 0; i < users.length; i++) {
            var option = document.createElement('option');
            option.value = users[i].team_short;
            select.appendChild(option);
        }
    })
    GetPlayersFromNrlClub(club)
    .then((players) => {
        PopulatePlayerTable(players, 'squadTable')
    })
    .catch((error) => {
        document.getElementById('feedback').innerText += error;
    });
}

function selectNrlClub(event) {
    event.preventDefault();
    var club = document.getElementById('nrlClubSelect').value;
    document.getElementById('squadName').innerText = club;
    GetPlayersFromNrlClub(club)
        .then((data) => {
            PopulatePlayerTable(data, 'squadTable');
        })
        .catch((error) => {
            document.getElementById('feedback').innerText += error;
        })
}
window.selectNrlClub = selectNrlClub;

function selectXrlTeam(event) {
    event.preventDefault();
    var team = document.getElementById('xrlTeamSelect').value;
    document.getElementById('squadName').innerText = team;
    GetPlayersFromXrlTeam(team)
        .then((data) => {
            PopulatePlayerTable(data, 'squadTable');
        })
        .catch((error) => {
            document.getElementById('feedback').innerText += error;
        })
}
window.selectXrlTeam = selectXrlTeam;