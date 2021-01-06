import { GetPlayersFromXrlTeam, GetActiveUserInfo, UpdatePlayerXrlTeam, GetAllUsers, GetActiveUserTeamShort, GetAllFixtures } from './ApiFetch.js';
import { DisplayFeedback, GetActiveRoundFromFixtures, GetOrdinal, GetUserFixture } from './Helpers.js';

let squad, allUsers, user, allRounds, lastRound, nextRound;

window.onload = async function () {
    try {
        allUsers = await GetAllUsers();
        user = allUsers.find(u => u.team_short == GetActiveUserTeamShort());
        squad = await GetPlayersFromXrlTeam(user.team_short);
        allRounds = await GetAllFixtures();
        nextRound = GetActiveRoundFromFixtures(allRounds);
        lastRound = allRounds.find(r => r.round_number == nextRound.round_number - 1);
        if (lastRound) DisplayLastMatch();
        DisplayNextMatch();
        DisplayTeamInfo();
        DisplaySquadInfo();
        DisplayCaptainInfo();
        let sortedSquad = squad.sort(function(p1, p2) {
            return p1.player_name.split(' ')[1] > p2.player_name.split(' ')[1]
        });
        PopulatePickPlayerTable(sortedSquad);
    } catch (error) {
        DisplayFeedback('Error', error);
    }
}

function DisplayLastMatch() {
    let match = GetUserFixture(user, nextRound);
    let homeGame = match.home == user.team_short;
    let opponent = homeGame ? match.away : match.home;
    let ground = homeGame ? user.homeground : allUsers.find(u => u.team_short == opponent).homeground;
    document.getElementById('lastMatchOpponent').innerText = opponent + ' @ ' + ground;
    document.getElementById('lastMatchScore').innerText = match.homeScore + ' - ' + match.awayScore;
    let result = match.homeScore == match.awayScore ? 'DRAW' : homeGame ? match.homeScore > match.awayScore ? 'WIN' : 'LOSS' : match.awayScore > match.homeScore ? 'WIN' : 'LOSS';
    document.getElementById('lastMatchResult').style.color = result == 'WIN' ? 'green' : result == 'LOSS' ? 'c94d38' : 'orange'; 
    document.getElementById('lastMatchResult').innerText = result; 
    document.getElementById('lastMatchView').href = `fixture.html?round=${lastRound.round_number}&fixture=${match.home}-v-${match.away}`;
}

function DisplayNextMatch() {
    let match = GetUserFixture(user, lastRound);
    let homeGame = match.home == user.team_short;
    let opponent = homeGame ? match.away : match.home;
    let ground = homeGame ? user.homeground : allUsers.find(u => u.team_short == opponent).homeground;
    document.getElementById('nextMatchOpponent').innerText = opponent + ' @ ' + ground;
    if (nextRound.completed) status = 'Completed';
    else if (nextRound.in_progress) status = 'In Progress';
    else if (nextRound.active) status = 'Active';
    else status = 'Inactive';
    document.getElementById('nextMatchStatus').innerText = 'Status: ' + status;
    if (!nextRound.in_progress) {
        document.getElementById('nextMatchButton').href = `lineup.html`;
        document.getElementById('nextMatchButton').innerText = 'Set Lineup';
    } else {
        document.getElementById('nextMatchScore').innerText = match.homeScore + ' - ' + match.awayScore; 
        document.getElementById('nextMatchScore').hidden = false; 
        document.getElementById('nextMatchButton').href = `fixture.html?round=${lastRound.round_number}&fixture=${match.home}-v-${match.away}`;
        document.getElementById('nextMatchButton').innerText = 'View';
    }
    if (nextRound.completed) {
        let result = match.homeScore == match.awayScore ? 'DRAW' : homeGame ? match.homeScore > match.awayScore ? 'WIN' : 'LOSS' : match.awayScore > match.homeScore ? 'WIN' : 'LOSS';
        document.getElementById('nextMatchResult').style.color = result == 'WIN' ? 'green' : result == 'LOSS' ? 'c94d38' : 'orange'; 
        document.getElementById('nextMatchResult').innerText = result;
    } 
}

function DisplayCaptainInfo() {
    document.getElementById('powerplayCount').innerText = user.powerplays;
    for (let player in user.captain_counts) {
        let name = squad.find(p => p.player_id == player).player_name;
        document.getElementById('captainCountList').innerHTML += `<li>${name}: ${user.captain_counts[player]}</li>`;
    }
}

function DisplaySquadInfo() {
    document.getElementById('squadCount').innerText = squad.length;
    let backs = squad.filter(p => p.position == 'Back' || p.position2 == 'Back');
    let playmakers = squad.filter(p => p.position == 'Playmaker' || p.position2 == 'Playmaker');
    let forwards = squad.filter(p => p.position == 'Forward' || p.position2 == 'Forward');
    document.getElementById('backsCount').innerText = 'Backs: ' + backs.length;
    document.getElementById('playmakersCount').innerText = 'Playmakers: ' + playmakers.length;
    document.getElementById('forwardsCount').innerText = 'Forwards: ' + forwards.length;
    let duals = squad.filter(p => p.position2 != '');
    if (duals.length == 1)
        document.getElementById('positionCounts').innerHTML += `<br />Includes ${duals.length} dual-position player`;
    else if (duals.length > 1)
        document.getElementById('positionCounts').innerHTML += `<br />Includes ${duals.length} dual-position players`;
    if (squad.length < 18) {
        document.getElementById('pickPlayersLink').hidden = false;
    }
}

function DisplayTeamInfo() {
    document.getElementById('teamNameDisplay').innerHTML = user.team_name;
    document.getElementById('teamLogo').src = '/static/' + user.team_short + '.png';
    document.getElementById('teamOwner').innerText = user.username;
    let ladder = allUsers.sort(function (u1, u2) {
        if (u2.stats.points != u1.stats.points) {
            return u2.stats.points - u1.stats.points;
        } if ((u2.stats.for - u2.stats.against) != (u1.stats.for - u1.stats.against)) {
            return (u2.stats.for - u2.stats.against) - (u1.stats.for - u1.stats.against);
        }
        return u2.stats.for - u1.stats.for;
    });
    let position = ladder.findIndex(u => u.username == user.username) + 1;
    document.getElementById('teamPosition').innerText = 'Position: ' + GetOrdinal(position) + ' (' + user.stats.points + ' points)';
    document.getElementById('teamWinStats').innerText = `Wins: ${user.stats.wins}, Draws: ${user.stats.draws}, Losses: ${user.stats.losses}`;
    document.getElementById('teamPointStats').innerText = `For: ${user.stats.for}, Against: ${user.stats.against}, Differential: ${user.stats.for - user.stats.against}`;
}

function PopulatePickPlayerTable(playerData) {
    var tableBody = document.getElementById('playerSquadTable');
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
        var drop = document.createElement('td');
        var form = document.createElement('form');
        var input = document.createElement('input');
        input.setAttribute('type', 'hidden')
        input.setAttribute('value', player.player_id)
        form.appendChild(input)
        var button = document.createElement('button');
        button.setAttribute('type', 'submit');
        button.className = 'btn btn-danger';
        button.innerText = 'Drop';
        form.appendChild(button);
        form.onsubmit = async function (event) {
            event.preventDefault();
            dropPlayer(this);
            try {
                let playerToDrop = squad.find()
                const resp = await UpdatePlayerXrlTeam(null, this.elements[0].value);
                location.reload();
            } catch (error) {
                DisplayFeedback('Error', error);
            }
        };
        drop.appendChild(form);
        tr.appendChild(drop);
        tableBody.appendChild(tr);
    }
}

async function dropPlayer(form) {
    let playerToDrop = squad.find(p => p.player_id == form.elements[0].value)
    await UpdatePlayerXrlTeam(null, playerToDrop);
    location.reload();
}

function sortByName() {
    let sortedSquad = squad.sort(function(p1, p2) {
        return p1.player_name.split(' ')[1] > p2.player_name.split(' ')[1]
    });
    document.getElementById('sortByNameButton').onclick = sortByNameDesc;
    PopulatePickPlayerTable(sortedSquad);
}
window.sortByName = sortByName;
function sortByNameDesc() {
    let sortedSquad = squad.sort(function(p1, p2) {
        return p1.player_name.split(' ')[1] < p2.player_name.split(' ')[1]
    });
    document.getElementById('sortByNameButton').onclick = sortByName;
    PopulatePickPlayerTable(sortedSquad);
}
window.sortByNameDesc = sortByNameDesc;
function sortByPosition() {
    let sortedSquad = squad.sort(function(p1, p2) {
        return p1.position > p2.position
    });
    document.getElementById('sortByPositionButton').onclick = sortByPositionDesc;
    PopulatePickPlayerTable(sortedSquad);
}
window.sortByPosition = sortByPosition;
function sortByPositionDesc() {
    let sortedSquad = squad.sort(function(p1, p2) {
        return p1.position < p2.position
    });
    document.getElementById('sortByPositionButton').onclick = sortByPosition;
    PopulatePickPlayerTable(sortedSquad);
}
window.sortByPositionDesc = sortByPositionDesc;
function sortByPosition2() {
    let sortedSquad = squad.sort(function(p1, p2) {
        return p1.position2 > p2.position2
    });
    document.getElementById('sortByPosition2Button').onclick = sortByPosition2Desc;
    PopulatePickPlayerTable(sortedSquad);
}
window.sortByPosition2 = sortByPosition2;
function sortByPosition2Desc() {
    let sortedSquad = squad.sort(function(p1, p2) {
        return p1.position < p2.position
    });
    document.getElementById('sortByPosition2Button').onclick = sortByPosition2;
    PopulatePickPlayerTable(sortedSquad);
}
window.sortByPosition2Desc = sortByPosition2Desc;
function sortByClub() {
    let sortedSquad = squad.sort(function(p1, p2) {
        return p1.nrl_club > p2.nrl_club
    });
    document.getElementById('sortByClubButton').onclick = sortByClubDesc;
    PopulatePickPlayerTable(sortedSquad);
}
window.sortByClub = sortByClub;
function sortByClubDesc() {
    let sortedSquad = squad.sort(function(p1, p2) {
        return p1.nrl_club < p2.nrl_club
    });
    document.getElementById('sortByClubButton').onclick = sortByClub;
    PopulatePickPlayerTable(sortedSquad);
}
window.sortByClubDesc = sortByClubDesc;