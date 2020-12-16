import { GetIdToken, GetPlayersFromXrlTeam, GetActiveUserInfo } from './ApiFetch.js';
import { PopulatePickPlayerTable } from './Tables.js';

var idToken = GetIdToken();
if (!idToken) {
    window.location.replace('login.html');
}

GetActiveUserInfo(idToken)
    .then((user) => {        
        document.getElementById('userData').innerText = JSON.stringify(user);
        GetPlayersFromXrlTeam(user.team_short)
            .then((playerSquad) => {
                if (playerSquad.length < 18) {
                    document.getElementById('playerCountMessage').innerText = `Your squad only has ${playerSquad.length} players. You should pick more!`;
                    document.getElementById('pickPlayersLink').hidden = false;
                }
                PopulatePickPlayerTable(playerSquad, user.team_short, 'playerSquadTable');
            });
    })
    .catch((error) => {
        document.getElementById('feedback').innerText += error;
    });



