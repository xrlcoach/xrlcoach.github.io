import { GetActiveUserInfo, GetIdToken, GetLineup, GetPlayersFromXrlTeam, SetLineup } from './ApiFetch.js'

const idToken = GetIdToken();
const positions_backs = ['fullback', 'winger1', 'winger2', 'centre1', 'centre2'];
const positions_playmakers = ['five_eighth', 'halfback', 'hooker'];
const positions_forwards = ['prop1', 'prop2', 'lock', 'row1', 'row2'];
const interchange = ['int1', 'int2', 'int3', 'int4'];
const roles = ['captain', 'captain2', 'vice', 'kicker', 'backupKicker'];
let user;
let squad;
let lineup;

window.onload = async () => {
    user = await GetActiveUserInfo(idToken);
    console.log(user);
    squad = await GetPlayersFromXrlTeam(user.team_short);
    console.log(squad[0]);
    lineup = await GetLineup(idToken);
    console.log(lineup.length);
    const backs = squad.filter(p => p.position == 'Back' || p.position2 == 'Back');
    console.log('Backs: ' + backs[0]);
    const forwards = squad.filter(p => p.position == 'Forward' || p.position2 == 'Forward');
    console.log('Forwards: ' + forwards[0]);
    const playmakers = squad.filter(p => p.position == 'Playmaker' || p.position2 == 'Playmaker');
    console.log('Playmakers: ' + playmakers[0]);
    PopulateLineup();
}

async function PopulateLineup() {    
    if (lineup.length > 0) {
        console.log('Pre-filling existing lineup');
        console.log(lineup[0]);
        for (let i = 0; i < positions_backs.length; i++) {
            let player = lineup.filter(p => p.position_specific == positions_backs[i])[0];
            createOption(player, positions_backs[i]);
            let otherBacks = backs.filter(p => !player['name+club'].startsWith(p['player_name']));
            for (let j = 0; j < otherBacks.length; j++) {
                createOption(otherBacks[j], positions_backs[i]);
            }
        }
        for (let i = 0; i < positions_forwards.length; i++) {
            let player = lineup.filter(p => p.position_specific == positions_forwards[i])[0];
            createOption(player, positions_forwards[i]);
            let otherForwards = forwards.filter(p => !player['name+club'].startsWith(p['player_name']));
            for (let j = 0; j < otherForwards.length; j++) {
                createOption(otherForwards[j], positions_forwards[i]);
            }
        }
        for (let i = 0; i < positions_playmakers.length; i++) {
            let player = lineup.filter(p => p.position_specific == positions_playmakers[i])[0];
            createOption(player, positions_playmakers[i]);
            let otherPlaymakers = playmakers.filter(p => !player['name+club'].startsWith(p['player_name']));
            for (let j = 0; j < otherPlaymakers.length; j++) {
                createOption(otherPlaymakers[j], positions_playmakers[i]);
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

function createOption(player, position) {
    let option = document.createElement('option');
    option.innerText = player['player_name'];
    option.value = player['player_name'] + ';' + player['nrl_club'];
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
            if (roles[j].value == players[i].value) {
                entry[roles[j].id] = true;
            } else {
                entry[roles[j].id] = false;
            }
        }
        lineup.push(entry);
    }
    await SetLineup(idToken, lineup);
    window.location.href = 'index.html';
}

window.submitLineup = submitLineup;
