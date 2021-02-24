import { GetActiveUserTeamShort, GetAllPlayers, GetAllUsers, GetCurrentRoundInfo, GetCurrentRoundStatus, GetPlayersFromNrlClub, GetPlayersFromXrlTeam } from "./ApiFetch.js";
import { DefaultPlayerSort, DefaultPlayerSortDesc, DisplayFeedback, SortByNrlClub, SortByNrlClubDesc, SortByPlayerName, SortByPlayerNameDesc, SortByPosition2, SortByPosition2Desc, DisplayPlayerInfo } from "./Helpers.js";

let allUsers, players, filteredPlayers, xrlTeam, nrlClub, currentRound;

window.onload = async function () {
    try {
        if(sessionStorage.getItem('roundStatus')) {
            currentRound = JSON.parse(sessionStorage.getItem('roundStatus'));
        } else {
            currentRound = await GetCurrentRoundStatus();
            sessionStorage.setItem('roundStatus', JSON.stringify(currentRound));
        }        
        //Fetch all users data
        if(sessionStorage.getItem('allUsers')) {
            allUsers = JSON.parse(sessionStorage.getItem('allUsers'));
        } else {
            allUsers = await GetAllUsers();
            sessionStorage.setItem('allUsers', JSON.stringify(allUsers));
        }        
        //Populate XRL team select options
        let select = document.getElementById('xrlTeamSelect');
        allUsers.forEach(u => {
            let li = document.createElement('li')
            let option = document.createElement('a');
            option.value = u.team_short;
            option.innerText = u.team_short;
            option.href = '#\\';
            option.className = 'dropdown-item';
            option.onclick = function() {
                selectXrlTeam(this.value);
            }
            li.appendChild(option);
            select.appendChild(li);
        });
        // for (let i = 0; i < users.length; i++) {
        //     let li = document.createElement('li')
        //     let option = document.createElement('a');
        //     option.value = users[i].team_short;
        //     option.innerText = users[i].team_short;
        //     option.href = '#';
        //     option.className = "dropdown-item";
        //     option.onclick = function() {
        //         selectXrlTeam(this.value);
        //     }
        //     li.appendChild(option);
        //     select.appendChild(li);
        // }
        //Look for URL query parameters
        let query = window.location.href.split('?')[1];
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
        //Call function to fill player table
        PopulatePlayerTable(players.sort(DefaultPlayerSort), 'squadTable');
        //Hide loading icon and display page
        document.getElementById('loading').hidden = true;
        document.getElementById('mainContent').hidden = false;
    } catch (error) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
        document.getElementById('loading').hidden = true;
    }
    // GetPlayersFromNrlClub(club)
    // .then((players) => {
    //     PopulatePlayerTable(players, 'squadTable')
    // })
    // .catch((error) => {
    //     document.getElementById('feedback').innerText += error;
    // });
}

/**
 * 
 * @param {Array} playerData An array of player profile objects
 * @param {String} tableId The ID of the table to fill
 */
function PopulatePlayerTable(playerData, tableId) {
    try {
        //Find and clear table
        let tableBody = document.getElementById(tableId);
        tableBody.innerHTML = '';
        //For each player...
        playerData.forEach(p => {
            //Create a row
            let tr = document.createElement('tr');
            //Create a name cell
            let name = document.createElement('td');
            name.style.whiteSpace = 'nowrap';
            //Add NRL club logo
            let logo = document.createElement('img');
            logo.src = 'static/' + p.nrl_club + '.svg';
            logo.height = '40';
            logo.className = 'me-1';
            name.appendChild(logo);
            //Add name with link to display player modal
            let nameLink = document.createElement('a');
            nameLink.href = '#\\';
            nameLink.innerText = p.player_name;
            nameLink.value = p.player_id;
            nameLink.onclick = function() {
                DisplayPlayerInfo(players.find(p => p.player_id == this.value), currentRound);
            };
            name.appendChild(nameLink);
            tr.appendChild(name);
            //Add positions and club
            let pos1 = document.createElement('td');
            pos1.textContent = p.position;
            tr.appendChild(pos1);
            let pos2 = document.createElement('td');
            pos2.textContent = p.position2;
            tr.appendChild(pos2);
            let team = document.createElement('td');
            team.textContent = p.nrl_club;
            tr.appendChild(team);
            tableBody.appendChild(tr);
        });
        // for (let i = 0; i < playerData.length; i++) {
        //     let player = playerData[i];
        //     let tr = document.createElement('tr');
        //     let name = document.createElement('td');
        //     name.style.whiteSpace = 'nowrap';
        //     let logo = document.createElement('img');
        //     logo.src = 'static/' + player.nrl_club + '.svg';
        //     logo.height = '40';
        //     logo.className = 'me-1';
        //     name.appendChild(logo);
        //     let nameLink = document.createElement('a');
        //     nameLink.href = '#';
        //     nameLink.innerText = player.player_name;
        //     nameLink.value = player.player_id;
        //     nameLink.onclick = function() {
        //         DisplayPlayerInfo(players.find(p => p.player_id == this.value, round));
        //     };
        //     name.appendChild(nameLink);
        //     tr.appendChild(name);
        //     let pos1 = document.createElement('td');
        //     pos1.textContent = player.position;
        //     tr.appendChild(pos1);
        //     let pos2 = document.createElement('td');
        //     pos2.textContent = player.position2;
        //     tr.appendChild(pos2);
        //     let team = document.createElement('td');
        //     team.textContent = player.nrl_club;
        //     tr.appendChild(team);
        //     tableBody.appendChild(tr);
        // }
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}

/**
 * Fetches an NRL squad from db and shows in table
 * @param {String} club NRL club name
 */
async function selectNrlClub(club) {
    try {
        document.getElementById('squadName').innerText = club;
        players = await GetPlayersFromNrlClub(club);
        PopulatePlayerTable(players.sort(DefaultPlayerSort), 'squadTable');
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}
window.selectNrlClub = selectNrlClub;

/**
 * Fetches an XRL squad from db and shows in table
 * @param {String} team An XRL team acronym
 */
async function selectXrlTeam(team) {
    try {
        document.getElementById('squadName').innerText = team;
        players = await GetPlayersFromXrlTeam(team);
        PopulatePlayerTable(players.sort(DefaultPlayerSort), 'squadTable');
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}
window.selectXrlTeam = selectXrlTeam;

//#region Sorting functions...
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
//#endregion