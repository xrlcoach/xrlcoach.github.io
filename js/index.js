import { GetIdToken, GetPlayersFromXrlTeam, GetActiveUserInfo } from './ApiFetch.js';
import { PopulatePickPlayerTable } from './Tables.js';

var idToken = GetIdToken();
if (!idToken) {
    window.location.replace('login.html');
}

let user;

GetActiveUserInfo(idToken)
    .then((data) => {
        user = data;
        document.getElementById('userData').innerText = JSON.stringify(user);
    });

GetPlayersFromXrlTeam(user.team_short)
    .then((playerSquad) => {
        if (playerSquad.length < 18) {
            document.getElementById('playerCountMessage').innerText = `Your squad only has ${playerSquad.length} players. You should pick more!`;
            document.getElementById('pickPlayersLink').hidden = false;
        }
        PopulatePickPlayerTable(playerSquad, user.team_short, 'playerSquadTable');
    });

