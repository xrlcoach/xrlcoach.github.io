import { GetPlayersFromXrlTeam, GetActiveUserInfo, UpdatePlayerXrlTeam, GetAllUsers, GetActiveUserTeamShort, GetAllFixtures, UpdateUserInbox, GetPlayerById } from './ApiFetch.js';
import { DisplayFeedback, DisplayPlayerInfo, GetActiveRoundFromFixtures, GetOrdinal, GetTeamFixture, DefaultPlayerSort, SortByPosition2, DefaultPlayerSortDesc, SortByPosition2Desc, SortByNrlClub, SortByNrlClubDesc, SortByPlayerName, SortByPlayerNameDesc } from './Helpers.js';

let squad, allUsers, user, allRounds, lastRound, nextRound;
const positionOrder = ['Back', 'Playmaker', 'Forward'];

window.onload = async function () {
    try {
        //Fetch all users data
        allUsers = await GetAllUsers();
        //Isolate active user from team cookie
        user = allUsers.find(u => u.team_short == GetActiveUserTeamShort());
        //Get the active user's squad data
        squad = await GetPlayersFromXrlTeam(user.team_short);
        //Get fixtures data
        allRounds = await GetAllFixtures();
        //Isolate current active round
        nextRound = GetActiveRoundFromFixtures(allRounds);
        //Isolate last round
        lastRound = allRounds.find(r => r.round_number == nextRound.round_number - 1);
        //If current round is not 1st, display last match info
        if (lastRound) DisplayLastMatch();
        //Display current/next match info
        DisplayNextMatch();
        //Display team, squad and captaincy info
        DisplayTeamInfo();
        DisplayInbox();
        DisplaySquadInfo();
        DisplayCaptainInfo();
        //Sort squad alphabetically by last name
        let sortedSquad = squad.sort(DefaultPlayerSort);
        //Populate the squad table
        PopulatePickPlayerTable(sortedSquad);
        //Hide loading icon and display main content
        document.getElementById('loading').hidden = true;
        document.getElementById('mainContent').hidden = false;
    } catch (error) {
        DisplayFeedback(error, error.stack);
    }
}
/**
 * Display's the active user's last XRL match (opponent, score, result)
 */
function DisplayLastMatch() {
    //Get user's match from last round's fixtures
    let match = GetTeamFixture(user.team_short, lastRound);
    if (match == undefined) { //If user didn't have a match in the last round, hide section and return
        document.getElementById('lastMatchOpponent').innerText = 'None';
        document.getElementById('lastMatchView').hidden = true;
        return;
    }
    document.getElementById('lastMatchView').hidden = false;
    //Check if match was a homegame, find opponent and venue, display
    let homeGame = match.home == user.team_short;
    let opponent = homeGame ? match.away : match.home;
    let ground = homeGame ? user.homeground : allUsers.find(u => u.team_short == opponent).homeground;
    document.getElementById('lastMatchOpponent').innerText = opponent + ' @ ' + ground;
    //Display score
    document.getElementById('lastMatchScore').innerText = match.home_score + ' - ' + match.away_score;
    //Work out result based on score and whether user's team was home or away
    let result = match.home_score == match.away_score ? 'DRAW' : homeGame ? match.home_score > match.away_score ? 'WIN' : 'LOSS' : match.away_score > match.home_score ? 'WIN' : 'LOSS';
    document.getElementById('lastMatchResult').style.color = result == 'WIN' ? 'green' : result == 'LOSS' ? '#c94d38' : 'orange'; 
    document.getElementById('lastMatchResult').innerText = ' ' + result; 
    //Give the 'View' button a href of fixture.html with query parameteres specifying round and match
    document.getElementById('lastMatchView').href = `fixture.html?round=${lastRound.round_number}&fixture=${match.home}-v-${match.away}`;
}

function DisplayNextMatch() {
    let match = GetTeamFixture(user.team_short, nextRound);
    if (match == undefined) {
        document.getElementById('nextMatchOpponent').innerText = 'No game this week.';
        document.getElementById('nextMatchButton').hidden = true;
        return;
    }
    let homeGame = match.home == user.team_short;
    let opponent = homeGame ? match.away : match.home;
    let ground = homeGame ? user.homeground : allUsers.find(u => u.team_short == opponent).homeground;
    document.getElementById('nextMatchOpponent').innerText = opponent + ' @ ' + ground;
    let status, color;
    if (nextRound.completed) { status = 'Completed'; color = 'green'; }
    else if (nextRound.in_progress) { status = 'In Progress'; color = 'green'; }
    else if (nextRound.active) { status = 'Active'; color = 'orange'; }
    else { status = 'Inactive'; color = '#c94d38'; }
    document.getElementById('nextMatchStatus').style.color = color;
    document.getElementById('nextMatchStatus').innerText = 'Status: ' + status;
    if (!nextRound.in_progress) {
        document.getElementById('nextMatchButton').href = `lineup.html`;
        document.getElementById('nextMatchButton').innerText = 'Set Lineup';
    } else {
        document.getElementById('nextMatchScore').innerText = match.home_team + ' ' + match.home + ' - ' + match.away_score + ' ' + match.away; 
        document.getElementById('nextMatchScore').hidden = false; 
        document.getElementById('nextMatchButton').href = `fixture.html?round=${nextRound.round_number}&fixture=${match.home}-v-${match.away}`;
        document.getElementById('nextMatchButton').innerText = 'View';
    }
    if (nextRound.completed) {
        let result = match.home_score == match.away_score ? 'DRAW' : homeGame ? match.home_score > match.away_score ? 'WIN' : 'LOSS' : match.away_score > match.home_score ? 'WIN' : 'LOSS';
        document.getElementById('nextMatchResult').style.color = result == 'WIN' ? 'green' : result == 'LOSS' ? '#c94d38' : 'orange'; 
        document.getElementById('nextMatchResult').innerText = ' ' + result;
    } 
}

function DisplayInbox() {
    let inboxBody = document.getElementById('inboxBody');
    inboxBody.innerHTML = '';
    for (let message of user.inbox.sort((m1, m2) => new Date(m2.datetime) - new Date(m1.datetime))) {
        let alert = document.createElement('tr');
        let time = document.createElement('td');
        time.innerText = message.datetime;
        alert.appendChild(time);
        let sender = document.createElement('td');
        sender.innerText = message.sender;
        alert.appendChild(sender);
        let subject = document.createElement('td');
        subject.innerText = message.subject;
        alert.appendChild(subject);
        let body = document.createElement('td');
        body.innerText = message.message;
        alert.appendChild(body);
        let deleteCell = document.createElement('td');
        let deleteButton = document.createElement('button');
        deleteButton.className = 'btn btn-danger';
        deleteButton.innerText = 'Delete';
        deleteButton.value = message.message;
        deleteButton.onclick = function() {
            deleteMessage(this.value);
        };
        deleteCell.appendChild(deleteButton);
        alert.appendChild(deleteCell);
        inboxBody.appendChild(alert);
    }
}

function deleteMessage(messageBody) {
    let messageIndex = user.inbox.findIndex(m => m.message == messageBody);
    user.inbox.splice(messageIndex, 1);
    UpdateUserInbox(user.username, user.inbox);
    DisplayInbox();
}

function DisplayCaptainInfo() {
    document.getElementById('powerplayCount').innerText = user.powerplays;
    for (let player in user.captain_counts) {
        let playerInfo = squad.find(p => p.player_id == player);
        if (!playerInfo) playerInfo = GetPlayerById(player);
        let name = playerInfo.player_name;
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
    if (squad.length < 18 && nextRound.round_number == 1) {
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
    document.getElementById('teamPosition').innerText = GetOrdinal(position) + ' (' + user.stats.points + ' points)';
    document.getElementById('teamWins').innerText = user.stats.wins;
    document.getElementById('teamDraws').innerText = user.stats.draws;
    document.getElementById('teamLosses').innerText = user.stats.losses;
    document.getElementById('teamFor').innerText = user.stats.for;
    document.getElementById('teamAgainst').innerText = user.stats.against;
    document.getElementById('teamPD').innerText = user.stats.for - user.stats.against;
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
        var details = document.createElement('td');
        var form = document.createElement('form');
        var input = document.createElement('input');
        input.setAttribute('type', 'hidden')
        input.setAttribute('value', player.player_id)
        form.appendChild(input)
        var button = document.createElement('button');
        button.setAttribute('type', 'submit');
        button.className = 'btn btn-success';
        button.innerText = 'Details';
        form.appendChild(button);
        form.onsubmit = function(event) {
            event.preventDefault();
            DisplayPlayerInfo(squad.find(p => p.player_id == this.firstChild.value), nextRound);
        }
        // form.onsubmit = async function (event) {
        //     event.preventDefault();
        //     dropPlayer(this);
        //     try {
        //         let playerToDrop = squad.find()
        //         const resp = await UpdatePlayerXrlTeam(null, this.elements[0].value);
        //         location.reload();
        //     } catch (error) {
        //         DisplayFeedback('Error', error);
        //     }
        // };
        details.appendChild(form);
        tr.appendChild(details);
        tableBody.appendChild(tr);
    }
}

async function dropPlayer(form) {
    let playerToDrop = squad.find(p => p.player_id == form.elements[0].value)
    await UpdatePlayerXrlTeam(null, playerToDrop);
    location.reload();
}

function sortByName() {
    let sortedSquad = squad.sort(SortByPlayerName);
    document.getElementById('sortByNameButton').onclick = sortByNameDesc;
    PopulatePickPlayerTable(sortedSquad);
}
window.sortByName = sortByName;
function sortByNameDesc() {
    let sortedSquad = squad.sort(SortByPlayerNameDesc);
    document.getElementById('sortByNameButton').onclick = sortByName;
    PopulatePickPlayerTable(sortedSquad);
}
window.sortByNameDesc = sortByNameDesc;
function sortByPosition() {
    let sortedSquad = squad.sort(DefaultPlayerSort);
    document.getElementById('sortByPositionButton').onclick = sortByPositionDesc;
    PopulatePickPlayerTable(sortedSquad);
}
window.sortByPosition = sortByPosition;
function sortByPositionDesc() {
    let sortedSquad = squad.sort(DefaultPlayerSortDesc);
    document.getElementById('sortByPositionButton').onclick = sortByPosition;
    PopulatePickPlayerTable(sortedSquad);
}
window.sortByPositionDesc = sortByPositionDesc;
function sortByPosition2() {
    let sortedSquad = squad.sort(SortByPosition2);
    document.getElementById('sortByPosition2Button').onclick = sortByPosition2Desc;
    PopulatePickPlayerTable(sortedSquad);
}
window.sortByPosition2 = sortByPosition2;
function sortByPosition2Desc() {
    let sortedSquad = squad.sort(SortByPosition2Desc);
    document.getElementById('sortByPosition2Button').onclick = sortByPosition2;
    PopulatePickPlayerTable(sortedSquad);
}
window.sortByPosition2Desc = sortByPosition2Desc;
function sortByClub() {
    let sortedSquad = squad.sort(SortByNrlClub);
    document.getElementById('sortByClubButton').onclick = sortByClubDesc;
    PopulatePickPlayerTable(sortedSquad);
}
window.sortByClub = sortByClub;
function sortByClubDesc() {
    let sortedSquad = squad.sort(SortByNrlClubDesc);
    document.getElementById('sortByClubButton').onclick = sortByClub;
    PopulatePickPlayerTable(sortedSquad);
}
window.sortByClubDesc = sortByClubDesc;