import { DisplayFeedback } from "./Helpers.js";

async function signUp(event) {
    event.preventDefault();
    var username = document.getElementById('username').value;
    if (username == '' || username.length < 3) {
        DisplayFeedback('Error', 'Please enter a valid username');
        return;
    }
    var password = document.getElementById('password').value;
    if (password == '' || password.length < 8) {
        DisplayFeedback('Error', 'Please enter a valid password (at least 8 characters, with one uppercase, one number, one special character. You know the drill.)');
        return;
    }
    var passwordConfirm = document.getElementById('confirm_password').value;
    var teamName = document.getElementById('team_name').value;
    if (teamName == '') {
        DisplayFeedback('Error', 'Please enter a valid team name');
        return;
    }
    var teamShort = document.getElementById('team_short').value.toUpperCase();
    if (teamShort == '') {
        DisplayFeedback('Error', 'Please enter a valid team acronym');
        return;
    }
    var homeground = document.getElementById('homeground').value;
    if (homeground == '') {
        DisplayFeedback('Error', 'Please enter a valid ground name');
        return;
    }
    if (password != passwordConfirm) {
        DisplayFeedback('Error', 'Passwords do not match');
        return;
    }
    if (teamName.length > 150) {
        DisplayFeedback('Error', 'Team name too long.');
        return;
    }
    if (teamShort.length != 3) {
        DisplayFeedback('Error', 'Team acronym must be three letters');
        return;
    }
    if (homeground.length > 150) {
        DisplayFeedback('Error', 'Homeground name too long.');
        return;
    }

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
    console.log(response);
    const data = await response.json();
    console.log(data);
    if (data.error) {
        DisplayFeedback('Error', data.error);
        return;
    } else {
        location.replace('index.html');
    }
}

window.signUp = signUp;