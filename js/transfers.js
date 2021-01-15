import { GetActiveUserTeamShort, GetAllUsers, getCookie, GetPlayerById, GetPlayersFromXrlTeam, GetTransferHistory, GetUserTradeOffers, ProcessTradeOffer, SendTradeOffer, UpdateUserWaiverPreferences } from "./ApiFetch.js";
import { DisplayFeedback } from "./Helpers.js";

let roundNumber, allUsers, user, squad, waiverPreferences = [], provisionalDrop, tradeOffers, transferHistory;
let tradeTarget, targetPlayers, playersOffered = [], playersRequested = [], powerplaysOffered = 0, powerplaysWanted = 0;

window.onload = async () => {
    try {
        roundNumber = getCookie('round');
        allUsers = await GetAllUsers();
        user = allUsers.find(u => u.team_short == GetActiveUserTeamShort());
        squad = await GetPlayersFromXrlTeam(user.team_short);
        for (let playerId of user.waiver_preferences) {
            waiverPreferences.push(await GetPlayerById(playerId));
        };
        provisionalDrop = user.provisional_drop;
        tradeOffers = await GetUserTradeOffers(user.username);
        transferHistory = await GetTransferHistory();
        DisplayUserWaiverInfo();
        DisplayTradeOffers();
        DisplayTransferHistory(transferHistory.filter(t => t.round_number == roundNumber).sort((t1, t2) => {
            return new Date(t2.datetime) - new Date(t1.datetime);
        }));
        document.getElementById('loading').hidden = true;
        document.getElementById('mainContent').hidden = false;
    } catch (err) {
        DisplayFeedback(err, err.stack);
    }
}

function DisplayUserWaiverInfo() {
    document.getElementById('teamWaiverRank').innerText = user.waiver_rank;
    PopulateWaiverPreferencesTable();
    PopulateProvisionalDropOptions();
}

function DisplayTradeOffers() {
    let tradeBody = document.getElementById('tradeOffersBody');
    if (tradeOffers.length == 0) {
        tradeBody.innerText = 'No active trade offers.';
        return;
    }
    for (let offer of tradeOffers) {
        let offeredBy = allUsers.find(u => u.username == offer.offered_by);
        let offeredTo = allUsers.find(u => u.username == offer.offered_to);
        let offerDisplay = document.createElement('div');
        let offerContent = document.createElement('p');
        let offerTime = document.createElement('span');
        offerTime.className = 'mx-2';
        offerTime.innerText = 'Date: ' + new Date(offer.datetime).toLocaleDateString();
        offerContent.appendChild(offerTime);
        let offerStatus = document.createElement('span');
        offerStatus.className = 'mx-2';
        offerStatus.innerText = 'Status: ' + offer.status;
        offerContent.appendChild(offerStatus);
        let offerText = document.createElement('span');
        offerText.className = 'mx-2';
        if (offer.status == 'Pending') {
            offerDisplay.className = 'alert alert-warning';
            if (offer.offered_by == user.username) {
                offerText.innerText = 'Waiting on a response from ' + offeredTo.team_name + '.';
            } else {
                offerText.innerText = offeredBy.team_name + ' offered you a trade.';
            }
        }
        else if (offer.status == 'Accepted') {
            offerDisplay.className = 'alert alert-success';
            if (offer.offered_by == user.username) {
                offerText.innerText = offeredTo.team_name + ' accepted your trade offer.';
            } else {
                offerText.innerText = 'You accepted a trade offer from ' + offeredBy.team_name + '.';
            }
        }
        else if (offer.status == 'Rejected') {
            offerDisplay.className = 'alert alert-danger';
            if (offer.offered_by == user.username) {
                offerText.innerText = offeredTo.team_name + ' rejected your generous trade offer.';
            } else {
                offerText.innerText = 'You rejected an insulting trade offer from ' + offeredBy.team_name + '.';
            }
        }
        offerContent.appendChild(offerText);
        let viewButton = document.createElement('button');
        viewButton.className = 'btn btn-success mx-2';
        viewButton.value = offer.offer_id;
        viewButton.innerText = 'View';
        viewButton.onclick = function() {
            DisplayOfferDetails(this.value);
        }
    }

}

function PopulateWaiverPreferencesTable() {
    let table = document.getElementById('waiverPreferencesTable');
    table.innerHTML = '';
    for (let i in waiverPreferences) {
        let player = waiverPreferences[i];
        let row = document.createElement('tr');
        let rank = document.createElement('td');
        rank.innerText = Number(i) + 1;
        row.appendChild(rank);
        let name = document.createElement('td');
        let logo = document.createElement('img');
        logo.src = '/static/' + player.nrl_club + '.svg';
        logo.height = '40';
        logo.className = 'me-1';
        name.appendChild(logo);
        let span = document.createElement('span');
        span.innerText = player.player_name;
        name.appendChild(span);
        row.appendChild(name);
        let arrows = document.createElement('td');
        let upArrow = document.createElement('button');
        upArrow.className = "btn btn-success";
        upArrow.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-up" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5z"/>
            </svg>`;
        upArrow.value = player.player_id;
        upArrow.onclick = function () {
            changePlayerPreferenceRank(this.value, -1);
        }
        if (Number(i) != 0) arrows.appendChild(upArrow);
        let downArrow = document.createElement('button');
        downArrow.className = "btn btn-success ms-2";
        downArrow.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-down" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z"/>
            </svg>`;
        downArrow.value = player.player_id;
        downArrow.onclick = function () {
            changePlayerPreferenceRank(this.value, 1);
        }
        if (Number(i) != waiverPreferences.length - 1) arrows.appendChild(downArrow);
        let cancel = document.createElement('button');
        cancel.className = 'btn-close btn-close-white ms-2';
        cancel.value = player.player_id;
        cancel.onclick = function() {
            changePlayerPreferenceRank(this.value, 0);
        }
        arrows.appendChild(cancel);
        row.appendChild(arrows);
        table.appendChild(row);
    }
}

function PopulateProvisionalDropOptions() {
    let select = document.getElementById('provisionalDrop');
    select.onchange = () => document.getElementById('confirmChanges').hidden = false;
    for (let player of squad) {
        let option = document.createElement('option');
        option.innerText = player.player_name;
        option.value = player.player_id;
        if (player.player_id == provisionalDrop) option.selected = 'selected';
        select.appendChild(option);
    }
}

async function DisplayTransferHistory(transfers) {
    let table = document.getElementById('transferHistoryTable');
    table.innerHTML = '';
    for (let t of transfers) {
        let player = await GetPlayerById(t.player_id);
        let row = document.createElement('tr');
        let datetime = document.createElement('td');
        datetime.innerText = t.datetime;
        row.appendChild(datetime);
        let team = document.createElement('td');
        team.innerText = allUsers.find(u => u.username == t.user).team_name;
        row.appendChild(team);
        let type = document.createElement('td');
        if (t.type == 'Drop') {
            type.innerText = 'DROPPED';
            type.style.color = '#c94d38';
        } else {
            type.innerText = 'SIGNED';
            type.style.color = 'green';
        } 
        row.appendChild(type);
        let name = document.createElement('td');
        let span = document.createElement('span');
        span.innerText = player.player_name;
        name.appendChild(span);
        let logo = document.createElement('img');
        logo.src = '/static/' + player.nrl_club + '.svg';
        logo.height = '40';
        name.appendChild(logo);
        row.appendChild(name);
        let description = document.createElement('td');
        if (t.type == 'Scoop') description.innerText = 'on a free transfer.';
        if (t.type == 'Waiver') description.innerText = 'on a waiver.';
        if (t.type == 'Trade') description.innerText = 'from ' + t.seller;
        row.appendChild(description);
        table.appendChild(row);
    }
}

function changePlayerPreferenceRank(playerId, increment) {
    let playerIndex = waiverPreferences.findIndex(p => p.player_id == playerId);
    let removedPlayer = waiverPreferences.splice(playerIndex, 1)[0];
    if (increment != 0) waiverPreferences.splice(playerIndex + increment, 0, removedPlayer);
    PopulateWaiverPreferencesTable();
    document.getElementById('confirmChanges').hidden = false;
}

async function submitWaiverPreferences() {
    let preferences = waiverPreferences.map(p => p.player_id);
    provisionalDrop = document.getElementById('provisionalDrop').value;
    let resp = await UpdateUserWaiverPreferences(user.username, preferences, provisionalDrop);
    if (resp.error) {
        DisplayFeedback('Error', resp.error);
    } else {
        DisplayFeedback('Success', 'Waiver preferences updated', true, function() {location.reload()}, false);
    }
}
window.submitWaiverPreferences = submitWaiverPreferences;

async function DisplayOfferDetails(offerId) {
    let tradeInfoModal = new bootstrap.Modal(document.getElementById('tradeInfo'));
    let offer = tradeOffers.find(t => t.offer_id == offerId);
    let offeredBy = allUsers.find(u => u.username == offer.offered_by);
    let offeredTo = allUsers.find(u => u.username == offer.offered_to);
    let userOffer = offeredBy.username == user.username;
    document.getElementById('tradeInfoOfferedBy').innerText = offered_by.team_name;
    document.getElementById('tradeInfoStatus').innerText = offer.status;
    document.getElementById('tradeInfoStatus').style.color = offer.status == 'Accepted' ? 'green' : offer.status == 'Rejected' ? '#c94d38' : '';
    document.getElementById('tradeInfoOfferedByShort').innerText = offeredBy.team_short;
    document.getElementById('tradeInfoOfferedToShort').innerText = offeredTo.team_short;
    for (let id of offer.players_offered) {
        let player = userOffer ? squad.find(p => p.player_id == id) : await GetPlayerById(id);
        let li = document.createElement('li');
        li.innerText = player.player_name;
        document.getElementById('trafeInfoOfferedPlayers').appendChild(li);
    }
    for (let id of offer.players_wanted) {
        let player = userOffer ? await GetPlayerById(id) : squad.find(p => p.player_id == id);
        let li = document.createElement('li');
        li.innerText = player.player_name;
        document.getElementById('trafeInfoWantedPlayers').appendChild(li);
    }
    document.getElementById('tradeInfoOfferedPowerplays').innerText = offer.powerplays_offered;
    document.getElementById('tradeInfoWantedPowerplays').innerText = offer.powerplays_wanted;
    if (offer.status == 'Pending') {
        document.getElementById('tradeInfoFooter').hidden = false;
        let reject = document.getElementById('tradeInfoRejectButton');
        acceptButton.onclick = async function() {
            await ProcessTradeOffer(offer.offer_id, false);
            DisplayFeedback('Rejected', 'Trade offer rejected.', true, function() {location.reload()});
        }
        let acceptButton = document.getElementById('tradeInfoAcceptButton');
        acceptButton.onclick = function() {
            DisplayFeedback('Confirm', 'Are you sure you want to accept this trade offer?', true, async function() {
                await ProcessTradeOffer(offer.offer_id, true);
                DisplayFeedback('Success', 'Trade completed!', true, function() {location.reload()});
            }, true);
        };
    } else {
        document.getElementById('tradeInfoFooter').hidden = true;
    }
    tradeInfoModal.show();
}

function DisplayTradeForm() {
    let tradeForm = new bootstrap.Modal(document.getElementById('tradeForm'));
    allUsers.forEach(u => {
        let li = document.createElement('li');
        let option = document.createElement('a');
        option.className = 'dropdown-item';
        option.href = '#';
        option.value = u.team_short;
        option.onclick = async function() {
            tradeTarget = u;
            await populatePlayerRequestOptions(this.value);
        }
        li.appendChild(option);
        document.getElementById('xrlTeamSelect').appendChild(li);
    });
    squad.forEach(p => {
        let option = document.createElement('option');
        option.value = p.player_id;
        option.innerText = p.player_name;
        document.getElementById('tradeFormOfferPlayersSelect').appendChild(option);
    });
    populateOfferFields();
}
window.DisplayTradeForm = DisplayTradeForm;

async function populatePlayerRequestOptions(team_short) {
    targetPlayers = await GetPlayersFromXrlTeam(team_short);
    document.getElementById('tradeFormRequestPlayersSelect').innerHTML = '';
    playersToRequest.forEach(p => {
        let option = document.createElement('option');
        option.value = p.player_id;
        option.innerText = p.player_name;
        document.getElementById('tradeFormRequestPlayersSelect').appendChild(option);
    });
}

function populateOfferFields() {
    playersOffered.forEach((p, i) => {
        let li = document.createElement('li');
        let name = document.createElement('span');
        name.innerText = p.player_name;
        li.appendChild(name);
        let remove = document.createElement('button');
        remove.className = 'btn btn-close mx-1';
        remove.value = i;
        remove.onclick = function() {
            playersOffered.splice(this.value, 1);
            populateOfferFields();
        }
        li.appendChild(remove);
        document.getElementById('trafeFormOfferedPlayers').appendChild(li);
    });
    playersRequested.forEach((p, i) => {
        let li = document.createElement('li');
        let name = document.createElement('span');
        name.innerText = p.player_name;
        li.appendChild(name);
        let remove = document.createElement('button');
        remove.className = 'btn btn-close mx-1';
        remove.value = i;
        remove.onclick = function() {
            playersRequested.splice(this.value, 1);
            populateOfferFields();
        }
        li.appendChild(remove);
        document.getElementById('trafeFormWantedPlayers').appendChild(li);
    });
    document.getElementById('tradeFormOfferedPowerplays').innerText = powerplaysOffered;
    document.getElementById('tradeFormWantedPowerplays').innerText = powerplaysWanted;
}

function addPlayerToPlayersOffered() {
    playersOffered.push(squad.find(p => p.player_id == document.getElementById('tradeFormOfferPlayersSelect').value));
    populateOfferFields();
}
window.addPlayerToPlayersOffered = addPlayerToPlayersOffered;
function addPlayerToPlayersRequested() {
    playersRequested.push(targetPlayers.find(p => p.player_id == document.getElementById('tradeFormRequestPlayersSelect').value));
    populateOfferFields();
}
window.addPlayerToPlayersRequested = addPlayerToPlayersRequested;
function addPowerplayToOffer() {
    if (powerplaysOffered == user.powerplays) {
        DisplayFeedback('Sorry', "You don't have any more powerplays to offer.");
        return;
    }
    powerplaysOffered += 1;
    populateOfferFields();
}
window.addPowerplayToOffer = addPowerplayToOffer;
function addPowerplayToRequest() {
    if (powerplaysWanted == tradeTarget.powerplays) {
        DisplayFeedback('Sorry', tradeTarget.team_name + " doesn't have any more powerplays to offer.");
        return;
    }
    powerplaysWanted += 1;
    populateOfferFields();
}
window.addPowerplayToRequest = addPowerplayToRequest;
function removePowerplaysOffered() {
    powerplaysOffered = 0;
    populateOfferFields();
}
window.removePowerplaysOffered = removePowerplaysOffered;
function removePowerplaysRequested() {
    powerplaysWanted = 0;
    populateOfferFields();
}
window.removePowerplaysRequested = removePowerplaysRequested;

function SubmitTradeOffer() {
    DisplayFeedback('Confirm', 'Are you sure you want to send this trade ofer to ' + tradeTarget.team_name + '?',
    true, async function() {
        await SendTradeOffer(user.username, tradeTarget.username,
            playersOffered.map(p => p.player_id), playersRequested.map(p => p.player_id),
            powerplaysOffered, powerplaysWanted);
        DisplayFeedback('Success', 'Trade offer sent.', true, null, false);
    })
}
window.SubmitTradeOffer = SubmitTradeOffer;