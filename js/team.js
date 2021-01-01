import { GetPlayersFromXrlTeam, GetActiveUserInfo, UpdatePlayerXrlTeam } from './ApiFetch.js';

let squad, user;

window.onload = async function () {
    try {
        user = await GetActiveUserInfo(idToken);
        squad = await GetPlayersFromXrlTeam(user.team_short);
        document.getElementById('teamHeader').innerHTML = user.team_name + "<br />First Team Squad";
        if (squad.length < 18) {
            document.getElementById('playerCountMessage').innerText = `Your squad only has ${squad.length} players. You should pick more!`;
            document.getElementById('pickPlayersLink').hidden = false;
        }
        PopulatePickPlayerTable(squad, user.team_short, 'playerSquadTable');
    } catch (error) {
        document.getElementById('feedback').innerText += error;
    }
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
        var drop = document.createElement('td');
        var form = document.createElement('form');
        var input = document.createElement('input');
        input.setAttribute('type', 'hidden')
        input.setAttribute('value', player.player_id)
        form.appendChild(input)
        var button = document.createElement('button');
        button.setAttribute('type', 'submit');
        button.className = 'btn btn-danger';
        button.innerText = 'Drop';
        form.appendChild(button);
        form.onsubmit = async function (event) {
            event.preventDefault();
            dropPlayer(this);
            try {
                let playerToDrop = squad.find()
                const resp = await UpdatePlayerXrlTeam(null, this.elements[0].value);
                location.reload();
            } catch (error) {
                document.getElementById('feedback').innerText += error;
            }
        };
        drop.appendChild(form);
        tr.appendChild(drop);
        tableBody.appendChild(tr);
    }
}

async function dropPlayer(form) {
    let playerToDrop = squad.find(p => p.player_id == form.elements[0].value)
    await UpdatePlayerXrlTeam(null, playerToDrop);
    location.reload();
}