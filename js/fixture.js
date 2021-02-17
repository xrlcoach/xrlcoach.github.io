/* Script controlling fixture.html, which displays XRL match stats */

import { GetLineupByTeamAndRound, GetRoundInfo, getCookie, GetRoundInfoFromCookie, GetActiveUserInfo, GetIdToken, GetActiveUserTeamShort, GetPlayerAppearanceStats, GetRoundStatus, GetTeamFixtureByRound, GetCurrentRoundStatus } from "./ApiFetch.js";
import { DisplayAppearanceInfoFromLineup, GetLineupScore, GetTeamFixture, PositionNames, DisplayFeedback } from "./Helpers.js";

let roundNumber, roundInfo, completed, match, homeTeam, awayTeam, homeLineup, awayLineup;

window.onload = async function() {
    try {
        //Get query parameters, if present
        let query = window.location.href.split('?')[1];
        if (query) {
            //Split into individual params
            let queries = query.split('&');
            //Iterate through queries and find round number and match
            for (let q of queries) {
                if (q.startsWith('round')) {
                    roundNumber = q.split('=')[1];
                    roundInfo = await GetRoundStatus(roundNumber);
                }
                if (q.startsWith('fixture')) {
                    let fixture = q.split('=')[1];
                    match = GetTeamFixtureByRound(fixture.split('-v-')[0], roundNumber);
                }
            }
        } else { //If no query, get user's current match
            roundInfo = await GetCurrentRoundStatus();
            roundNumber = roundInfo.round_number;
            match = await GetTeamFixtureByRound(GetActiveUserTeamShort(), roundNumber);
        }
        //If there is no such match to display (draw not done, incorrect query), display message and stop loading
        if (match == undefined) {
            document.getElementById('loading').hidden = true;
            DisplayFeedback('WTF?', 'No match to show yet. Please check back later.');
            return;
        }
        if (match.home == GetActiveUserTeamShort() || match.away == GetActiveUserTeamShort()) {
            if (roundNumber > 1) {
                let lastMatch = await GetTeamFixtureByRound(GetActiveUserTeamShort(), Number(roundNumber) - 1);
                document.getElementById('previousMatchLink').href = `fixture.html?round=${Number(roundNumber) - 1}&fixture=${lastMatch.home}-v-${lastMatch.away}`;
                document.getElementById('previousMatchLink').hidden = false;
            }
            if (roundNumber < 21) {
                let nextMatch = await GetTeamFixtureByRound(GetActiveUserTeamShort(), Number(roundNumber) + 1);
                document.getElementById('nextMatchLink').href = `fixture.html?round=${Number(roundNumber) + 1}&fixture=${nextMatch.home}-v-${nextMatch.away}`;
                document.getElementById('nextMatchLink').hidden = false;
            }
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
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}
/**
 * Fills specified table with provided lineup data. Colourises players to indicate whether they
 * played. Displays total score.
 * @param {String} tableId The id of the table body element to construct
 * @param {Array} lineup An array of player lineup entries
 */
async function populateLineupTable(tableId, lineup, score) {
    try {
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
            /*For each property to display, create a table cell, assign the data to the innerText property,
            and append it to the table row*/
            let shirtNumber = document.createElement('td');
            shirtNumber.innerText = player.position_number;
            //Colour player number and name green if the player played that week, red if not
            if (player['played_xrl']) shirtNumber.style.color = "green";
            if (!player['played_xrl'] && completed) shirtNumber.style.color = "#c94d38";
            tr.appendChild(shirtNumber);
            let name = document.createElement('td');
            name.style.whiteSpace = 'nowrap';
            //Turn player name into a clickable element which displays the player lineup info modal
            let nameLink = document.createElement('a');
            nameLink.innerText = player['player_name'];
            nameLink.href = '#';
            nameLink.onclick = function() {
                DisplayAppearanceInfoFromLineup(player);
            };
            if (player['played_xrl']) nameLink.style.color = "green";
            if (!player['played_xrl'] && completed) nameLink.style.color = "#c94d38";
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
            tries.innerText = statsRecord ? statsRecord.stats.Tries : 0;
            tries.style.color = Number(tries.innerText) > 0 ? "green" : "";
            tr.appendChild(tries);
            let goals = document.createElement('td');
            goals.innerText = statsRecord ? statsRecord.scoring_stats.kicker.goals : 0;
            goals.style.color = Number(goals.innerText) > 0 ? "green" : "";
            tr.appendChild(goals);
            let fieldGoals = document.createElement('td');
            fieldGoals.innerText = statsRecord ? statsRecord.scoring_stats.kicker.field_goals : 0;
            fieldGoals.style.color = Number(fieldGoals.innerText) > 0 ? "green" : "";
            tr.appendChild(fieldGoals);
            let IT = document.createElement('td');
            IT.innerText = statsRecord ? statsRecord.scoring_stats[player.position_general].involvement_try ? 1 : 0 : 0;
            IT.style.color = Number(IT.innerText) > 0 ? "green" : "";
            tr.appendChild(IT);
            let PT = document.createElement('td');
            PT.innerText = statsRecord ? statsRecord.scoring_stats[player.position_general].positional_try ? 1 : 0 : 0;
            PT.style.color = Number(PT.innerText) > 0 ? "green" : "";
            tr.appendChild(PT);
            let MIA = document.createElement('td');
            MIA.innerText = statsRecord ? statsRecord.scoring_stats[player.position_general].mia ? 1 : 0 : 0;
            MIA.style.color = Number(MIA.innerText) > 0 ? "#c94d38" : "";
            tr.appendChild(MIA);
            let concede = document.createElement('td');
            concede.innerText = statsRecord ? statsRecord.scoring_stats[player.position_general].concede ? 1 : 0 : 0;
            concede.style.color = Number(concede.innerText) > 0 ? "#c94d38" : "";
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
        benchHeader.colSpan = "12";
        benchHeader.className = "border-bottom border-white";
        benchHeader.innerText = 'Interchange'; 
        tr.appendChild(benchHeader);
        table.appendChild(tr);
        //Iterate through the interchange players
        for (let player of bench) {
            let statsRecord = await GetPlayerAppearanceStats(player.player_id, player.round_number);
            //Create a new table row
            let tr = document.createElement('tr');
            /*Create the same table cells as for the starters, but no need to conditionally fill
            captain and kicker cells*/
            let shirtNumber = document.createElement('td');
            shirtNumber.innerText = player.position_number;
            /*Colour player name and number green if player played that week and was subbed on, red if not,
            and grey if they haven't been subbed on but the round isn't over*/
            if (player['played_xrl']) shirtNumber.style.color = "green";
            if (!player['played_xrl'] && completed) shirtNumber.style.color = "#c94d38";
            if (!player['played_xrl'] && !completed) shirtNumber.style.color = "grey";
            tr.appendChild(shirtNumber);
            let name = document.createElement('td');
            name.style.whiteSpace = 'nowrap';
            //Turn player name into a clickable element which displays the player lineup info modal
            let nameLink = document.createElement('a');
            nameLink.innerText = player['player_name'];
            nameLink.href = '#';
            nameLink.onclick = function() {
                DisplayAppearanceInfoFromLineup(player);
            };
            if (player['played_xrl']) nameLink.style.color = "green";
            if (!player['played_xrl'] && completed) nameLink.style.color = "#c94d38";
            if (!player['played_xrl'] && !completed) nameLink.style.color = "grey";
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
            tries.innerText = statsRecord ? statsRecord.stats.Tries : 0;
            tries.style.color = Number(tries.innerText) > 0 ? "green" : "";
            tr.appendChild(tries);
            let goals = document.createElement('td');
            goals.innerText = statsRecord ? statsRecord.scoring_stats.kicker.goals : 0;
            goals.style.color = Number(goals.innerText) > 0 ? "green" : "";
            tr.appendChild(goals);
            let fieldGoals = document.createElement('td');
            fieldGoals.innerText = statsRecord ? statsRecord.scoring_stats.kicker.field_goals : 0;
            fieldGoals.style.color = Number(fieldGoals.innerText) > 0 ? "green" : "";
            tr.appendChild(fieldGoals);
            let IT = document.createElement('td');
            IT.innerText = statsRecord ? statsRecord.scoring_stats[player.position_general].involvement_try ? 1 : 0 : 0;
            IT.style.color = Number(IT.innerText) > 0 ? "green" : "";
            tr.appendChild(IT);
            let PT = document.createElement('td');
            PT.innerText = statsRecord ? statsRecord.scoring_stats[player.position_general].positional_try ? 1 : 0 : 0;
            PT.style.color = Number(PT.innerText) > 0 ? "green" : "";
            tr.appendChild(PT);
            let MIA = document.createElement('td');
            MIA.innerText = statsRecord ? statsRecord.scoring_stats[player.position_general].mia ? 1 : 0 : 0;
            MIA.style.color = Number(MIA.innerText) > 0 ? "#c94d38" : "";
            tr.appendChild(MIA);
            let concede = document.createElement('td');
            concede.innerText = statsRecord ? statsRecord.scoring_stats[player.position_general].concede ? 1 : 0 : 0;
            concede.style.color = Number(concede.innerText) > 0 ? "#c94d38" : "";
            tr.appendChild(concede);
            let roles = document.createElement('td');
            tr.appendChild(roles);
            let score = document.createElement('td');
            score.innerText = player['score'];
            score.style.color = Number(score.innerText) > 0 ? "green" : Number(score.innerText) < 0 ? "#c94d38" : "";
            tr.appendChild(score);
            //Append row to table
            table.appendChild(tr);
        }
        //Create a row to show the total score
        tr = document.createElement('tr');
        let blank = document.createElement('td');
        blank.colSpan = '8';
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
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}