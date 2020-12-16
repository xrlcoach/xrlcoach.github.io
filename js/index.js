var idToken = GetIdToken();
if (!idToken) {
    window.location.replace('login.html');
}



GetUserInfo(idToken)
.then((response) => {
    if (response.ok) {        
        return response.json();
    } else {
        document.getElementById('feedback').innerText = 'Network response not ok';
    }
    
})
.then((data) => {
    // var table = document.createElement('table');
    // var thead = document.createElement('tr');
    // var username = document.createElement('th');
    // username.textContent = 'Username';
    // thead.appendChild(username);
    // var teamName = document.createElement('th');
    // teamName.textContent = 'Team Name';
    // thead.appendChild(teamName);
    // var homeground = document.createElement('th');
    // homeground.textContent = 'Home Ground';
    // thead.appendChild(homeground);
    // table.appendChild(thead);
    // for (var i = 0; i < data.length; i++) {
    //     var user = data[i];
    //     var tr = document.createElement('tr');
    //     username = document.createElement('td');
    //     username.textContent = user.username;
    //     tr.appendChild(username);
    //     teamName = document.createElement('td');
    //     teamName.textContent = user.team_name;
    //     tr.appendChild(teamName);
    //     homeground = document.createElement('td');
    //     homeground.textContent = user.homeground;
    //     tr.appendChild(homeground);
    //     table.appendChild(tr);
    // }
    // document.getElementById('userData').appendChild(table);
    document.getElementById('userData').innerText = JSON.stringify(data);
})
.catch((error) => {
    document.getElementById('userData').innerText += error;
})


