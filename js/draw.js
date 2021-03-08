/* Script controlling draw.html, the page which allows user to brows past, current
and future XRL fixtures. */

import { GetAllFixtures, GetAllUsers } from "./ApiFetch.js";
import { GetActiveRoundFromFixtures, DisplayFeedback } from "./Helpers.js";
/**
 * An array of round objects sorted by round number.
 */
let draw;
/**
 * The round object for the current active round.
 */
let roundToDisplay;
/**
 * An array of user data objects.
 */
let users;

window.onload = async function() {
    try {
        //Retrieve data for all rounds
        if (sessionStorage.getItem('allFixtures')) {
            draw = JSON.parse(sessionStorage.getItem('allFixtures'));
        } else {
            let fixtures = await GetAllFixtures();
            //Sort by round number
            draw = fixtures.sort((a, b) => a.round_number - b.round_number);
            sessionStorage.setItem('allFixtures', JSON.stringify(draw));
        }        
        //Retrieve all users' data
        if(sessionStorage.getItem('allUsers')) {
            users = JSON.parse(sessionStorage.getItem('allUsers'));
        } else {
            users = await GetAllUsers();
            sessionStorage.setItem('allUsers', JSON.stringify(users));
        }  
        console.log(draw);
        //If draw has not been created yet, alert user and stop loading process.
        if (draw.length == 0) {
            DisplayFeedback('Sorry!', 'No draw yet. Fixtures will be generated once all teams have joined.');
            return;
        }
        //Isolate curent active round and display heading
        roundToDisplay = GetActiveRoundFromFixtures(draw);
        console.log('Current round: ' + roundToDisplay.round_number);
        //Populate round number dropdown options
        draw.forEach(r => {
            let li = document.createElement('li');
            let option = document.createElement('a');
            option.innerText = r.round_number;
            option.value = r.round_number;
            option.href = '#';
            option.className = 'dropdown-item';
            option.onclick = function() {
                selectRound(this.value);
            }
            //Make current round the selected value
            if (r.round_number == roundToDisplay.round_number) option.className += ' active';
            li.appendChild(option);
            document.getElementById('roundSelect').appendChild(li);
        });
        //Populate XRL Team dropdown options
        users.forEach(u => {
            let li = document.createElement('li');
            let option = document.createElement('a');
            option.innerText = u.team_short;
            option.value = u.team_short;
            option.href = '#';
            option.className = 'dropdown-item';
            option.onclick = function() {
                selectTeam(this.value);
            }
            li.appendChild(option);
            document.getElementById('teamSelect').appendChild(li);
        });
        //Call table constructor
        PopulateFixtureTable(roundToDisplay);
        //Display content
        document.getElementById('loading').hidden = true;
        document.getElementById('mainContent').hidden = false;
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
        document.getElementById('loading').hidden = true;
    }
}
/**
 * Populates the fixtures table body with the desired round's XRL matches.
 * @param {Object} round An XRL round data object
 */
function PopulateFixtureTable(round) {
    try {
        //Determine round's status and display
        let status;
        if (round.completed) status = 'Completed';
        else if (round.in_progress) status = 'In Progress';
        else if (round.active) status = 'Active';
        else status = 'Inactive';
        document.getElementById('tableHeading').innerText = `Round ${round.round_number}    -   ${status}`;
        //Locate table body element
        let table = document.getElementById('fixturesTableBody');
        //Clear previous contents
        table.innerHTML = '';
        //Iterate through the round's fixtures
        round.fixtures.forEach(match => {
            //Create table row
            let tr = document.createElement('tr');
            //Add blank cell
            tr.appendChild(document.createElement('td'));
            //Use match to find user data for home and away teams 
            let homeUser = users.find(u => u.team_short == match.home);
            let awayUser = users.find(u => u.team_short == match.away);
            //Create table cells for each team and fill with team names
            let home = document.createElement('td');
            home.style.whiteSpace = 'nowrap';
            let homeLogo =  document.createElement('img');
            homeLogo.src = '/static/' + match.home + '.png';
            homeLogo.height = '50';
            homeLogo.className = 'me-1';
            home.appendChild(homeLogo);
            let homeName = document.createElement('a');
            homeName.href = 'squads.html?xrlTeam=' + match.home;
            homeName.innerText = homeUser ? homeUser.team_name : match.home;
            home.appendChild(homeName);
            tr.appendChild(home);
            let homeScore = document.createElement('td');
            tr.appendChild(homeScore);
            let awayScore = document.createElement('td');
            tr.appendChild(awayScore);
            let away = document.createElement('td');
            away.style.whiteSpace = 'nowrap';
            let awayName = document.createElement('a');
            awayName.href = 'squads.html?xrlTeam=' + match.away;
            awayName.innerText = awayUser ? awayUser.team_name : match.away;
            away.appendChild(awayName);
            let awayLogo =  document.createElement('img');
            awayLogo.src = '/static/' + match.away + '.png';
            awayLogo.height = '50';
            awayLogo.className = 'ms-1';
            away.appendChild(awayLogo);
            tr.appendChild(away);
            //If the round is ongoing or finished, get the team scores and display them alongside the team name
            if (round.completed || round.in_progress) {
                //let homeScore = await GetLineupScoreByTeamAndRound(round.round_number, homeUser.team_short);
                homeScore.innerText = match.home_score;
                //let awayScore = await GetLineupScoreByTeamAndRound(round.round_number, awayUser.team_short);
                awayScore.innerText = match.away_score;
            }
            //Append cells to row
            let view = document.createElement('td');
            //A link to the fixture page, using the match data to construct a query parameter
            
            let link = document.createElement('a');
            link.innerText = 'View';
            link.href = `fixture.html?round=${round.round_number}&fixture=${match.home}-v-${match.away}`;
            view.appendChild(link);
            
            tr.appendChild(view);
            //Append the row to the table
            table.appendChild(tr);
        });
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}
/**
 * Reconstructs the fixtures table with matches from the selected round.
 * @param {*} event 
 */
function selectRound(number) {
    try {
        //Uses the selected round number to locate round info from pre-loaded array
        roundToDisplay = draw.find(r => r.round_number == number);
        //Calls the table constructor with the new round info
        PopulateFixtureTable(roundToDisplay);
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}
//Give the function global scope, allowing it to be called from HTML.
window.selectRound = selectRound;
/**
 * Populates the fixtures table body with the desired round's XRL matches.
 * @param {Object} round An XRL round data object
 */
function PopulateTeamFixtureTable(team) {
    try {
        //Display team heading
        document.getElementById('tableHeading').innerText = team + ' Fixtures';
        //Locate table body element
        let table = document.getElementById('fixturesTableBody');
        //Clear previous contents
        table.innerHTML = '';
        //Iterate through the all the rounds
        draw.forEach(round => {
            //Get user's match from round
            let match = round.fixtures.find(f => f.home == team || f.away == team);;
            if (!match) return;
            //Create table row
            let tr = document.createElement('tr');
            let roundCell = document.createElement('td');
            roundCell.innerText = round.round_number;
            tr.appendChild(roundCell);
            //Use match to find user data for home and away teams 
            let homeUser = users.find(u => u.team_short == match.home);
            let awayUser = users.find(u => u.team_short == match.away);
            //Create table cells for each team and fill with team names
            let home = document.createElement('td');
            home.style.whiteSpace = 'nowrap';
            let homeLogo =  document.createElement('img');
            homeLogo.src = '/static/' + homeUser.team_short + '.png';
            homeLogo.height = '50';
            homeLogo.className = 'me-1';
            home.appendChild(homeLogo);
            let homeName = document.createElement('a');
            homeName.href = 'squads.html?xrlTeam=' + homeUser.team_short;
            homeName.innerText = homeUser.team_name;
            home.appendChild(homeName);
            tr.appendChild(home);
            let homeScore = document.createElement('td');
            tr.appendChild(homeScore);
            let awayScore = document.createElement('td');
            tr.appendChild(awayScore);
            let away = document.createElement('td');
            away.style.whiteSpace = 'nowrap';
            let awayName = document.createElement('a');
            awayName.href = 'squads.html?xrlTeam=' + awayUser.team_short;
            awayName.innerText = awayUser.team_name;
            away.appendChild(awayName);
            let awayLogo =  document.createElement('img');
            awayLogo.src = '/static/' + awayUser.team_short + '.png';
            awayLogo.height = '50';
            awayLogo.className = 'ms-1';
            away.appendChild(awayLogo);
            tr.appendChild(away);
            //If the round is ongoing or finished, get the team scores and display them alongside the team name
            if (round.completed || round.in_progress) {
                //let homeScore = await GetLineupScoreByTeamAndRound(round.round_number, homeUser.team_short);
                homeScore.innerText = match.home_score;
                //let awayScore = await GetLineupScoreByTeamAndRound(round.round_number, awayUser.team_short);
                awayScore.innerText = match.away_score;
            }
            //Append cells to row
            let view = document.createElement('td');
            //Add a link to the fixture page, using the match data to construct a query parameter            
            let link = document.createElement('a');
            link.innerText = 'View';
            link.href = `fixture.html?round=${round.round_number}&fixture=${match.home}-v-${match.away}`;
            view.appendChild(link);
            
            tr.appendChild(view);
            //Append the row to the table
            table.appendChild(tr);
        });
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}
/**
 * Reconstructs the fixtures table with all matches for a particular team.
 * @param {*} event 
 */
function selectTeam(team) {
    try {
        //Calls the user's fixture table constructor with the team acronym
        PopulateTeamFixtureTable(team);
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}
//Give the function global scope, allowing it to be called from HTML.
window.selectTeam = selectTeam;
