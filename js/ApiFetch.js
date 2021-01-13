import { DisplayFeedback } from "./Helpers.js";

/**
 * Passes username and password to lambda login function, which authenticates user against Cognito user pool.
 * Returns Cognito id token in response body.
 * @param {String} username 
 * @param {String} password 
 */
export async function Login(username, password) {
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/xrl-users/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': '*/*'                
        },
        credentials: 'include',
        body: JSON.stringify({
            "username": username,
            "password": password,        
        })
    });
    console.log(response);
    const data = await response.json();
    console.log(data);
    return data;
}
/**
 * Retrieves the id token stored in the 'id' cookie
 */
export function GetIdToken() {
    return getCookie('id');
}
/**
 * Retrieves the team acronym stored in the 'team' cookie
 */
export function GetActiveUserTeamShort() {
    return getCookie('team');
}
/**
 * Calls GetUsers lambda function to retrieve all users' data
 */
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
/**
 * Passes the id token to the GetUsers lambda, which isolates username and retrieves their user data
 * @param {String} idToken 
 */
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
/**
 * Calls the Players lambda to scan the whole players table
 */
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
/**
 * Calls the Players lambda with nrlClub query paramater
 * @param {String} club e.g. 'Broncos', 'Eels'
 */
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
/**
 * Calls the Players with xrlTeam query parameter
 * @param {String} team XRL team acronym
 */
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
/**
 * Retrieves a single player's data from players table
 * @param {String} playerId 
 */
export async function GetPlayerById(playerId) {
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/players?playerId=' + playerId, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'        
        }
    });
    const data = await response.json();
    return data; 
}
/**
 * Used to pick or drop a single player. Sends POST request to Players lambda with player id and new team acronym.
To drop a player, call with xrlTeam as null, which updates team to 'None' and then sends POST request to GetSetLineup
lambda, dropping the player from any current or future lineups.
 * @param {String} xrlTeam XRL team acronym
 * @param {Object} player Player object
 */
export async function UpdatePlayerXrlTeam(xrlTeam, player) {
    var newTeam = xrlTeam == null ? 'None' : xrlTeam;
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/players', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'        
        },
        body: JSON.stringify({
            "operation": "pick_drop",
            "player_id": player.player_id,
            "xrl_team": newTeam
        })
    });
    if (response.ok) {
        const data = await response.json();
    } else {
        DisplayFeedback('Error', 'Network response not ok');
    }
    if (newTeam == 'None') {
        const response2 = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/lineup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': GetIdToken()         
            },
            body: JSON.stringify({
                'operation': 'remove',
                'player': JSON.stringify(player)
            })
        });
        const data = await response2.json();
    }
}
/**
 * Used to pick or drop multiple players (must be one or the other for whole player group, not a mix of picks and drops)
 * @param {String} xrlTeam XRL team acronym
 * @param {Array} players An array of player objects
 */
export async function ScoopPlayers(xrlTeam, players) {
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/players', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'        
        },
        body: JSON.stringify({
            "operation": "scoop",
            "players": players,
            "xrl_team": xrlTeam
        })
    });
    const data = await response.json();
    return data;
}

export async function DropPlayers(players) {
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/players', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'        
        },
        body: JSON.stringify({
            "operation": "drop",
            "players": players,
        })
    });
    const data = await response.json();
    const response2 = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/lineup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': GetIdToken()         
        },
        body: JSON.stringify({
            'operation': 'remove_multiple',
            'players': players
        })
    });
    const data2 = await response2.json();    
    return [data, data2];
}
/**
 * Retrieves the active user's lineup for the next round (i.e. not the round in progress)
 * @param {String} idToken 
 */
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
/**
 * Retrieves lineup information for a specific xrl team and round
 * @param {*} roundNumber 
 * @param {String} xrlTeam XRL team acronym
 */
export async function GetLineupByTeamAndRound(roundNumber, xrlTeam) {
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/lineup?team=' + xrlTeam + '&round=' + roundNumber, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    });
    const data = await response.json();
    return data;
}
/**
 * Sets the active user's lineup for the next round
 * @param {String} idToken 
 * @param {Array} players An array of player lineup entries
 */
export async function SetLineup(idToken, players) {
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/lineup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': idToken         
        },
        body: JSON.stringify({
            'operation': 'set',
            'players': JSON.stringify(players)
        })
    });
    const data = await response.json();
    return data;
}
/**
 * Retrieves all data from rounds table. Each round has status boolean properties and a fixtures property with an array of matches.
 */
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
/**
 * Retrieves specific round information, including status and fixtures.
 * @param {*} roundNumber 
 */
export async function GetRoundInfo(roundNumber) {
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/fixtures?round=' + roundNumber, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'        
        }
    });
    const data = await response.json();
    return data;
}
/**
 * Calls GetAllFixtures and then identifies and returns current active round.
 */
export async function GetCurrentRoundInfo() {
    const rounds = await GetAllFixtures();
    let activeRounds = rounds.filter(r => r.active);
    let roundNumbers = activeRounds.map(r => r.round_number);
    let currentRoundNumber = Math.max(...roundNumbers);
    let currentRound = rounds.find(r => r.round_number == currentRoundNumber);
    return currentRound;
}
/**
 * Retrieves current active round number from 'round' cookie and passes that to GetRoundInfo, returning data.
 */
export async function GetRoundInfoFromCookie() {
    let data = await GetRoundInfo(getCookie('round'));
    return data; 
}
/**
 * Calls GetAllFixtures and then identifies and returns next round, i.e. the next round not in progress or completed.
 */
export async function GetNextRoundInfo() {
    const rounds = await GetAllFixtures();
    let notInProgressRounds = rounds.filter(r => !r.in_progress);
    let roundNumbers = notInProgressRounds.map(r => r.round_number);
    let nextRoundNumber = Math.min(...roundNumbers);
    let nextRound = rounds.find(r => r.round_number == nextRoundNumber);
    return nextRound;
}
/**
 * Calls the GetStats lambda to scan the entire stats table.
 */
export async function GetAllStats() {
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/stats', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'        
        }
    });
    const data = await response.json();
    return data;
}
/**
 * Retrieves a round's stats from the database
 * @param {String} roundNumber 
 */
export async function GetStatsByRound(roundNumber) {
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/stats?round=' + roundNumber, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'        
        }
    });
    const data = await response.json();
    return data;
}
/**
 * Retrieves a single stat entry from the database
 * @param {String} playerId 
 * @param {String} roundNumber 
 */
export async function GetPlayerAppearanceStats(playerId, roundNumber) {
    try {
        const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/stats?playerId=' + playerId + '&round=' + roundNumber, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'        
            }
        });
        const data = await response.json();
        return data;
    } catch (err) {
        return undefined;
    }
}

export async function UpdateUserWaiverPreferences(username, preferences, provisionalDrop) {
    await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/waivers', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'        
        },
        body: JSON.stringify({
            'operation': 'update_preferences',
            'preferences': preferences,
            'provisional_drop': provisionalDrop
        })
    });
    const data = await response.json();
    return data;
}

export async function GetTransferHistory(roundNumber) {
    await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/waivers', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'        
        }
    });
    const data = await response.json();
    return data;
}

/**
 * Isolates the desired cookie from the browser cookie string
 * @param {String} cname 
 */
export function getCookie(cname) {
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
