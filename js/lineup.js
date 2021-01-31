/* Script controlling lineup.html, the page where the user sets their lineup for the next round */

import { GetActiveUserInfo, GetIdToken, GetLineup, GetLineupByTeamAndRound, GetNextRoundInfo, GetPlayersFromXrlTeam, SetLineup } from './ApiFetch.js'
import { DisplayFeedback, GetTeamFixture } from './Helpers.js';

/**
 * The active user's id token
 */
const idToken = GetIdToken();
/**
 * An array of position element ids that map to Back positions
 */
const positions_backs = ['fullback', 'winger1', 'winger2', 'centre1', 'centre2'];
/**
 * An array of position element ids that map to Playmaker positions
 */
const positions_playmakers = ['five_eighth', 'halfback', 'hooker'];
/**
 * An array of position element ids that map to Forward positions
 */
const positions_forwards = ['prop1', 'prop2', 'lock', 'row1', 'row2'];
/**
 * An array of position element ids that map to interchange positions
 */
const interchange = ['int1', 'int2', 'int3', 'int4'];
/**
 * An array of element ids that map to player roles
 */
const roles = ['captain', 'captain2', 'vice', 'kicker', 'backup_kicker'];

let user, squad, lineup, backs, forwards, playmakers, powerplay, nextRound;

window.onload = async () => {
    //Get the active user's data
    user = await GetActiveUserInfo(idToken);
    console.log(user);
    //Get player data for the user's XRL squad
    squad = await GetPlayersFromXrlTeam(user.team_short);
    console.log(squad[0]);
    //Retrieve and display info for the next round
    nextRound = await GetNextRoundInfo();
    let match = GetTeamFixture(user.team_short, nextRound);
    if (match == undefined) {
        document.getElementById('loading').hidden = true;
        DisplayFeedback('WTF?', 'No match this week. Please check back later.');
        return;
    }
    let homeGame = match.home == user.team_short;
    let opponent = homeGame ? match.away : match.home;
    document.getElementById('lineupHeading').innerHTML = `Select ${user.team_short} lineup for Round ${nextRound.round_number} vs ${opponent} ${homeGame ? "AT HOME" : "AWAY"}`;
    //Get the user's lineup data for the current round, if already set
    lineup = await GetLineup(idToken);
    console.log(lineup.length);
    //If no lineup is set, get previous lineup
    if (lineup.length == 0) {
        lineup = await GetLineupByTeamAndRound(nextRound.round_number - 1, user.team_short);
        for (let player of lineup) {
            if (player.captain2) {
                player.captain2 = false;
                player.vice = true;
            }
        }
    }
    //Check if existing lineup is using powerplay
    let numCaptains = lineup.filter(p => p.captain || p.captain2).length;
    console.log(numCaptains);
    powerplay = numCaptains == 2;
    console.log(powerplay);
    //If so, change second captain input to visible, and vice captain to hidden
    if (powerplay) {
        document.getElementById('secondCaptainSelect').hidden = false;
        document.getElementById('viceCaptainSelect').hidden = true;
    }
    //Locate powerplay button
    let button = document.getElementById('powerplayButton');
    //If powerplay is not already active, and the user is at home and has some left to use, show the green
    //'Use Powerplay' button
    if (!powerplay && homeGame && user.powerplays > 0) {
        button.hidden = false;
        button.className = 'btn btn-success';
        button.innerText = 'Use Powerplay';
    } // If powerplay is already active, show the red 'Turn Off Powerplay' button
    else if (powerplay) {
        button.hidden = false;
        button.className = 'btn btn-danger';
        button.innerText = 'Turn Off Powerplay';
    }
    //Organise user's XRL squad into separate arrays based on their position
    backs = squad.filter(p => p.position == 'Back' || p.position2 == 'Back');
    console.log('Backs: ' + backs[0]);
    forwards = squad.filter(p => p.position == 'Forward' || p.position2 == 'Forward');
    console.log('Forwards: ' + forwards[0]);
    playmakers = squad.filter(p => p.position == 'Playmaker' || p.position2 == 'Playmaker');
    console.log('Playmakers: ' + playmakers[0]);
    //Call the table constructor
    PopulateLineup();
    document.getElementById('loading').hidden = true;
    document.getElementById('mainContent').hidden = false;
}

function togglePowerplay(event, button) {
    if (powerplay) {
        powerplay = false;
        document.getElementById('captain2').innerHTML = '';
        document.getElementById('secondCaptainSelect').hidden = true;
        for (var i = 0; i < squad.length; i++) {
            createOption(squad[i], 'vice');
        }
        document.getElementById('viceCaptainSelect').hidden = false;
        button.className = 'btn btn-success';
        button.innerText = 'Use Powerplay';
    } else {
        powerplay = true;
        document.getElementById('vice').innerHTML = '';
        document.getElementById('viceCaptainSelect').hidden = true;
        for (var i = 0; i < squad.length; i++) {
            createOption(squad[i], 'captain2');
        }
        document.getElementById('secondCaptainSelect').hidden = false;
        button.className = 'btn btn-danger';
        button.innerText = 'Turn Off Powerplay';
    }
}

window.togglePowerplay = togglePowerplay;

async function PopulateLineup() {    
    if (lineup.length > 0) {
        console.log('Pre-filling existing lineup');
        console.log(lineup[0]);
        for (let i = 0; i < positions_backs.length; i++) {
            let player = lineup.find(p => p.position_specific == positions_backs[i]);
            let otherBacks;
            if (player == undefined) {
                createOption(null, positions_backs[i]);
                otherBacks = backs;
            } else{
                createOption(player, positions_backs[i]);
                otherBacks = backs.filter(p => player['player_id'] != p['player_id']);
            }
            for (let j = 0; j < otherBacks.length; j++) {
                createOption(otherBacks[j], positions_backs[i]);
            }
            createOption(null, positions_backs[i]);
        }
        for (let i = 0; i < positions_forwards.length; i++) {
            let player = lineup.find(p => p.position_specific == positions_forwards[i]);
            let otherForwards;
            if (player == undefined) {
                createOption(null, positions_forwards[i]);
                otherForwards = forwards;
            } else {
                createOption(player, positions_forwards[i]);
                otherForwards = forwards.filter(p => player['player_id'] != p['player_id']);
            }
            for (let j = 0; j < otherForwards.length; j++) {
                createOption(otherForwards[j], positions_forwards[i]);
            }
            createOption(null, positions_forwards[i]);
        }
        for (let i = 0; i < positions_playmakers.length; i++) {
            let player = lineup.find(p => p.position_specific == positions_playmakers[i]);
            let otherPlaymakers;
            if (player == undefined) {
                createOption(null, positions_playmakers[i]);
                otherPlaymakers = playmakers;
            } else {
                createOption(player, positions_playmakers[i]);
                otherPlaymakers = playmakers.filter(p => player['player_id'] != p['player_id']);
            }
            for (let j = 0; j < otherPlaymakers.length; j++) {
                createOption(otherPlaymakers[j], positions_playmakers[i]);
            }
            createOption(null, positions_playmakers[i]);
        }
        fillInterchangeOptions(true);
        for (let i = 0; i < roles.length; i++) {
            if (roles[i] == 'captain2' && !powerplay) continue;
            if (roles[i] == 'vice' && powerplay) continue;
            let player = lineup.find(p => p[roles[i]]);
            let otherPlayers;
            if (player == undefined) {
                createOption(null, roles[i]);
                otherPlayers = squad;
            } else {
                otherPlayers = squad.filter(p => player['player_id'] != p['player_id']);
                createOption(player, roles[i]);
            }
            for (let j = 0; j < otherPlayers.length; j++) {
                createOption(otherPlayers[j], roles[i]);
            }
            createOption(null, roles[i]);
        }
    } else {
        for (let i = 0; i < positions_backs.length; i++) {
            createOption(null, positions_backs[i]);
            for (let j = 0; j < backs.length; j++) {
                createOption(backs[j], positions_backs[i]);
            }
        }
        for (let i = 0; i < positions_forwards.length; i++) {
            createOption(null, positions_forwards[i]);
            for (let j = 0; j < forwards.length; j++) {
                createOption(forwards[j], positions_forwards[i]);
            }
        }
        for (let i = 0; i < positions_playmakers.length; i++) {
            createOption(null, positions_playmakers[i]);
            for (let j = 0; j < playmakers.length; j++) {
                createOption(playmakers[j], positions_playmakers[i]);
            }
        }    
        for (var i = 0; i < interchange.length; i++) {
            createOption(null, interchange[i]);
            for (var j = 0; j < squad.length; j++) {
                createOption(squad[j], interchange[i]);
            }
            fillPositionOptions(document.getElementById(interchange[i]));
        }
        for (var i = 0; i < roles.length; i++) {
            if (roles[i] == 'captain2' && !powerplay) continue;
            if (roles[i] == 'vice' && powerplay) continue;
            createOption(null, roles[i]);
            for (var j = 0; j < squad.length; j++) {
                createOption(squad[j], roles[i]);
            }
        }
    }
}

function createOption(player, position) {
    let option = document.createElement('option');
    option.innerText = player ? player['player_name'] : 'None';
    option.value = player ? player['player_id']: 'None';
    document.getElementById(position).appendChild(option);
}

async function fillPositionOptions(select) {
    document.getElementById(select.id + 'Position').innerHTML = '';
    if (select.value == 'None') return;
    let player = squad.find(p => p.player_id == select.value);
    let option = document.createElement('option');
    option.innerText = player['position'];
    option.value = player['position'];
    document.getElementById(select.id + 'Position').appendChild(option);
    if (player['position2']) {
        let option = document.createElement('option');
        option.innerText = player['position2'];
        option.value = player['position2'];
        document.getElementById(select.id + 'Position').appendChild(option);
    }
}

window.fillPositionOptions = fillPositionOptions;

async function submitLineup(event) {
    document.getElementById('submitLoading').hidden = false;
    event.preventDefault();
    let newLineup = [];
    const players = document.getElementsByName('player');
    const playerRoles = document.getElementsByName('role');
    for (let i = 0; i < players.length; i++) {
        if (players[i].value === '' || players[i].value == 'None') continue;
        let playerInfo = squad.find(p => p.player_id == players[i].value);
        let positionGeneral;
        let secondPosition = '';
        if (positions_backs.includes(players[i].id)) positionGeneral = 'Back'; 
        if (positions_forwards.includes(players[i].id)) positionGeneral = 'Forward'; 
        if (positions_playmakers.includes(players[i].id)) positionGeneral = 'Playmaker'; 
        if (interchange.includes(players[i].id)) {
            positionGeneral = document.getElementById(players[i].id + 'Position').value;
            if (playerInfo.position2 && playerInfo.position2 != '') {
                secondPosition = positionGeneral == playerInfo.position ? playerInfo.position2 : playerInfo.position;
            }
        }
        let entry = {
            "player_id": playerInfo.player_id,
            "player_name": playerInfo.player_name,
            "nrl_club": playerInfo.nrl_club,
            "position": players[i].id,
            "position_general": positionGeneral,
            "second_position": secondPosition
        };
        for (let j = 0; j < playerRoles.length; j++) {
            if (playerRoles[j].value == players[i].value) {
                entry[playerRoles[j].id] = true;
            } else {
                entry[playerRoles[j].id] = false;
            }            
        }
        newLineup.push(entry);
    }
    let completeSubmission = async function() {
        await SetLineup(idToken, newLineup);
        window.location.href = 'index.html';
    }
    let problem = false;
    let message = '';
    for (let player of newLineup) {
        if (newLineup.filter(p => p.player_id == player.player_id).length != 1) {
            problem = true;
            if (!message.includes(`<li>${player.player_name} has been picked more than once.</li>`)) {
                message += `<li>${player.player_name} has been picked more than once.</li>`;
            }
        }
        if ((player.captain || player.captain2 || player.vice) && user.captain_counts && user.captain_counts[player.player_id] > 5) {
            DisplayFeedback('Invalid Lineup', player.player_name + ' has already been captained 6 times.');
            return;
        }
        if ((player.captain && player.captain2) || (player.captain && player.vice)) {
            problem = true;
            message += `<li>${player.player_name} has two captain roles.</li>`;
        }
        if (player.kicker && player.backup_kicker) {
            problem = true;
            message += `<li>Same player chosen as kicker and backup kicker</li>`;
        }
        if ((player.captain || player.captain2) && player.position.startsWith('int')) {
            DisplayFeedback('Invalid Lineup', 'Your chosen captain is starting on the bench');
            return;
        }
        if (player.vice && player.position.startsWith('int')) {
            problem = true;
            message += `<li>Your chosen vice-captain is starting on the bench.</li>`;
        }
        if (player.kicker && player.position.startsWith('int')) {
            DisplayFeedback('Invalid Lineup', 'Your chosen kicker is starting on the bench');
            return;
        }
        if (player.backup_kicker && player.position.startsWith('int')) {
            problem = true;
            message += `<li>Your chosen backup kicker is starting on the bench.</li>`;
        }
    }
    if (problem) {
        DisplayFeedback('Warning!', "<ul>" + message + "</ul><p>Would you like to proceed with lineup submission?</p>", true, completeSubmission);
        return;
    }
    
    await SetLineup(idToken, newLineup);
    document.getElementById('submitLoading').hidden = true;
    DisplayFeedback('Success!', 'Lineup set successfully.', true, function() { location.href = 'index.html' }, false);
}
window.submitLineup = submitLineup;

function fillInterchangeOptions(onload = false) {
    //Get full team selections
    let playerSelections = document.getElementsByName('player');
    let selectedPlayers = [];
    for (let i = 0; i < playerSelections.length; i++) {
        //If element id is e.g. int1, int2, continue
        if (interchange.includes(playerSelections[i].id)) continue;
        //If element is a starting position, push the player_id to selectedPlayers array
        selectedPlayers.push(playerSelections[i].value);
    }
    //Available bench players is everyone not in selectedPlayers array
    let benchPlayers = squad.filter(p => !selectedPlayers.includes(p.player_id));
    for (var i = 0; i < interchange.length; i++) {
        let player = undefined;
        if (onload) {
            player = lineup.find(p => p.position_specific == interchange[i]);
        } else {
            player = squad.find(p => p.player_id == document.getElementById(interchange[i]).value)
        }
        if (player != undefined && !selectedPlayers.includes(player.player_id)) {
            document.getElementById(interchange[i]).innerHTML = '';
            createOption(player, interchange[i]);
            let restOfBench = benchPlayers.filter(p => p.player_id != player.player_id);
            for (var j = 0; j < restOfBench.length; j++) {
                createOption(restOfBench[j], interchange[i]);
            }
            fillPositionOptions(document.getElementById(interchange[i]));
            createOption(null, interchange[i]);
        } else {
            document.getElementById(interchange[i]).innerHTML = '';
            createOption(null, interchange[i]);
            for (var j = 0; j < benchPlayers.length; j++) {
                createOption(benchPlayers[j], interchange[i]);
            }
            fillPositionOptions(document.getElementById(interchange[i]));
        } 
    }
}
window.fillInterchangeOptions = fillInterchangeOptions;
