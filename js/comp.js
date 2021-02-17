/* Script controlling comp.html, which displays league table */

import { GetAllUsers } from "./ApiFetch.js";

/**
 * Array of user data objects
 */
let users;

window.onload = async function() {
    try {
        //Retrieve users' data
        if(sessionStorage.getItem('allUsers') !== null) {
            users = JSON.parse(sessionStorage.getItem('allUsers'));
        } else {
            users = await GetAllUsers();
            sessionStorage.setItem('allUsers', JSON.stringify(users));
        }  
        //Sort users first by points, point difference, then by points for
        users = users.sort(function(u1, u2) {
            if (u2.stats.points != u1.stats.points) {
                return u2.stats.points - u1.stats.points;
            } if ((u2.stats.for - u2.stats.against) != (u1.stats.for - u1.stats.against)) {
                return (u2.stats.for - u2.stats.against) - (u1.stats.for - u1.stats.against);
            }
            return u2.stats.for - u1.stats.for;
        });
        //Pass sorted array to table constructor
        PopulateLeagueTable(users);
        //Display content
        document.getElementById('loading').hidden = true;
        document.getElementById('mainContent').hidden = false;
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}
/**
 * Populates the league table with each user's info and season stats
 * @param {Array} users A sorted array of user data objects
 */
function PopulateLeagueTable(users) {
    try {
        //Locate table body element
        let table = document.getElementById('ladderTableBody');
        //Iterate through array of users
        users.forEach(user => {
            //Create a new row
            let tr = document.createElement('tr');
            /*For each property to display, create a table cell, assign the data to the innerText property,
            and append it to the table row*/
            let xrlTeam = document.createElement('td');
            xrlTeam.style.whiteSpace = 'nowrap';
            let teamLogo =  document.createElement('img');
            teamLogo.src = '/static/' + user.team_short + '.png';
            teamLogo.height = '50';
            teamLogo.className = 'me-1';
            xrlTeam.appendChild(teamLogo);
            let teamName = document.createElement('a');
            teamName.href = 'squads.html?xrlTeam=' + user.team_short;
            teamName.innerText = user.team_name;
            xrlTeam.appendChild(teamName);
            tr.appendChild(xrlTeam);
            let wins = document.createElement('td');
            wins.innerText = user.stats.wins;
            tr.appendChild(wins);
            let draws = document.createElement('td');
            draws.innerText = user.stats.draws;
            tr.appendChild(draws);
            let losses = document.createElement('td');
            losses.innerText = user.stats.losses;
            tr.appendChild(losses);
            let pointsFor = document.createElement('td');
            pointsFor.innerText = user.stats.for;
            tr.appendChild(pointsFor);
            let pointsagainst = document.createElement('td');
            pointsagainst.innerText = user.stats.against;
            tr.appendChild(pointsagainst);
            let differential = document.createElement('td');
            let pd = user.stats.for - user.stats.against;
            if (pd > 0) differential.style.color = 'green';
            if (pd < 0) differential.style.color = '#c94d38';
            differential.innerText = pd;
            tr.appendChild(differential);
            let points = document.createElement('td');
            points.innerText = user.stats.points;
            tr.appendChild(points);
            //Append the row to the table body
            table.appendChild(tr);
        });
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}