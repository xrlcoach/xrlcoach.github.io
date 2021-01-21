import { GetActiveUserTeamShort, GetAllUsers, getCookie, GetPlayerById, GetPlayersFromXrlTeam, GetTransferHistory, GetUserTradeOffers, GetWaiverReports, ProcessTradeOffer, SendTradeOffer, UpdateUserWaiverPreferences, WithdrawTradeOffer } from "./ApiFetch.js";
import { DisplayFeedback } from "./Helpers.js";

let roundNumber, allUsers, user, squad, waiverPreferences = [], provisionalDrop, tradeOffers, tradeOffersToDisplay, transferHistory, waiverReports;
let tradeTarget, targetPlayers, playersOffered = [], playersRequested = [], powerplaysOffered = 0, powerplaysWanted = 0;

window.onload = async () => {
    try {
        roundNumber = getCookie('round');
        allUsers = await GetAllUsers();
        user = allUsers.find(u => u.team_short == GetActiveUserTeamShort());
        squad = await GetPlayersFromXrlTeam(user.team_short);
        waiverReports = await GetWaiverReports();
        waiverReports = waiverReports.sort((r1, r2) => {
            let r1r = Number(r1.waiver_round.split('_')[0]);
            let r2r = Number(r2.waiver_round.split('_')[0]);
            let r1i = Number(r1.waiver_round.split('_')[1]);
            let r2i = Number(r2.waiver_round.split('_')[1]);
            if (r1r == r2r) return r2i - r1i;
            return r2r - r1r;
        })
        for (let report of waiverReports) {
            let r = report.waiver_round.split('_')[0];
            let i = report.waiver_round.split('_')[1];
            let linkText = `Round ${r} - ${i}`;
            let li = document.createElement('li');
            let a = document.createElement('a');
            a.className = "dropdown-item";
            a.href = '#/';
            a.innerText = linkText;
            a.value = report.waiver_round;
            a.onclick = function() {
                DisplayWaiverReport(waiverReports.find(rep => rep.waiver_round == this.value));
            };
            li.appendChild(a);
            document.getElementById('waiverReportSelect').appendChild(li);
        }
        for (let playerId of user.waiver_preferences) {
            waiverPreferences.push(await GetPlayerById(playerId));
        };
        provisionalDrop = user.provisional_drop;
        tradeOffers = await GetUserTradeOffers(user.username);
        let today = new Date();
        tradeOffersToDisplay = tradeOffers.filter(t => {
            let transferDate = new Date(t.datetime);
            let dayDiff = (today.getTime() - transferDate.getTime()) / (1000 * 3600 * 24);
            return dayDiff < 14;
        }).sort((t1, t2) => new Date(t2.datetime) - new Date(t1.datetime));
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
    for (let offer of tradeOffersToDisplay) {
        let offeredBy = allUsers.find(u => u.username == offer.offered_by);
        let offeredTo = allUsers.find(u => u.username == offer.offered_to);
        let offerDisplay = document.createElement('div');
        let row = document.createElement('div');
        row.className = 'row';
        let offerTime = document.createElement('div');
        offerTime.className = 'col-lg-3';
        offerTime.innerText = 'Date: ' + new Date(offer.datetime).toDateString();
        row.appendChild(offerTime);
        let offerText = document.createElement('div');
        offerText.className = 'col-lg';
        if (offer.offer_status == 'Pending') {
            offerDisplay.className = 'alert alert-warning';
            if (offer.offered_by == user.username) {
                offerText.innerText = 'You offered a trade to ' + offeredTo.team_name + '.';
            } else {
                offerText.innerText = offeredBy.team_name + ' offered you a trade.';
            }
        }
        else if (offer.offer_status == 'Accepted') {
            offerDisplay.className = 'alert alert-success';
            if (offer.offered_by == user.username) {
                offerText.innerText = offeredTo.team_name + ' accepted your trade offer.';
            } else {
                offerText.innerText = 'You accepted a trade offer from ' + offeredBy.team_name + '.';
            }
        }
        else if (offer.offer_status == 'Rejected') {
            offerDisplay.className = 'alert alert-danger';
            if (offer.offered_by == user.username) {
                offerText.innerText = offeredTo.team_name + ' rejected your generous trade offer.';
            } else {
                offerText.innerText = 'You rejected an insulting trade offer from ' + offeredBy.team_name + '.';
            }
        }
        else if (offer.offer_status == 'Withdrawn') {
            offerDisplay.className = 'alert alert-danger';
            if (offer.offered_by == user.username) {
                offerText.innerText = 'Your trade offer to ' + offeredTo.team_name + ' has been withdrawn.';
            } else {
                offerText.innerText = 'The trade offer from ' + offeredBy.team_name + ' has been withdrawn.';
            }
        }
        row.appendChild(offerText);
        let offerStatus = document.createElement('div');
        offerStatus.className = 'col-lg-2';
        offerStatus.innerText = 'Status: ' + offer.offer_status;
        row.appendChild(offerStatus);
        let viewCol = document.createElement('div');
        viewCol.className = 'col-lg-2';
        let viewButton = document.createElement('button');
        viewButton.className = 'btn btn-success mx-2';
        viewButton.value = offer.offer_id;
        viewButton.innerText = 'View';
        viewButton.onclick = function() {
            DisplayOfferDetails(this.value);
        }
        viewCol.appendChild(viewButton);
        row.appendChild(viewCol);
        offerDisplay.appendChild(row);
        tradeBody.appendChild(offerDisplay);
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
        if (t.type == 'Trade') description.innerText = 'from ' + allUsers.find(u => u.username == t.seller).team_name;
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
    document.getElementById('tradeInfoOfferedBy').innerText = offeredBy.team_name;
    document.getElementById('tradeInfoStatus').innerText = offer.offer_status;
    document.getElementById('tradeInfoStatus').style.color = offer.offer_status == 'Accepted' ? 'green' : offer.offer_status == 'Rejected' ? '#c94d38' : '';
    // document.getElementById('tradeInfoOfferedByShort').innerText = offeredBy.team_short;
    // document.getElementById('tradeInfoOfferedToShort').innerText = offeredTo.team_short;
    document.getElementById('trafeInfoOfferedPlayers').innerHTML = '';
    for (let id of offer.players_offered) {
        let player = await GetPlayerById(id);
        let li = document.createElement('li');
        li.innerText = player.player_name;
        document.getElementById('trafeInfoOfferedPlayers').appendChild(li);
    }
    document.getElementById('trafeInfoWantedPlayers').innerHTML = '';
    for (let id of offer.players_wanted) {
        let player = await GetPlayerById(id);
        let li = document.createElement('li');
        li.innerText = player.player_name;
        document.getElementById('trafeInfoWantedPlayers').appendChild(li);
    }
    document.getElementById('tradeInfoOfferedPowerplays').innerText = offer.powerplays_offered;
    document.getElementById('tradeInfoWantedPowerplays').innerText = offer.powerplays_wanted;
    if (offer.offer_status == 'Pending') {
        let rejectButton = document.getElementById('tradeInfoRejectButton');
        let acceptButton = document.getElementById('tradeInfoAcceptButton');
        let withdrawButton = document.getElementById('tradeInfoWithdrawButton');
        if (user.username == offeredTo.username) {
            withdrawButton.hidden = true;
            document.getElementById('tradeInfoFooter').hidden = false;
            rejectButton.onclick = async function() {
                let data = await ProcessTradeOffer(offer.offer_id, false);
                if (data.error) {
                    DisplayFeedback('Error', data.error);
                    return;
                }
                DisplayFeedback('Rejected', 'Trade offer rejected.', true, function() {location.reload()}, false);
            }
            rejectButton.hidden = false;
            acceptButton.onclick = function() {
                DisplayFeedback('Confirm', 'Are you sure you want to accept this trade offer?', true, async function() {
                    let data = await ProcessTradeOffer(offer.offer_id, true);
                    if (data.error) {
                        DisplayFeedback('Error', data.error);
                        return;
                    }
                    DisplayFeedback('Success', 'Trade completed!', true, function() {location.reload()}, false);
                });
            };
            acceptButton.hidden = false;
        }
        else if (user.username == offeredBy.username) {
            document.getElementById('tradeInfoFooter').hidden = false;
            rejectButton.hidden = true;
            acceptButton.hidden = true;
            withdrawButton.onclick = function() {
                DisplayFeedback('Confirm', 'Are you sure you want to withdraw this trade offer?', true, async function() {
                    let data = await WithdrawTradeOffer(offer.offer_id);
                    if (data.error) {
                        DisplayFeedback('Error', data.error);
                        return;
                    }
                    DisplayFeedback('Success', 'Trade offer withdrawn.', true, function() {location.reload()}, false);
                });
            }
        }
    } else {
        document.getElementById('tradeInfoFooter').hidden = true;
    }
    tradeInfoModal.show();
}

function DisplayTradeForm() {
    let tradeForm = new bootstrap.Modal(document.getElementById('tradeForm'));
    document.getElementById('xrlTeamSelect').innerHTML = '';
    document.getElementById('tradeFormOfferPlayersSelect').innerHTML = '';
    allUsers.filter(u => u.username != user.username).forEach(u => {
        let li = document.createElement('li');
        let option = document.createElement('a');
        option.className = 'dropdown-item';
        option.href = '#';
        option.value = u.team_short;
        option.innerText = u.team_name;
        option.onclick = async function() {
            tradeTarget = allUsers.find(u1 => u1.team_short == this.value);
            document.getElementById('tradeFormTargetTeam').innerText = tradeTarget.team_name;
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
    tradeForm.show();
}
window.DisplayTradeForm = DisplayTradeForm;

async function populatePlayerRequestOptions(team_short) {
    targetPlayers = await GetPlayersFromXrlTeam(team_short);
    document.getElementById('tradeFormRequestPlayersSelect').innerHTML = '';
    targetPlayers.forEach(p => {
        let option = document.createElement('option');
        option.value = p.player_id;
        option.innerText = p.player_name;
        document.getElementById('tradeFormRequestPlayersSelect').appendChild(option);
    });
}

function populateOfferFields() {
    document.getElementById('trafeFormOfferedPlayers').innerHTML = '';
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
    document.getElementById('trafeFormWantedPlayers').innerHTML = '';
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
    if (powerplaysOffered > 0) document.getElementById('cancelPowerplaysOffered').hidden = false;
    else document.getElementById('cancelPowerplaysOffered').hidden = true;
    document.getElementById('tradeFormWantedPowerplays').innerText = powerplaysWanted;
    if (powerplaysWanted > 0) document.getElementById('cancelPowerplaysWanted').hidden = false;
    else document.getElementById('cancelPowerplaysWanted').hidden = true;
}

function addPlayerToPlayersOffered() {
    let player = squad.find(p => p.player_id == document.getElementById('tradeFormOfferPlayersSelect').value);
    if (playersOffered.includes(player)) {
        DisplayFeedback('Error', 'The deal already includes ' + player.player_name);
        return;
    }
    playersOffered.push(player);
    populateOfferFields();
}
window.addPlayerToPlayersOffered = addPlayerToPlayersOffered;
function addPlayerToPlayersRequested() {
    let player = targetPlayers.find(p => p.player_id == document.getElementById('tradeFormRequestPlayersSelect').value);
    if (playersRequested.includes(player)) {
        DisplayFeedback('Error', 'The deal already includes ' + player.player_name);
        return;
    }
    playersRequested.push(player);
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
    DisplayFeedback('Confirm', 'Are you sure you want to send this trade offer to ' + tradeTarget.team_name + '?',
    true, async function() {
        let data = await SendTradeOffer(user.username, tradeTarget.username,
            playersOffered.map(p => p.player_id), playersRequested.map(p => p.player_id),
            powerplaysOffered, powerplaysWanted);
        if (data.error) {
            DisplayFeedback('Error', data.error);
        } else {
            DisplayFeedback('Success', 'Trade offer sent.', true, function() {location.reload()}, false);
        }
    })
}
window.SubmitTradeOffer = SubmitTradeOffer;

function DisplayWaiverReport(report) {
    let reportModal = new bootstrap.Modal(document.getElementById('waiverReportModal'));
    document.getElementById('waiverReportTitle').innerText = `Waiver Report: Round ${report.waiver_round.split('_')[0]} - ${report.waiver_round.split('_')[1]}`;
    document.getElementById('waiverReportBody').innerText = report.report;
    reportModal.show();
}