function signUp() {
    var username = document.getElementById('username');
    var password = document.getElementById('password');
    var teamName = document.getElementById('team_name');
    var teamShort = document.getElementById('team_short');
    var homeground = document.getElementById('homeground');


    fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/xrl-users/signup', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',        
    },
    body: {
        'username': username,
        'password': password,
        'team_name': teamName,
        'team_short': teamShort,
        'homeground': homeground
    }
    })
    .then((response) => {
        if (response.ok) {
            window.location.replace('logintest.html');
        } else {
            document.getElementById('feedback').innerText = 'Network response not ok';
        }        
    })
    .catch((error) => {
        document.getElementById('feedback').innerText += error;
    })
}