import { GetActiveUserTeamShort, GetAllPlayers, GetAllUsers, GetCurrentRoundInfo, GetPlayersFromNrlClub, GetPlayersFromXrlTeam } from "./ApiFetch.js";
import { DefaultPlayerSort, DefaultPlayerSortDesc, DisplayFeedback, SortByNrlClub, SortByNrlClubDesc, SortByPlayerName, SortByPlayerNameDesc, SortByPosition2, SortByPosition2Desc } from "./Helpers.js";

let users, players, filteredPlayers, xrlTeam, nrlClub, round;

window.onload = async function () {
    try {
        users = await GetAllUsers();
        round = await GetCurrentRoundInfo();
        let query = window.location.href.split('?')[1];
        var select = document.getElementById('xrlTeamSelect');
        for (var i = 0; i < users.length; i++) {
            let li = document.createElement('li')
            var option = document.createElement('a');
            option.value = users[i].team_short;
            option.innerText = users[i].team_short;
            option.href = '#';
            option.className = "dropdown-item";
            option.onclick = function() {
                selectXrlTeam(this.value);
            }
            li.appendChild(option);
            select.appendChild(li);
        }
        if (query) {
            //Split into individual params
            let queries = query.split('&');
            //Iterate through queries and find requested squad
            for (let q of queries) {
                if (q.startsWith('xrlTeam')) {
                    xrlTeam = q.split('=')[1];
                    players = await GetPlayersFromXrlTeam(xrlTeam);
                }
                if (q.startsWith('nrlTeam')) {
                    nrlClub = q.split('=')[1];
                    players = await GetPlayersFromNrlClub(nrlClub);
                }
            }
        } else { //If no query, get user's squad
            players = GetPlayersFromXrlTeam(GetActiveUserTeamShort());
        }
        PopulatePlayerTable(players.sort(DefaultPlayerSort), 'squadTable');
    } catch (error) {
        DisplayFeedback('Error', error.stack);
    }
    // GetPlayersFromNrlClub(club)
    // .then((players) => {
    //     PopulatePlayerTable(players, 'squadTable')
    // })
    // .catch((error) => {
    //     document.getElementById('feedback').innerText += error;
    // });
}

function PopulatePlayerTable(playerData, tableId) {
    var tableBody = document.getElementById(tableId);
    tableBody.innerHTML = '';
    for (var i = 0; i < playerData.length; i++) {
        var player = playerData[i];
        var tr = document.createElement('tr');
        let name = document.createElement('td');
        let logo = document.createElement('img');
        logo.src = 'static/' + player.nrl_club + '.svg';
        logo.height = '40';
        logo.className = 'me-1';
        name.appendChild(logo);
        let nameLink = document.createElement('a');
        nameLink.href = '#';
        nameLink.innerText = player.player_name;
        nameLink.value = player.player_id;
        nameLink.onclick = function() {
            DisplayPlayerInfo(players.find(p => p.player_id == this.value, round));
        };
        name.appendChild(nameLink);
        tr.appendChild(name);
        var pos1 = document.createElement('td');
        pos1.textContent = player.position;
        tr.appendChild(pos1);
        var pos2 = document.createElement('td');
        pos2.textContent = player.position2;
        tr.appendChild(pos2);
        var team = document.createElement('td');
        team.textContent = player.nrl_club;
        tr.appendChild(team);
        tableBody.appendChild(tr);
    }
}

function selectNrlClub(club) {
    document.getElementById('squadName').innerText = club;
    filteredPlayers = players.filter(p => p.nrl_club == club);
    PopulatePlayerTable(filteredPlayers.sort(DefaultPlayerSort), 'squadTable');
}
window.selectNrlClub = selectNrlClub;

function selectXrlTeam(team) {
    document.getElementById('squadName').innerText = team;
    filteredPlayers = players.filter(p => p.xrl_team == team);
    PopulatePlayerTable(filteredPlayers.sort(DefaultPlayerSort), 'squadTable');
}
window.selectXrlTeam = selectXrlTeam;

function sortByName() {
    let sortedPlayers = filteredPlayers.sort(SortByPlayerName);
    document.getElementById('sortByNameButton').onclick = sortByNameDesc;
    PopulatePlayerTable(sortedPlayers, 'squadTable');
}
window.sortByName = sortByName;
function sortByNameDesc() {
    let sortedPlayers = filteredPlayers.sort(SortByPlayerNameDesc);
    document.getElementById('sortByNameButton').onclick = sortByName;
    PopulatePlayerTable(sortedPlayers, 'squadTable');
}
window.sortByNameDesc = sortByNameDesc;
function sortByPosition() {
    let sortedPlayers = filteredPlayers.sort(DefaultPlayerSort);
    document.getElementById('sortByPositionButton').onclick = sortByPositionDesc;
    PopulatePlayerTable(sortedPlayers, 'squadTable');
}
window.sortByPosition = sortByPosition;
function sortByPositionDesc() {
    let sortedPlayers = filteredPlayers.sort(DefaultPlayerSortDesc);
    document.getElementById('sortByPositionButton').onclick = sortByPosition;
    PopulatePlayerTable(sortedPlayers, 'squadTable');
}
window.sortByPositionDesc = sortByPositionDesc;
function sortByPosition2() {
    let sortedPlayers = filteredPlayers.sort(SortByPosition2);
    document.getElementById('sortByPosition2Button').onclick = sortByPosition2Desc;
    PopulatePlayerTable(sortedPlayers, 'squadTable');
}
window.sortByPosition2 = sortByPosition2;
function sortByPosition2Desc() {
    let sortedPlayers = filteredPlayers.sort(SortByPosition2Desc);
    document.getElementById('sortByPosition2Button').onclick = sortByPosition2;
    PopulatePlayerTable(sortedPlayers, 'squadTable');
}
window.sortByPosition2Desc = sortByPosition2Desc;
function sortByClub() {
    let sortedPlayers = filteredPlayers.sort(SortByNrlClub);
    document.getElementById('sortByClubButton').onclick = sortByClubDesc;
    PopulatePlayerTable(sortedPlayers, 'squadTable');
}
window.sortByClub = sortByClub;
function sortByClubDesc() {
    let sortedPlayers = filteredPlayers.sort(SortByNrlClubDesc);
    document.getElementById('sortByClubButton').onclick = sortByClub;
    PopulatePlayerTable(sortedPlayers, 'squadTable');
}
window.sortByClubDesc = sortByClubDesc;
