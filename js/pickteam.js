import { GetAllPlayers, GetActiveUserInfo, DropPlayers, ScoopPlayers, GetIdToken } from "./ApiFetch.js";
import { DisplayFeedback } from "./Helpers.js";

let user, squad, players, allPlayers, modifiedSquad;
const pickedPlayers = [];
const droppedPlayers = [];

window.onload = async function () {
    try {
        if (sessionStorage.getItem('activeUser')) {
            user = JSON.parse(sessionStorage.getItem('activeUser'));
        } else {
            user = await GetActiveUserInfo(GetIdToken());
            sessionStorage.setItem('activeUser', JSON.stringify(user));
        }
        allPlayers = await GetAllPlayers();
        squad = allPlayers.filter(p => p.xrl_team == user.team_short);
        modifiedSquad = squad;
        DisplayPlayerCounts();
        document.getElementById('loading').hidden = true;
        document.getElementById('mainContent').hidden = false;
    } catch (error) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}

async function DisplayPlayerCounts() {
    try {
        var totalPlayers = modifiedSquad.length;
        var backs = modifiedSquad.filter(p => p.position == 'Back' || p.position2 == 'Back');
        var forwards = modifiedSquad.filter(p => p.position == 'Forward' || p.position2 == 'Forward');
        var playmakers = modifiedSquad.filter(p => p.position == 'Playmaker' || p.position2 == 'Playmaker');
        document.getElementById('playerCountBreakdown').innerHTML = '';
        document.getElementById('playerCountMessage').innerText =
            `You currently have ${totalPlayers} in your squad. You need ${18 - totalPlayers} more in total.`;
        if (backs.length < 5) {
            document.getElementById('playerCountBreakdown').innerHTML +=
                `<li>You need at least ${5 - backs.length} more ${5 - backs.length > 1 ? 'backs' : 'back'}.`;
        }
        if (forwards.length < 5) {
            document.getElementById('playerCountBreakdown').innerHTML +=
                `<li>You need at least ${5 - forwards.length} more ${5 - forwards.length > 1 ? 'forwards' : 'forward'}.`;
        }
        if (playmakers.length < 3) {
            document.getElementById('playerCountBreakdown').innerHTML +=
                `<li>You need at least ${3 - playmakers.length} more ${3 - playmakers.length > 1 ? 'playmakers' : 'playmaker'}.`;
        }
    } catch (error) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
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
                    removeFromDroppedList(this);
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

async function selectNrlClub(club) {
    document.getElementById('clubLogo').hidden = false;
    document.getElementById('clubLogo').src = '/static/' + club + '.svg';
    document.getElementById('clubName').innerText = club;
    try {
        players = allPlayers.filter(p => p.nrl_club == club);
        PopulatePickPlayerTable(players, user.team_short, 'pickPlayerTable');
    } catch (error) {
        DisplayFeedback(error, error.stack);
    }
}
window.selectNrlClub = selectNrlClub;

function searchPlayer(event) {
    event.preventDefault();
    document.getElementById('clubLogo').hidden = true;
    let player = document.getElementById('playerSearch').value;
    document.getElementById('clubName').innerText = 'Search: ' + player;
    players = allPlayers.filter(p => p.search_name.toLowerCase().includes(player.toLowerCase()));
    PopulatePickPlayerTable(players, user.team_short, 'pickPlayerTable');
}
window.searchPlayer = searchPlayer;

function PickDropPlayer(xrlTeam, form) {
    let player = players.find(p => p.player_id == form.elements[0].value);
    // let playerId = form.elements[0].value;
    // let playerName = form.elements[0].name;
    if (xrlTeam == null) {
        droppedPlayers.push(player);
        modifiedSquad.splice(modifiedSquad.findIndex(p => p.player_id == player.player_id), 1);
        form.onsubmit = function (event) {
            event.preventDefault();
            removeFromDroppedList(this);
        };
        form.lastChild.className = 'btn btn-warning';
        form.lastChild.innerText = 'Cancel';
        displayChoices();
        DisplayPlayerCounts();
    } else {
        if (modifiedSquad.length == 18) {
            DisplayFeedback('Sorry!', 'Adding this player would take your squad size above 18.');
            return;
        }
        let availableSpots = 18 - modifiedSquad.length;
        let requiredBacks = 5 - squad.filter(p => p.position == 'Back' || p.position2 == 'Back').length;
        requiredBacks = requiredBacks < 0 ? 0 : requiredBacks;
        let requiredForwards = 5 - squad.filter(p => p.position == 'Forward' || p.position2 == 'Forward').length;
        requiredForwards = requiredForwards < 0 ? 0 : requiredForwards;
        let requiredPlaymakers = 3 - squad.filter(p => p.position == 'Playmaker' || p.position2 == 'Playmaker').length;
        requiredPlaymakers = requiredPlaymakers < 0 ? 0 : requiredPlaymakers;
        let pickFunction = function() {
            pickedPlayers.push(player);
            modifiedSquad.push(player);
            form.onsubmit = function (event) {
                event.preventDefault();
                removeFromPickedList(this, xrlTeam);
            };
            form.lastChild.className = 'btn btn-warning';
            form.lastChild.innerText = 'Cancel';
            displayChoices();
            DisplayPlayerCounts();
        }
        if (availableSpots == requiredBacks && (player.position != 'Back' && player.position2 != 'Back')) {
            DisplayFeedback('Warning', `You only have ${availableSpots} ${availableSpots > 1 ? 'spots' : 'spot'} left and you need ${requiredBacks} more ${requiredBacks > 1 ? 'backs' : 'back'}. Would you like to pick ${player.player_name} anyway?`,
                true, pickFunction);
            return;
        }
        if (availableSpots == requiredForwards && (player.position != 'Forward' && player.position2 != 'Forward')) {
            DisplayFeedback('Warning', `You only have ${availableSpots} ${availableSpots > 1 ? 'spots' : 'spot'} left and you need ${requiredForwards} more ${requiredForwards > 1 ? 'forwards' : 'forward'}. Would you like to pick ${player.player_name} anyway?`,
                true, pickFunction);
            return;
        }
        if (availableSpots == requiredPlaymakers && (player.position != 'Playmaker' && player.position2 != 'Playmaker')) {
            DisplayFeedback('Warning', `You only have ${availableSpots} ${availableSpots > 1 ? 'spots' : 'spot'} left and you need ${requiredPlaymakers} more ${requiredPlaymakers > 1 ? 'playmakers' : 'playmaker'}. Would you like to pick ${player.player_name} anyway?`,
                true, pickFunction);
            return;
        }
        if (availableSpots == requiredBacks + requiredForwards &&
            (![player.position, player.position2].includes('Back') && ![player.position, player.position2].includes('Forward'))) {
            DisplayFeedback('Warning', `You only have ${availableSpots} ${availableSpots > 1 ? 'spots' : 'spot'} left and you need ${requiredBacks} more ${requiredBacks > 1 ? 'backs' : 'back'} and ${requiredForwards} more ${requiredForwards > 1 ? 'forwards' : 'forward'}. Would you like to pick ${player.player_name} anyway?`,
                true, pickFunction);
            return;
        }
        if (availableSpots == requiredBacks + requiredPlaymakers &&
            (![player.position, player.position2].includes('Back') && ![player.position, player.position2].includes('Playmaker'))) {
            DisplayFeedback('Warning', `You only have ${availableSpots} ${availableSpots > 1 ? 'spots' : 'spot'} left and you need ${requiredBacks} more ${requiredBacks > 1 ? 'backs' : 'back'} and ${requiredPlaymakers} more ${requiredPlaymakers > 1 ? 'playmakers' : 'playmaker'}. Would you like to pick ${player.player_name} anyway?`,
                true, pickFunction);
            return;
        }
        if (availableSpots == requiredPlaymakers + requiredForwards &&
            (![player.position, player.position2].includes('Playmaker') && ![player.position, player.position2].includes('Forward'))) {
            DisplayFeedback('Warning', `You only have ${availableSpots} ${availableSpots > 1 ? 'spots' : 'spot'} left and you need ${requiredPlaymakers} more ${requiredPlaymakers > 1 ? 'playmakers' : 'playmaker'} and ${requiredForwards} more ${requiredForwards > 1 ? 'forwards' : 'forward'}. Would you like to pick ${player.player_name} anyway?`,
                true, pickFunction);
            return;
        }
        pickedPlayers.push(player);
        modifiedSquad.push(player);
        form.onsubmit = function (event) {
            event.preventDefault();
            removeFromPickedList(this, xrlTeam);
        };
        form.lastChild.className = 'btn btn-warning';
        form.lastChild.innerText = 'Cancel';
    }
    displayChoices();
    DisplayPlayerCounts();
    // try {
    //     const resp = await UpdatePlayerXrlTeam(xrlTeam, form.elements[0].value);
    //     return resp.message;
    // } catch (error) {
    //     document.getElementById('feedback').innerText += error;
    // }
}

function removeFromPickedList(form, xrlTeam) {
    pickedPlayers.splice(pickedPlayers.findIndex(p => p.player_id == form.firstChild.value), 1);
    modifiedSquad.splice(modifiedSquad.findIndex(p => p.player_id == form.firstChild.value), 1);
    form.onsubmit = async function (event) {
        event.preventDefault();
        PickDropPlayer(xrlTeam, this);
    };
    form.lastChild.className = 'btn btn-success';
    form.lastChild.innerText = 'Pick';
    displayChoices();
    DisplayPlayerCounts();
}

function removeFromDroppedList(form) {
    modifiedSquad.push(droppedPlayers.find(p => p.player_id == form.firstChild.value));
    droppedPlayers.splice(droppedPlayers.findIndex(p => p.player_id == form.firstChild.value), 1);
    form.onsubmit = async function (event) {
        event.preventDefault();
        PickDropPlayer(null, this);
    };
    form.lastChild.className = 'btn btn-danger';
    form.lastChild.innerText = 'Drop';
    displayChoices();
    DisplayPlayerCounts();
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
    if (droppedPlayers.length > 0) {
        await DropPlayers(user.team_short, droppedPlayers);
    }
    if (pickedPlayers.length > 0) {
        await ScoopPlayers(user.team_short, pickedPlayers);
    }
    location.reload();
}
window.submitChoices = submitChoices;


