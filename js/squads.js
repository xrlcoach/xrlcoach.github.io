import { GetAllPlayers, GetPlayersFromNrlClub } from "./ApiFetch.js";

GetAllPlayers()
.then((data) => {
    PopulatePlayerTable(data)
})
.catch((error) => {
    document.getElementById('feedback').innerText += error;
})


function selectNrlClub(event) {
    event.preventDefault();
    club = document.getElementById('nrlClubSelect').value;
    GetPlayersFromNrlClub(club)
    .then((data) => {
        PopulatePlayerTable(data);
    })
    .catch((error) => {
        document.getElementById('feedback').innerText += error;
    })
}

export function PopulatePlayerTable(playerData) {
    tableBody = document.getElementById('squadTableBody');    
    for (var i = 0; i < data.length; i++) {
        var player = data[i];
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
        tableBody.appendChild(tr);
    }
}