import { GetPlayersFromXrlTeam, GetAllUsers, GetActiveUserTeamShort, UpdateUserInbox, GetCurrentRoundNumber, GetCurrentRoundStatus, GetTeamFixtureByRound } from './ApiFetch.js';
import { DisplayFeedback, DisplayPlayerInfo, GetOrdinal, DefaultPlayerSort, SortByPosition2, DefaultPlayerSortDesc, SortByPosition2Desc, SortByNrlClub, SortByNrlClubDesc, SortByPlayerName, SortByPlayerNameDesc, SortLeageTable } from './Helpers.js';

let squad, allUsers, user, currentRound, lastMatch, nextMatch;

window.onload = async function () {
    try {
        if(sessionStorage.getItem('roundStatus') !== null) {
            currentRound = JSON.parse(sessionStorage.getItem('roundStatus'));
        } else {
            currentRound = await GetCurrentRoundStatus();
            sessionStorage.setItem('roundStatus', JSON.stringify(currentRound));
        }        
        //Fetch all users data
        if(sessionStorage.getItem('allUsers') !== null) {
            allUsers = JSON.parse(sessionStorage.getItem('allUsers'));
        } else {
            allUsers = await GetAllUsers();
            sessionStorage.setItem('allUsers', JSON.stringify(allUsers));
        }        
        //Isolate active user from team cookie
        if (sessionStorage.getItem('activeUser') !== null) {
            user = JSON.parse(sessionStorage.getItem('activeUser'));
        } else {
            user = allUsers.find(u => u.team_short == GetActiveUserTeamShort());
            sessionStorage.setItem('activeUser', JSON.stringify(user));
        }
        //Load fixture data and display reliant sections
        LoadFixtureData();
        //Load the squad data and fill reliant sections
        LoadSquadInfo();
        //Display team info and inbox
        DisplayTeamInfo();
        DisplayInbox();
        //Hide loading icon and display main content
        document.getElementById('loading').hidden = true;
        document.getElementById('mainContent').hidden = false;
    } catch (error) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}
/**
 * Loads and displays the active user's last and current/next matches
 */
async function LoadFixtureData() {
    //Get fixtures data
    //allRounds = await GetAllFixtures();
    //Isolate current active round
    try {
        nextMatch = await GetTeamFixtureByRound(user.team_short, GetCurrentRoundNumber());
    } catch (err) {
        nextMatch = undefined;
    }
    //Isolate last round
    try {
        lastMatch = await GetTeamFixtureByRound(user.team_short, Number(GetCurrentRoundNumber()) - 1);
    } catch (err) {
        lastMatch = undefined;
    }
    //If current round is not 1st, display last match info
    if (lastMatch) DisplayLastMatch();
    //Display current/next match info
    DisplayNextMatch();
}
/**
 * Loads and displays active user's squad, squad info and captain info
 */
async function LoadSquadInfo() {
    try {
        //Load squad
        squad = await GetPlayersFromXrlTeam(user.team_short);
        //Sort players
        let sortedSquad = squad.sort(DefaultPlayerSort);
        //Display squad and captain info
        DisplaySquadInfo();
        DisplayCaptainInfo();
        //Display player table
        PopulateSquadTable(sortedSquad);
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}

/**
 * Display's the active user's last XRL match (opponent, score, result)
 */
function DisplayLastMatch() {
    try {
        //Get user's match from last round's fixtures
        if (lastMatch == undefined) { //If user didn't have a match in the last round, hide section and return
            document.getElementById('lastMatchOpponent').innerText = 'None';
            document.getElementById('lastMatchView').hidden = true;
            return;
        }
        document.getElementById('lastMatchView').hidden = false;
        //Check if match was a homegame, find opponent and venue, display
        let homeGame = lastMatch.home == user.team_short;
        let opponent = homeGame ? lastMatch.away : lastMatch.home;
        let ground = homeGame ? user.homeground : allUsers.find(u => u.team_short == opponent).homeground;
        document.getElementById('lastMatchOpponent').innerText = opponent + ' @ ' + ground;
        //Display score
        document.getElementById('lastMatchScore').innerText = lastMatch.home_score + ' - ' + lastMatch.away_score;
        //Work out result based on score and whether user's team was home or away
        let result = lastMatch.home_score == lastMatch.away_score ? 'DRAW' : homeGame ? lastMatch.home_score > lastMatch.away_score ? 'WIN' : 'LOSS' : lastMatch.away_score > lastMatch.home_score ? 'WIN' : 'LOSS';
        document.getElementById('lastMatchResult').style.color = result == 'WIN' ? 'green' : result == 'LOSS' ? '#c94d38' : 'orange'; 
        document.getElementById('lastMatchResult').innerText = ' ' + result; 
        //Give the 'View' button a href of fixture.html with query parameteres specifying round and match
        document.getElementById('lastMatchView').href = `fixture.html?round=${currentRound.round_number - 1}&fixture=${lastMatch.home}-v-${lastMatch.away}`;
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}
/**
 * Displays the active user's current/next XRL match (opponent, live score)
 */
function DisplayNextMatch() {
    try {
        //Locate user's fixture in the next round
        //let match = GetTeamFixture(user.team_short, nextMatch);
        //If the user has no match in that round, display message and return
        if (nextMatch == undefined) {
            document.getElementById('nextMatchOpponent').innerText = 'No game this week.';
            document.getElementById('nextMatchButton').hidden = true;
            return;
        }
        //If the user's team is the home team, then it's a home game
        let homeGame = nextMatch.home == user.team_short;
        //If it's a homegame, the opponent is the away team, and vice versa
        let opponent = homeGame ? nextMatch.away : nextMatch.home;
        //If it's a homegame, the venue is the user's homeground, else it's the opponent's homeground
        let ground = homeGame ? user.homeground : allUsers.find(u => u.team_short == opponent).homeground;
        //Display opponent and venue
        document.getElementById('nextMatchOpponent').innerText = opponent + ' @ ' + ground;
        let status, color;
        //Display and colourise the round status
        if (currentRound.completed) { status = 'Completed'; color = 'green'; }
        else if (currentRound.in_progress) { status = 'In Progress'; color = 'green'; }
        else if (currentRound.active) { status = 'Active'; color = 'orange'; }
        else { status = 'Inactive'; color = '#c94d38'; }
        document.getElementById('nextMatchStatus').style.color = color;
        document.getElementById('nextMatchStatus').innerText = 'Status: ' + status;    
        if (!currentRound.in_progress) { //If the next round hasn't started yet, button should take user to lineup page
            document.getElementById('nextMatchButton').href = `lineup.html`;
            document.getElementById('nextMatchButton').innerText = 'Set Lineup';
        } else { //If it is in progress, display the live score and set button to take user to match view
            document.getElementById('nextMatchScore').innerText = nextMatch.home + ' ' + nextMatch.home_score + ' - ' + nextMatch.away_score + ' ' + nextMatch.away; 
            document.getElementById('nextMatchScore').hidden = false; 
            document.getElementById('nextMatchButton').href = `fixture.html?round=${currentRound.round_number}&fixture=${nextMatch.home}-v-${nextMatch.away}`;
            document.getElementById('nextMatchButton').innerText = 'View';
        }
        if (nextMatch.completed) { //If round is completed, determine the result, colourise and display
            let result = nextMatch.home_score == nextMatch.away_score ? 'DRAW' : homeGame ? nextMatch.home_score > nextMatch.away_score ? 'WIN' : 'LOSS' : nextMatch.away_score > nextMatch.home_score ? 'WIN' : 'LOSS';
            document.getElementById('nextMatchResult').style.color = result == 'WIN' ? 'green' : result == 'LOSS' ? '#c94d38' : 'orange'; 
            document.getElementById('nextMatchResult').innerText = ' ' + result;
        } 
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}
/**
 * Displays the active user's inbox
 */
function DisplayInbox() {
    try {
        let inboxBody = document.getElementById('inboxBody');
        //Clear any previous contents
        inboxBody.innerHTML = '';
        //Sort messages by date
        let sortedInbox = user.inbox.sort((m1, m2) => new Date(m2.datetime) - new Date(m1.datetime));
        sortedInbox.forEach((message) => { //For each message...            
            //Create a row in the table
            let messageRow = document.createElement('tr');
            //Add message datetime 
            let time = document.createElement('td');
            time.innerText = message.datetime;
            messageRow.appendChild(time);
            //Add message sender
            let sender = document.createElement('td');
            sender.innerText = message.sender;
            messageRow.appendChild(sender);
            //Add message subject
            let subject = document.createElement('td');
            subject.innerText = message.subject;
            messageRow.appendChild(subject);
            //Add message body
            let body = document.createElement('td');
            body.innerText = message.message;
            messageRow.appendChild(body);
            //Add a button to delete message
            let deleteCell = document.createElement('td');
            let deleteButton = document.createElement('button');
            deleteButton.className = 'btn btn-danger';
            deleteButton.innerText = 'Delete';
            deleteButton.value = message.message;
            deleteButton.onclick = function() {
                deleteMessage(this.value);
            };
            deleteCell.appendChild(deleteButton);
            messageRow.appendChild(deleteCell);
            //Add message to inbox table
            inboxBody.appendChild(messageRow);
        });
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}
/**
 * Removes a message from the active user's inbox and calls the method to persist change
 * in the database.
 * @param {String} messageBody The body of the message to delete
 */
function deleteMessage(messageBody) {
    try {
        //Find index of message in user's inbox array
        let messageIndex = user.inbox.findIndex(m => m.message == messageBody);
        //Remove the message
        user.inbox.splice(messageIndex, 1);
        //Call function to persist changes to inbox
        UpdateUserInbox(user.username, user.inbox);
        //Display the updated inbox
        DisplayInbox();
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}
/**
 * Displays how many powerplays user has and how often different players have been captained
 */
function DisplayCaptainInfo() {
    try {
        //Display powerplay count
        document.getElementById('powerplayCount').innerText = user.powerplays;
        //Iterate through players who have been captain at least once
        squad.filter(p => p.times_as_captain > 0).forEach(p => {
            //Add a record to the captain count list
            document.getElementById('captainCountList').innerHTML += `<li>${p.player_name}: ${p.times_as_captain}</li>`;
        });
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}
/**
 * Displays info about the makeup of the user's squad (number of players, number in each position)
 */
function DisplaySquadInfo() {
    try {
        //Display the number of players in the squad
        document.getElementById('squadCount').innerText = squad.length;
        //Filter squad array into backs, playmakers and forwards
        let backs = squad.filter(p => p.position == 'Back' || p.position2 == 'Back');
        let playmakers = squad.filter(p => p.position == 'Playmaker' || p.position2 == 'Playmaker');
        let forwards = squad.filter(p => p.position == 'Forward' || p.position2 == 'Forward');
        //Display counts of those positions
        document.getElementById('backsCount').innerText = 'Backs: ' + backs.length;
        document.getElementById('playmakersCount').innerText = 'Playmakers: ' + playmakers.length;
        document.getElementById('forwardsCount').innerText = 'Forwards: ' + forwards.length;
        //Find players with more than one position and indicate if there are some
        let duals = squad.filter(p => p.position2 != '');
        if (duals.length == 1)
            document.getElementById('positionCounts').innerHTML += `<br />Includes 1 dual-position player`;
        else if (duals.length > 1)
            document.getElementById('positionCounts').innerHTML += `<br />Includes ${duals.length} dual-position players`;
        //If squad size is less than maximum (18) and the competition hasn't started yet, display the button redirecting to the pick players page
        if (squad.length < 18 && currentRound.round_number == 1) {
            document.getElementById('pickPlayersLink').hidden = false;
        }
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}
/**
 * Displays general info about the active user's team (name, owner, stats)
 */
function DisplayTeamInfo() {
    try {
        //Display team name, logo and owner
        document.getElementById('teamNameDisplay').innerHTML = user.team_name;
        document.getElementById('teamLogo').src = '/static/' + user.team_short + '.png';
        document.getElementById('teamOwner').innerText = user.username;
        //Sort users into ladder
        let ladder = SortLeageTable(allUsers);
        //Get active user's position in the ladder
        let position = ladder.findIndex(u => u.username == user.username) + 1;
        //Display team position and stats
        document.getElementById('teamPosition').innerText = GetOrdinal(position) + ' (' + user.stats.points + ' points)';
        document.getElementById('teamWins').innerText = user.stats.wins;
        document.getElementById('teamDraws').innerText = user.stats.draws;
        document.getElementById('teamLosses').innerText = user.stats.losses;
        document.getElementById('teamFor').innerText = user.stats.for;
        document.getElementById('teamAgainst').innerText = user.stats.against;
        document.getElementById('teamPD').innerText = user.stats.for - user.stats.against;
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}
/**
 * Displays the active user's squad in the homepage table
 * @param {Array} playerData An array of player objects
 */
function PopulateSquadTable(playerData) {
    try {
        var tableBody = document.getElementById('playerSquadTable');
        //Clear any previous content
        tableBody.innerHTML = '';
        playerData.forEach((player) => {
            //Create a row in the table
            var tr = document.createElement('tr');
            //Add player name and NRL club logo 
            var name = document.createElement('td');
            name.style.whiteSpace = 'nowrap';
            let logo = document.createElement('img');
            logo.src = 'static/' + player.nrl_club + '.svg';
            logo.height = '40';
            logo.className = 'me-1';
            name.appendChild(logo);
            let nameText = document.createElement('span');
            nameText.innerText = player.player_name;
            name.appendChild(nameText);
            tr.appendChild(name);
            //Add player's positions
            var pos1 = document.createElement('td');
            pos1.textContent = player.position;
            tr.appendChild(pos1);
            var pos2 = document.createElement('td');
            pos2.textContent = player.position2;
            tr.appendChild(pos2);   
            //Add a button to view player details      
            var details = document.createElement('td');
            var button = document.createElement('button');
            button.className = 'btn btn-success';
            button.innerText = 'Details';
            button.value = player.player_id;
            button.onclick = function() {
                DisplayPlayerInfo(squad.find(p => p.player_id == this.value), nextMatch);
            };
            details.appendChild(button);
            tr.appendChild(details);
            //Add row to table
            tableBody.appendChild(tr);
        });
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}

//#region The following functions sort the squad table
function sortByName() {
    try {
        let sortedSquad = squad.sort(SortByPlayerName);
        document.getElementById('sortByNameButton').onclick = sortByNameDesc;
        PopulateSquadTable(sortedSquad);
    } catch (err) {
        DisplayFeedback(err, err.stack);
    }
}
window.sortByName = sortByName;
function sortByNameDesc() {
    try {
        let sortedSquad = squad.sort(SortByPlayerNameDesc);
        document.getElementById('sortByNameButton').onclick = sortByName;
        PopulateSquadTable(sortedSquad);
    } catch (err) {
        DisplayFeedback(err, err.stack);
    }
}
window.sortByNameDesc = sortByNameDesc;
function sortByPosition() {
    try {
        let sortedSquad = squad.sort(DefaultPlayerSort);
        document.getElementById('sortByPositionButton').onclick = sortByPositionDesc;
        PopulateSquadTable(sortedSquad);
    } catch (err) {
        DisplayFeedback(err, err.stack);
    }
}
window.sortByPosition = sortByPosition;
function sortByPositionDesc() {
    try {
        let sortedSquad = squad.sort(DefaultPlayerSortDesc);
        document.getElementById('sortByPositionButton').onclick = sortByPosition;
        PopulateSquadTable(sortedSquad);
    } catch (err) {
        DisplayFeedback(err, err.stack);
    }
}
window.sortByPositionDesc = sortByPositionDesc;
function sortByPosition2() {
    try {
        let sortedSquad = squad.sort(SortByPosition2);
        document.getElementById('sortByPosition2Button').onclick = sortByPosition2Desc;
        PopulateSquadTable(sortedSquad);
    } catch (err) {
        DisplayFeedback(err, err.stack);
    }
}
window.sortByPosition2 = sortByPosition2;
function sortByPosition2Desc() {
    try {
        let sortedSquad = squad.sort(SortByPosition2Desc);
        document.getElementById('sortByPosition2Button').onclick = sortByPosition2;
        PopulateSquadTable(sortedSquad);
    } catch (err) {
        DisplayFeedback(err, err.stack);
    }
}
window.sortByPosition2Desc = sortByPosition2Desc;
function sortByClub() {
    try {
        let sortedSquad = squad.sort(SortByNrlClub);
        document.getElementById('sortByClubButton').onclick = sortByClubDesc;
        PopulateSquadTable(sortedSquad);
    } catch (err) {
        DisplayFeedback(err, err.stack);
    }
}
window.sortByClub = sortByClub;
function sortByClubDesc() {
    try {
        let sortedSquad = squad.sort(SortByNrlClubDesc);
        document.getElementById('sortByClubButton').onclick = sortByClub;
        PopulateSquadTable(sortedSquad);
    } catch (err) {
        DisplayFeedback(err, err.stack);
    }
}
window.sortByClubDesc = sortByClubDesc;
//#endregion