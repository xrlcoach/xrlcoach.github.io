export function GetIdToken() {
    return getCookie('id');
}

export async function GetActiveUserInfo(idToken) {
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/xrl-users', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': idToken
        }
    });
    return response.json();
        // .then((response) => {
        //     if (response.ok) {
        //         return response.json();
        //     } else {
        //         document.getElementById('feedback').innerText = 'Network response not ok';
        //     }
        // })
        // .then((data) => {
        //     return data;
        // })
        // .catch((error) => {
        //     document.getElementById('feedback').innerText = error;
        // });
}

export function GetAllPlayers() {
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
            return data;
        })
        .catch((error) => {
            document.getElementById('feedback').innerText = error;
        });
}

export function GetPlayersFromNrlClub(club) {
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
    });
}

export async function GetPlayersFromXrlTeam(team) {
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/players?xrlTeam=' + team, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'        
        }
    });
    return response.json();
    // .then((response) => {
    //     if (response.ok) {        
    //         return response.json();
    //     } else {
    //         document.getElementById('feedback').innerText = 'Network response not ok';
    //     }        
    // })
    // .catch((error) => {
    //     document.getElementById('feedback').innerText = error;
    // });
}

export function UpdatePlayerXrlTeam(xrlTeam, playerInfo) {
    var newTeam = xrlTeam == null ? 'None' : xrlTeam;
    var playerName = playerInfo.split(';')[0]
    var playerClub = playerInfo.split(';')[1]
    fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/players', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'        
        },
        body: {
            'operation': 'pick_drop',
            'player_name': playerName,
            'nrl_club': playerClub,
            'xrl_team': newTeam
        }
    })
    .then((response) => {
        if (response.ok) {        
            return response.json();
        } else {
            document.getElementById('feedback').innerText = 'Network response not ok';
        }        
    });
}

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
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
