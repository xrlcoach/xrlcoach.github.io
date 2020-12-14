function login(event) {
    event.preventDefault();
    var username = document.getElementById('username').value;
    var password = document.getElementById('password').value;

    fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/xrl-users/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'withCredentials': true        
    },
    body: JSON.stringify({
        "username": username,
        "password": password,        
    })
    })
    .then((response) => {
        if (response.ok) {
            window.location.href = './index.html';
        } else {
            document.getElementById('feedback').innerText = 'Network response not ok';
        }        
    })
    .catch((error) => {
        document.getElementById('feedback').innerText += error;
    })
}