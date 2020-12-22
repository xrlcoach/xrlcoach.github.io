import { GetActiveUserInfo, GetIdToken, GetLineup, GetPlayersFromXrlTeam, SetLineup } from './ApiFetch.js'

const idToken = GetIdToken();
const positions_backs = ['fullback', 'winger1', 'winger2', 'centre1', 'centre2'];
const positions_playmakers = ['five_eighth', 'halfback', 'hooker'];
const positions_forwards = ['prop1', 'prop2', 'lock', 'row1', 'row2'];
const positions_int = ['int1', 'int2', 'int3', 'int4'];
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
    PopulateLineup();
}

async function PopulateLineup() {
    const lineup = await GetLineup(idToken);
    const backs = squad.filter(p => p.position == 'Back' || p.position2 == 'Back');
    console.log('Backs: ' + backs[0]);
    const forwards = squad.filter(p => p.position == 'Forward' || p.position2 == 'Forward');
    console.log('Forwards: ' + forwards[0]);
    const playmakers = squad.filter(p => p.position == 'Playmaker' || p.position2 == 'Playmaker');
    console.log('Playmakers: ' + playmakers[0]);
    if (lineup.length > 0) {
        console.log('Pre-filling existing lineup');
        console.log(lineup[0]);
        for (let i = 0; i < positions_backs.length; i++) {
            let option = document.createElement('option');
            let player = lineup.filter(p => p.position_specific == positions_backs[i]);
            option.innerText = player['name+club'];
            option.value = player['name+club'];
            document.getElementById(positions_backs[i]).appendChild(option);
            let otherBacks = backs.filter(p => !player['name+club'].startsWith(p['player_name']));
            for (let j = 0; j < otherBacks.length; j++) {
                option = document.createElement('option');
                option.innerText = otherBacks[j]['player_name'];
                option.value = otherBacks[j]['player_name'] + ';' + otherBacks[j]['nrl_club'];
                document.getElementById(positions_backs[i]).appendChild(option);
            }
        }
        for (let i = 0; i < positions_forwards.length; i++) {
            let option = document.createElement('option');
            let player = lineup.filter(p => p.position_specific == positions_forwards[i]);
            option.innerText = player['name+club'];
            option.value = player['name+club'];
            document.getElementById(positions_forwards[i]).appendChild(option);
            let otherForwards = forwards.filter(p => !player['name+club'].startsWith(p['player_name']));
            for (let j = 0; j < otherForwards.length; j++) {
                option = document.createElement('option');
                option.innerText = otherForwards[j]['player_name'];
                option.value = otherForwards[j]['player_name'] + ';' + otherForwards[j]['nrl_club'];
                document.getElementById(positions_forwards[i]).appendChild(option);
            }
        }
        for (let i = 0; i < positions_playmakers.length; i++) {
            let option = document.createElement('option');
            let player = lineup.filter(p => p.position_specific == positions_playmakers[i]);
            option.innerText = player['name+club'];
            option.value = player['name+club'];
            document.getElementById(positions_playmakers[i]).appendChild(option);
            let otherPlaymakers = playmakers.filter(p => !player['name+club'].startsWith(p['player_name']));
            for (let j = 0; j < otherPlaymakers.length; j++) {
                option = document.createElement('option');
                option.innerText = otherPlaymakers[j]['player_name'];
                option.value = otherPlaymakers[j]['player_name'] + ';' + otherPlaymakers[j]['nrl_club'];
                document.getElementById(positions_playmakers[i]).appendChild(option);
            }
        }
    } else {
        for (let i = 0; i < positions_backs.length; i++) {
            for (let j = 0; j < backs.length; j++) {
                let option = document.createElement('option');
                option.innerText = backs[j]['player_name'];
                option.value = backs[j]['player_name'] + ';' + backs[j]['nrl_club'];
                document.getElementById(positions_backs[i]).appendChild(option);
            }
        }
        for (let i = 0; i < positions_forwards.length; i++) {
            for (let j = 0; j < forwards.length; j++) {
                let option = document.createElement('option');
                option.innerText = forwards[j]['player_name'];
                option.value = forwards[j]['player_name'] + ';' + forwards[j]['nrl_club'];
                document.getElementById(positions_forwards[i]).appendChild(option);
            }
        }
        for (let i = 0; i < positions_playmakers.length; i++) {
            for (let j = 0; j < playmakers.length; j++) {
                let option = document.createElement('option');
                option.innerText = playmakers[j]['player_name'];
                option.value = playmakers[j]['player_name'] + ';' + playmakers[j]['nrl_club'];
                document.getElementById(positions_playmakers[i]).appendChild(option);
            }
        }
    }
}

async function submitLineup(event) {
    event.preventDefault();
    let lineup = [];
    const players = document.getElementsByName('player');
    for (let i = 0; i < players.length; i++) {
        if (players[i].value === '') continue;
        lineup.push({
            "name+club": players[i].value,
            "position": players[i].id
        })
    }
    await SetLineup(idToken, lineup);
    window.location.href = 'index.html';
}

window.submitLineup = submitLineup;
