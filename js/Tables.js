export function PopulatePlayerTable(playerData, tableId) {
    tableBody = document.getElementById(tableId);
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

export function PopulatePickPlayerTable(playerData, xrlTeam, tableId) {
    tableBody = document.getElementById(tableId);
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
        if (player.xrl_team == user.team_short || player.xrl_team == undefined || player.xrl_team == 'None') {
            var pickOrDrop = document.createElement('td');
            var form = document.createElement('form');
            var input = document.createElement('input');
            input.setAttribute('type', 'hidden')
            input.setAttribute('value', `${player.player_name};${player.nrl_club}]`)
            form.appendChild(input)
            var button = document.createElement('button');
            button.setAttribute('type', 'submit');
            if (player.xrl_team == user.team_short) {
                button.className = 'btn btn-danger';
                button.innerText = 'Drop';
                form.onsubmit = (event) => {
                    event.preventDefault();
                    UpdatePlayerXrlTeam(null, input.value)
                    DisplayPlayerCounts(xrlTeam)
                }
            } else {
                button.className = 'btn btn-success';
                button.innerText = 'Pick';
                form.onsubmit = (event) => {
                    event.preventDefault();
                    UpdatePlayerXrlTeam(null, input.value)
                    DisplayPlayerCounts(xrlTeam)
                }
            }            
            tr.appendChild(pickOrDrop);
        } else {
            var xrl = document.createElement('td');
            xrl.innerText = player.xrl_team;
            tr.appendChild(xrl);
        }
        tableBody.appendChild(tr);
    }
}