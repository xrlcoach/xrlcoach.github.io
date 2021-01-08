import { DisplayFeedback } from "./Helpers.js";

function signUp(event) {
    event.preventDefault();
    var username = document.getElementById('username').value;
    var password = document.getElementById('password').value;
    var teamName = document.getElementById('team_name').value;
    var teamShort = document.getElementById('team_short').value;
    var homeground = document.getElementById('homeground').value;


    fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/xrl-users/signup', {
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
    })
    .then((response) => {
        if (response.ok) {
            console.log(response);
            return response.json();
            //window.location.replace('login.html');
        } else {
            DisplayFeedback('Error', 'Network response not ok');
        }        
    })
    .then((data) => {
        console.log(data);
    })
    .catch((error) => {
        DisplayFeedback('Error', error);
    })
}

window.signUp = signUp;