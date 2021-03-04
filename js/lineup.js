/* Script controlling lineup.html, the page where the user sets their lineup for the next round */

import { GetActiveUserInfo, GetIdToken, GetLineup, GetLineupByTeamAndRound, GetNextRoundStatus, GetPlayersFromXrlTeam, GetTeamFixtureByRound, SetLineup } from './ApiFetch.js'
import { DisplayFeedback, GetTeamFixture, PositionMap } from './Helpers.js';

/**
 * The active user's id token
 */
const idToken = GetIdToken();
/**
 * An array of position element ids that map to Back positions
 */
const positions_backs = ['fullback', 'winger1', 'winger2', 'centre1', 'centre2'];
/**
 * An array of position element ids that map to Playmaker positions
 */
const positions_playmakers = ['five_eighth', 'halfback', 'hooker'];
/**
 * An array of position element ids that map to Forward positions
 */
const positions_forwards = ['prop1', 'prop2', 'lock', 'row1', 'row2'];
/**
 * An array of position element ids that map to interchange positions
 */
const interchange = ['int1', 'int2', 'int3', 'int4'];
/**
 * An array of element ids that map to player roles
 */
const roles = ['captain', 'captain2', 'vice', 'kicker', 'backup_kicker'];

let user, squad, lineup, backs, forwards, playmakers, powerplay, nextRound, fixture, homeGame;

window.onload = async () => {
    try {
        //Retrieve info for the next round
        if (sessionStorage.getItem('nextRoundStatus')) {
            nextRound = JSON.parse(sessionStorage.getItem('nextRoundStatus'));
        } else {
            nextRound = await GetNextRoundStatus();
            sessionStorage.setItem('nextRoundStatus', JSON.stringify(nextRound));
        }        
        //Get the active user's data
        if (sessionStorage.getItem('activeUser')) {
            user = JSON.parse(sessionStorage.getItem('activeUser'));
        } else {
            user = await GetActiveUserInfo(idToken);
            sessionStorage.setItem('activeUser', JSON.stringify(user));
        }
        //Display match info
        if (sessionStorage.getItem('allFixtures')) {
            let allRounds = JSON.parse(sessionStorage.getItem('allFixtures'));
            let next = allRounds.find(r => r.round_number == nextRound.round_number);
            fixture = next.fixtures.find(m => m.home == user.team_short || m.away == user.team_short);
        } else {
            try {
                fixture = await GetTeamFixtureByRound(user.team_short, nextRound.round_number);
            } catch (err) {
                DisplayFeedback('Error', 'No match this week. Please check back later.');
                return;
            }
        }          
        if (fixture == undefined) {
            document.getElementById('loading').hidden = true;
            DisplayFeedback('Error', 'No match this week. Please check back later.');
            return;
        }
        homeGame = fixture.home == user.team_short;
        let opponent = homeGame ? fixture.away : fixture.home;
        //Load squad, lineup asynchronously
        LoadData();
        document.getElementById('lineupHeading').innerHTML = `Select ${user.team_short} lineup for Round ${nextRound.round_number} vs ${opponent} ${homeGame ? "AT HOME" : "AWAY"}`;
        //Stop loading animation
        document.getElementById('loading').hidden = true;
        document.getElementById('mainContent').hidden = false;
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
        document.getElementById('loading').hidden = true;
    }
}

/**
 * Loads squad and lineup data
 */
async function LoadData() {    
    try {
        //Get player data for the user's XRL squad
        if (sessionStorage.getItem('userSquad')) {
            squad = JSON.parse(sessionStorage.getItem('userSquad'));
        } else {
            squad = await GetPlayersFromXrlTeam(user.team_short);
            sessionStorage.setItem('userSquad', JSON.stringify(squad));
        }     
        //Get the user's lineup data for the current round, if already set
        lineup = await GetLineup(idToken);
        console.log(lineup.length);
        //If no lineup is set, get previous lineup
        if (lineup.length == 0 && nextRound.round_number != 1) {
            lineup = await GetLineupByTeamAndRound(nextRound.round_number - 1, user.team_short);
            //Check if the last lineup had two captains (i.e. powerplay), and if so change second captain
            //to vice-captain
            for (let player of lineup) {
                if (player.captain2) {
                    player.captain2 = false;
                    player.vice = true;
                }
            }
        }
        //Check if existing lineup is using powerplay
        let numCaptains = lineup.filter(p => p.captain || p.captain2).length;
        console.log(numCaptains);
        powerplay = numCaptains == 2;
        console.log(powerplay);
        //If so, change second captain input to visible, and vice captain to hidden
        if (powerplay) {
            document.getElementById('secondCaptainSelect').hidden = false;
            document.getElementById('viceCaptainSelect').hidden = true;
        }
        //Locate powerplay button
        let button = document.getElementById('powerplayButton');
        //If powerplay is not already active, and the user is at home and has some left to use, show the green
        //'Use Powerplay' button
        if (!powerplay && homeGame && user.powerplays > 0) {
            button.hidden = false;
            button.className = 'btn btn-success';
            button.innerText = 'Use Powerplay';
        } // If powerplay is already active, show the red 'Turn Off Powerplay' button
        else if (powerplay) {
            button.hidden = false;
            button.className = 'btn btn-danger';
            button.innerText = 'Turn Off Powerplay';
        }
        //Organise user's XRL squad into separate arrays based on their position
        backs = squad.filter(p => p.position == 'Back' || p.position2 == 'Back');
        console.log('Backs: ' + backs[0]);
        forwards = squad.filter(p => p.position == 'Forward' || p.position2 == 'Forward');
        console.log('Forwards: ' + forwards[0]);
        playmakers = squad.filter(p => p.position == 'Playmaker' || p.position2 == 'Playmaker');
        console.log('Playmakers: ' + playmakers[0]);
        //Call the table constructor
        PopulateLineup();
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}

/**
 * Turns powerplay (lineup has 2 captains) on/off
 * @param {*} event The event which triggered the function
 * @param {*} button The powerplay button
 */
function togglePowerplay(button) {
    try {
        if (powerplay) { //If powerplay is currently ON...
            //Turn powerplay off
            powerplay = false;
            //Remove second captain select
            document.getElementById('captain2').innerHTML = '';
            document.getElementById('secondCaptainSelect').hidden = true;
            //Create vice-captain select
            squad.forEach((player) => {
                createOption(player, 'vice');
            });
            document.getElementById('viceCaptainSelect').hidden = false;
            //Change text and colour of powerplay button
            button.className = 'btn btn-success';
            button.innerText = 'Use Powerplay';
        } else { //If powerplay is currently OFF...
            //Turn powerplay on
            powerplay = true;
            //Remove vice-captain select
            document.getElementById('vice').innerHTML = '';
            document.getElementById('viceCaptainSelect').hidden = true;
            //Create second captain select
            squad.forEach((player) => {
                createOption(player, 'captain2');
            });
            document.getElementById('secondCaptainSelect').hidden = false;
            //Change text and colour of button
            button.className = 'btn btn-danger';
            button.innerText = 'Turn Off Powerplay';
        }
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}
window.togglePowerplay = togglePowerplay;

/**
 * Populates lineup position select options. Will pre-fill with existing or previous lineup.
 */
function PopulateLineup() {
    try {
        //For each back position in the lineup (fullback, wingers, centres)...   
        positions_backs.forEach(pos => {
            //Create a 'None' option for that position select
            createOption(null, pos);
            //Try and find a player in the existing/previous lineup in that position
            let player = lineup.find(p => p.position_specific == pos);
            //For each back in the user's squad...
            backs.forEach(back => {
                //If that player is the player already picked, create an option and pre-select it
                if (player && back.player_id == player.player_id) createOption(back, pos, true);
                //Else just create an option and add it to the position select
                else createOption(back, pos);
            });
        });
        //Do the same for the forward positions...
        positions_forwards.forEach(pos => {
            createOption(null, pos);
            let player = lineup.find(p => p.position_specific == pos);
            forwards.forEach(forward => {
                if (player && forward.player_id == player.player_id) createOption(forward, pos, true);
                else createOption(forward, pos);
            });
        });
        //..and the playmakers
        positions_playmakers.forEach(pos => {
            createOption(null, pos);
            let player = lineup.find(p => p.position_specific == pos);
            playmakers.forEach(pm => {
                if (player && pm.player_id == player.player_id) createOption(pm, pos, true);
                else createOption(pm, pos);
            });
        });
        //Call the functon to fill the interchange options
        fillInterchangeOptions(true);
        //For each role in the lineup (e.g. captain, kicker)...
        roles.forEach(role => {
            //If user is not using powerplay, skip over second captain role
            if (role == 'captain2' && !powerplay) return;
            //If user IS using powerplay, skip over vice-captain role
            if (role == 'vice' && powerplay) return;
            //Create a 'None' option
            createOption(null, role);
            //Check if existing/previous lineup has player in that role
            let player = lineup.find(p => p[role]);
            //Create an option for each player in the squad, pre-selecting existing selection
            squad.forEach(p => {
                if (player && player.player_id == p.player_id) createOption(p, role, true);
                else createOption(p, role);
            });
        });        
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}

/**
 * Creates an option for a player and adds it to a position's select dropdown
 * @param {*} player A player profile object
 * @param {String} position The position select element ID
 * @param {Boolean} selected Whether the option should be pre-selected
 */
function createOption(player, position, selected = false) {
    try {
        //Create an option element
        let option = document.createElement('option');
        //Make option text the player's name and value the player's ID (or 'None')
        option.innerText = player ? player['player_name'] : 'None';
        option.value = player ? player['player_id']: 'None';
        //Assign the selected attribute (false by default)
        option.selected = selected;
        //Add option to the associated select element
        document.getElementById(position).appendChild(option);
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}

/**
 * Populates interchange position select options, filtering out players who have
 * been selected in the starting lineup.
 * @param {Boolean} onload 
 */
function fillInterchangeOptions(onload = false) {
    try {
        //Get all player selections
        let playerSelections = document.getElementsByName('player');
        let selectedPlayers = Array.from(playerSelections)
            .filter(e => !interchange.includes(e.id) && e.value != 'None') //Filter out interchange positions and empty selects
            .map(e => e.value); //Create array of player IDs
    
        // for (let i = 0; i < playerSelections.length; i++) {
        //     //If element id is e.g. int1, int2, continue
        //     if (interchange.includes(playerSelections[i].id)) continue;
        //     //If element is a starting position, push the player_id to selectedPlayers array
        //     selectedPlayers.push(playerSelections[i].value);
        // }
    
        //Available players for bench is everyone not in selectedPlayers array
        let nonStarters = squad.filter(p => !selectedPlayers.includes(p.player_id));
        //For each interchange position...
        interchange.forEach(pos => {
            //Find select element for that position
            let select = document.getElementById(pos);
            let player = undefined;
            //If this function has been called on page load, check lineup for player
            //in interchange position
            if (onload) {
                player = lineup.find(p => p.position_specific == pos);
            } else {//Else try and find the player selected in that spot
                player = squad.find(p => p.player_id == select.value);
            }        
            //Clear select options and create 'None' option
            select.innerHTML = '';
            createOption(null, pos);
            //Create an option for each player not already in starting lineup, pre-selecting existing
            //selection if they have not since been picked in starting lineup
            nonStarters.forEach(p => {
                if (player && player.player_id == p.player_id) createOption(p, pos, true);
                else createOption(p, pos);
                //Call function to populate positional preference options
                fillPositionOptions(select);
            });
        });        
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}
window.fillInterchangeOptions = fillInterchangeOptions;

/**
 * Populates the select options for an interchange player's positional preference
 * @param {*} select The interchange select element
 */
async function fillPositionOptions(select) {
    try {
        //Find and clear the select element. If interchange player select element has ID 'int2',
        //then positional preference select has ID 'int2Position'
        document.getElementById(select.id + 'Position').innerHTML = '';
        //If selected player is 'None', do nothing
        if (select.value == 'None') return;
        //Look for player in squad
        let player = squad.find(p => p.player_id == select.value);
        //Create and fill option for first position
        let option = document.createElement('option');
        option.innerText = player['position'];
        option.value = player['position'];
        //Add it to select element
        document.getElementById(select.id + 'Position').appendChild(option);
        //Do the same for player's second position, if they have one
        if (player['position2']) {
            let option = document.createElement('option');
            option.innerText = player['position2'];
            option.value = player['position2'];
            document.getElementById(select.id + 'Position').appendChild(option);
        }
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}
window.fillPositionOptions = fillPositionOptions;

/**
 * Formulates new lineup from selections then validates and calls function to set in database. 
 * @param {*} event 
 */
async function submitLineup(event) {
    event.preventDefault();
    //Show loading icon
    document.getElementById('submitLoading').hidden = false;
    //Get all player and role select elements
    let players = document.getElementsByName('player');
    let playerRoles = document.getElementsByName('role');
    let newLineup;
    try {
        //Map new lineup
        newLineup = Array.from(players)
            .filter(e => e.value != '' && e.value != 'None') //Filter out non-selections
            .map(e => {
                //Try and find player in squad, throw exception if not found                
                let playerInfo = squad.find(p => p.player_id == e.value);
                if (!playerInfo) throw 'One of the players selected is no longer in your squad.';
                //Get XRL position matching lineup position
                let positionGeneral = PositionMap[e.id];
                let secondPosition = '';
                //If player is on bench...
                if (positionGeneral == 'Interchange') {
                    //Get their general position from positional preference selection
                    positionGeneral = document.getElementById(e.id + 'Position').value;
                    //If they have two positions, record their other position
                    if (playerInfo.position2 && playerInfo.position2 != '') {
                        secondPosition = positionGeneral == playerInfo.position ? playerInfo.position2 : playerInfo.position;
                    }
                }
                //Create database lineup entry object
                let entry = {
                    "player_id": playerInfo.player_id,
                    "player_name": playerInfo.player_name,
                    "nrl_club": playerInfo.nrl_club,
                    "position": e.id,
                    "position_general": positionGeneral,
                    "second_position": secondPosition
                };
                //Check player against each role selection
                playerRoles.forEach(role => {
                    //Create an attribute on the db entry indicating whether they have been
                    //selected for that role
                    entry[role.id] = role.value == e.value;
                });
                //Map db entry into new array
                return entry;
            });
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
        return;
    }
    // for (let i = 0; i < players.length; i++) {
    //     if (players[i].value === '' || players[i].value == 'None') continue;
    //     let playerInfo = squad.find(p => p.player_id == players[i].value);
    //     if (!playerInfo) {
    //         DisplayFeedback('Error', 'One of the players selected is no longer in your squad.');
    //         return;
    //     }
    //     let positionGeneral;
    //     let secondPosition = '';
    //     if (positions_backs.includes(players[i].id)) positionGeneral = 'Back'; 
    //     if (positions_forwards.includes(players[i].id)) positionGeneral = 'Forward'; 
    //     if (positions_playmakers.includes(players[i].id)) positionGeneral = 'Playmaker'; 
    //     if (interchange.includes(players[i].id)) {
    //         positionGeneral = document.getElementById(players[i].id + 'Position').value;
    //         if (playerInfo.position2 && playerInfo.position2 != '') {
    //             secondPosition = positionGeneral == playerInfo.position ? playerInfo.position2 : playerInfo.position;
    //         }
    //     }
    //     let entry = {
    //         "player_id": playerInfo.player_id,
    //         "player_name": playerInfo.player_name,
    //         "nrl_club": playerInfo.nrl_club,
    //         "position": players[i].id,
    //         "position_general": positionGeneral,
    //         "second_position": secondPosition
    //     };
    //     for (let j = 0; j < playerRoles.length; j++) {
    //         if (playerRoles[j].value == players[i].value) {
    //             entry[playerRoles[j].id] = true;
    //         } else {
    //             entry[playerRoles[j].id] = false;
    //         }            
    //     }
    //     newLineup.push(entry);
    // }

    //Function that will submit lineup to db, display success message and redirect to home page
    let completeSubmission = async function() {
        try {
            await SetLineup(idToken, newLineup);
            document.getElementById('submitLoading').hidden = true;
            DisplayFeedback('Success!', 'Lineup set successfully.', true, function() { location.href = 'index.html' }, false);
        } catch (err) {
            DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
        }
    }

    //Validate new lineup
    //A problem is an error or ommission in lineup that doesn't necessarily prevent submission
    let problem = false;
    let message = '';
    try {
        //For each entry in new lineup...
        newLineup.forEach(entry => {
            //Unacceptable errors...
            //Check if player is in lineup twice
            if (newLineup.filter(p => p.player_id == entry.player_id).length != 1) {
                throw entry.player_name + ' has been picked more than once.';
            }
            //Check if any of captains has already been captain 6 times
            if (entry.captain || entry.captain2 || entry.vice) {
                let timesAsCaptain = squad.find(p => p.player_id == entry.player_id).times_as_captain;
                if (timesAsCaptain > 5) throw entry.player_name + ' has already been captained 6 times.';
            }
            //Check if captain is on bench
            if ((entry.captain || entry.captain2) && entry.position.startsWith('int')) {
                throw 'Your chosen captain is starting on the bench';
            }
            //Check if kicker is on bench
            if (entry.kicker && entry.position.startsWith('int')) {
                throw 'Your chosen kicker is starting on the bench';
            }
            //Acceptable errors.....
            //Check if captain is also vice-captain or second captain
            if ((entry.captain && entry.captain2) || (entry.captain && entry.vice)) {
                problem = true;
                message += `<li>${entry.player_name} has two captain roles.</li>`;
            }
            //Check if kicker is also backup kicker
            if (entry.kicker && entry.backup_kicker) {
                problem = true;
                message += `<li>Same player chosen as kicker and backup kicker</li>`;
            }
            //Check if vice-captain is on bench
            if (entry.vice && entry.position.startsWith('int')) {
                problem = true;
                message += `<li>Your chosen vice-captain is starting on the bench.</li>`;
            }
            //Check if backup kicker is on bench
            if (entry.backup_kicker && entry.position.startsWith('int')) {
                problem = true;
                message += `<li>Your chosen backup kicker is starting on the bench.</li>`;
            }
        });
        //If there's a non-breaking error, display a warning error with option to proceed or cancel
        if (problem) {
            document.getElementById('submitLoading').hidden = true;
            DisplayFeedback('Warning!', "<ul>" + message + "</ul><p>Would you like to proceed with lineup submission?</p>", true, completeSubmission);
            return;
        }
        //If there are no errors, proceed with submission
        completeSubmission();
    } catch (err) {
        document.getElementById('submitLoading').hidden = true;
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }

    // for (let player of newLineup) {
    //     if (newLineup.filter(p => p.player_id == player.player_id).length != 1) {
    //         problem = true;
    //         if (!message.includes(`<li>${player.player_name} has been picked more than once.</li>`)) {
    //             message += `<li>${player.player_name} has been picked more than once.</li>`;
    //         }
    //     }
    //     if ((player.captain || player.captain2 || player.vice) && user.captain_counts && user.captain_counts[player.player_id] > 5) {
    //         DisplayFeedback('Invalid Lineup', player.player_name + ' has already been captained 6 times.');
    //         return;
    //     }
    //     if ((player.captain && player.captain2) || (player.captain && player.vice)) {
    //         problem = true;
    //         message += `<li>${player.player_name} has two captain roles.</li>`;
    //     }
    //     if (player.kicker && player.backup_kicker) {
    //         problem = true;
    //         message += `<li>Same player chosen as kicker and backup kicker</li>`;
    //     }
    //     if ((player.captain || player.captain2) && player.position.startsWith('int')) {
    //         DisplayFeedback('Invalid Lineup', 'Your chosen captain is starting on the bench');
    //         return;
    //     }
    //     if (player.vice && player.position.startsWith('int')) {
    //         problem = true;
    //         message += `<li>Your chosen vice-captain is starting on the bench.</li>`;
    //     }
    //     if (player.kicker && player.position.startsWith('int')) {
    //         DisplayFeedback('Invalid Lineup', 'Your chosen kicker is starting on the bench');
    //         return;
    //     }
    //     if (player.backup_kicker && player.position.startsWith('int')) {
    //         problem = true;
    //         message += `<li>Your chosen backup kicker is starting on the bench.</li>`;
    //     }
    // }
    // if (problem) {
    //     DisplayFeedback('Warning!', "<ul>" + message + "</ul><p>Would you like to proceed with lineup submission?</p>", true, completeSubmission);
    //     return;
    // }
    
    // completeSubmission();
}
window.submitLineup = submitLineup;