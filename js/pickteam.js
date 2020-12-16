import { GetAllPlayers, GetIdToken, GetPlayersFromNrlClub, GetPlayersFromXrlTeam, GetActiveUserInfo, UpdatePlayerXrlTeam } from "./ApiFetch.js";

function DisplayPlayerCounts(xrlTeam) {
    GetPlayersFromXrlTeam(xrlTeam)
        .then((data) => {
            var totalPlayers = data.length;
            if (totalPlayers == 18) {
                window.location.href = 'index.html';
            }
            var backs = data.filter(p => p.position == 'Back' || p.position2 == 'Back').length
            var forwards = data.filter(p => p.position == 'Forward' || p.position2 == 'Forward').length
            var playmakers = data.filter(p => p.position == 'Playmaker' || p.position2 == 'Playmaker').length
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
        })
        .catch((error) => {
            document.getElementById('feedback').innerText += 'DPC Function: ' + error;
        })
}

function PopulatePickPlayerTable(playerData, xrlTeam, tableId) {
    var tableBody = document.getElementById(tableId);
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
        if (player.xrl_team == user.team_short || player.xrl_team == undefined || player.xrl_team == 'None') {
            var pickOrDrop = document.createElement('td');
            var form = document.createElement('form');
            var input = document.createElement('input');
            input.setAttribute('type', 'hidden')
            input.setAttribute('value', `${player.player_name};${player.nrl_club}]`)
            form.appendChild(input)
            var button = document.createElement('button');
            button.setAttribute('type', 'submit');
            if (player.xrl_team == user.team_short) {
                button.className = 'btn btn-danger';
                button.innerText = 'Drop';
                form.onsubmit = (event) => {
                    event.preventDefault();
                    UpdatePlayerXrlTeam(null, input.value)
                        .then(() => DisplayPlayerCounts(xrlTeam))
                };
            } else {
                button.className = 'btn btn-success';
                button.innerText = 'Pick';
                form.onsubmit = (event) => {
                    event.preventDefault();
                    UpdatePlayerXrlTeam(null, input.value)
                        .then(() => DisplayPlayerCounts(xrlTeam))
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

function selectNrlClub(event) {
    event.preventDefault();
    club = document.getElementById('nrlClubSelect').value;
    document.getElementById('squadName').innerText = club;
    GetPlayersFromNrlClub(club)
        .then((data) => {
            PopulatePickPlayerTable(data, user.team_short, 'pickPlayerTable');
        })
        .catch((error) => {
            document.getElementById('feedback').innerText = error;
        })
}

window.onload = () => {
    const idToken = GetIdToken();
    if (!idToken) {
        window.location.replace('login.html');
    }
    GetActiveUserInfo(idToken)
        .then((user) => {
            DisplayPlayerCounts(user.team_short);
            GetAllPlayers()
                .then((data) => {
                    PopulatePickPlayerTable(data, user.team_short, 'pickPlayerTable');
                });
        })
        .catch((error) => document.getElementById('feedback').innerHTML += 'OnLoad: ' + error);
}
