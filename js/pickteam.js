import { GetAllPlayers, GetIdToken, GetPlayersFromNrlClub, GetPlayersFromXrlTeam, GetActiveUserInfo, UpdatePlayerXrlTeam, UpdateMultiplePlayerXrlTeams } from "./ApiFetch.js";

let user;
const pickedPlayers = [];
const droppedPlayers = [];

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
            input.setAttribute('value', player.player_id)
            input.name = player.player_name;
            form.appendChild(input)
            var button = document.createElement('button');
            button.setAttribute('type', 'submit');
            if (player.xrl_team == xrlTeam) {
                button.className = 'btn btn-danger';
                button.innerText = 'Drop';
                form.onsubmit = async function (event) {
                    event.preventDefault();
                    PickDropPlayer(null, this);
                };
            } else if (pickedPlayers.findIndex(p => p.player_id == player.player_id) != -1) {
                button.className = 'btn btn-warning';
                button.innerText = 'Cancel';
                form.onsubmit = function (event) {
                    event.preventDefault();
                    removeFromPickedList(this, xrlTeam);
                };
            } else if (droppedPlayers.findIndex(p => p.player_id == player.player_id) != -1) {
                button.className = 'btn btn-warning';
                button.innerText = 'Cancel';
                form.onsubmit = function (event) {
                    event.preventDefault();
                    removeFromDroppedList(this, xrlTeam);
                };
            } else {
                button.className = 'btn btn-success';
                button.innerText = 'Pick';
                form.onsubmit = function (event) {
                    event.preventDefault();
                    PickDropPlayer(xrlTeam, this);
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
        PopulatePickPlayerTable(players, user.team_short, 'pickPlayerTable');
    } catch (error) {
        document.getElementById('feedback').innerText = error;
    }
}
window.selectNrlClub = selectNrlClub;

async function PickDropPlayer(xrlTeam, form) {
    let playerId = form.elements[0].value;
    let playerName = form.elements[0].name;
    if (xrlTeam == null) {
        droppedPlayers.push({'player_id': playerId, 'player_name': playerName});
        form.onsubmit = function (event) {
            event.preventDefault();
            removeFromDroppedList(this, xrlTeam);
        };        
        form.lastChild.className = 'btn btn-warning';
        form.lastChild.innerText = 'Cancel';
        displayChoices();
    } else {
        pickedPlayers.push({'player_id': playerId, 'player_name': playerName});
        form.onsubmit = function (event) {
            event.preventDefault();
            removeFromPickedList(this, xrlTeam);
        };        
        form.lastChild.className = 'btn btn-warning';
        form.lastChild.innerText = 'Cancel';
        displayChoices();
    }
    // try {
    //     const resp = await UpdatePlayerXrlTeam(xrlTeam, form.elements[0].value);
    //     return resp.message;
    // } catch (error) {
    //     document.getElementById('feedback').innerText += error;
    // }
}

function removeFromPickedList(form, xrlTeam) {
    pickedPlayers.splice(pickedPlayers.findIndex(p => p.player_id == form.firstChild.value), 1);
    form.onsubmit = async function (event) {
        event.preventDefault();
        const resp = await PickDropPlayer(xrlTeam, this);
        document.getElementById('feedback').innerText += resp.message;
        location.reload();
    };        
    form.lastChild.className = 'btn btn-success';
    form.lastChild.innerText = 'Pick';
    displayChoices();
}

function removeFromDroppedList(form, xrlTeam) {
    droppedPlayers.splice(droppedPlayers.findIndex(p => p.player_id == form.firstChild.value), 1);
    form.onsubmit = async function (event) {
        event.preventDefault();
        const resp = await PickDropPlayer(null, this);
        document.getElementById('feedback').innerText += resp.message;
        location.reload();
    };        
    form.lastChild.className = 'btn btn-danger';
    form.lastChild.innerText = 'Drop';
    displayChoices();
}

function displayChoices() {
    if (pickedPlayers.length == 0 && droppedPlayers.length == 0) {
        document.getElementById('chosenPlayers').hidden = true;
    }
    if (pickedPlayers.length > 0) {
        document.getElementById('chosenPlayers').hidden = false;
        document.getElementById('picked').hidden = false;
        document.getElementById('pickedList').innerHTML = '';
        for (let player of pickedPlayers) {
            let li = document.createElement('li');
            li.innerText = player.player_name;
            li.id = player.player_id;
            document.getElementById('pickedList').appendChild(li);
        }
    } else document.getElementById('picked').hidden = true;
    if (droppedPlayers.length > 0) {
        document.getElementById('chosenPlayers').hidden = false;
        document.getElementById('dropped').hidden = false;
        document.getElementById('droppedList').innerHTML = '';
        for (let player of droppedPlayers) {
            let li = document.createElement('li');
            li.innerText = player.player_name;
            li.id = player.player_id;
            document.getElementById('droppedList').appendChild(li);
        }
    } else document.getElementById('dropped').hidden = true;
}

async function submitChoices() {
    await UpdateMultiplePlayerXrlTeams(null, droppedPlayers);
    await UpdateMultiplePlayerXrlTeams(user.team_short, pickedPlayers);
    location.reload();
}
window.submitChoices = submitChoices;


