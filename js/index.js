/* var jwt = String(window.location).split('#')[1];
var idToken = String(jwt).split('=')[1].split('&')[0];
document.getElementById('fragId').innerText = idToken; */

var idToken = getCookie('id');
// if (!idToken) {
//     window.location.replace('logintest.html');
// }
document.getElementById('userData').innerText = idToken;
document.getElementById('fragId').innerText = document.cookie;


fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/xrl-users', {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': idToken
    }
})
.then((response) => {
    if (response.ok) {        
        return response.json();
    } else {
        document.getElementById('userData').innerText = 'Network response not ok';
    }
    
})
.then((data) => {
    var table = document.createElement('table');
    var thead = document.createElement('tr');
    var username = document.createElement('th');
    username.textContent = 'Username';
    thead.appendChild(username);
    var teamName = document.createElement('th');
    teamName.textContent = 'Team Name';
    thead.appendChild(teamName);
    var homeground = document.createElement('th');
    homeground.textContent = 'Home Ground';
    thead.appendChild(homeground);
    table.appendChild(thead);
    for (var i = 0; i < data.length; i++) {
        var user = data[i];
        var tr = document.createElement('tr');
        username = document.createElement('td');
        username.textContent = user.username;
        tr.appendChild(username);
        teamName = document.createElement('td');
        teamName.textContent = user.team_name;
        tr.appendChild(teamName);
        homeground = document.createElement('td');
        homeground.textContent = user.homeground;
        tr.appendChild(homeground);
        table.appendChild(tr);
    }
    document.getElementById('userData').appendChild(table);
})
.catch((error) => {
    document.getElementById('userData').innerText += error;
})

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  }

