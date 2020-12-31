import { GetActiveUserInfo, GetIdToken, GetLineup, GetPlayersFromXrlTeam, SetLineup } from './ApiFetch.js'
import { DisplayFeedback } from './Helpers.js';

const idToken = GetIdToken();
const positions_backs = ['fullback', 'winger1', 'winger2', 'centre1', 'centre2'];
const positions_playmakers = ['five_eighth', 'halfback', 'hooker'];
const positions_forwards = ['prop1', 'prop2', 'lock', 'row1', 'row2'];
const interchange = ['int1', 'int2', 'int3', 'int4'];
const roles = ['captain', 'captain2', 'vice', 'kicker', 'backup_kicker'];
let user, squad, lineup, backs, forwards, playmakers, powerplay;

window.onload = async () => {
    user = await GetActiveUserInfo(idToken);
    console.log(user);
    squad = await GetPlayersFromXrlTeam(user.team_short);
    console.log(squad[0]);
    lineup = await GetLineup(idToken);
    console.log(lineup.length);
    let captains = lineup.filter(p => p.captain || p.captain2);
    let numCaptains = captains.length;
    console.log(numCaptains);
    powerplay = numCaptains == 2;
    console.log(powerplay);
    if (powerplay) {
        document.getElementById('secondCaptainSelect').hidden = false;
        document.getElementById('viceCaptainSelect').hidden = true;
    }
    let button = document.getElementById('powerplayButton');
    if (!powerplay && user.powerplays > 0) {
        button.className = 'btn btn-success';
        button.innerText = 'Use Powerplay';
    } else if (powerplay) {
        button.className = 'btn btn-danger';
        button.innerText = 'Turn Off Powerplay';
    }
    backs = squad.filter(p => p.position == 'Back' || p.position2 == 'Back');
    console.log('Backs: ' + backs[0]);
    forwards = squad.filter(p => p.position == 'Forward' || p.position2 == 'Forward');
    console.log('Forwards: ' + forwards[0]);
    playmakers = squad.filter(p => p.position == 'Playmaker' || p.position2 == 'Playmaker');
    console.log('Playmakers: ' + playmakers[0]);
    PopulateLineup();
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
        for (let i = 0; i < interchange.length; i++) {
            let player = lineup.find(p => p.position_specific == interchange[i]);
            let otherInts;
            if (player == undefined) {
                createOption(null, interchange[i]);
                otherInts = squad;
            } else {
                otherInts = squad.filter(p => player['player_id'] != p['player_id']);
                createOption(player, interchange[i]);
            }
            for (let j = 0; j < otherInts.length; j++) {
                createOption(otherInts[j], interchange[i]);
            }
            createOption(null, interchange[i]);
            fillPositionOptions(document.getElementById(interchange[i]));
        }
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
    event.preventDefault();
    let lineup = [];
    const players = document.getElementsByName('player');
    const playerRoles = document.getElementsByName('role');
    for (let i = 0; i < players.length; i++) {
        if (players[i].value === '' || players[i].value == 'None') continue;
        let playerInfo = squad.find(p => p.player_id == players[i].value);
        let positionGeneral;
        if (positions_backs.includes(players[i].id)) positionGeneral = 'Back'; 
        if (positions_forwards.includes(players[i].id)) positionGeneral = 'Forward'; 
        if (positions_playmakers.includes(players[i].id)) positionGeneral = 'Playmaker'; 
        if (interchange.includes(players[i].id)) positionGeneral = document.getElementById(players[i].id + 'Position').value; 
        let entry = {
            "player_id": playerInfo.player_id,
            "player_name": playerInfo.player_name,
            "nrl_club": playerInfo.nrl_club,
            "position": players[i].id,
            "position_general": positionGeneral
        };
        for (let j = 0; j < playerRoles.length; j++) {
            if (playerRoles[j].value == players[i].value) {
                entry[playerRoles[j].id] = true;
            } else {
                entry[playerRoles[j].id] = false;
            }            
        }
        lineup.push(entry);
    }

    for (let player of lineup) {
        if (lineup.filter(p => p.player_id == player.player_id).length != 1) {
            DisplayFeedback(player.player_name + ' has been picked more than once.');
            return;
        }
        if ((player.captain && player.captain2) || (player.captain && player.vice) || 
        (player.captain2 && player.vice)) {
            DisplayFeedback(player.player_name + ' has two captain roles.');
            return;
        }
        if (player.kicker && player.backup_kicker) {
            DisplayFeedback('Same player chosen as kicker and backup kicker');
            return;
        }
        if ((player.captain || player.captain2) && player.position.startsWith('int')) {
            DisplayFeedback('Your chosen captain is starting on the bench');
        }
        if (player.vice && player.position.startsWith('int')) {
            if (!confirm('Your chosen vice-captain is starting on the bench. Proceed with lineup submission?')) {
                return;
            }
        }
        if (player.kicker && player.position.startsWith('int')) {
            DisplayFeedback('Your chosen kicker is starting on the bench');
        }
        if (player.backup_kicker && player.position.startsWith('int')) {
            if (!confirm('Your chosen backup kicker is starting on the bench. Proceed with lineup submission?')) {
                return;
            }
        }
    }
    
    await SetLineup(idToken, lineup);
    window.location.href = 'index.html';
}

window.submitLineup = submitLineup;
