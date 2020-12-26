export function GetIdToken() {
    return getCookie('id');
}

export async function GetAllUsers() {
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/xrl-users', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    });
    const data = await response.json();
    return data;
}

export async function GetActiveUserInfo(idToken) {
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/xrl-users', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': idToken
        }
    });
    const data = await response.json();
    return data;        
}

export async function GetAllPlayers() {
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/players', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    return data;
}

export async function GetPlayersFromNrlClub(club) {
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/players?nrlClub=' + club, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'        
        }
    });
    const data = await response.json();
    return data;
}

export async function GetPlayersFromXrlTeam(team) {
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/players?xrlTeam=' + team, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'        
        }
    });
    const data = await response.json();
    return data;   
}

export async function UpdatePlayerXrlTeam(xrlTeam, playerInfo) {
    var newTeam = xrlTeam == null ? 'None' : xrlTeam;
    var playerName = playerInfo.split(';')[0]
    var playerClub = playerInfo.split(';')[1]
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/players', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'        
        },
        body: JSON.stringify({
            "operation": "pick_drop",
            "player_name": playerName,
            "nrl_club": playerClub,
            "xrl_team": newTeam
        })
    });
    if (response.ok) {
        const data = await response.json();
        return data;
    } else {
        document.getElementById('feedback').innerText += 'Network response not ok';
    }
}

export async function GetLineup(idToken) {
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/lineup', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': idToken         
        }
    });
    const data = await response.json();
    return data;
}

export async function SetLineup(idToken, players) {
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/lineup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': idToken         
        },
        body: JSON.stringify(players)
    });
    const data = await response.json();
    return data;
}

export async function GetAllFixtures() {
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/fixtures', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'        
        }
    });
    const data = await response.json();
    return data;
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
