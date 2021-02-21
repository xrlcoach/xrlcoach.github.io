import { GetAllUsers, getCookie, GetPlayerById, GetPlayersFromXrlTeam, GetTransferHistoryByRound, GetUserTradeOffers, GetWaiverReports, ProcessTradeOffer, SendTradeOffer, UpdateUserWaiverPreferences, WithdrawTradeOffer, GetActiveUserInfo, GetIdToken } from "./ApiFetch.js";
import { DisplayFeedback } from "./Helpers.js";

let roundNumber, allUsers, user, squad, waiverPreferences = [], provisionalDrop, tradeOffers, tradeOffersToDisplay, waiverReports;
let tradeTarget, targetPlayers, playersOffered = [], playersRequested = [], powerplaysOffered = 0, powerplaysWanted = 0;

window.onload = async () => {
    try {
        //Get current active round number
        roundNumber = getCookie('round');
        //Load all user data
        if(sessionStorage.getItem('allUsers')) {
            allUsers = JSON.parse(sessionStorage.getItem('allUsers'));
        } else {
            allUsers = await GetAllUsers();
            sessionStorage.setItem('allUsers', JSON.stringify(allUsers));
        }   
        //Isolate active user info
        if (sessionStorage.getItem('activeUser')) {
            user = JSON.parse(sessionStorage.getItem('activeUser'));
        } else {
            user = await GetActiveUserInfo(GetIdToken());
            sessionStorage.setItem('activeUser', JSON.stringify(user));
        }
        //Load active user's squad data
        if (sessionStorage.getItem('userSquad')) {
            squad = JSON.parse(sessionStorage.getItem('userSquad'));
        } else {
            squad = await GetPlayersFromXrlTeam(user.team_short);
            sessionStorage.setItem('userSquad', JSON.stringify(squad));
        }     
        //Call functions to load rest of data asynchronously
        DisplayUserWaiverInfo();        
        FillWaiverSelect();
        DisplayTradeOffers();        
        DisplayTransferHistory();
        //Finish loading
        document.getElementById('loading').hidden = true;
        document.getElementById('mainContent').hidden = false;
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}

/**
 * Populates the waiver report dropdown select
 */
async function FillWaiverSelect() {
    try {
        //Fetch waiver reports from db
        waiverReports = await GetWaiverReports();
        //Sort reports by round number then by A/B
        waiverReports = waiverReports.sort((r1, r2) => {
            let r1r = Number(r1.waiver_round.split('_')[0]);
            let r2r = Number(r2.waiver_round.split('_')[0]);
            let r1i = Number(r1.waiver_round.split('_')[1]);
            let r2i = Number(r2.waiver_round.split('_')[1]);
            if (r1r == r2r)
                return r2i - r1i;
            return r2r - r1r;
        });
        //Populate dropdown select with report names that link to display modal
        waiverReports.forEach(report => {
            let r = report.waiver_round.split('_')[0];
            let i = report.waiver_round.split('_')[1];
            let linkText = `Round ${r} - ${i}`;
            let li = document.createElement('li');
            let a = document.createElement('a');
            a.className = "dropdown-item";
            a.href = '#/';
            a.innerText = linkText;
            a.value = report.waiver_round;
            a.onclick = function () {
                DisplayWaiverReport(waiverReports.find(rep => rep.waiver_round == this.value));
            };
            li.appendChild(a);
            document.getElementById('waiverReportSelect').appendChild(li);
        });
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}

/**
 * Loads player profiles for user's waiver preferences
 */
async function DisplayUserWaiverInfo() {
    try {        
        for (let playerId of user.waiver_preferences) {
            //Load player profile and add to global array
            waiverPreferences.push(await GetPlayerById(playerId));
        }
        //Assign user's indicated player to drop to global
        provisionalDrop = user.provisional_drop;
        //Display user's waiver rank
        document.getElementById('teamWaiverRank').innerText = user.waiver_rank;
        //Call functions to populate waiver preference table and provisional drop select options
        PopulateWaiverPreferencesTable();
        PopulateProvisionalDropOptions();
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}

/**
 * Displays any recent trade offers involving the active user
 */
async function DisplayTradeOffers() {
    try {
        //Fetch all trade offers by or to the active user
        tradeOffers = await GetUserTradeOffers(user.username);
        //Get today's date
        let today = new Date();
        //Filter out offers more than two weeks old and sort most recent first
        tradeOffersToDisplay = tradeOffers.filter(t => {
            let transferDate = new Date(t.datetime);
            let dayDiff = (today.getTime() - transferDate.getTime()) / (1000 * 3600 * 24);
            return dayDiff < 14;
        }).sort((t1, t2) => new Date(t2.datetime) - new Date(t1.datetime));
        //Find trade offers table
        let tradeBody = document.getElementById('tradeOffersBody');
        //If there are no trades to display, show message and return
        if (tradeOffers.length == 0) {
            tradeBody.innerText = 'No active trade offers.';
            return;
        }
        tradeOffersToDisplay.forEach(offer => {//For each trade...
            //Get data for users involved
            let offeredBy = allUsers.find(u => u.username == offer.offered_by);
            let offeredTo = allUsers.find(u => u.username == offer.offered_to);
            //Create a display section for offer
            let offerDisplay = document.createElement('div');
            let row = document.createElement('div');
            row.className = 'row';
            //Add trade offer date
            let offerTime = document.createElement('div');
            offerTime.className = 'col-lg-3';
            offerTime.innerText = 'Date: ' + new Date(offer.datetime).toDateString();
            row.appendChild(offerTime);
            //Add offer info text
            let offerText = document.createElement('div');
            offerText.className = 'col-lg';
            //Format text according to the status of the offer, and whether it was to or from the active user
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
            //Add offer status
            let offerStatus = document.createElement('div');
            offerStatus.className = 'col-lg-2';
            offerStatus.innerText = 'Status: ' + offer.offer_status;
            row.appendChild(offerStatus);
            //Add button which calls up trade offer details modal
            let viewCol = document.createElement('div');
            viewCol.className = 'col-lg-2';
            let viewButton = document.createElement('button');
            viewButton.className = 'btn btn-success mx-2';
            viewButton.value = offer.pk;
            viewButton.innerText = 'View';
            viewButton.onclick = function() {
                DisplayOfferDetails(this.value);
            }
            viewCol.appendChild(viewButton);
            row.appendChild(viewCol);
            offerDisplay.appendChild(row);
            //Add offer to main display
            tradeBody.appendChild(offerDisplay);
        });
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}

/**
 * Displays the user's waiver preferences and allows them to be altered
 */
function PopulateWaiverPreferencesTable() {
    try {
        //Find waiver preference table and clear any present data
        let table = document.getElementById('waiverPreferencesTable');
        table.innerHTML = '';
        //Create table row for each player        
        waiverPreferences.forEach((player, rank) => {            
            let row = document.createElement('tr');
            //Add preference rank
            let rankDisplay = document.createElement('td');
            rankDisplay.innerText = rank + 1;
            row.appendChild(rankDisplay);
            //Add name and club logo
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
            //Add up and down arrows which can re-arrange preference order
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
            if (rank != 0) arrows.appendChild(upArrow); //Only add up arrow if player is not already top
            let downArrow = document.createElement('button');
            downArrow.className = "btn btn-success ms-2";
            downArrow.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-down" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z"/>
                </svg>`;
            downArrow.value = player.player_id;
            downArrow.onclick = function () {
                changePlayerPreferenceRank(this.value, 1);
            }
            if (rank != waiverPreferences.length - 1) arrows.appendChild(downArrow); //Only add down arrow if player is not already bottom
            //Add button to remove player from preferences list
            let cancel = document.createElement('button');
            cancel.className = 'btn-close btn-close-white ms-2';
            cancel.value = player.player_id;
            cancel.onclick = function() {
                changePlayerPreferenceRank(this.value, 0);
            }
            arrows.appendChild(cancel);
            row.appendChild(arrows);
            table.appendChild(row);
        });
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}

/**
 * Populates the dropdown select for a user's provisional waiver drop
 */
function PopulateProvisionalDropOptions() {
    try {
        //Find select element
        let select = document.getElementById('provisionalDrop');
        //If any change is made, display the confirm changes button
        select.onchange = () => document.getElementById('confirmChanges').hidden = false;
        //Create an option for each player in user's squad, selecting the option for
        //the player already chosen (if applicable)
        squad.forEach(player => {
            let option = document.createElement('option');
            option.innerText = player.player_name;
            option.value = player.player_id;
            if (player.player_id == provisionalDrop) option.selected = 'selected';
            select.appendChild(option);
        });
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}

/**
 * Display's any transfers from the current round
 */
async function DisplayTransferHistory() {
    try {
        //Populate round dropdown select options
        for (let i = Number(roundNumber); i > 0; i--) {
            //Create an option for each round number with an onclick which populates table
            let option = document.createElement('li');
            let link = document.createElement('a');
            link.innerText = i;
            link.value = i;
            link.className = "dropdown-item";
            link.href = '#\\';
            link.onclick = function(e) {
                e.preventDefault();
                populateTransferTable(this.value);
            };
            option.appendChild(link);
            document.getElementById('transferRoundSelect').appendChild(option);
        }        
        //Populate table with current round's transfers
        populateTransferTable(roundNumber);
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}

/**
 * 
 * @param {String} round 
 */
async function populateTransferTable(round) {
    try {
        //Filter transfer history for desired round and sort newest to oldest
        let transfers = await GetTransferHistoryByRound(round);
        transfers = transfers.sort((t1, t2) => {
            return new Date(t2.datetime) - new Date(t1.datetime);
        });
        //Find table and clear contents
        let table = document.getElementById('transferHistoryTable');
        table.innerHTML = '';
        //Add row to table for each transfer
        for (let t of transfers) {
            //Get player profile and user data
            let player = await GetPlayerById(t.player_id);
            let user = allUsers.find(u => u.username == t.user);
            let row = document.createElement('tr');
            //Add date
            let datetime = document.createElement('td');
            datetime.innerText = t.datetime;
            row.appendChild(datetime);
            //Add name and logo of team who did dropping or signing
            let team = document.createElement('td');
            let teamLogo =  document.createElement('img');
            teamLogo.src = '/static/' + user.team_short + '.png';
            teamLogo.height = '50';
            teamLogo.className = 'me-1';
            team.appendChild(teamLogo);
            let teamName = document.createElement('span');
            teamName.innerText = user.team_name;
            team.appendChild(teamName);
            row.appendChild(team);
            //Add transfer type and colour accordingly
            let type = document.createElement('td');
            if (t.type == 'Drop') {
                type.innerText = 'DROPPED';
                type.style.color = '#c94d38';
            } else {
                type.innerText = 'SIGNED';
                type.style.color = 'green';
            }
            row.appendChild(type);
            //Add player name and club logo
            let name = document.createElement('td');
            let span = document.createElement('span');
            span.innerText = player.player_name;
            name.appendChild(span);
            let logo = document.createElement('img');
            logo.src = '/static/' + player.nrl_club + '.svg';
            logo.height = '40';
            name.appendChild(logo);
            row.appendChild(name);
            //Add description of how player was signed
            let description = document.createElement('td');
            if (t.type == 'Scoop')
                description.innerText = 'on a free transfer.';
            if (t.type == 'Waiver')
                description.innerText = 'on a waiver.';
            if (t.type == 'Trade')
                description.innerText = 'from ' + allUsers.find(u => u.username == t.seller).team_name;
            row.appendChild(description);
            table.appendChild(row);
        }
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}

/**
 * Changes a player's rank in the user's waiver preferences
 * @param {String} playerId ID of player to move
 * @param {Number} increment 1 moves up, -1 moves down, 0 removes from preferences
 */
function changePlayerPreferenceRank(playerId, increment) {
    try {
        //Find current index of player
        let playerIndex = waiverPreferences.findIndex(p => p.player_id == playerId);
        //Remove player from preferences
        let removedPlayer = waiverPreferences.splice(playerIndex, 1)[0];
        //If increment is not 0 (i.e. if player is not being removed), reinsert them at their previous index plus the increment (1 or -1)
        if (increment != 0) waiverPreferences.splice(playerIndex + increment, 0, removedPlayer);
        //Re-populate waiver preference table
        PopulateWaiverPreferencesTable();
        //Display button to confirm changes
        document.getElementById('confirmChanges').hidden = false;
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}

/**
 * Saves any changes to waiver preferences
 */
async function submitWaiverPreferences() {
    try {
        //Get array of player IDs from current waiver preferences array
        let preferences = waiverPreferences.map(p => p.player_id);
        //Get ID of provisional waiver drop
        provisionalDrop = document.getElementById('provisionalDrop').value;
        //Call function to update preferences in db
        await UpdateUserWaiverPreferences(user.username, preferences, provisionalDrop);
        //Display success message which reloads page        
        DisplayFeedback('Success', 'Waiver preferences updated', true, function() {location.reload()}, false);        
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}
window.submitWaiverPreferences = submitWaiverPreferences;

/**
 * Displays the a modal with the details of a trade offer
 * @param {String} offerId 
 */
async function DisplayOfferDetails(offerPk) {
    try {
        //Find and activate modal
        let tradeInfoModal = new bootstrap.Modal(document.getElementById('tradeInfo'));
        //Find trade offer in global array
        let offer = tradeOffers.find(t => t.pk == offerPk);
        //Find and display data for users involved
        let offeredBy = allUsers.find(u => u.username == offer.offered_by);
        let offeredTo = allUsers.find(u => u.username == offer.offered_to);
        document.getElementById('tradeInfoOfferedBy').innerText = offeredBy.team_name;
        document.getElementById('tradeInfoStatus').innerText = offer.offer_status;
        //Display offer status
        document.getElementById('tradeInfoStatus').style.color = offer.offer_status == 'Accepted' ? 'green' : offer.offer_status == 'Rejected' ? '#c94d38' : '';
        //Clear any previous player data
        document.getElementById('trafeInfoWantedPlayers').innerHTML = '';
        document.getElementById('trafeInfoOfferedPlayers').innerHTML = '';
        //Display info for players in trade
        for (let id of offer.players_offered) {
            let player = await GetPlayerById(id);
            let li = document.createElement('li');
            li.innerText = player.player_name;
            document.getElementById('trafeInfoOfferedPlayers').appendChild(li);
        }
        for (let id of offer.players_wanted) {
            let player = await GetPlayerById(id);
            let li = document.createElement('li');
            li.innerText = player.player_name;
            document.getElementById('trafeInfoWantedPlayers').appendChild(li);
        }
        //Display any powerplays involved in trade
        document.getElementById('tradeInfoOfferedPowerplays').innerText = offer.powerplays_offered;
        document.getElementById('tradeInfoWantedPowerplays').innerText = offer.powerplays_wanted;
        //If trade offer is still active, display action buttons
        if (offer.offer_status == 'Pending') {
            //Find button elements
            let rejectButton = document.getElementById('tradeInfoRejectButton');
            let acceptButton = document.getElementById('tradeInfoAcceptButton');
            let withdrawButton = document.getElementById('tradeInfoWithdrawButton');
            //If active user is being offered to...
            if (user.username == offeredTo.username) {
                //Hide withdraw button
                withdrawButton.hidden = true;
                //Show modal footer
                document.getElementById('tradeInfoFooter').hidden = false;
                //Program reject button to reject the offer
                rejectButton.onclick = async function() {
                    try {
                        await ProcessTradeOffer(offer.pk, false);                        
                        DisplayFeedback('Rejected', 'Trade offer rejected.', true, function() {location.reload()}, false);
                    } catch (err) {
                        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
                    }
                }
                //Show reject button
                rejectButton.hidden = false;
                //Program accept button to prompt for confirmation and then accept offer
                acceptButton.onclick = function() {
                    DisplayFeedback('Confirm', 'Are you sure you want to accept this trade offer?', true, async function() {
                        try {
                            await ProcessTradeOffer(offer.pk, true);                        
                            DisplayFeedback('Success', 'Trade completed!', true, function() {location.reload()}, false);
                        } catch (err) {
                            DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
                        }
                    });
                };
                //Show accept button
                acceptButton.hidden = false;
            }
            //If active user is the one who proposed trade...
            else if (user.username == offeredBy.username) {
                //Show footer
                document.getElementById('tradeInfoFooter').hidden = false;
                //Hide accept and reject buttons
                rejectButton.hidden = true;
                acceptButton.hidden = true;
                //Program withdraw button to prompt for confirmation and then cancel offer
                withdrawButton.onclick = function() {
                    DisplayFeedback('Confirm', 'Are you sure you want to withdraw this trade offer?', true, async function() {
                        try {
                            await WithdrawTradeOffer(offer.pk);                        
                            DisplayFeedback('Success', 'Trade offer withdrawn.', true, function() {location.reload()}, false);
                        } catch (err) {
                            DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
                        }
                    });
                };
                //Show withdraw button
                withdrawButton.hidden = false;
            }
        } else {//If offer is not still active, hide modal footer
            document.getElementById('tradeInfoFooter').hidden = true;
        }
        //Show modal
        tradeInfoModal.show();
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}

/**
 * Shows a modal allowing user to propose a new trade
 */
function DisplayTradeForm() {
    try {
        //Find and activate modal
        let tradeForm = new bootstrap.Modal(document.getElementById('tradeForm'));
        //Clear any previous data
        document.getElementById('xrlTeamSelect').innerHTML = '';
        document.getElementById('tradeFormOfferPlayersSelect').innerHTML = '';
        //Populate XRL team select options with all user except the active one
        allUsers.filter(u => u.username != user.username).forEach(u => {
            let li = document.createElement('li');
            let option = document.createElement('a');
            option.className = 'dropdown-item';
            option.href = '#';
            option.value = u.team_short;
            option.innerText = u.team_name;
            //When XRL team is selected, populate the player select options
            option.onclick = async function() {
                try {
                    tradeTarget = allUsers.find(u1 => u1.team_short == this.value);
                    document.getElementById('tradeFormTargetTeam').innerText = tradeTarget.team_name;
                    await populatePlayerRequestOptions(this.value);
                } catch (err) {
                    DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
                }
            };
            li.appendChild(option);
            document.getElementById('xrlTeamSelect').appendChild(li);
        });
        //Populate options for players to offer
        squad.forEach(p => {
            let option = document.createElement('option');
            option.value = p.player_id;
            option.innerText = p.player_name;
            document.getElementById('tradeFormOfferPlayersSelect').appendChild(option);
        });
        //Call function to populate offer data
        populateOfferFields();
        //Show modal
        tradeForm.show();
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}
window.DisplayTradeForm = DisplayTradeForm;

/**
 * Populates trade offer options for players to request from targeted team
 * @param {String} team_short The acronym of the targeted XRL team
 */
async function populatePlayerRequestOptions(team_short) {
    try {
        //Get players from selected user's squad
        targetPlayers = await GetPlayersFromXrlTeam(team_short);
        //Clear any previous data
        document.getElementById('tradeFormRequestPlayersSelect').innerHTML = '';
        //Create a select option for each player
        targetPlayers.forEach(p => {
            let option = document.createElement('option');
            option.value = p.player_id;
            option.innerText = p.player_name;
            document.getElementById('tradeFormRequestPlayersSelect').appendChild(option);
        });
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}

/**
 * Displays current state of trade offer (players and powerplays offered/requested)
 */
function populateOfferFields() {
    try {
        //Clear any previous data
        document.getElementById('trafeFormOfferedPlayers').innerHTML = '';
        document.getElementById('trafeFormWantedPlayers').innerHTML = '';
        //Display all players currently being offered in trade
        playersOffered.forEach((p, i) => {
            let li = document.createElement('li');
            let name = document.createElement('span');
            name.innerText = p.player_name;
            li.appendChild(name);
            //Add a button to remove the player from list
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
        //Display all players currently being requested in trade
        playersRequested.forEach((p, i) => {
            let li = document.createElement('li');
            let name = document.createElement('span');
            name.innerText = p.player_name;
            li.appendChild(name);
            //Add button to remove player from list
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
        //Show any powerplays offered or requested, with buttons to cancel if required
        document.getElementById('tradeFormOfferedPowerplays').innerText = powerplaysOffered;
        if (powerplaysOffered > 0) document.getElementById('cancelPowerplaysOffered').hidden = false;
        else document.getElementById('cancelPowerplaysOffered').hidden = true;
        document.getElementById('tradeFormWantedPowerplays').innerText = powerplaysWanted;
        if (powerplaysWanted > 0) document.getElementById('cancelPowerplaysWanted').hidden = false;
        else document.getElementById('cancelPowerplaysWanted').hidden = true;
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}

/**
 * Adds a player to the list of players currently being offered in the trade
 */
function addPlayerToPlayersOffered() {
    try {
        //Find player info from user's squad
        let player = squad.find(p => p.player_id == document.getElementById('tradeFormOfferPlayersSelect').value);
        //If player is already involved in trade, display error message and return
        if (playersOffered.includes(player)) {
            DisplayFeedback('Error', 'The deal already includes ' + player.player_name);
            return;
        }
        //Add player to global array
        playersOffered.push(player);
        //Refresh offer display
        populateOfferFields();
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}
window.addPlayerToPlayersOffered = addPlayerToPlayersOffered;

/**
 * Adds a player to the list of players currently being requested in the trade
 */
function addPlayerToPlayersRequested() {
    try {
        //Find player info from targeted user's squad
        let player = targetPlayers.find(p => p.player_id == document.getElementById('tradeFormRequestPlayersSelect').value);
        //If player is already involved in trade, display error message and return
        if (playersRequested.includes(player)) {
            DisplayFeedback('Error', 'The deal already includes ' + player.player_name);
            return;
        }
        //Add player to global array
        playersRequested.push(player);
        //Refresh offer display
        populateOfferFields();
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}
window.addPlayerToPlayersRequested = addPlayerToPlayersRequested;

/**
 * Adds one powerplay to the amount being offered in the trade
 */
function addPowerplayToOffer() {
    try {
        //If active user has already offered all their powerplays, display error message and return
        if (powerplaysOffered == user.powerplays) {
            DisplayFeedback('Sorry', "You don't have any more powerplays to offer.");
            return;
        }
        //Increment global count
        powerplaysOffered += 1;
        //Refresh offer display
        populateOfferFields();
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}
window.addPowerplayToOffer = addPowerplayToOffer;

/**
 * Adds one powerplay to the amount being requested in the trade
 */
function addPowerplayToRequest() {
    try {
        //If player has already requested all the targeted user's powerplays, display error message and return
        if (powerplaysWanted == tradeTarget.powerplays) {
            DisplayFeedback('Sorry', tradeTarget.team_name + " doesn't have any more powerplays to offer.");
            return;
        }
        //Increment global count
        powerplaysWanted += 1;
        //Refresh offer display
        populateOfferFields();
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}
window.addPowerplayToRequest = addPowerplayToRequest;

/**
 * Removes any powerplays being offered in trade
 */
function removePowerplaysOffered() {
    try {
        powerplaysOffered = 0;
        populateOfferFields();
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}
window.removePowerplaysOffered = removePowerplaysOffered;

/**
 * Removes any powerplays being requested in trade
 */
function removePowerplaysRequested() {
    try {
        powerplaysWanted = 0;
        populateOfferFields();
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}
window.removePowerplaysRequested = removePowerplaysRequested;

/**
 * Submits the trade offer, which makes record in db and sends message to targeted user
 */
function SubmitTradeOffer() {
    try {
        //Prompt user to confirm offer
        DisplayFeedback('Confirm', 'Are you sure you want to send this trade offer to ' + tradeTarget.team_name + '?',
        true, async function() {
            try {
                //If they confirm, call function to record offer and notify target user
                await SendTradeOffer(user.username, tradeTarget.username,
                    playersOffered.map(p => p.player_id), playersRequested.map(p => p.player_id),
                    powerplaysOffered, powerplaysWanted);
                //Display success message which reloads page on confirm            
                DisplayFeedback('Success', 'Trade offer sent.', true, function() {location.reload()}, false);
            } catch (err) {
                DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
            }            
        });
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}
window.SubmitTradeOffer = SubmitTradeOffer;

/**
 * Displays a modal with a full waiver report
 * @param {String} report The report to display
 */
function DisplayWaiverReport(report) {
    try {
        //Find and activate modal
        let reportModal = new bootstrap.Modal(document.getElementById('waiverReportModal'));
        //Populate title and body text
        document.getElementById('waiverReportTitle').innerText = `Waiver Report: Round ${report.waiver_round.split('_')[0]} - ${report.waiver_round.split('_')[1]}`;
        document.getElementById('waiverReportBody').innerText = report.report;
        //Show modal
        reportModal.show();
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}