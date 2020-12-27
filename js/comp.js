import { GetAllUsers } from "./ApiFetch.js";

let users;

window.onload = async function() {
    users = await GetAllUsers();
    PopulateLeagueTable(users);
}

function PopulateLeagueTable(users) {
    let user;
    for (user of users) {
        let table = document.getElementById('ladderTableBody');
        let tr = document.createElement('tr');
        let xrlTeam = document.createElement('td');
        xrlTeam.innerText = user.team_name;
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
        let points = document.createElement('td');
        points.innerText = user.stats.points;
        tr.appendChild(points);
        table.appendChild(tr);
    }
}