import { GetAllPlayers, GetIdToken, GetPlayersFromNrlClub, GetPlayersFromXrlTeam, GetActiveUserInfo, UpdatePlayerXrlTeam } from "./ApiFetch.js";

let user;

window.onload = async function () {
    const idToken = GetIdToken();
    if (!idToken) {
        window.location.replace('login.html');
    }
    try {
        user = await GetActiveUserInfo(idToken);
        await DisplayPlayerCounts(user.team_short);
        var club = document.getElementById('nrlClubSelect').value;
        document.getElementById('squadName').innerText = club;
        const players = await GetPlayersFromNrlClub(club);
        PopulatePickPlayerTable(players, user.team_short, 'pickPlayerTable');
    } catch (error) {
        document.getElementById('feedback').innerHTML += 'OnLoad: ' + error;
    }
}

async function DisplayPlayerCounts(xrlTeam) {
    try {
        const squad = await GetPlayersFromXrlTeam(xrlTeam);
        var totalPlayers = squad.length;
        if (totalPlayers == 18) {
            window.location.href = 'index.html';
        }
        var backs = squad.filter(p => p.position == 'Back' || p.position2 == 'Back')
        var forwards = squad.filter(p => p.position == 'Forward' || p.position2 == 'Forward')
        var playmakers = squad.filter(p => p.position == 'Playmaker' || p.position2 == 'Playmaker')
        document.getElementById('playerCountMessage').innerText =
            `You currently have ${totalPlayers} in your squad. You need ${18 - totalPlayers} more in total.`
        if (backs.length < 5) {
            document.getElementById('playerCountBreakdown').innerHTML +=
                `<li>You need at least ${5 - backs.length} more backs.`
        }
        if (forwards.length < 5) {
            document.getElementById('playerCountBreakdown').innerHTML +=
                `<li>You need at least ${5 - forwards.length} more forwards.`
        }
        if (playmakers.length < 3) {
            document.getElementById('playerCountBreakdown').innerHTML +=
                `<li>You need at least ${3 - playmakers.length} more playmakers.`
        }
    } catch (error) {
        document.getElementById('feedback').innerText += 'DPC Function: ' + error;
    }
}

function PopulatePickPlayerTable(playerData, xrlTeam, tableId) {
    var tableBody = document.getElementById(tableId);
    tableBody.innerHTML = '';
    for (var i = 0; i < playerData.length; i++) {
        var player = playerData[i];
        var tr = document.createElement('tr');
        var name = document.createElement('td');
        name.textContent = player.player_name;
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
        if (player.xrl_team == xrlTeam || player.xrl_team == undefined || player.xrl_team == 'None') {
            var pickOrDrop = document.createElement('td');
            var form = document.createElement('form');
            var input = document.createElement('input');
            input.setAttribute('type', 'hidden')
            input.setAttribute('value', `${player.player_name};${player.nrl_club}`)
            form.appendChild(input)
            var button = document.createElement('button');
            button.setAttribute('type', 'submit');
            if (player.xrl_team == xrlTeam) {
                button.className = 'btn btn-danger';
                button.innerText = 'Drop';
                form.onsubmit = async function (event) {
                    event.preventDefault();
                    document.getElementById('feedback').innerText += resp.message;
                    const resp = PickDropPlayer(null, this);
                    location.reload();
                };
            } else {
                button.className = 'btn btn-success';
                button.innerText = 'Pick';
                form.onsubmit = async function (event) {
                    event.preventDefault();
                    const resp = PickDropPlayer(xrlTeam, this);
                    document.getElementById('feedback').innerText += resp.message;
                    location.reload();
                };
            }
            form.appendChild(button);
            pickOrDrop.appendChild(form);
            tr.appendChild(pickOrDrop);
        } else {
            var xrl = document.createElement('td');
            xrl.innerText = player.xrl_team;
            tr.appendChild(xrl);
        }
        tableBody.appendChild(tr);
    }
}

async function selectNrlClub(event) {
    event.preventDefault();
    var club = document.getElementById('nrlClubSelect').value;
    document.getElementById('squadName').innerText = club;
    try {
        const players = await GetPlayersFromNrlClub(club);
        PopulatePickPlayerTable(data, user.team_short, 'pickPlayerTable');
    } catch (error) {
        document.getElementById('feedback').innerText = error;
    }
}
window.selectNrlClub = selectNrlClub;

async function PickDropPlayer(xrlTeam, form) {
    try {
        const resp = UpdatePlayerXrlTeam(xrlTeam, form.elements[0].value);
        return resp.message;
    } catch (error) {
        document.getElementById('feedback').innerText += error;
    }
}



