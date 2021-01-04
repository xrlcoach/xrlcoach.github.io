import { GetPlayersFromXrlTeam, GetActiveUserInfo, UpdatePlayerXrlTeam } from './ApiFetch.js';

let squad, user;

window.onload = async function () {
    try {
        user = await GetActiveUserInfo(idToken);
        squad = await GetPlayersFromXrlTeam(user.team_short);
        document.getElementById('teamHeader').innerHTML = user.team_name + "<br />First Team Squad";
        document.getElementById('squadCount').innerText = 'Squad Size: ' + squad.length;
        let backs = squad.filter(p => p.position == 'Back' || p.position2 == 'Back');
        let playmakers = squad.filter(p => p.position == 'Playmaker' || p.position2 == 'Playmaker');
        let forwards = squad.filter(p => p.position == 'Forward' || p.position2 == 'Forward');
        let duals = squad.filter(p => p.position2 != '');
        document.getElementById('positionCounts').innerText = `Backs: ${backs.length}   Playmakers: ${playmakers.length}    Forwards: ${forwards.length}`
        if (duals.length == 1) document.getElementById('positionCounts').innerHTML += `<br />Includes ${duals.length} dual-position player`;
        else if (duals.length > 1) document.getElementById('positionCounts').innerHTML += `<br />Includes ${duals.length} dual-position players`;
        if (squad.length < 18) {
            document.getElementById('pickPlayersLink').hidden = false;
        }
        document.getElementById('powerplayCount').innerText = 'Powerplays left: ' + user.powerplays;
        for (let player in user.captain_counts) {
            document.getElementById('captainCountList').innerHTML += `<li>${player}: ${user.captain_counts[player]}</li>`
        }
        let sortedSquad = squad.sort(function(p1, p2) {
            return p1.player_name.split(' ')[1] > p2.player_name.split(' ')[1]
        });
        PopulatePickPlayerTable(sortedSquad);
    } catch (error) {
        document.getElementById('feedback').innerText += error;
    }
}

function PopulatePickPlayerTable(playerData) {
    var tableBody = document.getElementById('playerSquadTable');
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

function sortByName() {
    let sortedSquad = squad.sort(function(p1, p2) {
        return p1.player_name.split(' ')[1] > p2.player_name.split(' ')[1]
    });
    document.getElementById('sortByNameButton').onclick = sortByNameDesc;
    PopulatePickPlayerTable(sortedSquad);
}
window.sortByName = sortByName;
function sortByNameDesc() {
    let sortedSquad = squad.sort(function(p1, p2) {
        return p1.player_name.split(' ')[1] < p2.player_name.split(' ')[1]
    });
    document.getElementById('sortByNameButton').onclick = sortByName;
    PopulatePickPlayerTable(sortedSquad);
}
window.sortByNameDesc = sortByNameDesc;
function sortByPosition() {
    let sortedSquad = squad.sort(function(p1, p2) {
        return p1.position > p2.position
    });
    document.getElementById('sortByPositionButton').onclick = sortByPositionDesc;
    PopulatePickPlayerTable(sortedSquad);
}
window.sortByPosition = sortByPosition;
function sortByPositionDesc() {
    let sortedSquad = squad.sort(function(p1, p2) {
        return p1.position < p2.position
    });
    document.getElementById('sortByPositionButton').onclick = sortByPosition;
    PopulatePickPlayerTable(sortedSquad);
}
window.sortByPositionDesc = sortByPositionDesc;
function sortByPosition2() {
    let sortedSquad = squad.sort(function(p1, p2) {
        return p1.position2 > p2.position2
    });
    document.getElementById('sortByPosition2Button').onclick = sortByPosition2Desc;
    PopulatePickPlayerTable(sortedSquad);
}
window.sortByPosition2 = sortByPosition2;
function sortByPosition2Desc() {
    let sortedSquad = squad.sort(function(p1, p2) {
        return p1.position < p2.position
    });
    document.getElementById('sortByPosition2Button').onclick = sortByPosition2;
    PopulatePickPlayerTable(sortedSquad);
}
window.sortByPosition2Desc = sortByPosition2Desc;
function sortByClub() {
    let sortedSquad = squad.sort(function(p1, p2) {
        return p1.nrl_club > p2.nrl_club
    });
    document.getElementById('sortByClubButton').onclick = sortByClubDesc;
    PopulatePickPlayerTable(sortedSquad);
}
window.sortByClub = sortByClub;
function sortByClubDesc() {
    let sortedSquad = squad.sort(function(p1, p2) {
        return p1.nrl_club < p2.nrl_club
    });
    document.getElementById('sortByClubButton').onclick = sortByClub;
    PopulatePickPlayerTable(sortedSquad);
}
window.sortByClubDesc = sortByClubDesc;