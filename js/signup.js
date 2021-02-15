import { DisplayFeedback } from "./Helpers.js";

/**
 * Validates form input and signs up new player to XRL
 * @param {*} event 
 */
async function signUp(event) {
    event.preventDefault();
    //Check that username has been entered
    let username = document.getElementById('username').value;
    if (username == '' || username.length < 3) {
        DisplayFeedback('Error', 'Please enter a valid username');
        return;
    }
    //Check that team name is not empty or too long
    let teamName = document.getElementById('team_name').value;
    if (teamName == '') {
        DisplayFeedback('Error', 'Please enter a valid team name');
        return;
    }
    if (teamName.length > 150) {
        DisplayFeedback('Error', 'Team name too long.');
        return;
    }
    //Check that team acronym is three characters
    let teamShort = document.getElementById('team_short').value.toUpperCase();
    if (teamShort.length != 3) {
        DisplayFeedback('Error', 'Team acronym must be three letters');
        return;
    }
    //Check that homeground is not empty or too long
    let homeground = document.getElementById('homeground').value;
    if (homeground == '') {
        DisplayFeedback('Error', 'Please enter a valid ground name');
        return;
    }    
    if (homeground.length > 150) {
        DisplayFeedback('Error', 'Homeground name too long.');
        return;
    }
    //Check that password has been entered and that poassword confirm matches
    let password = document.getElementById('password').value;
    if (password == '' || password.length < 8) {
        DisplayFeedback('Error', 'Please enter a valid password (at least 8 characters, with one uppercase, one number, one special character. You know the drill.)');
        return;
    }
    let passwordConfirm = document.getElementById('confirm_password').value;
    if (password != passwordConfirm) {
        DisplayFeedback('Error', 'Passwords do not match');
        return;
    }
    //POST to signup API with new user data
    const response = await fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/xrl-users/signup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',        
        },
        body: JSON.stringify({
            'username': username,
            'password': password,
            'team_name': teamName,
            'team_short': teamShort,
            'homeground': homeground
        })
    });
    const data = await response.json();
    //Display any error, or else redirect to login
    if (data.error) {
        DisplayFeedback('Error', data.error);
        return;
    } else {
        location.replace('login.html');
    }
}
window.signUp = signUp;