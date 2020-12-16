import { GetAllPlayers, GetPlayersFromNrlClub } from "./ApiFetch.js";
import { PopulatePlayerTable } from './Tables.js'

GetAllPlayers()
    .then((data) => {
        PopulatePlayerTable(data, 'squadTable')
    })
    .catch((error) => {
        document.getElementById('feedback').innerText += error;
    });


function selectNrlClub(event) {
    event.preventDefault();
    club = document.getElementById('nrlClubSelect').value;
    document.getElementById('squadName').innerText = club;
    GetPlayersFromNrlClub(club)
        .then((data) => {
            PopulatePlayerTable(data, 'squadTable');
        })
        .catch((error) => {
            document.getElementById('feedback').innerText += error;
        })
}
