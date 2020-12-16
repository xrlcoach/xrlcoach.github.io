import { GetIdToken, GetPlayersFromXrlTeam, GetUserInfo } from './ApiFetch.js';
import { PopulatePlayerTable } from './squads.js';
var idToken = GetIdToken();
if (!idToken) {
    window.location.replace('login.html');
}

let user;

GetActiveUserInfo(idToken)    
    .then((data) => {   
        user = data;     
        document.getElementById('userData').innerText = JSON.stringify(data);
    })
    .catch((error) => {
        document.getElementById('feedback').innerText = error;
    })

GetPlayersFromXrlTeam(user.team_short)
    .then((data) => {
        if (data.length < 18) {
            document.getElementById('playerCountMessage').innerText = `Your squad only has ${data.length} players. You should pick more!`;
            document.getElementById('pickPlayersLink').hidden = false;
        }
        PopulatePlayerTable(data);
    })
