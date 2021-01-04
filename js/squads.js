import { GetAllPlayers, GetAllUsers, GetPlayersFromNrlClub, GetPlayersFromXrlTeam } from "./ApiFetch.js";
import { PopulatePlayerTable } from './Tables.js';

let users, players;

window.onload = async function () {
    var club = document.getElementById('nrlClubSelect').value;
    document.getElementById('squadName').innerText = club;
    try {
        users = await GetAllUsers();
        players = await GetAllPlayers();
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

function selectNrlClub(event) {
    event.preventDefault();
    var club = document.getElementById('nrlClubSelect').value;
    document.getElementById('squadName').innerText = club;
    let filteredPlayers = players.filter(p => p.nrl_club == club);
    PopulatePlayerTable(filteredPlayers, 'squadTable');
}
window.selectNrlClub = selectNrlClub;

function selectXrlTeam(event) {
    event.preventDefault();
    var team = document.getElementById('xrlTeamSelect').value;
    document.getElementById('squadName').innerText = team;
    let filteredPlayers = players.filter(p => p.xrl_team == team);
    PopulatePlayerTable(filteredPlayers, 'squadTable');
}
window.selectXrlTeam = selectXrlTeam;

function searchPlayer(event) {
    event.preventDefault();
    let player = document.getElementById('playerSearch').value.toLowerCase();
    document.getElementById('squadName').innerText = 'Sarch: ' + player;
    let filteredPlayers = players.filter(p => p.search_name.toLowerCase().includes(player));
    PopulatePlayerTable(filteredPlayers, 'squadTable');
}
window.searchPlayer = searchPlayer;
