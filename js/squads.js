import { GetAllPlayers, GetAllUsers, GetPlayersFromNrlClub, GetPlayersFromXrlTeam } from "./ApiFetch.js";
import { PopulatePlayerTable } from './Tables.js';

let users, players, filteredPlayers;

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
    filteredPlayers = players.filter(p => p.nrl_club == club);
    PopulatePlayerTable(filteredPlayers.sort(function(p1, p2) {
        return p1.player_name.split(' ')[1] > p2.player_name.split(' ')[1]
    }), 'squadTable');
}
window.selectNrlClub = selectNrlClub;

function selectXrlTeam(event) {
    event.preventDefault();
    var team = document.getElementById('xrlTeamSelect').value;
    document.getElementById('squadName').innerText = team;
    filteredPlayers = players.filter(p => p.xrl_team == team);
    PopulatePlayerTable(filteredPlayers.sort(function(p1, p2) {
        return p1.player_name.split(' ')[1] > p2.player_name.split(' ')[1]
    }), 'squadTable');
}
window.selectXrlTeam = selectXrlTeam;

function searchPlayer(event) {
    event.preventDefault();
    let player = document.getElementById('playerSearch').value.toLowerCase();
    document.getElementById('squadName').innerText = 'Sarch: ' + player;
    filteredPlayers = players.filter(p => p.search_name.toLowerCase().includes(player));
    PopulatePlayerTable(filteredPlayers, 'squadTable');
}
window.searchPlayer = searchPlayer;

function sortByName() {
    let sortedPlayers = filteredPlayers.sort(function(p1, p2) {
        return p1.player_name.split(' ')[1] > p2.player_name.split(' ')[1]
    });
    document.getElementById('sortByNameButton').onclick = sortByNameDesc;
    PopulatePlayerTable(sortedPlayers, 'squadTable');
}
window.sortByName = sortByName;
function sortByNameDesc() {
    let sortedPlayers = filteredPlayers.sort(function(p1, p2) {
        return p1.player_name.split(' ')[1] < p2.player_name.split(' ')[1]
    });
    document.getElementById('sortByNameButton').onclick = sortByName;
    PopulatePlayerTable(sortedPlayers, 'squadTable');
}
window.sortByNameDesc = sortByNameDesc;
function sortByPosition() {
    let sortedPlayers = filteredPlayers.sort(function(p1, p2) {
        return p1.position > p2.position
    });
    document.getElementById('sortByPositionButton').onclick = sortByPositionDesc;
    PopulatePlayerTable(sortedPlayers, 'squadTable');
}
window.sortByPosition = sortByPosition;
function sortByPositionDesc() {
    let sortedPlayers = filteredPlayers.sort(function(p1, p2) {
        return p1.position < p2.position
    });
    document.getElementById('sortByPositionButton').onclick = sortByPosition;
    PopulatePlayerTable(sortedPlayers, 'squadTable');
}
window.sortByPositionDesc = sortByPositionDesc;
function sortByPosition2() {
    let sortedPlayers = filteredPlayers.sort(function(p1, p2) {
        return p1.position2 > p2.position2
    });
    document.getElementById('sortByPosition2Button').onclick = sortByPosition2Desc;
    PopulatePlayerTable(sortedPlayers, 'squadTable');
}
window.sortByPosition2 = sortByPosition2;
function sortByPosition2Desc() {
    let sortedPlayers = filteredPlayers.sort(function(p1, p2) {
        return p1.position < p2.position
    });
    document.getElementById('sortByPosition2Button').onclick = sortByPosition2;
    PopulatePlayerTable(sortedPlayers, 'squadTable');
}
window.sortByPosition2Desc = sortByPosition2Desc;
function sortByClub() {
    let sortedPlayers = filteredPlayers.sort(function(p1, p2) {
        return p1.nrl_club > p2.nrl_club
    });
    document.getElementById('sortByClubButton').onclick = sortByClubDesc;
    PopulatePlayerTable(sortedPlayers, 'squadTable');
}
window.sortByClub = sortByClub;
function sortByClubDesc() {
    let sortedPlayers = filteredPlayers.sort(function(p1, p2) {
        return p1.nrl_club < p2.nrl_club
    });
    document.getElementById('sortByClubButton').onclick = sortByClub;
    PopulatePlayerTable(sortedPlayers, 'squadTable');
}
window.sortByClubDesc = sortByClubDesc;
