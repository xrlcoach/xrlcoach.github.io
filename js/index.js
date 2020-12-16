import { GetIdToken, GetPlayersFromXrlTeam, GetActiveUserInfo, UpdatePlayerXrlTeam } from './ApiFetch.js';

var idToken = GetIdToken();
if (!idToken) {
    window.location.replace('login.html');
}

GetActiveUserInfo(idToken)
    .then((user) => {
        document.getElementById('userData').innerText = JSON.stringify(user);
        GetPlayersFromXrlTeam(user.team_short)
            .then((playerSquad) => {
                if (playerSquad.length < 18) {
                    document.getElementById('playerCountMessage').innerText = `Your squad only has ${playerSquad.length} players. You should pick more!`;
                    document.getElementById('pickPlayersLink').hidden = false;
                }
                PopulatePickPlayerTable(playerSquad, user.team_short, 'playerSquadTable');
            });
    })
    .catch((error) => {
        document.getElementById('feedback').innerText += error;
    });

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
        var drop = document.createElement('td');
        var form = document.createElement('form');
        var input = document.createElement('input');
        input.setAttribute('type', 'hidden')
        input.setAttribute('value', `${player.player_name};${player.nrl_club}]`)
        form.appendChild(input)
        var button = document.createElement('button');
        button.setAttribute('type', 'submit');
        button.className = 'btn btn-danger';
        button.innerText = 'Drop';
        form.appendChild(button);
        form.onsubmit = (event) => {
            event.preventDefault();
            UpdatePlayerXrlTeam(null, input.value)
                .then(() => DisplayPlayerCounts(xrlTeam))
        };
        drop.appendChild(form);
        tr.appendChild(drop);
        tableBody.appendChild(tr);
    }
}


