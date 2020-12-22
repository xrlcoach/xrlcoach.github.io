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
    squad = await GetPlayersFromXrlTeam(user.team_short);
    lineup = await GetLineup(idToken);
    PopulateLineup();
}

async function PopulateLineup() {
    const lineup = await GetLineup(idToken);
    const backs = squad.filter(p => p.position == 'Back' || p.position2 == 'Back')
    const forwards = squad.filter(p => p.position == 'Forward' || p.position2 == 'Forward')
    const playmakers = squad.filter(p => p.position == 'Playmaker' || p.position2 == 'Playmaker')
    if (lineup.length > 0) {
        for (let i = 0; i < positions_backs.length; i++) {
            let option = document.createElement('option');
            let player = lineup.filter(p => p.position_specific == positions_backs[i])
            option.innerText = player['name+club'];
            option.value = player['name+club'];
            document.getElementById(positions_backs[i]).appendChild(option);
            let otherBacks = backs.filter(p => p['name+club'] != player['name+club']);
            for (let j = 0; j < otherBacks.length; j++) {
                option = document.createElement('option');
                option.innerText = otherBacks[i]['name+club'];
                option.value = otherBacks[i]['name+club'];
                document.getElementById(positions_backs[i]).appendChild(option);
            }
        }
        for (let i = 0; i < positions_forwards.length; i++) {
            let option = document.createElement('option');
            let player = lineup.filter(p => p.position_specific == positions_forwards[i])
            option.innerText = player['name+club'];
            option.value = player['name+club'];
            document.getElementById(positions_forwards[i]).appendChild(option);
            let otherForwards = forwards.filter(p => p['name+club'] != player['name+club']);
            for (let j = 0; j < otherForwards.length; j++) {
                option = document.createElement('option');
                option.innerText = otherForwards[i]['name+club'];
                option.value = otherForwards[i]['name+club'];
                document.getElementById(positions_forwards[i]).appendChild(option);
            }
        }
        for (let i = 0; i < positions_playmakers.length; i++) {
            let option = document.createElement('option');
            let player = lineup.filter(p => p.position_specific == positions_playmakers[i])
            option.innerText = player['name+club'];
            option.value = player['name+club'];
            document.getElementById(positions_playmakers[i]).appendChild(option);
            let otherPlaymakers = playmakers.filter(p => p['name+club'] != player['name+club']);
            for (let j = 0; j < otherPlaymakers.length; j++) {
                option = document.createElement('option');
                option.innerText = otherPlaymakers[i]['name+club'];
                option.value = otherPlaymakers[i]['name+club'];
                document.getElementById(positions_playmakers[i]).appendChild(option);
            }
        }
    } else {
        for (let i = 0; i < positions_backs.length; i++) {
            for (let j = 0; j < backs.length; j++) {
                let option = document.createElement('option');
                option.innerText = backs[i]['name+club'];
                option.value = backs[i]['name+club'];
                document.getElementById(positions_backs[i]).appendChild(option);
            }
        }
        for (let i = 0; i < positions_forwards.length; i++) {
            for (let j = 0; j < forwards.length; j++) {
                let option = document.createElement('option');
                option.innerText = forwards[i]['name+club'];
                option.value = forwards[i]['name+club'];
                document.getElementById(positions_forwards[i]).appendChild(option);
            }
        }
        for (let i = 0; i < positions_playmakers.length; i++) {
            for (let j = 0; j < playmakers.length; j++) {
                let option = document.createElement('option');
                option.innerText = playmakers[i]['name+club'];
                option.value = playmakers[i]['name+club'];
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
        lineup.push({
            "name+club": players[i].value,
            "position": players[i].id
        })
    }
    await SetLineup(idToken, lineup);
    window.location.href = 'index.html';
}
