/* Script controlling fixture.html, which displays XRL match stats */

import { GetLineupByTeamAndRound, GetRoundInfo, getCookie, GetRoundInfoFromCookie, GetActiveUserInfo, GetIdToken, GetActiveUserTeamShort, GetPlayerAppearanceStats } from "./ApiFetch.js";
import { DisplayAppearanceInfoFromLineup, GetLineupScore, GetTeamFixture, PositionNames, DisplayFeedback } from "./Helpers.js";

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
    } else { //If no query, get user's current match
        roundInfo = await GetRoundInfoFromCookie();
        roundNumber = roundInfo.round_number;
        match = GetTeamFixture(GetActiveUserTeamShort(), roundInfo);
        if (roundNumber > 1) {
            let lastMatch = GetTeamFixture(GetActiveUserTeamShort(), await GetRoundInfo(Number(roundNumber) - 1));
            document.getElementById('previousMatchLink').href = `fixture.html?round=${Number(roundNumber) - 1}&fixture=${lastMatch.home}-v-${lastMatch.away}`;
            document.getElementById('previousMatchLink').hidden = false;
        }
        if (roundNumber < 21) {
            let nextMatch = GetTeamFixture(GetActiveUserTeamShort(), await GetRoundInfo(Number(roundNumber) + 1));
            document.getElementById('nextMatchLink').href = `fixture.html?round=${Number(roundNumber) + 1}&fixture=${nextMatch.home}-v-${nextMatch.away}`;
            document.getElementById('nextMatchLink').hidden = false;
        }
    }
    //If there is no such match to display (draw not done, incorrect query), display message and stop loading
    if (match == undefined) {
        document.getElementById('loading').hidden = true;
        DisplayFeedback('WTF?', 'No match to show yet. Please check back later.');
        return;
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
    //Display content
    document.getElementById('loading').hidden = true;
    document.getElementById('mainContent').hidden = false;
}
/**
 * Fills specified table with provided lineup data. Colourises players to indicate whether they
 * played. Displays total score.
 * @param {String} tableId The id of the table body element to construct
 * @param {Array} lineup An array of player lineup entries
 */
async function populateLineupTable(tableId, lineup, score) {
    //Locate table body element
    let table = document.getElementById(tableId);
    //Separate the starting lineup from the interchange players
    let starters = lineup.filter(p => p.position_number < 14);
    let bench = lineup.filter(p => p.position_number >= 14);
    //Iterate through starting lineup
    for (let player of starters) {
        let statsRecord = await GetPlayerAppearanceStats(player.player_id, player.round_number);
        //Create table row
        let tr = document.createElement('tr');
        //Colour row green if the player played that week, red if not
        if (player['played_xrl']) tr.style.color = "green";
        if (!player['played_xrl'] && completed) tr.style.color = "#c94d38";
        /*For each property to display, create a table cell, assign the data to the innerText property,
        and append it to the table row*/
        let shirtNumber = document.createElement('td');
        shirtNumber.innerText = player.position_number;
        let name = document.createElement('td');
        tr.appendChild(shirtNumber);
        //Turn player name into a clickable element which displays the player lineup info modal
        let nameLink = document.createElement('a');
        nameLink.innerText = player['player_name'];
        nameLink.href = '#';
        nameLink.onclick = function() {
            DisplayAppearanceInfoFromLineup(player);
        };
        name.appendChild(nameLink);
        tr.appendChild(name);
        let nrlClub = document.createElement('td');
        let logo = document.createElement('img');
        logo.src = '/static/' + player.nrl_club + '.svg';
        logo.height = '40';
        logo.className = 'me-1';
        nrlClub.appendChild(logo);
        tr.appendChild(nrlClub);
        // let position = document.createElement('td');
        // position.innerText = PositionNames[player['position_specific']];
        // tr.appendChild(position);
        let tries = document.createElement('td');
        tries.innerText = statsRecord.stats.Tries;
        tr.appendChild(tries);
        let goals = document.createElement('td');
        goals.innerText = statsRecord.scoring_stats.kicker.goals;
        tr.appendChild(goals);
        let fieldGoals = document.createElement('td');
        fieldGoals.innerText = statsRecord.scoring_stats.kicker.field_goals;
        tr.appendChild(fieldGoals);
        let IT = document.createElement('td');
        IT.innerText = statsRecord.scoring_stats[player.position_general].involvement_try ? 1 : 0;
        tr.appendChild(IT);
        let PT = document.createElement('td');
        PT.innerText = statsRecord.scoring_stats[player.position_general].positional_try ? 1 : 0;
        tr.appendChild(PT);
        let MIA = document.createElement('td');
        MIA.innerText = statsRecord.scoring_stats[player.position_general].mia ? 1 : 0;
        tr.appendChild(MIA);
        let concede = document.createElement('td');
        concede.innerText = statsRecord.scoring_stats[player.position_general].concede ? 1 : 0;
        tr.appendChild(concede);
        let roles = document.createElement('td');
        if (player['captain']) roles.innerText = 'C ';
        if (player['captain2']) roles.innerText = 'C ';
        if (player['vice']) roles.innerText = 'VC ';
        if (player['kicker']) roles.innerText += 'K';
        if (player['backup_kicker']) roles.innerText += 'BK';
        tr.appendChild(roles);
        let score = document.createElement('td');
        score.innerText = player['score'];
        tr.appendChild(score);
        //Append the row to the table body
        table.appendChild(tr);
    }
    //Create heading for Interchange section of the table
    let tr = document.createElement('tr');
    let benchHeader = document.createElement('td');
    benchHeader.colSpan = "10";
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
        let shirtNumber = document.createElement('td');
        shirtNumber.innerText = player.position_number;
        let name = document.createElement('td');
        //Turn player name into a clickable element which displays the player lineup info modal
        let nameLink = document.createElement('a');
        nameLink.innerText = player['player_name'];
        nameLink.href = '#';
        nameLink.onclick = function() {
            DisplayAppearanceInfoFromLineup(player);
        };
        name.appendChild(nameLink);
        tr.appendChild(name);
        let nrlClub = document.createElement('td');
        let logo = document.createElement('img');
        logo.src = '/static/' + player.nrl_club + '.svg';
        logo.height = '40';
        logo.className = 'me-1';
        nrlClub.appendChild(logo);
        tr.appendChild(nrlClub);
        let tries = document.createElement('td');
        tries.innerText = statsRecord.stats.Tries;
        tr.appendChild(tries);
        let goals = document.createElement('td');
        goals.innerText = statsRecord.scoring_stats.kicker.goals;
        tr.appendChild(goals);
        let fieldGoals = document.createElement('td');
        fieldGoals.innerText = statsRecord.scoring_stats.kicker.field_goals;
        tr.appendChild(fieldGoals);
        let IT = document.createElement('td');
        IT.innerText = statsRecord.scoring_stats[player.position_general].involvement_try ? 1 : 0;
        tr.appendChild(IT);
        let PT = document.createElement('td');
        PT.innerText = statsRecord.scoring_stats[player.position_general].positional_try ? 1 : 0;
        tr.appendChild(PT);
        let MIA = document.createElement('td');
        MIA.innerText = statsRecord.scoring_stats[player.position_general].mia ? 1 : 0;
        tr.appendChild(MIA);
        let concede = document.createElement('td');
        concede.innerText = statsRecord.scoring_stats[player.position_general].concede ? 1 : 0;
        tr.appendChild(concede);
        let roles = document.createElement('td');
        tr.appendChild(roles);
        let score = document.createElement('td');
        score.innerText = player['score'];
        tr.appendChild(score);
        //Append row to table
        table.appendChild(tr);
    }
    //Create a row to show the total score
    tr = document.createElement('tr');
    let blank = document.createElement('td');
    blank.colSpan = '6';
    tr.appendChild(blank);
    //Create label cell
    let label = document.createElement('td');
    label.colSpan = '2';
    label.className = 'h4';
    label.innerText = 'Total:';
    tr.appendChild(label);
    //Pass the lineup to the GetLineupScore function from Helpers module
    let total = score ? score : GetLineupScore(lineup);
    //Create cell to display total
    let totalDisplay = document.createElement('td');
    totalDisplay.colSpan = '2';
    totalDisplay.className = 'h4';
    totalDisplay.innerText = total;
    tr.appendChild(totalDisplay);
    table.appendChild(tr);
}