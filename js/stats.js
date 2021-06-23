import { GetActiveUserTeamShort, GetAllPlayers, GetAllUsers, getCookie, GetPlayersFromNrlClub, GetPlayersFromXrlTeam, GetCurrentRoundStatus, GetStatsByClubAndRound, GetStatsByRound } from "./ApiFetch.js";
import { GetPlayerXrlScores, DisplayPlayerInfo, DisplayAppearanceInfoFromStats, SortByPlayerName, SortByPlayerNameDesc, DefaultPlayerSort, DefaultPlayerSortDesc, DisplayFeedback } from "./Helpers.js";

let roundToDisplay, currentRound, allUsers, activeUser, displayedStats, scoreAsKicker, singleRound;
let sortAttribute = 'score';
let sortOrder = 'Descending';
let loadedPlayers = [], loadedStats = [], loadedTeams = [], loadedTeamStats = [], loadedRounds = [], allPlayersLoaded = false;
// const allClubs = ['Broncos', 'Bulldogs', 'Cowboys', 'Dragons', 'Eels', 'Knights', 'Panthers', 'Rabbitohs', 'Raiders', 'Roosters',
// 'Sea Eagles', 'Sharks', 'Storm', 'Titans', 'Warriors', 'Wests Tigers'];

window.onload = async function() {
    try {
        console.log("Page load start at " + new Date());
        //Get current active round number and info
        roundToDisplay = getCookie('round');
        if(sessionStorage.getItem('roundStatus')) {
            currentRound = JSON.parse(sessionStorage.getItem('roundStatus'));
        } else {
            currentRound = await GetCurrentRoundStatus();
            sessionStorage.setItem('roundStatus', JSON.stringify(currentRound));
        }  
        console.log("Round data loaded at " + new Date());
        //Populate round filter options, starting at current round and going backwards
        for (let i = roundToDisplay; i > 0; i--) {
            let option = document.createElement('option');
            option.innerText = i;
            document.getElementById('roundSelect').appendChild(option);
        }
        //Load user data
        if(sessionStorage.getItem('allUsers')) {
            allUsers = JSON.parse(sessionStorage.getItem('allUsers'));
        } else {
            allUsers = await GetAllUsers();
            sessionStorage.setItem('allUsers', JSON.stringify(allUsers));
        }  
        console.log("User data loaded at " + new Date());
        //Populate XRL team filter options
        allUsers.forEach(u => {
            let option = document.createElement('option');
            option.innerText = u.team_short;
            document.getElementById('xrlTeamSelect').appendChild(option);
        });
        // for (let user of allUsers) {
        //     let option = document.createElement('option');
        //     option.innerText = user.team_short;
        //     document.getElementById('xrlTeamSelect').appendChild(option);
        // }
    
        //Find active user
        activeUser = allUsers.find(u => u.team_short == GetActiveUserTeamShort());
        //Finish loading and display main content
        document.getElementById('loading').hidden = true;
        document.getElementById('mainContent').hidden = false;
        console.log("Page load finished at " + new Date());
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}

/**
 * Populates the main table with player stats
 * @param {Array} stats An array of player profiles or player appearances
 * @param {Function} sortFunction A function to sort the data
 * @param {Boolean} scoringAsKicker Whether to include kicking stats in total score
 */
function populateStatsTable(stats, sortFunction, scoringAsKicker=true) {
    try {
        //Sort stats according to provided function
        let sortedStats = stats.sort(sortFunction);
        //Find table and clear existing data
        let table = document.getElementById('statTableBody');
        table.innerHTML = '';
        //For each record in stats data...
        sortedStats.forEach(player => {
            //Create row
            let tr = document.createElement('tr');
            //Add cell with club logo and name, which links to modal
            let name = document.createElement('td');
            name.style.whiteSpace = 'nowrap';
            let logo = document.createElement('img');
            logo.src = 'static/' + player.nrl_club + '.svg';
            logo.height = '40';
            logo.className = 'me-1';
            name.appendChild(logo);
            let nameLink = document.createElement('a');
            nameLink.href = '#';
            nameLink.innerText = player.player_name;
            nameLink.value = player.player_id;
            if (!singleRound) { //If record is player profile (i.e. for all rounds), link shows player info modal
                nameLink.onclick = function() {
                    DisplayPlayerInfo(loadedPlayers.find(p => p.player_id == this.value), currentRound);
                };
            } else { //Else link shows appearance info modal
                nameLink.onclick = function() {
                    DisplayAppearanceInfoFromStats(displayedStats.find(p => p.player_id == this.value));
                };
            }
            name.appendChild(nameLink);
            tr.appendChild(name);
            //Add cells for XRL team, position and XRL stats
            let xrlTeam = document.createElement('td');
            xrlTeam.innerText = player.xrl_team == undefined ? 'None' : player.xrl_team;
            tr.appendChild(xrlTeam);
            let position = document.createElement('td');
            position.innerText = player.position;
            tr.appendChild(position);
            let appearances = document.createElement('td');
            appearances.innerText = player.stats.appearances ? player.stats.appearances : '-';
            tr.appendChild(appearances);
            let tries = document.createElement('td');
            tries.innerText = player.stats.Tries | 0;
            tr.appendChild(tries);
            let goals = document.createElement('td');
            goals.innerText = player.scoring_stats.kicker.goals | 0;
            tr.appendChild(goals);
            let fieldGoals = document.createElement('td');
            fieldGoals.innerText = player.scoring_stats[player.position].field_goals | 0;
            tr.appendChild(fieldGoals);
            let ITs = document.createElement('td');
            ITs.innerText = player.scoring_stats[player.position].involvement_try | 0;
            tr.appendChild(ITs);
            let PTs = document.createElement('td');
            PTs.innerText = player.scoring_stats[player.position].positional_try | 0;
            tr.appendChild(PTs);
            let concede = document.createElement('td');
            concede.innerText = player.scoring_stats[player.position].concede | 0;
            tr.appendChild(concede);
            let mia = document.createElement('td');
            mia.innerText = player.scoring_stats[player.position].mia | 0;
            tr.appendChild(mia);
            let total = document.createElement('td');
            //Work out whether to include kicking stats in total score
            if (scoringAsKicker) {
                if (singleRound) {
                    total.innerText = player.score;
                } else {
                    total.innerText = (player.scoring_stats[player.position].points || 0) + (player.scoring_stats.kicker.points || 0);
                }
            } else {
                if (singleRound) {
                    total.innerText = player.score_not_kicking;
                } else {
                    total.innerText = player.scoring_stats[player.position].points || 0;
                }
            }
            tr.appendChild(total);
            //Add row to table
            table.appendChild(tr);
        });
        //Show table
        document.getElementById('playersTable').hidden = false;
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}

/**
 * Searches for player profiles and stats based on user's filter selections. Will load data into
 * globals and check each time if data already loaded before fetching from database.
 * @param {*} event 
 */
async function filterStats(event) {
    try {
        event.preventDefault();
        document.getElementById('filterLoading').hidden = false;
        //Initialise loading message
        let message = 'Searching for';
        //Get user's filter selections
        let roundNumber = document.getElementById('roundSelect').value;
        singleRound = roundNumber != 'ALL'; //singleRound is global variable, needed by PopulateStatsTable function
        let position = document.getElementById('positionSelect').value;
        let allPositions = position == 'ALL';
        let nrlClub = document.getElementById('nrlClubSelect').value;
        let allClubs = nrlClub == 'ALL';
        let xrlTeam = document.getElementById('xrlTeamSelect').value;
        let allTeams = xrlTeam == 'ALL';
        //Format loading message based on filter suggestions
        if (singleRound) message +=` Round ${roundNumber} stats for`;
        if (allClubs && allTeams) message += ' all';
        message += allPositions ? ' players' : ' ' + position.toLowerCase() + 's';
        if (!allClubs) message += ` from the ${nrlClub}`;
        if (!allTeams) {
            if (allClubs) message += ` from ${xrlTeam}`;
            else message += ` and ${xrlTeam}`
        }
        message += '...';
        //Show loading message
        document.getElementById('filterMessage').innerText = message;
        document.getElementById('filterMessage').hidden = false;
        //Set global boolean value for scoring kicking stats
        scoreAsKicker = document.getElementById('scoreKickerSelect').value == 'Yes' ? true : false;
        //Initialise stats variable
        let statsToDisplay;
        //Figure out what stats need to be loaded and call appropriate fetch functions
        if (singleRound) {//If user selected a specific round...
            if (allClubs) {//..and didn't specify an NRL club...
                if (loadedRounds.includes(roundNumber)) {//If that round has already been loaded...
                    //Filter required data from loadedStats global
                    statsToDisplay = loadedStats.filter(s => s.round_number == roundNumber);
                } else {//If round hasn't been loaded previously...
                    //Fetch stats from db
                    statsToDisplay = await GetStatsByRound(roundNumber);
                    if (!allPlayersLoaded) {//If player profiles have not been loaded...
                        //Fetch all player profiles from db
                        loadedPlayers = await GetAllPlayers();
                        //Set global to true, indicating all player profiles have been loaded.
                        allPlayersLoaded = true;
                        loadedTeams
                    }
                    //Add score, position and XRL team to appearance record
                    statsToDisplay = scoreAppearanceStats(statsToDisplay);
                    // for (let i in statsToDisplay) {
                    //     let player = loadedPlayers.find(p => p.player_id == statsToDisplay[i].player_id);
                    //     statsToDisplay[i].score = GetPlayerXrlScores(player.position, statsToDisplay[i]);
                    //     statsToDisplay[i].score_not_kicking = GetPlayerXrlScores(player.position, statsToDisplay[i], false);
                    //     statsToDisplay[i].position = player.position;
                    //     statsToDisplay[i].xrl_team = player.xrl_team ? player.xrl_team : 'None';
                    // }
    
                    //Add stats to loadedStats global, allowing for faster loading if called again
                    loadedStats = loadedStats.concat(statsToDisplay);
                    //Add round to global list of loaded rounds
                    loadedRounds.push(roundNumber);
                }
            } else {//...and also specified an NRL club
                //If entire round has already been loaded, or if that NRL club's stats have been loaded for that round...
                if (loadedRounds.includes(roundNumber) || loadedTeamStats.includes([roundNumber, nrlClub])) {
                    //Filter required stats from global stats array
                    statsToDisplay = loadedStats.filter(s => s.round_number == roundNumber && s.nrl_club == nrlClub);
                } else {//If the required stats haven't been loaded yet...
                    //Fetch stats from db
                    statsToDisplay = await GetStatsByClubAndRound(roundNumber, nrlClub);
                    //If all player profiles haven't been loaded, or that particular club's players haven't been loaded...
                    if (!allPlayersLoaded && !loadedTeams.includes(nrlClub)) {
                        //Fetch player profiles from db
                        let load = await GetPlayersFromNrlClub(nrlClub);
                        //Add the players to the global array, filtering out any that are already in there
                        loadedPlayers = loadedPlayers.concat(load.filter(p => !loadedPlayers.includes(p)));
                        //Add NRL club to list of loaded teams
                        loadedTeams.push(nrlClub);
                    }
                    //Add score, position and XRL team to appearance record
                    statsToDisplay = scoreAppearanceStats(statsToDisplay);
                    //Add stats to global stats array
                    loadedStats = loadedStats.concat(statsToDisplay);
                    //Add round number and NRL club to list of loaded stats
                    loadedTeamStats.push([roundNumber, nrlClub]);
                }
            }
            if (!allTeams) {//If user specified an XRL team...
                //If that team was 'Free Agents', filter stats to include only players with no XRL team
                if (xrlTeam == 'Free Agents') statsToDisplay = statsToDisplay.filter(p => p.xrl_team == undefined || p.xrl_team == 'None' || p.xrl_team == 'On Waivers' || p.xrl_team == 'Pre=Waivers');
                //Else filter stats to include players in that XRL team
                else statsToDisplay = statsToDisplay.filter(p => p.xrl_team == xrlTeam);
            }
        } else {//If user didn't specify a particular round...
            if (allClubs && allTeams) {//...and also didn't specify an NRL club or XRL team
                if (!allPlayersLoaded) {//If all players haven't been loaded yet...
                    //Fetch all players from db
                    loadedPlayers = await GetAllPlayers();
                    //Set global bool to true, indicating all player profiles have been loaded
                    allPlayersLoaded = true;
                }
                //Assign the loaded players to the stats to be displayed
                statsToDisplay = loadedPlayers;
            } else if (!allClubs) {//...and did specify an NRL club
                //If club has already been loaded, or all players have been loaded
                if (loadedTeams.includes(nrlClub) || allPlayersLoaded) {
                    //Filter required players from global array
                    statsToDisplay = loadedPlayers.filter(p => p.nrl_club == nrlClub);
                } else {//If players haven't been loaded yet
                    //Fetch players from db  
                    statsToDisplay = await GetPlayersFromNrlClub(nrlClub);
                    //Add players to global array, filtering out any who are already in there
                    loadedPlayers = loadedPlayers.concat(statsToDisplay.filter(p => !loadedPlayers.includes(p)));
                    //Add club to list of loaded teams
                    loadedTeams.push(nrlClub);
                }
                if (!allTeams) {//If user ALSO specified an XRL team, filter accordingly
                    if (xrlTeam == 'Free Agents') statsToDisplay = statsToDisplay.filter(p => p.xrl_team == undefined || p.xrl_team == 'None' || p.xrl_team == 'On Waivers' || p.xrl_team == 'Pre-Waivers');
                    else statsToDisplay = statsToDisplay.filter(p => p.xrl_team == xrlTeam);
                }
            } else if (!allTeams) {//...and did specify an XRL team
                //If team has already been loaded or all players have been loaded
                if (loadedTeams.includes(xrlTeam) || allPlayersLoaded) {
                    //Filter out required players
                    if (xrlTeam == 'Free Agents') statsToDisplay = loadedPlayers.filter(p => p.xrl_team == undefined || p.xrl_team == 'None' || p.xrl_team == 'On Waivers' || p.xrl_team == 'Pre-Waivers');
                    else statsToDisplay = loadedPlayers.filter(p => p.xrl_team == xrlTeam);
                } else {//If players have not been loaded
                    //Fetch players from db
                    statsToDisplay = await GetPlayersFromXrlTeam(xrlTeam);
                    //Add players to global array, filtering out any who are already in there
                    loadedPlayers = loadedPlayers.concat(statsToDisplay.filter(p => !loadedPlayers.includes(p)));
                    //Add team to list of loaded teams
                    loadedTeams.push(xrlTeam);
                }
            }
        }
        //If user specified a particular position, filter stats accordingly
        if (position != 'ALL') statsToDisplay = statsToDisplay.filter(p => p.position == position);
        //Assign the filtered data to the global variable which tracks what data is currently being displayed
        displayedStats = statsToDisplay;
        //Set the sorting function according to whether the stats are a single round or not, and whether kicking stats are being included
        let sortFunction = singleRound ? scoreAsKicker ? sortByXrlScore : sortByXrlScoreNoKicking : scoreAsKicker ? sortByTotalXrlScore : sortByTotalXrlScoreNoKicking;
        //Call function to populate stats table
        populateStatsTable(statsToDisplay, sortFunction, scoreAsKicker);
        //Hide loading message
        document.getElementById('filterMessage').hidden = true;
        document.getElementById('filterLoading').hidden = true;
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}
window.filterStats = filterStats;

/**
 * Scores a player's NRL appearance based on their primary position, then adds their position and XRL team
 * to the record so they can be displayed in the table.
 * @param {Array} stats An array of player appearance records
 */
function scoreAppearanceStats(stats) {
    try {
        stats.forEach(s => {//For each appearance record in round...
            //Find player profile
            let player = loadedPlayers.find(p => p.player_id == s.player_id);
            //Score player's appearance according to primary position
            s.score = GetPlayerXrlScores(player.position, s);
            //Do the same, not including kicking stats
            s.score_not_kicking = GetPlayerXrlScores(player.position, s, false);
            //Copy over player's position and XRL team
            s.position = player.position;
            s.xrl_team = player.xrl_team ? player.xrl_team : 'None';
        });
        return stats;
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}

/**
 * Searches the currently displayed player records for names matching the search expression
 * and loads results into table
 * @param {*} event 
 */
async function searchPlayer(event) {
    try {
        event.preventDefault();
        document.getElementById('filterLoading').hidden = false;
        //Initialise loading message
        let message = 'Searching ';
        message += displayedStats ? 'within results for ' : 'all players for ';
        //Get entered search expression
        let search = document.getElementById('playerSearch').value.toLowerCase();
        message += search + '...';
        //Show loading message
        document.getElementById('filterMessage').innerText = message;
        document.getElementById('filterMessage').hidden = false;
        let result;
        if (displayedStats) {//If there are already stats showing...
            //Filter currently displayed stats for player names including search expression
            result = displayedStats.filter(p => p.player_name.toLowerCase().includes(search));
        } else {//Else if search is first action on page...
            //Load all players
            loadedPlayers = await GetAllPlayers();
            //Filter for search expression
            result = loadedPlayers.filter(p => p.search_name.includes(search));
        }
        //Populate the display table with the results sorted alphabetically by name
        populateStatsTable(result, function(p1, p2) {
            return p1.player_name.split(' ')[1] > p2.player_name.split(' ')[1] ? 1 : -1;
        });
        document.getElementById('filterMessage').hidden = true;
        document.getElementById('filterLoading').hidden = true;
    } catch (err) {
        DisplayFeedback('Error', err + (err.stack ? '<p>' + err.stack + '</p>': ''));
    }
}
window.searchPlayer = searchPlayer;

//#region Sorting functions
function sortByTotalXrlScore(p1, p2) {    
    return ((p2.scoring_stats[p2.position].points || 0) + (p2.scoring_stats.kicker.points || 0)) - ((p1.scoring_stats[p1.position].points || 0) + (p1.scoring_stats.kicker.points || 0));
}
function sortByTotalXrlScoreAsc(p1, p2) {
    return ((p1.scoring_stats[p1.position].points || 0) + (p1.scoring_stats.kicker.points || 0)) - ((p2.scoring_stats[p2.position].points || 0) + (p2.scoring_stats.kicker.points || 0));
}
function sortByTotalXrlScoreNoKicking(p1, p2) {
    return (p2.scoring_stats[p2.position].points || 0) - (p1.scoring_stats[p1.position].points || 0);
}
function sortByTotalXrlScoreNoKickingAsc(p1, p2) {
    return (p1.scoring_stats[p1.position].points || 0) - (p2.scoring_stats[p2.position].points || 0);
}
function sortByXrlScore(p1, p2) {
    return p2.score - p1.score;
}
function sortByXrlScoreAsc(p1, p2) {
    return p1.score - p2.score;
}
function sortByXrlScoreNoKicking(p1, p2) {
    return p2.score_not_kicking - p1.score_not_kicking;
}
function sortByXrlScoreNoKickingAsc(p1, p2) {
    return p1.score_not_kicking - p2.score_not_kicking;
}

function sortPlayers(attribute) {
    let sortFunction;
    //If attribute is same as currently sorted attribute, switch sort order
    if (sortAttribute == attribute) {
        sortOrder = sortOrder == 'Descending' ? 'Ascending' : 'Descending';
    }
    //Assign attribute to be the currently sorted attribute
    sortAttribute = attribute;
    //Use attribute to decide which sort function to use
    if (['involvement_try', 'positional_try', 'concede', 'mia', 'tries', 'field_goals'].includes(attribute)) {
        if (sortOrder == 'Descending') sortFunction = (p1, p2) => p2.scoring_stats[p2.position][attribute] - p1.scoring_stats[p1.position][attribute];
        else sortFunction = (p1, p2) => p1.scoring_stats[p1.position][attribute] - p2.scoring_stats[p2.position][attribute];
    } else if (['goals'].includes(attribute)) {
        if (sortOrder == 'Descending') sortFunction = (p1, p2) => p2.scoring_stats.kicker[attribute] - p1.scoring_stats.kicker[attribute];
        else sortFunction = (p1, p2) => p1.scoring_stats.kicker[attribute] - p2.scoring_stats.kicker[attribute];
    } else if (attribute == 'player_name') {
        if (sortOrder == 'Descending') sortFunction = SortByPlayerName;
        else sortFunction = SortByPlayerNameDesc;
    } else if (attribute == 'appearances') {
        if (sortOrder == 'Descending') sortFunction = (p1, p2) => {
            let p1apps = p1.stats[attribute] | 0;
            let p2apps = p2.stats[attribute] | 0;
            return p2apps - p1apps;
        };
        else sortFunction = (p1, p2) => {
            let p1apps = p1.stats[attribute] | 0;
            let p2apps = p2.stats[attribute] | 0;
            return p1apps - p2apps;
        }
    } else if (attribute == 'score') {
        if (sortOrder == 'Descending') sortFunction = singleRound ? scoreAsKicker ? sortByXrlScore : sortByXrlScoreNoKicking : scoreAsKicker ? sortByTotalXrlScore : sortByTotalXrlScoreNoKicking;
        else sortFunction = singleRound ? scoreAsKicker ? sortByXrlScoreAsc : sortByXrlScoreNoKickingAsc : scoreAsKicker ? sortByTotalXrlScoreAsc : sortByTotalXrlScoreNoKickingAsc;
    } else if (attribute == 'position') { 
        if (sortOrder == 'Descending') sortFunction = DefaultPlayerSort;
        else sortFunction = DefaultPlayerSortDesc;
    } else {
        if (sortOrder == 'Descending') {
            sortFunction = function(p1, p2) {
                if (p1[attribute] == undefined) p1[attribute] = 'None';
                if (p2[attribute] == undefined) p2[attribute] = 'None';
                return p1[attribute] > p2[attribute] ? 1 : -1;
            }
        } else {
            sortFunction = function(p1, p2) {
                if (p1[attribute] == undefined) p1[attribute] = 'None';
                if (p2[attribute] == undefined) p2[attribute] = 'None';
                return p1[attribute] < p2[attribute] ? 1 : -1;
            }
        }
    }
    //Re-populate stats table with new sort function
    populateStatsTable(displayedStats, sortFunction, scoreAsKicker, singleRound);
}
window.sortPlayers = sortPlayers;
//#endregion