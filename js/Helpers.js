import { GetActiveUserTeamShort, GetLineupByTeamAndRound, GetPlayersFromXrlTeam, UpdatePlayerXrlTeam, GetPlayerAppearanceStats, DropPlayers, ScoopPlayers, GetActiveUserInfo, GetIdToken, UpdateUserWaiverPreferences } from "./ApiFetch.js"
/**
 * Displays a feedback modal with an optional footer with cancel/confirm buttons and an onconfirm function.
 * @param {String} title A title for the feedback display
 * @param {String} message The main feedback message
 * @param {Boolean} confirm Whether to display a confirm button
 * @param {Function} onConfirmFunction A function to call when confirm button is clicked
 * @param {Boolean} cancel Whether to display a cancel button
 */
export function DisplayFeedback(title, message, confirm=false, onConfirmFunction=null, cancel=true) {
    //Activate the element as a modal
    let feedback = new bootstrap.Modal(document.getElementById('feedback'));
    //Display the title and message
    document.getElementById('feedbackTitle').innerText = title;
    document.getElementById('feedbackMessage').innerHTML = message;
    //Display the confirm button if desired and assign the onclick function
    if (confirm) {
        document.getElementById('feedbackFooter').hidden = false;
        document.getElementById('feedbackConfirm').onclick = onConfirmFunction;
    } else {
        document.getElementById('feedbackFooter').hidden = true;
    }
    //Display the cancel button if desired
    if (cancel) {
        document.getElementById('feedbackCancel').hidden = false;
    } else document.getElementById('feedbackCancel').hidden = true;
    //Display the feedback modal
    feedback.show();
}
/**
 * Displays a modal with player's basic info and cumulative stats
 * @param {Object} player A player object from the players table
 */
export function DisplayPlayerInfo(player, round) {
    //Activate the element as a modal
    let playerInfo = new bootstrap.Modal(document.getElementById('playerInfo'));
    //Display basic player info (name, club, xrl team, positions)
    document.getElementById('playerInfoTitle').innerText = player.player_name;
    document.getElementById('playerNrlClub').innerText = player.nrl_club;
    document.getElementById('playerNrlLogo').src = '/static/' + player.nrl_club + '.svg';
    document.getElementById('playerXrlTeam').innerText = player.xrl_team ? player.xrl_team : 'None';
    if (!player.xrl_team || player.xrl_team == 'None') {
        document.getElementById('playerXrlLogo').hidden = true;
    } else {
        document.getElementById('playerXrlLogo').hidden = false;
        document.getElementById('playerXrlLogo').src = '/static/' + player.xrl_team + '.png';
    }
    document.getElementById('playerPositions').innerText = player.position;
    if (player.position2) document.getElementById('playerPositions').innerText += ', ' + player.position2;
    //Populate the stats sections with XRL scoring stats
    document.getElementById('playerXrlPoints').innerText = player.scoring_stats[player.position].points + player.scoring_stats.kicker.points;
    document.getElementById('playerInfoAppearances').innerText = player.stats.appearances ? player.stats.appearances : '0';
    document.getElementById('playerTries').innerText = player.stats.Tries;
    document.getElementById('playerITs').innerText = player.scoring_stats[player.position].involvement_try;
    document.getElementById('playerPTs').innerText = player.scoring_stats[player.position].positional_try;
    document.getElementById('playerGoals').innerText = player.scoring_stats.kicker.goals;
    document.getElementById('playerFGs').innerText = player.scoring_stats.kicker.field_goals;
    document.getElementById('playerMIAs').innerText = player.scoring_stats[player.position].mia;
    document.getElementById('playerConcedes').innerText = player.scoring_stats[player.position].concede;
    document.getElementById('playerSinBins').innerText = player.stats['Sin Bins'];
    document.getElementById('playerSendOffs').innerText = player.stats['Send Offs'];
    //If the player is in the user's team, display a 'Drop' button
    if (player.xrl_team == GetActiveUserTeamShort()) {
        document.getElementById('playerInfoFooter').hidden = false; //Show the footer
        document.getElementById('playerInfoPickButton').hidden = true; //Hide the 'Pick' button
        document.getElementById('playerInfoWaiverButton').hidden = true;
        /*The 'Drop' button displays a feedback modal asking for confirmation. That modal then contains the callback
        function which drops the player, displays confirmation message, and redirects to homepage */
        document.getElementById('playerInfoDropButton').onclick = function() {
            DisplayFeedback('Confirm', 'Are you sure you want to drop ' + player.player_name + '?',
            true, async function() {
                await DropPlayers(GetActiveUserTeamShort(), [player]);
                DisplayFeedback('Success', player.player_name + ' has been dropped from your squad.',
                true, function() { location.href = 'index.html' }, false);
            });
        };
        document.getElementById('playerInfoDropButton').hidden = false; //Show the drop button
    } //If player is a free agent and scooping is open, display a 'Scoop' button
    else if ((player.xrl_team == undefined || player.xrl_team == 'None') && round.scooping) {
        document.getElementById('playerInfoFooter').hidden = false; //Show the footer
        document.getElementById('playerInfoDropButton').hidden = true; //Hide the 'Drop' button
        document.getElementById('playerInfoWaiverButton').hidden = true;
        /*Like the 'Drop' button, the 'Pick' button displays a feedback modal asking for confirmation. That modal then contains the callback
        function which adds the player to the user's team, displays confirmation message, and redirects to homepage */
        document.getElementById('playerInfoPickButton').onclick = function () {
            DisplayFeedback('Confirm', 'Are you sure you want to scoop ' + player.player_name + '?',
            true, async function() {
                let playerSquad = await GetPlayersFromXrlTeam(GetActiveUserTeamShort());
                if (playerSquad.length > 17) {
                    DisplayFeedback('Sorry!', "Your squad already has 18 players. You'll need to drop someone first.");
                } else {
                    await ScoopPlayers(GetActiveUserTeamShort(), [player]);
                    DisplayFeedback('Success', player.player_name + ' has been added to your squad.',
                    true, function() { location.href = 'index.html' }, false);
                }
            });
        };
        document.getElementById('playerInfoPickButton').hidden = false; //Show the pick button
    } else if (player.xrl_team == undefined || player.xrl_team == 'None' || player.xrl_team == 'On Waivers' || player.xrl_team == 'Pre-Waivers') {
        document.getElementById('playerInfoFooter').hidden = false; //Show the footer
        document.getElementById('playerInfoDropButton').hidden = true;
        document.getElementById('playerInfoPickButton').hidden = true;
        document.getElementById('playerInfoWaiverButton').onclick = function () {
            DisplayFeedback('Confirm', 'Are you sure you want to add ' + player.player_name + ' to your waiver preferences?',
            true, async function() {
                    let user = await GetActiveUserInfo(GetIdToken());
                    if (user.waiver_preferences.includes(player.player_id)) {
                        DisplayFeedback('Error', player.player_name + ' is already listed in your waiver preferences.');
                    } else {
                        user.waiver_preferences.push(player.player_id);
                        await UpdateUserWaiverPreferences(user.username, user.waiver_preferences, user.provisional_drop);
                        DisplayFeedback('Success', player.player_name + ' has been added to your waiver preferences. You can change the order of preferences in the Transfer Centre',
                        true, null, false);
                    }
            });
        };
        document.getElementById('playerInfoWaiverButton').hidden = false;
    } else { //If player is in someone else's team, don't show any buttons
        document.getElementById('playerInfoFooter').hidden = true;
        document.getElementById('playerInfoDropButton').hidden = true;
        document.getElementById('playerInfoPickButton').hidden = true;
        document.getElementById('playerInfoWaiverButton').hidden = true;
    }
    //Clear the previous contents of the detailed stats section
    document.getElementById('allStatsContainer').innerHTML = '';
    //Sort the player's detailed stats properties alphabetically
    let sortedKeys = Object.keys(player.stats).filter(s => XrlRelevantStats.includes(s)).sort();
    //Iterate through all the detailed stats and display them in the stats section
    for (let stat of sortedKeys) {
        let col = document.createElement('div');
        col.className = 'col-4';
        let p = document.createElement('p');
        p.innerText = stat + ': ' + player.stats[stat];
        col.appendChild(p);
        document.getElementById('allStatsContainer').appendChild(col);
    }
    //Show the player info modal
    playerInfo.show();
}
/**
 * Display's a player appearance info modal with data from a player's XRL lineup entry.
 * @param {Object} appearance A player entry in the lineups table
 */
export async function DisplayAppearanceInfoFromLineup(appearance) {
    //Activate the element as a modal
    let appearanceInfo = new bootstrap.Modal(document.getElementById('appearanceInfo'));
    //Show the loading icon
    document.getElementById('appearanceInfoLoading').hidden = false;
    document.getElementById('appearanceInfoBody').hidden = true;
    //Display the player's name and round number in the title
    document.getElementById('appearanceInfoTitle').innerText = appearance.player_name + ' - Round ' + appearance.round_number;
    //Populate and display NRL club and XRL team info
    document.getElementById('appearanceInfoNrlClub').innerText = appearance.nrl_club;
    document.getElementById('appearanceInfoNrlLogo').src = '/static/' + appearance.nrl_club + '.svg';
    document.getElementById('appearanceInfoXrlTeam').innerText = appearance.xrl_team;       
    document.getElementById('appearanceInfoXrlLogo').hidden = false;
    document.getElementById('appearanceInfoXrlLogo').src = '/static/' + appearance.xrl_team + '.png';
    //Show the modal
    appearanceInfo.show();
    //Retrieve the player's appearance record for the round from the stats table
    let statsRecord = await GetPlayerAppearanceStats(appearance.player_id, appearance.round_number);
    //If the player played ...
    if (statsRecord) {
        //Hide the DidNotPlay display and show the stats displays
        document.getElementById('appearanceInfoDNPRow').hidden = true;
        document.getElementById('appearanceInfoNrlMatchRow').hidden = false;
        document.getElementById('appearanceInfoXrlMatchRow').hidden = false;
        document.getElementById('appearanceInfoStatsRow').hidden = false;
        //Find out what positions the player was scored for in that round and display them
        let appearancePositions = Object.keys(statsRecord.scoring_stats);
        appearancePositions = appearancePositions.filter(p => p != 'kicker');
        document.getElementById('appearanceInfoPositions').innerText = appearancePositions[0];
        if (appearancePositions.length > 1) document.getElementById('appearanceInfoPositions').innerText += ', ' + appearancePositions[1];
        //Display opponent, minutes played, and actual NRL position played in the match
        document.getElementById('appearanceInfoOpponent').innerText = statsRecord.opponent;
        document.getElementById('appearanceInfoOpponentLogo').src = '/static/' + statsRecord.opponent + '.svg';
        document.getElementById('appearanceInfoMinutes').innerText = statsRecord.stats['Mins Played'];
        document.getElementById('appearanceInfoNrlPosition').innerText = statsRecord.stats['Position'];
        //Show whether the player 'played' in the XRL lineup for the round
        if (appearance.played_xrl) {
            document.getElementById('appearanceInfoPlayedXrl').style.color = 'green';
            document.getElementById('appearanceInfoPlayedXrl').innerText = 'PLAYED';
        } else {
            document.getElementById('appearanceInfoPlayedXrl').style.color = '#c94d38';
            document.getElementById('appearanceInfoPlayedXrl').innerText = 'DID NOT PLAY';
        }
        //Display player's XRL points and XRL position info
        document.getElementById('appearanceInfoXrlPoints').innerText = appearance.score;
        document.getElementById('appearanceInfoPositionSpecific').innerText = PositionNames[appearance.position_specific];
        document.getElementById('appearanceInfoPositionGeneral').innerText = appearance.position_general;
        //Display the player's captaincy/kicker roles if applicable, else hide the elements
        if (appearance.captain || appearance.captain2 || appearance.vice || appearance.kicker || appearance.backup_kicker) {
            document.getElementById('appearanceInfoRoles').hidden = false;
        } else {
            document.getElementById('appearanceInfoRoles').hidden = true;
        }
        if (appearance.captain || appearance.captain2 ) {
            document.getElementById('appearanceInfoCaptainDiv').hidden = false;
            document.getElementById('appearanceInfoCaptain').innerText = 'Captain';
        } else if (appearance.vice) {
            document.getElementById('appearanceInfoCaptainDiv').hidden = false;
            document.getElementById('appearanceInfoCaptain').innerText = 'Vice-Captain';
        } else {
            document.getElementById('appearanceInfoCaptainDiv').hidden = true;
        }
        if (appearance.kicker) {
            document.getElementById('appearanceInfoKickerDiv').hidden = false;
            document.getElementById('appearanceInfoKicker').innerText = 'Kicker';
        } else if (appearance.backup_kicker ) {
            document.getElementById('appearanceInfoKickerDiv').hidden = false;
            document.getElementById('appearanceInfoKicker').innerText = 'Backup Kicker';
        } else {
            document.getElementById('appearanceInfoKickerDiv').hidden = true;
        }
        //Display the scoring stats for the round, with colourisation to indicate positive or negative result
        document.getElementById('appearanceInfoTries').innerText = statsRecord.stats.Tries;
        if (statsRecord.stats.Tries > 0) document.getElementById('appearanceInfoTries').style.color = 'green';
        else document.getElementById('appearanceInfoTries').style.color = '';
        if (statsRecord.scoring_stats[appearance.position_general].involvement_try) {
            document.getElementById('appearanceInfoITs').innerText = 'Yes';
            document.getElementById('appearanceInfoITs').style.color = 'green';
        } else {
            document.getElementById('appearanceInfoITs').innerText = 'No';
            document.getElementById('appearanceInfoITs').style.color = '';
        }
        if (statsRecord.scoring_stats[appearance.position_general].positional_try) {
            document.getElementById('appearanceInfoPTs').innerText = 'Yes';
            document.getElementById('appearanceInfoPTs').style.color = 'green';
        } else {
            document.getElementById('appearanceInfoPTs').innerText = 'No';
            document.getElementById('appearanceInfoPTs').style.color = '';
        }
        document.getElementById('appearanceInfoGoals').innerText = statsRecord.scoring_stats.kicker.goals;
        if (statsRecord.scoring_stats.kicker.goals > 0) document.getElementById('appearanceInfoGoals').style.color = 'green';
        else document.getElementById('appearanceInfoGoals').style.color = '';
        document.getElementById('appearanceInfoFGs').innerText = statsRecord.scoring_stats.kicker.field_goals;
        if (statsRecord.scoring_stats.kicker.field_goals > 0) document.getElementById('appearanceInfoFGs').style.color = 'green';
        else document.getElementById('appearanceInfoFGs').style.color = '';
        if (statsRecord.scoring_stats[appearance.position_general].mia) {
            document.getElementById('appearanceInfoMIAs').innerText = 'Yes';
            document.getElementById('appearanceInfoMIAs').style.color = '#c94d38';
        } else {
            document.getElementById('appearanceInfoMIAs').innerText = 'No';
            document.getElementById('appearanceInfoMIAs').style.color = '';
        }
        if (statsRecord.scoring_stats[appearance.position_general].concede) {
            document.getElementById('appearanceInfoConcedes').innerText = 'Yes';
            document.getElementById('appearanceInfoConcedes').style.color = '#c94d38';
        } else {
            document.getElementById('appearanceInfoConcedes').innerText = 'No';
            document.getElementById('appearanceInfoConcedes').style.color = '';
        }
        document.getElementById('appearanceInfoSinBins').innerText = statsRecord.stats['Sin Bins'];
        if (statsRecord.stats['Sin Bins'] > 0) document.getElementById('appearanceInfoSinBins').style.color = '#c94d38';
        else document.getElementById('appearanceInfoSinBins').style.color = '';
        if (statsRecord.stats['Send Offs'] == 0) {
            document.getElementById('appearanceInfoSendOffs').innerText = 'No';
            document.getElementById('appearanceInfoSendOffs').style.color = '';
        } else {
            document.getElementById('appearanceInfoSendOffs').innerText = 'Yes (' + appearance.stats['Send Offs'] + "')";
            document.getElementById('appearanceInfoSendOffs').style.color = '#c94d38';
        }
        //Clear previous contents of detailed stats section
        document.getElementById('appearanceInfoAllStatsContainer').innerHTML = '';
        //Filter stats and sort properties alphabetically
        let sortedKeys = Object.keys(statsRecord.stats).filter(s => XrlRelevantStats.includes(s)).sort();
        //Iterate through stats and add to section
        for (let stat of sortedKeys) {
            let col = document.createElement('div');
            col.className = 'col-4';
            let p = document.createElement('p');
            p.innerText = stat + ': ' + statsRecord.stats[stat];
            col.appendChild(p);
            document.getElementById('appearanceInfoAllStatsContainer').appendChild(col);
        }
    } else { //If the player didn't play NRL that week, display the DNP section and hide most others
        document.getElementById('appearanceInfoDNPRow').hidden = false;
        document.getElementById('appearanceInfoNrlMatchRow').hidden = true;
        document.getElementById('appearanceInfoXrlMatchRow').hidden = true;
        document.getElementById('appearanceInfoStatsRow').hidden = true;
        document.getElementById('appearanceInfoPositions').innerText = 'N/A';
    }
    //Hide the loading icon and display the modal content
    document.getElementById('appearanceInfoLoading').hidden = true;
    document.getElementById('appearanceInfoBody').hidden = false;
}
/**
 * Display's a player appearance info modal with data from a player's NRL round stat record.
 * @param {Object} appearance An appearance record from the stats table
 */
export function DisplayAppearanceInfoFromStats(appearance) {
    //Activate the element as a modal
    let appearanceInfo = new bootstrap.Modal(document.getElementById('appearanceInfo'));
    //Display player's name, club and positions scored in round
    document.getElementById('appearanceInfoTitle').innerText = appearance.player_name + ' - Round ' + appearance.round_number;
    document.getElementById('appearanceInfoNrlClub').innerText = appearance.nrl_club;
    document.getElementById('appearanceInfoNrlLogo').src = '/static/' + appearance.nrl_club + '.svg';
    let appearancePositions = Object.keys(appearance.scoring_stats);
    appearancePositions = appearancePositions.filter(p => p != 'kicker');
    document.getElementById('appearanceInfoPositions').innerText = appearancePositions[0];
    if (appearancePositions.length > 1) document.getElementById('appearanceInfoPositions').innerText += ', ' + appearancePositions[1];
    //Display opponent, minutes played, NRL position
    document.getElementById('appearanceInfoOpponent').innerText = appearance.opponent;
    document.getElementById('appearanceInfoOpponentLogo').src = '/static/' + appearance.opponent + '.svg';
    document.getElementById('appearanceInfoMinutes').innerText = appearance.stats['Mins Played'];
    document.getElementById('appearanceInfoNrlPosition').innerText = appearance.stats['Position'];
    //Display and colourise tries, goals and sin bins/send offs
    document.getElementById('appearanceInfoTries').innerText = appearance.stats.Tries;
    if (appearance.stats.Tries > 0) document.getElementById('appearanceInfoTries').style.color = 'green';
    else document.getElementById('appearanceInfoTries').style.color = '';
    document.getElementById('appearanceInfoGoals').innerText = appearance.scoring_stats.kicker.goals;
    if (appearance.scoring_stats.kicker.goals > 0) document.getElementById('appearanceInfoGoals').style.color = 'green';
    else document.getElementById('appearanceInfoGoals').style.color = '';
    document.getElementById('appearanceInfoFGs').innerText = appearance.scoring_stats.kicker.field_goals;
    if (appearance.scoring_stats.kicker.field_goals > 0) document.getElementById('appearanceInfoFGs').style.color = 'green';
    else document.getElementById('appearanceInfoFGs').style.color = '';
    document.getElementById('appearanceInfoSinBins').innerText = appearance.stats['Sin Bins'];
    if (appearance.stats['Sin Bins'] > 0) document.getElementById('appearanceInfoSinBins').style.color = '#c94d38';
    else document.getElementById('appearanceInfoSinBins').style.color = '';
    if (appearance.stats['Send Offs'] == 0) {
        document.getElementById('appearanceInfoSendOffs').innerText = 'No';
        document.getElementById('appearanceInfoSendOffs').style.color = '';
    } else {
        document.getElementById('appearanceInfoSendOffs').innerText = 'Yes (' + appearance.stats['Send Offs'] + "')";
        document.getElementById('appearanceInfoSendOffs').style.color = '#c94d38';
    }
    //Display XRL scoring stats for player's primary position
    document.getElementById('appearanceInfoPosition1').innerText = appearancePositions[0];
    if (appearance.scoring_stats[appearancePositions[0]].involvement_try) {
        document.getElementById('appearanceInfoITs').innerText = 'Yes';
        document.getElementById('appearanceInfoITs').style.color = 'green';
    } else {
        document.getElementById('appearanceInfoITs').innerText = 'No';
        document.getElementById('appearanceInfoITs').style.color = '';
    }
    if (appearance.scoring_stats[appearancePositions[0]].positional_try) {
        document.getElementById('appearanceInfoPTs').innerText = 'Yes';
        document.getElementById('appearanceInfoPTs').style.color = 'green';
    } else {
        document.getElementById('appearanceInfoPTs').innerText = 'No';
        document.getElementById('appearanceInfoPTs').style.color = '';
    }
    if (appearance.scoring_stats[appearancePositions[0]].mia) {
        document.getElementById('appearanceInfoMIAs').innerText = 'Yes';
        document.getElementById('appearanceInfoMIAs').style.color = '#c94d38';
    } else {
        document.getElementById('appearanceInfoMIAs').innerText = 'No';
        document.getElementById('appearanceInfoMIAs').style.color = '';
    }
    if (appearance.scoring_stats[appearancePositions[0]].concede) {
        document.getElementById('appearanceInfoConcedes').innerText = 'Yes';
        document.getElementById('appearanceInfoConcedes').style.color = '#c94d38';
    } else {
        document.getElementById('appearanceInfoConcedes').innerText = 'No';
        document.getElementById('appearanceInfoConcedes').style.color = '';
    }
    //If player was scored for a secondary position in the match, display those stats as well
    if (appearancePositions.length > 1) {
        document.getElementById('appearanceInfoPosition2').innerText = appearancePositions[1];
        if (appearance.scoring_stats[appearancePositions[1]].involvement_try) {
            document.getElementById('appearanceInfoITs2').innerText = 'Yes';
            document.getElementById('appearanceInfoITs2').style.color = 'green';
        } else {
            document.getElementById('appearanceInfoITs2').innerText = 'No';
            document.getElementById('appearanceInfoITs2').style.color = '';
        }
        if (appearance.scoring_stats[appearancePositions[1]].positional_try) {
            document.getElementById('appearanceInfoPTs2').innerText = 'Yes';
            document.getElementById('appearanceInfoPTs2').style.color = 'green';
        } else {
            document.getElementById('appearanceInfoPTs2').innerText = 'No';
            document.getElementById('appearanceInfoPTs2').style.color = '';
        }
        if (appearance.scoring_stats[appearancePositions[1]].mia) {
            document.getElementById('appearanceInfoMIAs2').innerText = 'Yes';
            document.getElementById('appearanceInfoMIAs2').style.color = '#c94d38';
        } else {
            document.getElementById('appearanceInfoMIAs2').innerText = 'No';
            document.getElementById('appearanceInfoMIAs2').style.color = '';
        }
        if (appearance.scoring_stats[appearancePositions[1]].concede) {
            document.getElementById('appearanceInfoConcedes2').innerText = 'Yes';
            document.getElementById('appearanceInfoConcedes2').style.color = '#c94d38';
        } else {
            document.getElementById('appearanceInfoConcedes2').innerText = 'No';
            document.getElementById('appearanceInfoConcedes2').style.color = '';
        }
        document.getElementById('appearanceInfoSecondPositionRow').hidden = false
    } else {
        document.getElementById('appearanceInfoSecondPositionRow').hidden = true
    }
    //Populate detailed stats section
    document.getElementById('appearanceInfoAllStatsContainer').innerHTML = '';
    let sortedKeys = Object.keys(appearance.stats).filter(s => XrlRelevantStats.includes(s)).sort();
    for (let stat of sortedKeys) {
        let col = document.createElement('div');
        col.className = 'col-4';
        let p = document.createElement('p');
        p.innerText = stat + ': ' + appearance.stats[stat];
        col.appendChild(p);
        document.getElementById('appearanceInfoAllStatsContainer').appendChild(col);
    }
    //Show the modal
    appearanceInfo.show();
}
/**
 * Tallies up the scores of all players in a lineup who played or subbed in
 * @param {Array} lineup 
 */
export function GetLineupScore(lineup) {
    return lineup.reduce(function(totalScore, player) {
        let playerScore = player.score;
        let played = player.played_xrl;
        if (played) {
            return totalScore + playerScore;
        } else {
            return totalScore;
        }
    }, 0);
}
/**
 * Calls the API method to retrieve lineup data for a specific team and round, and then calls
 * the GetLineupScore method to calculate total score.
 * @param {*} round 
 * @param {String} xrlTeam XRL team acronym
 */
export async function GetLineupScoreByTeamAndRound(round, xrlTeam) {
    let lineup = await GetLineupByTeamAndRound(round, xrlTeam);
    return GetLineupScore(lineup);
}
/**
 * Calculates a player's XRL score in a given position from a given NRL appearance. Specifically the
 * scoring_stats property of the appearance, which contains scoring stats for each position the player
 * is eligible to play in as well as kicking stats.
 * @param {String} scoringPosition The position to score the player in, e.g. 'Forward'
 * @param {Object} appearance A player's appearance entry in the stats table
 * @param {Boolean} scoreAsKicker Whether to score the player's kicking stats as well
 */
export function GetPlayerXrlScores(scoringPosition, appearance, scoreAsKicker=true) {
    let score = 0;
    let stats = appearance.scoring_stats;
    //Iterate through the position keys in the scoring_stats object
    for (let position in stats) {
        //Score kicking stats by default, but can be turned off
        if (position == 'kicker' && scoreAsKicker) {
            //2 points for each goal (conversion or penalty goal)
            score += stats[position].goals * 2;
            //1 point for each field goal
            score += stats[position].field_goals;
        //Score stats for the provided position
        } else if (position == scoringPosition) {
            //4 points for each try
            score += stats[position].tries * 4;
            //-2 points for a sin bin
            score -= stats[position].sin_bins * 2;
            //-4 points for a red card and -1 for every 10 mins off field
            if (stats[position].send_offs != 0) {
                let minutes = 80 - stats[position].send_offs;
                let deduction = Math.floor(minutes / 10) + 4;
                score -= deduction;
            }
            //4 points for involvement and positional tries
            if (stats[position].involvement_try) score += 4;
            if (stats[position].positional_try > 0) score += 4;
            //-4 points for conceding and missing-in-action
            if (stats[position].mia) score -= 4;
            if (stats[position].concede) score -= 4;
        }
    }
    return score;
}
/**
 * Searches a round's fixture list and returns the match containing the specified user
 * @param {*} user A user data object
 * @param {*} round A round data object
 */
export function GetTeamFixture(team_short, round) {
    return round.fixtures.find(f => f.home == team_short || f.away == team_short);
}
/**
 * Returns ordinal number string for provided integer, e.g. 1 = '1st', 11 = '11th' 
 * @param {Number} num 
 */
export function GetOrdinal(num) {
    let str = String(num);
    let lastNum = str.charAt(str.length - 1);
    let secondLastNum = str.charAt(str.length - 2);
    if (lastNum == '1' && secondLastNum != '1') {
        return str + 'st';
    } else if (lastNum == '2' && secondLastNum != '1') {
        return str + 'nd';
    } else if (lastNum == '3') {
        return str + 'rd';
    } else {
        return str + 'th';
    }
}
/**
 * Retrieves the current active round from an array of round objects
 * @param {Array} rounds An array of round data objects
 */
export function GetActiveRoundFromFixtures(rounds) {
    let activeRounds = rounds.filter(r => r.active);
    let roundNumbers = activeRounds.map(r => r.round_number);
    let currentRoundNumber = Math.max(...roundNumbers);
    let currentRound = rounds.find(r => r.round_number == currentRoundNumber);
    return currentRound;
}
/**
 * Dictionary for converting position element ids into position display names
 */
export const PositionNames = {
    'fullback': 'Fullback',
    'winger1': 'Winger',
    'winger2': 'Winger',
    'centre1': 'Centre',
    'centre2': 'Centre',
    'five_eighth': 'Five-Eighth',
    'halfback': 'Halfback',
    'hooker': 'Hooker',
    'prop1': 'Prop',
    'prop2': 'Prop',
    'row1': '2nd Row',
    'row2': '2nd Row',
    'lock': 'Lock',
    'int1': 'Interchange', 
    'int2': 'Interchange',
    'int3': 'Interchange',
    'int4': 'Interchange',
}
/**
 * List of NRL stats that are relevant for XRL scores
 */
export const XrlRelevantStats = ["All Runs", "Line Breaks", "Line Break Assists", "Try Assists", "Tackle Breaks",
"Offloads", "Tackles Made", "Kicks", "40/20", "20/40", "All Runs", "All Run Metres", "Kicking Metres"]
