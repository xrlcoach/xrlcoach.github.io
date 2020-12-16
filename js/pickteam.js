

fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/players', {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'        
    }
})
.then((response) => {
    if (response.ok) {        
        return response.json();
    } else {
        document.getElementById('feedback').innerText = 'Network response not ok';
    }    
})
.then((data) => {
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
})
.catch((error) => {
    document.getElementById('feedback').innerText += error;
})


function selectNrlClub(event) {
    event.preventDefault();
    club = document.getElementById('nrlClubSelect').value;
    fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/players?nrlClub=' + club, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'        
        }
    })
    .then((response) => {
        if (response.ok) {        
            return response.json();
        } else {
            document.getElementById('feedback').innerText = 'Network response not ok';
        }        
    })
    .then((data) => {
        tableBody = document.getElementById('squadTableBody');
        tableBody.innerHTML = "";    
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
            var nrlClub = document.createElement('td');
            nrlClub.textContent = player.nrl_club;
            tr.appendChild(nrlClub);
            tableBody.appendChild(tr);
        }
    })
    .catch((error) => {
        document.getElementById('feedback').innerText += error;
    })
}