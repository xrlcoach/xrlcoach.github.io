import { GetActiveUserInfo, GetIdToken, GetLineup, GetPlayersFromXrlTeam, SetLineup } from './ApiFetch.js'

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
        document.getElementById('captain2').innerHTML = '';
        document.getElementById('secondCaptainSelect').hidden = true;
        button.className = 'btn btn-success';
        button.innerText = 'Use Powerplay';
    } else {
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
            createOption(player, positions_backs[i]);
            let otherBacks = backs.filter(p => player['player_id'] != p['player_id']);
            for (let j = 0; j < otherBacks.length; j++) {
                createOption(otherBacks[j], positions_backs[i]);
            }
        }
        for (let i = 0; i < positions_forwards.length; i++) {
            let player = lineup.find(p => p.position_specific == positions_forwards[i]);
            createOption(player, positions_forwards[i]);
            let otherForwards = forwards.filter(p => player['player_id'] != p['player_id']);
            for (let j = 0; j < otherForwards.length; j++) {
                createOption(otherForwards[j], positions_forwards[i]);
            }
        }
        for (let i = 0; i < positions_playmakers.length; i++) {
            let player = lineup.find(p => p.position_specific == positions_playmakers[i]);
            createOption(player, positions_playmakers[i]);
            let otherPlaymakers = playmakers.filter(p => player['player_id'] != p['player_id']);
            for (let j = 0; j < otherPlaymakers.length; j++) {
                createOption(otherPlaymakers[j], positions_playmakers[i]);
            }
        }
        for (let i = 0; i < interchange.length; i++) {
            let player = lineup.find(p => p.position_specific == interchange[i]);
            createOption(player, interchange[i]);
            let otherInts = squad.filter(p => player['player_id'] != p['player_id']);
            for (let j = 0; j < otherInts.length; j++) {
                createOption(otherInts[j], interchange[i]);
            }
            fillPositionOptions(document.getElementById(interchange[i]));
        }
        for (let i = 0; i < roles.length; i++) {
            if (roles[i] == 'captain2' && !powerplay) continue;
            let player = lineup.find(p => p[roles[i]]);
            createOption(player, roles[i]);
            let otherPlayers = squad.filter(p => player['player_id'] != p['player_id']);
            for (let j = 0; j < otherPlayers.length; j++) {
                createOption(otherPlayers[j], roles[i]);
            }
        }
    } else {
        for (let i = 0; i < positions_backs.length; i++) {
            for (let j = 0; j < backs.length; j++) {
                createOption(backs[j], positions_backs[i]);
            }
        }
        for (let i = 0; i < positions_forwards.length; i++) {
            for (let j = 0; j < forwards.length; j++) {
                createOption(forwards[j], positions_forwards[i]);
            }
        }
        for (let i = 0; i < positions_playmakers.length; i++) {
            for (let j = 0; j < playmakers.length; j++) {
                createOption(playmakers[j], positions_playmakers[i]);
            }
        }    
        for (var i = 0; i < interchange.length; i++) {
            for (var j = 0; j < squad.length; j++) {
                createOption(squad[j], interchange[i]);
            }
            fillPositionOptions(document.getElementById(interchange[i]));
        }
        for (var i = 0; i < roles.length; i++) {
            if (roles[i] == 'captain2' && !powerplay) continue;
            for (var j = 0; j < squad.length; j++) {
                createOption(squad[j], roles[i]);
            }
        }
    }
}

function createOption(player, position) {
    let option = document.createElement('option');
    option.innerText = player['player_name'];
    option.value = player['player_id'];
    document.getElementById(position).appendChild(option);
}

async function fillPositionOptions(select) {
    document.getElementById(select.id + 'Position').innerHTML = '';
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
        if (players[i].value === '') continue;
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
    await SetLineup(idToken, lineup);
    window.location.href = 'index.html';
}

window.submitLineup = submitLineup;
