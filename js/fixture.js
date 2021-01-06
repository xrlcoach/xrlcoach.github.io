/* Script controlling fixture.html, which displays XRL match stats */

import { GetLineupByTeamAndRound, GetRoundInfo, getCookie, GetRoundInfoFromCookie, GetActiveUserInfo, GetIdToken } from "./ApiFetch.js";
import { GetLineupScore, GetTeamFixture, PositionNames } from "./Helpers.js";

let roundNumber, roundInfo, completed, match, homeTeam, awayTeam, homeLineup, awayLineup;

window.onload = async function() {
    //Get query parameters, if present
    let query = window.location.href.split('?')[1];
    if (query) {
        //Split into individual params
        let queries = query.split('&');
        //Iterate through queries and find round number and match
        for (let q of queries) {
            if (q.startsWith('round')) {
                roundNumber = q.split('=')[1];
                roundInfo = await GetRoundInfo(roundNumber);
            }
            if (q.startsWith('fixture')) {
                let fixture = q.split('=')[1];
                match = GetTeamFixture(fixture.split('-v-')[0], roundInfo);
            }
        }
    } else { //If now query, get user's current match
        roundInfo = GetRoundInfoFromCookie();
        roundNumber = roundInfo.round_number;
        let user = await GetActiveUserInfo(GetIdToken());
        match = GetTeamFixture(user.team_short, roundInfo);
    }
    homeTeam = match.home;
    awayTeam = match.away;
    //Display match and team headings
    let heading = `Round ${roundNumber}: ${homeTeam} v ${awayTeam}`;
    document.getElementById('fixtureHeading').innerText = heading;
    document.getElementById('homeTableHeader').innerText = homeTeam + " Lineup";
    document.getElementById('awayTableHeader').innerText = awayTeam + " Lineup";
    document.getElementById('homeLogo').src = `/static/${homeTeam}.png`;
    document.getElementById('awayLogo').src = `/static/${awayTeam}.png`;
    //Check if round has been completed 
    completed = roundInfo['completed'];
    //Retrieve team lineups
    homeLineup = await GetLineupByTeamAndRound(roundNumber, homeTeam);
    awayLineup = await GetLineupByTeamAndRound(roundNumber, awayTeam);
    //Construct the lineup tables
    populateLineupTable('homeTableBody', homeLineup.sort((a, b) => a.position_number - b.position_number), match.home_score);
    populateLineupTable('awayTableBody', awayLineup.sort((a, b) => a.position_number - b.position_number), match.away_score);
}
/**
 * Fills specified table with provided lineup data. Colourises players to indicate whether they
 * played. Displays total score.
 * @param {String} tableId The id of the table body element to construct
 * @param {Array} lineup An array of player lineup entries
 */
function populateLineupTable(tableId, lineup, score) {
    //Locate table body element
    let table = document.getElementById(tableId);
    //Separate the starting lineup from the interchange players
    let starters = lineup.filter(p => p.position_number < 14);
    let bench = lineup.filter(p => p.position_number >= 14);
    //Iterate through starting lineup
    for (let player of starters) {
        //Create table row
        let tr = document.createElement('tr');
        //Colour row green if the player played that week, red if not
        if (player['played_xrl']) tr.style.color = "green";
        if (!player['played_xrl'] && completed) tr.style.color = "#c94d38";
        /*For each property to display, create a table cell, assign the data to the innerText property,
        and append it to the table row*/
        let name = document.createElement('td');
        name.innerText = player['player_name'];
        tr.appendChild(name);
        let nrlClub = document.createElement('td');
        nrlClub.innerText = player['nrl_club'];
        tr.appendChild(nrlClub);
        let position = document.createElement('td');
        position.innerText = PositionNames[player['position_specific']];
        tr.appendChild(position);
        let captain = document.createElement('td');
        if (player['captain']) captain.innerText = 'Captain';
        if (player['vice']) captain.innerText = 'Vice-Captain';
        tr.appendChild(captain);
        let kicker = document.createElement('td');
        if (player['kicker']) kicker.innerText = 'Kicker';
        if (player['backup_kicker']) kicker.innerText = 'Backup Kicker';
        tr.appendChild(kicker);
        let score = document.createElement('td');
        score.innerText = player['score'];
        tr.appendChild(score);
        //Append the row to the table body
        table.appendChild(tr);
    }
    //Create heading for Interchange section of the table
    let tr = document.createElement('tr');
    let benchHeader = document.createElement('td');
    benchHeader.colSpan = "6";
    benchHeader.className = "border-bottom border-white";
    benchHeader.innerText = 'Interchange'; 
    tr.appendChild(benchHeader);
    table.appendChild(tr);
    //Iterate through the interchange players
    for (let player of bench) {
        //Create a new table row
        let tr = document.createElement('tr');
        /*Colour row green if player played that week and was subbed on, red if not,
        and grey if they haven't been subbed on but the round isn't over*/
        if (player['played_xrl']) tr.style.color = "green";
        if (!player['played_xrl'] && completed) tr.style.color = "#c94d38";
        if (!player['played_xrl'] && !completed) tr.style.color = "grey";
        /*Create the same table cells as for the starters, but no need to conditionally fill
        captain and kicker cells*/
        let name = document.createElement('td');
        name.innerText = player['player_name'];
        tr.appendChild(name);
        let nrlClub = document.createElement('td');
        nrlClub.innerText = player['nrl_club'];
        tr.appendChild(nrlClub);
        let position = document.createElement('td');
        position.innerText = player['position_general'];
        tr.appendChild(position);
        let captain = document.createElement('td');
        tr.appendChild(captain);
        let kicker = document.createElement('td');
        tr.appendChild(kicker);
        let score = document.createElement('td');
        score.innerText = player['score'];
        tr.appendChild(score);
        //Append row to table
        table.appendChild(tr);
    }
    //Create a row to show the total score
    tr = document.createElement('tr');
    //Fill out the blank cells
    for (let i = 0; i < 4; i++) {
        tr.appendChild(document.createElement('td'));
    }
    //Create label cell
    let label = document.createElement('td');
    label.innerText = 'Total:';
    tr.appendChild(label);
    //Pass the lineup to the GetLineupScore function from Helpers module
    let total = score ? score : GetLineupScore(lineup);
    //Create cell to display total
    let totalDisplay = document.createElement('td');
    totalDisplay.innerText = total;
    tr.appendChild(totalDisplay);
    table.appendChild(tr);
}