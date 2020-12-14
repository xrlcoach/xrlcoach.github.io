function login() {
    var username = document.getElementById('username');
    var password = document.getElementById('password');

    fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/xrl-users/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',        
    },
    body: {
        'username': username,
        'password': password,        
    }
    })
    .then((response) => {
        if (response.ok) {
            document.cookie = `id=${response.id_token}`;
            window.location.replace('index.html');
        } else {
            document.getElementById('feedback').innerText = 'Network response not ok';
        }        
    })
    .catch((error) => {
        document.getElementById('feedback').innerText += error;
    })
}