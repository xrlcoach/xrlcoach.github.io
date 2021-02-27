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
    const data = await response.json();
    if (data.error) {
        throw data.error;
    }
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
    if (data.error) {
        throw data.error;
    }
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
        },
        body: JSON.stringify({
            'operation': 'get_user'
        })
    });
    const data = await response.json();
    if (data.error) {
        throw data.error;
    }
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
    if (data.error) {
        throw data.error;
    }
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
    if (data.error) {
        throw data.error;
    }
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
    if (data.error) {
        throw data.error;
    }
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
    if (data.error) {
        throw data.error;
    }
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
 * Used to pick one or more players
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
    if (data.error) {
        throw data.error;
    }
    sessionStorage.removeItem('userSquad');
    return data;
}
/**
 * Used to drop one or more players from a user's squad
 * @param {String} xrlTeam XRL team acronym
 * @param {Array} players An array of player objects
 */
export async function DropPlayers(xrlTeam, players) {
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/players', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'        
        },
        body: JSON.stringify({
            "operation": "drop",
            "players": players,
            "xrl_team": xrlTeam
        })
    });
    const data = await response.json();
    if (data.error) {
        throw data.error;
    }
    sessionStorage.removeItem('userSquad');
    // const response2 = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/lineup', {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/json',
    //         'Authorization': GetIdToken()         
    //     },
    //     body: JSON.stringify({
    //         'operation': 'remove_multiple',
    //         'players': players
    //     })
    // });
    // const data2 = await response2.json();  
    // if (data2.error) {
    //     DisplayFeedback('Error', data.error);
    // }  
    return data;
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
    if (data.error) {
        throw data.error;
    }
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
    if (data.error) {
        throw data.error;
    }
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
    if (data.error) {
        throw data.error;
    }
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
    if (data.error) {
        throw data.error;
    }
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
    if (data.error) {
        throw data.error;
    }
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
 * Retrieves the current active round's status, without fixtures
 */
export async function GetCurrentRoundStatus() {
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/fixtures', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'        
        },
        body: JSON.stringify({
            'operation': 'get_current_round'
        })
    });
    const data = await response.json();
    if (data.error) {
        throw data.error;
    }
    return data; 
}

/**
 * Retrieves the next round (i.e. not yet in progress)
 */
export async function GetNextRoundStatus() {
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/fixtures', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'        
        },
        body: JSON.stringify({
            'operation': 'get_next_round'
        })
    });
    const data = await response.json();
    if (data.error) {
        throw data.error;
    }
    return data; 
}

/**
 * Retrieves the status info for a particular round
 */
export async function GetRoundStatus(roundNumber) {
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/fixtures', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'        
        },
        body: JSON.stringify({
            'operation': 'get_round_status',
            'round_number': roundNumber
        })
    });
    const data = await response.json();
    if (data.error) {
        throw data.error;
    }
    return data; 
}

/**
 * Retrieves current active round number from 'round' cookie and passes that to GetRoundInfo, returning data.
 */
export async function GetRoundInfoFromCookie() {
    let data = await GetRoundInfo(getCookie('round'));
    return data; 
}

/**
 * Retrieves the current round number (as a Number) from the browser cookie set at login.
 */
export function GetCurrentRoundNumber() {
    return Number(getCookie('round'));
}

/**
 * Retrieves an XRL team's fixture for a given round
 * @param {String} xrlTeam The XRL team acronym
 * @param {String} roundNumber The round number to find the fixture for
 */
export async function GetTeamFixtureByRound(xrlTeam, roundNumber) {
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/fixtures', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'        
        },
        body: JSON.stringify({
            'operation': 'get_user_fixture',
            'round_number': roundNumber,
            'team_short': xrlTeam
        })
    });
    const data = await response.json();
    if (data.error) {
        throw data.error;
    }
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
    if (data.error) {
        throw data.error;
    }
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
    if (data.error) {
        throw data.error;
    }
    return data;
}
/**
 * Retrieves a club's stats from a particular round from the database
 * @param {String} roundNumber 
 */
export async function GetStatsByClubAndRound(roundNumber, nrlClub) {
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/stats?round=' + roundNumber + '&nrlClub=' + nrlClub, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'        
        }
    });
    const data = await response.json();
    if (data.error) {
        throw data.error;
    }
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
        if (data.error) {
            if (data.error = "'Item'") {
                return undefined;
            }
        }
        return data;
    } catch (err) {
        return undefined;
    }
}

/**
 * Update's a user's preferences for players to pick up during the next waiver round.
 * @param {String} username User to update
 * @param {String[]} preferences An array of player IDs
 * @param {String} provisionalDrop The ID of the player to drop if a user needs to make room in their squad
 */
export async function UpdateUserWaiverPreferences(username, preferences, provisionalDrop) {
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/transfers', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'        
        },
        body: JSON.stringify({
            'operation': 'update_preferences',
            'username': username,
            'preferences': preferences,
            'provisional_drop': provisionalDrop
        })
    });
    const data = await response.json();
    if (data.error) {
        throw data.error;
    }
    sessionStorage.removeItem('activeUser');
    return data;
}

/**
 * Retrieves transfer records for the entire season
 */
export async function GetTransferHistory() {
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/transfers', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'        
        }
    });
    const data = await response.json();
    if (data.error) {
        throw data.error;
    }
    return data;
}

/**
 * Retrieves transfer records for a particular round
 * @param {Number} roundNumber 
 */
export async function GetTransferHistoryByRound(roundNumber) {
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/transfers', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'        
        },
        body: JSON.stringify({
            'operation': 'get_round_transfers',
            'round_number': roundNumber            
        })
    });
    const data = await response.json();
    if (data.error) {
        throw data.error;
    }
    return data;
}

/**
 * Records a trade offer and sends message to target user's inbox
 * @param {String} sendingUsername The user making the trade offer
 * @param {String} targetUsername The user to make the offer to 
 * @param {String[]} playersOffered An array of player IDs
 * @param {String[]} playersWanted An array of player IDs
 * @param {Number} powerplaysOffered The number of powerplays being offered
 * @param {Number} powerplaysWanted The number of powerplays being requested
 */
export async function SendTradeOffer(sendingUsername, targetUsername, playersOffered, playersWanted, powerplaysOffered = 0, powerplaysWanted = 0) {
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/transfers', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'        
        },
        body: JSON.stringify({
            'operation': 'trade_offer',
            'offered_by': sendingUsername,
            'offered_to': targetUsername,
            'players_offered': playersOffered,
            'players_wanted': playersWanted,
            'powerplays_offered': powerplaysOffered,
            'powerplays_wanted': powerplaysWanted
        })
    });
    const data = await response.json();
    if (data.error) {
        throw data.error;
    }
    return data; 
}

/**
 * Retrieves all trade offers involving the specific user
 * @param {String} username 
 */
export async function GetUserTradeOffers(username) {
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/transfers', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'        
        },
        body: JSON.stringify({
            'operation': 'get_user_offers',
            'username': username
        })
    });
    const data = await response.json();
    if (data.error) {
        throw data.error;
    }
    return data;
}

/**
 * Resolves a trade offer by either processing or rejecting
 * @param {String} offerPk The primary key of the offer record
 * @param {Boolean} accepted Whether the offer is being accepted or rejected
 */
export async function ProcessTradeOffer(offerPk, accepted = false) {
    let outcome = accepted ? 'Accepted': 'Rejected';
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/transfers', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'        
        },
        body: JSON.stringify({
            'operation': 'process_trade',
            'offer_id': offerPk,
            'outcome': outcome
        })
    });
    const data = await response.json();
    if (data.error) {
        throw data.error;
    }
    if (accepted) {
        sessionStorage.removeItem('userSquad');
        sessionStorage.removeItem('activeUser');
    }
    return data;
}

/**
 * Withdraws a trade offer made by the active user
 * @param {String} offerPk The primary key of the offer record
 */
export async function WithdrawTradeOffer(offerPk) {
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/transfers', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'        
        },
        body: JSON.stringify({
            'operation': 'withdraw_trade',
            'offer_id': offerPk
        })
    });
    const data = await response.json();
    if (data.error) {
        throw data.error;
    }
    return data;
}

/**
 * Update's a user's inbox
 * @param {String} username The user to update
 * @param {Object[]} inbox The updated inbox
 */
export async function UpdateUserInbox(username, inbox) {
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/xrl-users', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'        
        },
        body: JSON.stringify({
            'operation': 'update_inbox',
            'username': username,
            'inbox': inbox
        })
    });
    const data = await response.json();
    if (data.error) {
        throw data.error;
    }
    sessionStorage.removeItem('activeUser');
    return data;
}

/**
 * Retrieves all waiver reports
 */
export async function GetWaiverReports() {
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/transfers', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'        
        },
        body: JSON.stringify({
            'operation': 'get_waiver_reports'
        })
    });
    const data = await response.json();
    if (data.error) {
        throw data.error;
    }
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
