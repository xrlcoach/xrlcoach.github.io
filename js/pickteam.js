import { GetAllPlayers, GetActiveUserInfo, DropPlayers, ScoopPlayers, GetIdToken } from "./ApiFetch.js";
import { DefaultPlayerSort, DisplayFeedback } from "./Helpers.js";

let user, squad, players, allPlayers, modifiedSquad;
const pickedPlayers = [];
const droppedPlayers = [];

window.onload = async function () {
    try {
        //Get active user info
        if (sessionStorage.getItem('activeUser')) {
            user = JSON.parse(sessionStorage.getItem('activeUser'));
        } else {
            user = await GetActiveUserInfo(GetIdToken());
            sessionStorage.setItem('activeUser', JSON.stringify(user));
        }
        //Fetch all player records
        allPlayers = await GetAllPlayers();
        //Get user's squad
        squad = allPlayers.filter(p => p.xrl_team == user.team_short);
        //Make a copy to track changes (players added or removed)
        modifiedSquad = Array.from(squad);
        //Show user squad breakdown
        DisplayPlayerCounts();
        //Finish loading
        document.getElementById('loading').hidden = true;
        document.getElementById('mainContent').hidden = false;
    } catch (error) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
        document.getElementById('loading').hidden = true;
    }
}

/**
 * Get squad size and position counts and display message to user
 */
async function DisplayPlayerCounts() {
    try {
        let totalPlayers = modifiedSquad.length;
        let backs = modifiedSquad.filter(p => p.position == 'Back' || p.position2 == 'Back');
        let forwards = modifiedSquad.filter(p => p.position == 'Forward' || p.position2 == 'Forward');
        let playmakers = modifiedSquad.filter(p => p.position == 'Playmaker' || p.position2 == 'Playmaker');
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

/**
 * Populates the player table giving option to pick/drop available players
 * @param {Array} playerData Array of player profile objects
 * @param {String} xrlTeam XRL team of active user
 * @param {String} tableId ID of table element to fill
 */
function PopulatePickPlayerTable(playerData, xrlTeam) {
    //Find and clear table
    let tableBody = document.getElementById('pickPlayerTable');
    tableBody.innerHTML = '';
    
    playerData.forEach(player => {
        //Create row for each player and fill out name, positions, club
        let tr = document.createElement('tr');
        let name = document.createElement('td');
        name.textContent = player.player_name;
        tr.appendChild(name);
        let pos1 = document.createElement('td');
        pos1.textContent = player.position;
        tr.appendChild(pos1);
        let pos2 = document.createElement('td');
        pos2.textContent = player.position2;
        tr.appendChild(pos2);
        let team = document.createElement('td');
        team.textContent = player.nrl_club;
        tr.appendChild(team);
        //Create a button if player belongs to user or is a free agent
        if (player.xrl_team == xrlTeam || player.xrl_team == undefined || player.xrl_team == 'None') {
            let pickOrDrop = document.createElement('td'); //Create cell
            // let form = document.createElement('form'); //Create form
            // let input = document.createElement('input'); //Create hidden input with player ID as value
            // input.setAttribute('type', 'hidden')
            // input.setAttribute('value', player.player_id)
            // input.name = player.player_name;
            // form.appendChild(input)
            let button = document.createElement('button');
            button.value = player.player_id;
            // button.setAttribute('type', 'submit');
            if (player.xrl_team == xrlTeam) {
                button.className = 'btn btn-danger';
                button.innerText = 'Drop';
                button.onclick = function () {
                    PickDropPlayer(null, this);
                };
            } else if (pickedPlayers.findIndex(p => p.player_id == player.player_id) != -1) {
                button.className = 'btn btn-warning';
                button.innerText = 'Cancel';
                button.onclick = function () {
                    removeFromPickedList(this, xrlTeam);
                };
            } else if (droppedPlayers.findIndex(p => p.player_id == player.player_id) != -1) {
                button.className = 'btn btn-warning';
                button.innerText = 'Cancel';
                button.onclick = function () {
                    removeFromDroppedList(this);
                };
            } else {
                button.className = 'btn btn-success';
                button.innerText = 'Pick';
                button.onclick = function () {
                    PickDropPlayer(xrlTeam, this);
                };
            }
            // form.appendChild(button);
            pickOrDrop.appendChild(button);
            tr.appendChild(pickOrDrop);
        } else { //If player already belongs to an XRL team, show that team's name
            let xrl = document.createElement('td');
            xrl.innerText = player.xrl_team;
            tr.appendChild(xrl);
        }
        //Add row to table
        tableBody.appendChild(tr);
    });
}

/**
 * Populates table with players from an NRL club
 * @param {String} club The name of the NRL club
 */
function selectNrlClub(club) {
    //Show club name and logo
    document.getElementById('clubLogo').hidden = false;
    document.getElementById('clubLogo').src = '/static/' + club + '.svg';
    document.getElementById('clubName').innerText = club;
    try {
        //Filter and sort players
        players = allPlayers
            .filter(p => p.nrl_club == club)
            .sort(DefaultPlayerSort);
        //Make call to populate table with players
        PopulatePickPlayerTable(players, user.team_short);
    } catch (error) {
        DisplayFeedback(error, error.stack);
    }
}
window.selectNrlClub = selectNrlClub;

/**
 * Searches all players for those whose name includes search term
 * @param {*} event 
 */
function searchPlayer(event) {
    event.preventDefault();
    document.getElementById('clubLogo').hidden = true;
    //Get search expression and display
    let player = document.getElementById('playerSearch').value;
    document.getElementById('clubName').innerText = 'Search: ' + player;
    //Search for players matching expression
    players = allPlayers.filter(p => p.search_name.toLowerCase().includes(player.toLowerCase()));
    //Make call to populate table with sorted player list
    PopulatePickPlayerTable(players.sort(DefaultPlayerSort), user.team_short);
}
window.searchPlayer = searchPlayer;

/**
 * Adds or removes a player from user's provisional selections
 * @param {String} xrlTeam XRL team acronym
 * @param {Element} button The button element that triggered function
 */
function PickDropPlayer(xrlTeam, button) {
    //Find player profile
    let player = players.find(p => p.player_id == button.value);
    // let playerId = form.elements[0].value;
    // let playerName = form.elements[0].name;
    if (xrlTeam == null) { //If function is called with null as XRL team, intention is to drop
        //Add player to drop list
        droppedPlayers.push(player);
        //Remove from modified squad list
        modifiedSquad.splice(modifiedSquad.findIndex(p => p.player_id == player.player_id), 1);
        //Change button on table row to allow user to cancel the drop
        button.onclick = function () {
            removeFromDroppedList(this);
        };
        button.className = 'btn btn-warning';
        button.innerText = 'Cancel';
        //Show user's choices and rebuild player table
        displayChoices();
        DisplayPlayerCounts();
    } else { //If function if called to pick player, perform the following validation...
        //Check if the squad already has 18 players
        if (modifiedSquad.length == 18) {
            DisplayFeedback('Sorry!', 'Adding this player would take your squad size above 18.');
            return;
        }
        //Calculate spots available and how many players user needs in each position
        let availableSpots = 18 - modifiedSquad.length;
        let requiredBacks = 5 - modifiedSquad.filter(p => p.position == 'Back' || p.position2 == 'Back').length;
        requiredBacks = requiredBacks < 0 ? 0 : requiredBacks;
        let requiredForwards = 5 - modifiedSquad.filter(p => p.position == 'Forward' || p.position2 == 'Forward').length;
        requiredForwards = requiredForwards < 0 ? 0 : requiredForwards;
        let requiredPlaymakers = 3 - modifiedSquad.filter(p => p.position == 'Playmaker' || p.position2 == 'Playmaker').length;
        requiredPlaymakers = requiredPlaymakers < 0 ? 0 : requiredPlaymakers;
        //Create a pick function to pass to the feedback modal
        let pickFunction = function() {
            pickedPlayers.push(player);
            modifiedSquad.push(player);
            button.onclick = function () {
                removeFromPickedList(this, xrlTeam);
            };
            button.className = 'btn btn-warning';
            button.innerText = 'Cancel';
            displayChoices();
            DisplayPlayerCounts();
        }
        //Display warning messages if the squad is short in a specific position, and the selected player does not play that position
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
        //If there are no issues, add player to picked players array
        pickedPlayers.push(player);
        //Add to provisional squad
        modifiedSquad.push(player);
        //Change button to allow user to cancel pick
        button.onclick = function () {
            removeFromPickedList(this, xrlTeam);
        };
        button.className = 'btn btn-warning';
        button.innerText = 'Cancel';
    }
    //Show user's choices and rebuild player table
    displayChoices();
    DisplayPlayerCounts();
}

/**
 * Cancels the picking of a player
 * @param {Element} button Button element that triggered function
 * @param {String} xrlTeam User's XRL team
 */
function removeFromPickedList(button, xrlTeam) {
    //Remove player from list of picked players and provisional squad list
    pickedPlayers.splice(pickedPlayers.findIndex(p => p.player_id == button.value), 1);
    modifiedSquad.splice(modifiedSquad.findIndex(p => p.player_id == button.value), 1);
    //Change button on row to allow player to be picked again
    button.onclick = function () {
        PickDropPlayer(xrlTeam, this);
    };
    button.className = 'btn btn-success';
    button.innerText = 'Pick';
    //Show user's choices and rebuild player table
    displayChoices();
    DisplayPlayerCounts();
}

/**
 * Cancels the dropping of a player
 * @param {Element} button Button element that triggered function
 */
function removeFromDroppedList(button) {
    //Put player back into provisional squad list
    modifiedSquad.push(droppedPlayers.find(p => p.player_id == button.value));
    //Remove player from list of players to drop
    droppedPlayers.splice(droppedPlayers.findIndex(p => p.player_id == button.value), 1);
    //Change button on row to allow plaeyr to be dropped again
    button.onclick = function () {
        PickDropPlayer(null, this);
    };
    button.className = 'btn btn-danger';
    button.innerText = 'Drop';
    //Show user's choices and rebuild player table
    displayChoices();
    DisplayPlayerCounts();
}

/**
 * Displays what alterations the user has made to their squad (players added, dropped)
 */
function displayChoices() {
    //Hide section if no changes made
    if (pickedPlayers.length == 0 && droppedPlayers.length == 0) {
        document.getElementById('chosenPlayers').hidden = true;
    }
    //Show picked players
    if (pickedPlayers.length > 0) {
        document.getElementById('chosenPlayers').hidden = false;
        document.getElementById('picked').hidden = false;
        document.getElementById('pickedList').innerHTML = '';
        pickedPlayers.forEach(player => {
            let li = document.createElement('li');
            li.innerText = player.player_name;
            li.id = player.player_id;
            document.getElementById('pickedList').appendChild(li);
        });
    } else document.getElementById('picked').hidden = true;
    //Show dropped players
    if (droppedPlayers.length > 0) {
        document.getElementById('chosenPlayers').hidden = false;
        document.getElementById('dropped').hidden = false;
        document.getElementById('droppedList').innerHTML = '';
        droppedPlayers.forEach(player => {
            let li = document.createElement('li');
            li.innerText = player.player_name;
            li.id = player.player_id;
            document.getElementById('droppedList').appendChild(li);
        });
    } else document.getElementById('dropped').hidden = true;
}

/**
 * Calls API to drop and pick selected players
 */
async function submitChoices() {
    try {
        if (droppedPlayers.length > 0) {
            await DropPlayers(user.team_short, droppedPlayers);
        }
        if (pickedPlayers.length > 0) {
            await ScoopPlayers(user.team_short, pickedPlayers);
        }
        location.reload();
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}
window.submitChoices = submitChoices;


