import { GetActiveUserTeamShort, GetAllUsers, getCookie, GetPlayerById, GetPlayersFromXrlTeam, GetTransferHistory, UpdateUserWaiverPreferences } from "./ApiFetch.js";
import { DisplayFeedback } from "./Helpers.js";

let roundNumber, allUsers, user, squad, waiverPreferences = [], provisionalDrop, transferHistory;

window.onload = async () => {
    try {
        roundNumber = getCookie('round');
        allUsers = await GetAllUsers();
        user = allUsers.find(u => u.team_short == GetActiveUserTeamShort());
        squad = await GetPlayersFromXrlTeam(user.team_short);
        for (let playerId of user.waiver_preferences) {
            waiverPreferences.push(await GetPlayerById(playerId));
        };
        provisionalDrop = user.provisional_drop;
        transferHistory = await GetTransferHistory();
        DisplayUserWaiverInfo();
        DisplayTransferHistory(transferHistory.filter(t => t.round_number == roundNumber));
        document.getElementById('loading').hidden = true;
        document.getElementById('mainContent').hidden = false;
    } catch (err) {
        DisplayFeedback(err, err.stack);
    }
}

function DisplayUserWaiverInfo() {
    document.getElementById('teamWaiverRank').innerText = user.waiver_rank;
    PopulateWaiverPreferencesTable();
    PopulateProvisionalDropOptions();
}

function PopulateWaiverPreferencesTable() {
    let table = document.getElementById('waiverPreferencesTable');
    table.innerHTML = '';
    for (let i in waiverPreferences) {
        let player = waiverPreferences[i];
        let row = document.createElement('tr');
        let rank = document.createElement('td');
        rank.innerText = i + 1;
        row.appendChild(rank);
        let name = document.createElement('td');
        let span = document.createElement('span');
        span.innerText = player.player_name;
        name.appendChild(span);
        let logo = document.createElement('img');
        logo.src = '/static/' + player.nrl_club + '.svg';
        logo.height = '50';
        name.appendChild(logo);
        row.appendChild(name);
        let arrows = document.createElement('td');
        let upArrow = document.createElement('button');
        upArrow.className = "btn btn-success";
        upArrow.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-up" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5z"/>
            </svg>`;
        upArrow.value = player.player_id;
        upArrow.onclick = function () {
            changePlayerPreferenceRank(this.value, 1);
        }
        arrows.appendChild(upArrow);
        let downArrow = document.createElement('button');
        downArrow.className = "btn btn-success m-1";
        downArrow.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-down" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z"/>
            </svg>`;
        downArrow.value = player.player_id;
        downArrow.onclick = function () {
            changePlayerPreferenceRank(this.value, -1);
        }
        arrows.appendChild(downArrow);
        let cancel = document.createElement('button');
        cancel.className = 'btn-close m-1';
        cancel.value = player.player_id;
        cancel.onclick = function() {
            changePlayerPreferenceRank(this.value, 0);
        }
        arrows.appendChild(cancel);
        row.appendChild(arrows);
        table.appendChild(row);
    }
}

function PopulateProvisionalDropOptions() {
    let select = document.getElementById('provisionalDrop');
    select.onchange = () => document.getElementById('confirmChanges').hidden = false;
    for (let player of squad) {
        let option = document.createElement('option');
        option.innerText = player.player_name;
        option.value = player.player_id;
        if (player.player_id == provisionalDrop) option.selected = 'selected';
        select.appendChild(option);
    }
}

async function DisplayTransferHistory(transfers) {
    let table = document.getElementById('transferHistoryTable');
    table.innerHTML = '';
    for (let t of transfers) {
        let player = await GetPlayerById(t.player_id);
        let row = document.createElement('tr');
        let datetime = document.createElement('td');
        datetime.innerText = t.datetime;
        row.appendChild(datetime);
        let team = document.createElement('td');
        team.innerText = allUsers.find(u => u.username == t.username).team_name;
        row.appendChild(team);
        let type = document.createElement('td');
        if (t.type == 'Drop') {
            type.innerText = 'DROPPED';
            type.style.color = '#c94d38';
        } else {
            type.innerText = 'SIGNED';
            type.style.color = 'green';
        } 
        let name = document.createElement('td');
        let span = document.createElement('span');
        span.innerText = player.player_name;
        name.appendChild(span);
        let logo = document.createElement('img');
        logo.src = '/static/' + player.nrl_club + '.svg';
        logo.height = '50px';
        name.appendChild(logo);
        row.appendChild(name);
        let description = document.createElement('tr');
        if (t.type == 'Scoop') description.innerText = 'on a free transfer.';
        if (t.type == 'Waiver') description.innerText = 'on a waiver.';
        if (t.type == 'Trade') description.innerText = 'from ' + t.seller;
        table.appendChild(row);
    }
}

function changePlayerPreferenceRank(playerId, increment) {
    let playerIndex = waiverPreferences.findIndex(p => p.player_id == playerId);
    let removedPlayer = waiverPreferences.splice(playerIndex, 1);
    if (increment != 0) waiverPreferences.splice(playerIndex + increment, 0, removedPlayer);
    PopulateWaiverPreferencesTable();
    document.getElementById('confirmChanges').hidden = false;
}

async function submitWaiverPreferences() {
    let preferences = waiverPreferences.map(p => p.player_id);
    provisionalDrop = document.getElementById('provisionalDrop').value;
    let resp = await UpdateUserWaiverPreferences(user.username, preferences, provisionalDrop);
    if (resp.error) {
        DisplayFeedback('Error', resp.error);
    } else {
        DisplayFeedback('Success', 'Waiver preferences updated', true, function() {location.reload()});
    }
}
window.submitWaiverPreferences = submitWaiverPreferences;