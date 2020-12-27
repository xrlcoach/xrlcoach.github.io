import { GetActiveUserInfo, GetIdToken, GetLineup, GetPlayersFromXrlTeam, SetLineup } from './ApiFetch.js'

const idToken = GetIdToken();
const positions_backs = ['fullback', 'winger1', 'winger2', 'centre1', 'centre2'];
const positions_playmakers = ['five_eighth', 'halfback', 'hooker'];
const positions_forwards = ['prop1', 'prop2', 'lock', 'row1', 'row2'];
const interchange = ['int1', 'int2', 'int3', 'int4'];
const roles = ['captain', 'captain2', 'vice', 'kicker', 'backupKicker'];
let user, squad, lineup, backs, forwards, playmakers;

window.onload = async () => {
    user = await GetActiveUserInfo(idToken);
    console.log(user);
    squad = await GetPlayersFromXrlTeam(user.team_short);
    console.log(squad[0]);
    lineup = await GetLineup(idToken);
    console.log(lineup.length);
    backs = squad.filter(p => p.position == 'Back' || p.position2 == 'Back');
    console.log('Backs: ' + backs[0]);
    forwards = squad.filter(p => p.position == 'Forward' || p.position2 == 'Forward');
    console.log('Forwards: ' + forwards[0]);
    playmakers = squad.filter(p => p.position == 'Playmaker' || p.position2 == 'Playmaker');
    console.log('Playmakers: ' + playmakers[0]);
    PopulateLineup();
}

async function PopulateLineup() {    
    if (lineup.length > 0) {
        console.log('Pre-filling existing lineup');
        console.log(lineup[0]);
        for (let i = 0; i < positions_backs.length; i++) {
            let player = lineup.find(p => p.position_specific == positions_backs[i]);
            createOption(player, positions_backs[i]);
            let otherBacks = backs.filter(p => !player['name+club'].startsWith(p['player_name']));
            for (let j = 0; j < otherBacks.length; j++) {
                createOption(otherBacks[j], positions_backs[i]);
            }
        }
        for (let i = 0; i < positions_forwards.length; i++) {
            let player = lineup.find(p => p.position_specific == positions_forwards[i]);
            createOption(player, positions_forwards[i]);
            let otherForwards = forwards.filter(p => !player['name+club'].startsWith(p['player_name']));
            for (let j = 0; j < otherForwards.length; j++) {
                createOption(otherForwards[j], positions_forwards[i]);
            }
        }
        for (let i = 0; i < positions_playmakers.length; i++) {
            let player = lineup.find(p => p.position_specific == positions_playmakers[i]);
            createOption(player, positions_playmakers[i]);
            let otherPlaymakers = playmakers.filter(p => !player['name+club'].startsWith(p['player_name']));
            for (let j = 0; j < otherPlaymakers.length; j++) {
                createOption(otherPlaymakers[j], positions_playmakers[i]);
            }
        }
        for (let i = 0; i < interchange.length; i++) {
            let player = lineup.find(p => p.position_specific == interchange[i]);
            createOption(player, interchange[i]);
            let otherInts = squad.filter(p => !player['name+club'].startsWith(p['player_name']));
            for (let j = 0; j < otherInts.length; j++) {
                createOption(otherInts[j], interchange[i]);
            }
        }
        for (let i = 0; i < roles.length; i++) {
            let player = lineup.find(p => p.roles[i]);
            createOption(player, roles[i]);
            let otherPlayers = squad.filter(p => !player['name+club'].startsWith(p['player_name']));
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
        }
        for (var i = 0; i < roles.length; i++) {
            for (var j = 0; j < squad.length; j++) {
                createOption(squad[j], roles[i]);
            }
        }
    }
}

function createOption(player, position) {
    let option = document.createElement('option');
    option.innerText = player['player_name'] || player['name+club'].split(';')[0];
    option.value = player['player_name'] ? player['player_name'] + ';' + player['nrl_club'] : player['name+club'];
    document.getElementById(position).appendChild(option);
}

async function submitLineup(event) {
    event.preventDefault();
    let lineup = [];
    const players = document.getElementsByName('player');
    const playerRoles = document.getElementsByName('role');
    for (let i = 0; i < players.length; i++) {
        if (players[i].value === '') continue;
        let entry = {
            "name+club": players[i].value,
            "position": players[i].id
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
