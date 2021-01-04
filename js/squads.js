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

function sortByName() {
    let sortedSquad = players.sort(function(p1, p2) {
        return p1.player_name.split(' ')[1] > p2.player_name.split(' ')[1]
    });
    document.getElementById('sortByNameButton').onclick = sortByNameDesc;
    PopulatePlayerTable(sortedSquad, 'squadTable');
}
window.sortByName = sortByName;
function sortByNameDesc() {
    let sortedSquad = players.sort(function(p1, p2) {
        return p1.player_name.split(' ')[1] < p2.player_name.split(' ')[1]
    });
    document.getElementById('sortByNameButton').onclick = sortByName;
    PopulatePickPlayerTable(sortedSquad);
}
window.sortByNameDesc = sortByNameDesc;
function sortByPosition() {
    let sortedSquad = players.sort(function(p1, p2) {
        return p1.position > p2.position
    });
    document.getElementById('sortByPositionButton').onclick = sortByPositionDesc;
    PopulatePlayerTable(sortedSquad, 'squadTable');
}
window.sortByPosition = sortByPosition;
function sortByPositionDesc() {
    let sortedSquad = players.sort(function(p1, p2) {
        return p1.position < p2.position
    });
    document.getElementById('sortByPositionButton').onclick = sortByPosition;
    PopulatePlayerTable(sortedSquad, 'squadTable');
}
window.sortByPositionDesc = sortByPositionDesc;
function sortByPosition2() {
    let sortedSquad = players.sort(function(p1, p2) {
        return p1.position2 > p2.position2
    });
    document.getElementById('sortByPosition2Button').onclick = sortByPosition2Desc;
    PopulatePlayerTable(sortedSquad, 'squadTable');
}
window.sortByPosition2 = sortByPosition2;
function sortByPosition2Desc() {
    let sortedSquad = players.sort(function(p1, p2) {
        return p1.position < p2.position
    });
    document.getElementById('sortByPosition2Button').onclick = sortByPosition2;
    PopulatePlayerTable(sortedSquad, 'squadTable');
}
window.sortByPosition2Desc = sortByPosition2Desc;
function sortByClub() {
    let sortedSquad = players.sort(function(p1, p2) {
        return p1.nrl_club > p2.nrl_club
    });
    document.getElementById('sortByClubButton').onclick = sortByClubDesc;
    PopulatePlayerTable(sortedSquad, 'squadTable');
}
window.sortByClub = sortByClub;
function sortByClubDesc() {
    let sortedSquad = players.sort(function(p1, p2) {
        return p1.nrl_club < p2.nrl_club
    });
    document.getElementById('sortByClubButton').onclick = sortByClub;
    PopulatePlayerTable(sortedSquad, 'squadTable');
}
window.sortByClubDesc = sortByClubDesc;
