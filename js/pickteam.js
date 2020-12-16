import { GetAllPlayers, GetIdToken, GetPlayersFromNrlClub, GetPlayersFromXrlTeam, GetActiveUserInfo } from "./ApiFetch.js";
import { PopulatePickPlayerTable } from './Tables.js';

const idToken = GetIdToken();
if (!idToken) {
    window.location.replace('login.html');
}

GetActiveUserInfo(idToken)
    .then((user) => {
        DisplayPlayerCounts(user.team_short)
            .then(
                GetAllPlayers()
                    .then((data) => {
                        PopulatePickPlayerTable(data, user.team_short, 'pickPlayerTable');
                    })
            )
    })
    .catch((error) => document.getElementById('feedback').innerHTML = error);  


function selectNrlClub(event) {
    event.preventDefault();
    club = document.getElementById('nrlClubSelect').value;
    document.getElementById('squadName').innerText = club;
    GetPlayersFromNrlClub(club)
        .then((data) => {
            PopulatePickPlayerTable(data, user.team_short, 'pickPlayerTable');
        })
        .catch((error) => {
            document.getElementById('feedback').innerText = error;
        })
}

function DisplayPlayerCounts(xrlTeam) {
    GetPlayersFromXrlTeam(xrlTeam)
        .then((data) => {
            var totalPlayers = data.length;
            var backs = data.filter(p => p.position == 'Back' || p.position2 == 'Back').length
            var forwards = data.filter(p => p.position == 'Forward' || p.position2 == 'Forward').length
            var playmakers = data.filter(p => p.position == 'Playmaker' || p.position2 == 'Playmaker').length
            document.getElementById('playerCountMessage').innerText =
                `You currently have ${totalPlayers} in your squad. You need ${18 - totalPlayers} more in total.`
            if (backs.length < 5) {
                document.getElementById('playerCountBreakdown').innerHTML +=
                    `<li>You need at least ${5 - backs.length} more backs.`
            }
            if (forwards.length < 5) {
                document.getElementById('playerCountBreakdown').innerHTML +=
                    `<li>You need at least ${5 - forwards.length} more forwards.`
            }
            if (playmakers.length < 3) {
                document.getElementById('playerCountBreakdown').innerHTML +=
                    `<li>You need at least ${3 - playmakers.length} more playmakers.`
            }
        })
        .catch((error) => {
            document.getElementById('feedback').innerText = error;
        })
}