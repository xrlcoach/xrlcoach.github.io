import { GetIdToken, GetPlayersFromXrlTeam, GetActiveUserInfo } from './ApiFetch.js';
import { PopulatePickPlayerTable } from './Tables.js';

var idToken = GetIdToken();
if (!idToken) {
    window.location.replace('login.html');
}

const user = GetActiveUserInfo(idToken);
document.getElementById('userData').innerText = JSON.stringify(user);

const playerSquad = GetPlayersFromXrlTeam(user.team_short);
if (data.length < 18) {
    document.getElementById('playerCountMessage').innerText = `Your squad only has ${data.length} players. You should pick more!`;
    document.getElementById('pickPlayersLink').hidden = false;
}
PopulatePickPlayerTable(playerSquad, user.team_short);


